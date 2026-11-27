using System.Text.Json;
using F1RaceIntelligence.Domain;

namespace F1RaceIntelligence.Application;

public interface IRaceFeed
{
    Task<JsonElement> ReadAsync(string stream, FeedQuery query, CancellationToken cancellation);
    bool LiveConfigured { get; }
}

public interface IOpenF1Pipeline
{
    Task<JsonElement> ReadAsync(string stream, FeedQuery query, bool immutable, CancellationToken cancellation);
}

public sealed class RaceFeed(IOpenF1Pipeline upstream, bool liveConfigured, TimeProvider clock) : IRaceFeed
{
    private static readonly HashSet<string> Catalog = ["meetings", "sessions"];
    private static readonly HashSet<string> Timed = ["location", "car_data"];
    private static readonly HashSet<string> SessionStreams =
    [
        "drivers", "position", "intervals", "laps", "pit", "stints", "weather", "race_control",
        "team_radio", "starting_grid", "session_result", "overtakes", "location", "car_data",
        "championship_drivers", "championship_teams"
    ];

    public bool LiveConfigured => liveConfigured;

    public async Task<JsonElement> ReadAsync(string stream, FeedQuery query, CancellationToken cancellation)
    {
        if (!Catalog.Contains(stream) && !SessionStreams.Contains(stream))
            throw new FeedException("This data stream is unavailable.", 404);
        if (Catalog.Contains(stream) && query.Year is null && query.Meeting is null && query.Session is null)
            throw new FeedException("A year, meeting or session is required.", 400);
        if (SessionStreams.Contains(stream) && query.Session is null)
            throw new FeedException("A session is required.", 400);
        if (query.Year is < 2023 || query.Year > clock.GetUtcNow().Year + 1 ||
            query.Session is <= 0 || query.Meeting is <= 0 || query.Driver is < 1 or > 999)
            throw new FeedException("A filter is outside the supported range.", 400);
        if (Timed.Contains(stream) && (query.Start is null || query.End is null ||
            query.End <= query.Start || query.End - query.Start > TimeSpan.FromMinutes(5)))
            throw new FeedException("Use a time window of up to five minutes.", 400);
        if (stream == "car_data" && query.Driver is null)
            throw new FeedException("Select a driver for telemetry.", 400);

        var immutable = false;
        if (SessionStreams.Contains(stream))
        {
            var sessions = await upstream.ReadAsync("sessions", new FeedQuery(Session: query.Session), false, cancellation);
            if (sessions.GetArrayLength() == 0) return sessions;
            var session = sessions[0];
            if (session.TryGetProperty("date_end", out var end) && end.TryGetDateTimeOffset(out var endsAt))
            {
                var now = clock.GetUtcNow();
                immutable = endsAt < now.AddHours(-24);
                if (endsAt > now && !LiveConfigured)
                    throw new FeedException("Live timing requires an authenticated OpenF1 subscription.", 403);
            }
        }

        return await upstream.ReadAsync(stream, query, immutable, cancellation);
    }
}
