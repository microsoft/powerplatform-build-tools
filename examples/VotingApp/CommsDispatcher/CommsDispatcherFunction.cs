using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Net;

namespace CommsDispatcher
{
    public class CommsDispatcherFunction
    {
        public const string VotesHub = "VotesHub";
        private readonly ILogger _logger;
        private static readonly ConcurrentDictionary<string, Lazy<VotingItem>> _votes = new ConcurrentDictionary<string, Lazy<VotingItem>>();

        public CommsDispatcherFunction(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger("negotiate");
        }

        [Function("negotiate")]
        public async Task<HttpResponseData>Negotiate(
            [HttpTrigger(AuthorizationLevel.Anonymous)] HttpRequestData req,
            [SignalRConnectionInfoInput(HubName = VotesHub)] string connectionInfo)
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
        [SignalROutput(HubName = VotesHub, ConnectionStringSetting = "AzureSignalRConnectionString")]
        public SignalRMessageAction? Vote(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "vote/{itemId}")] HttpRequestData req,
            string itemId)
        {
            _logger.LogInformation($"{nameof(Vote)}");

            var voteItem = _votes.GetOrAdd(itemId,
                x => new Lazy<VotingItem>(() => new VotingItem(itemId), LazyThreadSafetyMode.ExecutionAndPublication));

            var message = new SignalRMessageAction("CommsMessage");
            try
            {
                voteItem.Value.Lock.EnterWriteLock();
                voteItem.Value.Count++;
                var arguments = new List<object>
                {
                    voteItem.Value.Id,
                    voteItem.Value.Count
                };
                message.Arguments = arguments.ToArray();
            }
            finally
            {
                voteItem.Value.Lock.ExitWriteLock();
            }

            return message;
        }
    }
}
