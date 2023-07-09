using System.Collections.Concurrent;
using System.Text.Json.Serialization;

namespace VotesDispatcher;

internal class VotingBallot
{
    private readonly ConcurrentDictionary<string, Lazy<VotingItem>>
      _votes = new ConcurrentDictionary<string, Lazy<VotingItem>>();

    public VotingBallot(string id, string? name = null, string? description = null, Uri? image = null)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentNullException(nameof(id));
        Id = id;

        Name = name;
        Description = description;
        Image = image;
    }
  
    [JsonIgnore]
    public ReaderWriterLockSlim Lock { get; } = new ReaderWriterLockSlim();

    public string Id { get; }

    public string? Name { get; }

    public string? Description { get; }

    public Uri? Image { get; }

    public int TotalVotes { get; set; }

    public ConcurrentDictionary<string, Lazy<VotingItem>> Votes => _votes;
}
