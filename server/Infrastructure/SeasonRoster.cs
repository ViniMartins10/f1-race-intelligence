using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using F1RaceIntelligence.Domain;
using Microsoft.Extensions.Caching.Memory;

namespace F1RaceIntelligence.Infrastructure;

public sealed record SeasonDriver(string Id, string Code, string FirstName, string LastName, string? Number, string? Nationality);
public sealed record PublishedDriver(int Number, string FirstName, string LastName, string Code, string Team,
    string? Nationality, int? Position, string? Status, string? FastestLap, int? Laps, decimal? Points);
public sealed record PublishedRaceGrid(string RaceName, DateOnly Date, PublishedDriver[] Drivers);

public sealed class SeasonRoster(IHttpClientFactory clients, IMemoryCache cache)
{
    public async Task<SeasonDriver[]> GetAsync(int year, CancellationToken cancellation)
    {
        ValidateYear(year);
        var key = "jolpica:drivers:" + year;
        if (cache.TryGetValue(key, out SeasonDriver[]? existing) && existing is not null) return existing;

        using var client = clients.CreateClient("Jolpica");
        var data = await ReadAsync(client, year + "/drivers.json?limit=100", cancellation);
        var drivers = data.GetProperty("DriverTable").GetProperty("Drivers").EnumerateArray()
            .Select(driver => new SeasonDriver(
                Text(driver, "driverId") ?? "", Text(driver, "code") ?? "",
                Text(driver, "givenName") ?? "", Text(driver, "familyName") ?? "",
                Text(driver, "permanentNumber"), Text(driver, "nationality"))).ToArray();
        cache.Set(key, drivers, new MemoryCacheEntryOptions().SetSize(24_000).SetAbsoluteExpiration(TimeSpan.FromHours(3)));
        return drivers;
    }

    public async Task<PublishedRaceGrid[]> GetRaceGridAsync(int year, DateOnly? date, CancellationToken cancellation)
    {
        ValidateYear(year);
        if (date is { } requestedDate && requestedDate.Year != year)
            throw new FeedException("The race date must be in the selected season.", 400);
        var key = $"jolpica:race-grid:{year}:{date:yyyy-MM-dd}";
        if (cache.TryGetValue(key, out PublishedRaceGrid[]? existing) && existing is not null) return existing;

        using var client = clients.CreateClient("Jolpica");
        var round = "last";
        if (date is { } day)
        {
            var schedule = await ReadAsync(client, year + "/races.json?limit=100", cancellation);
            var race = Races(schedule).FirstOrDefault(row => RaceDate(row) == day);
            if (race.ValueKind == JsonValueKind.Undefined || Integer(race, "round") is not int roundNumber || roundNumber < 1) return [];
            round = roundNumber.ToString(CultureInfo.InvariantCulture);
        }

        var data = await ReadAsync(client, $"{year}/{round}/results.json?limit=100", cancellation);
        var grids = new List<PublishedRaceGrid>();
        foreach (var race in Races(data))
        {
            if (Text(race, "raceName") is not { Length: > 0 } name || RaceDate(race) is not { } raceDate ||
                (date.HasValue && raceDate != date.Value) || !race.TryGetProperty("Results", out var results)) continue;

            var drivers = new List<PublishedDriver>();
            foreach (var result in results.EnumerateArray())
            {
                var number = Integer(result, "number");
                if (number is null or < 1 or > 999 || !result.TryGetProperty("Driver", out var driver) ||
                    !result.TryGetProperty("Constructor", out var team) ||
                    Text(driver, "givenName") is not { Length: > 0 } firstName ||
                    Text(driver, "familyName") is not { Length: > 0 } lastName ||
                    Text(team, "name") is not { Length: > 0 } teamName) continue;

                var fastestLap = result.TryGetProperty("FastestLap", out var fastest) && fastest.TryGetProperty("Time", out var time)
                    ? Text(time, "time") : null;
                var points = decimal.TryParse(Text(result, "points"), NumberStyles.Number, CultureInfo.InvariantCulture, out var score)
                    ? score : (decimal?)null;
                drivers.Add(new PublishedDriver(number.Value, firstName, lastName, Text(driver, "code") ?? "",
                    teamName, Text(driver, "nationality"), Integer(result, "positionText"), Text(result, "status"),
                    fastestLap, Integer(result, "laps"), points));
            }
            if (drivers.Count > 0) grids.Add(new PublishedRaceGrid(name, raceDate, drivers.DistinctBy(driver => driver.Number).ToArray()));
        }

        var rows = grids.ToArray();
        var ttl = rows.Length == 0 ? TimeSpan.FromMinutes(2)
            : year < DateTime.UtcNow.Year || date.HasValue ? TimeSpan.FromHours(3) : TimeSpan.FromMinutes(10);
        cache.Set(key, rows, new MemoryCacheEntryOptions().SetSize(32_000).SetAbsoluteExpiration(ttl));
        return rows;
    }

    private static void ValidateYear(int year)
    {
        if (year < 2023 || year > DateTime.UtcNow.Year)
            throw new FeedException("Select a supported season.", 400);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string path, CancellationToken cancellation)
    {
        using var response = await client.GetAsync(path, cancellation);
        if (!response.IsSuccessStatusCode)
            throw new FeedException("Jolpica F1 data is temporarily unavailable.", 502);
        var document = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellation);
        return document.GetProperty("MRData");
    }

    private static JsonElement.ArrayEnumerator Races(JsonElement data) =>
        data.GetProperty("RaceTable").GetProperty("Races").EnumerateArray();

    private static DateOnly? RaceDate(JsonElement race) =>
        DateOnly.TryParseExact(Text(race, "date"), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date : null;

    private static int? Integer(JsonElement row, string name) =>
        int.TryParse(Text(row, name), NumberStyles.None, CultureInfo.InvariantCulture, out var number) ? number : null;

    private static string? Text(JsonElement row, string name) =>
        row.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}
