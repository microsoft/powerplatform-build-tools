namespace VotesDispatcher;

internal class VotesResponse
{
    public int TotalVotes { get; set; }

    public List<VotingItem> Items { get; set; } = new List<VotingItem>();
}
