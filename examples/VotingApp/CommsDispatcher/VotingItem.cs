namespace CommsDispatcher;

public class VotingItem
{
    public VotingItem (int id, string name, string? description = null, Uri? image = null)
    {
        Id = id;
        Name = name;
        Description = description;
        Image = image;
    }

    public int Id { get; set; }

    public string Name { get; set; }

    public string? Description { get; set; }

    public Uri? Image { get; set; }

    public int Count { get; set; }
}
