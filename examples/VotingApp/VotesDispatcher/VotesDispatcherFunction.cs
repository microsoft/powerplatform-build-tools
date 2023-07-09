using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;

namespace VotesDispatcher
{
  public class VotesDispatcherFunction
    {
        public const string VotesHub = "VotesHub";
        public const string ApplicationJson = "application/json";
        private readonly ILogger _logger;
        private static readonly ConcurrentDictionary<string, Lazy<VotingBallot>>
          _ballots = new ConcurrentDictionary<string, Lazy<VotingBallot>>();

        public VotesDispatcherFunction(ILoggerFactory loggerFactory)
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
            response.Headers.Add("Content-Type", ApplicationJson);
            await response.WriteStringAsync(connectionInfo);

            return response;
        }

        [Function("vote")]
        [SignalROutput(HubName = VotesHub, ConnectionStringSetting = "AzureSignalRConnectionString")]
        public SignalRMessageAction? Vote(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "vote/{ballotId}/{itemId}")]
            HttpRequestData req,
            string ballotId, string itemId)
        {
            _logger.LogInformation($"{nameof(Vote)}");

            var ballot = _ballots.GetOrAdd(ballotId,
                x => new Lazy<VotingBallot>(() => new VotingBallot(ballotId), LazyThreadSafetyMode.ExecutionAndPublication));

            var voteItem = ballot.Value.Votes.GetOrAdd(itemId,
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

        [Function("votes")]
        public async Task<HttpResponseData> Votes(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "votes/{ballotId}")]
            HttpRequestData req,
            string ballotId)
        {
            _logger.LogInformation($"{nameof(Votes)}");

            var ballot = _ballots.GetOrAdd(ballotId,
                x => new Lazy<VotingBallot>(() => new VotingBallot(ballotId), LazyThreadSafetyMode.ExecutionAndPublication));

            var votes = new List<VotingItem>();
            ballot.Value.Votes.Values.ToList().ForEach(x => {
                try
                {
                    x.Value.Lock.EnterReadLock();
                    votes.Add(new VotingItem(x.Value));
                }
                finally
                {
                    x.Value.Lock.ExitReadLock();
                }
            });

            var jsonToReturn = JsonSerializer.Serialize(votes);
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", ApplicationJson);
            await response.WriteStringAsync(jsonToReturn);

            return response;
        }
    }
}
