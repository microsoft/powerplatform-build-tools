using System.Collections.Concurrent;

namespace VotesDispatcher;

internal class VotingBallot
{
    private static readonly ConcurrentDictionary<string, Lazy<VotingItem>>
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

    public string Id { get; }

    public string? Name { get; }

    public string? Description { get; }

    public Uri? Image { get; }

    public ConcurrentDictionary<string, Lazy<VotingItem>> Votes => _votes;
}
