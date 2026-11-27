namespace F1RaceIntelligence.Domain;

public sealed record FeedQuery(
    int? Year = null, int? Meeting = null, int? Session = null, int? Driver = null,
    DateTimeOffset? Start = null, DateTimeOffset? End = null);

public sealed record ReplayWindow(string Stream, DateTimeOffset Start, DateTimeOffset End,
    System.Text.Json.JsonElement Rows);

public sealed class FeedException(string message, int status) : Exception(message)
{
    public int Status { get; } = status;
}
