using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Net;

namespace CommsDispatcher
{
    public class CommsDispatcherFunction
    {
        private readonly ILogger _logger;
        private static readonly ConcurrentDictionary<int, VotingItem> _votes = new ConcurrentDictionary<int, VotingItem>();

        public CommsDispatcherFunction(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger("negotiate");
            if (_votes.IsEmpty)
            {
                _votes.TryAdd(0, new VotingItem(0, "i0"));
                _votes.TryAdd(1, new VotingItem(1, "i1"));
                _votes.TryAdd(2, new VotingItem(2, "i2"));
                _votes.TryAdd(3, new VotingItem(3, "i3"));
            }
        }

        [Function("negotiate")]
        public async Task<HttpResponseData>Negotiate(
            [HttpTrigger(AuthorizationLevel.Anonymous)] HttpRequestData req,
            [SignalRConnectionInfoInput(HubName = "CommsHub")] string connectionInfo)
        {
            _logger.LogInformation($"Negotiate SignalR Connection");

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Access-Control-Allow-Credentials", $"false");
            response.Headers.Add("Access-Control-Allow-Origin", $"{req.Url.Scheme}://{req.Url.Authority}");
            response.Headers.Add("Content-Type", "application/json");
            await response.WriteStringAsync(connectionInfo);

            return response;
        }

        [Function("vote")]
        [SignalROutput(HubName = "CommsHub", ConnectionStringSetting = "AzureSignalRConnectionString")]
        public SignalRMessageAction? Vote(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "vote/{itemId}")] HttpRequestData req,
            int itemId)
        {
            _logger.LogInformation($"BroadcastToAll");

            if (!_votes.TryGetValue(itemId, out var voteItem)) {
                return null;
            }

            voteItem.Count++;

            var message = new SignalRMessageAction("CommsMessage");
            var arguments = new List<object>
            {
                voteItem.Id,
                voteItem.Count
            };
            message.Arguments = arguments.ToArray();

            return message;
        }
    }
}
