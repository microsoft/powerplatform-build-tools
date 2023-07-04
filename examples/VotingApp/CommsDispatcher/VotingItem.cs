namespace CommsDispatcher;

public class VotingItem
{
    public VotingItem (string id, string? name = null, string? description = null, Uri? image = null)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentNullException(nameof(id));
        Id = id;

        Name = name;
        Description = description;
        Image = image;
    }

    public ReaderWriterLockSlim Lock { get; } = new ReaderWriterLockSlim();

    public string Id { get; set; }

    public string? Name { get; set; }

    public string? Description { get; set; }

    public Uri? Image { get; set; }

    public int Count { get; set; }
}
