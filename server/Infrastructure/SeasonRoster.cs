using System.Net.Http.Json;
using System.Text.Json;
using F1RaceIntelligence.Domain;
using Microsoft.Extensions.Caching.Memory;

namespace F1RaceIntelligence.Infrastructure;

public sealed record SeasonDriver(string Id, string Code, string FirstName, string LastName, string? Number, string? Nationality);

public sealed class SeasonRoster(IHttpClientFactory clients, IMemoryCache cache)
{
    public async Task<SeasonDriver[]> GetAsync(int year, CancellationToken cancellation)
    {
        if (year < 2023 || year > DateTime.UtcNow.Year)
            throw new FeedException("Select a supported season.", 400);
        var key = "jolpica:drivers:" + year;
        if (cache.TryGetValue(key, out SeasonDriver[]? existing) && existing is not null) return existing;

        using var client = clients.CreateClient("Jolpica");
        using var response = await client.GetAsync(year + "/drivers.json?limit=100", cancellation);
        if (!response.IsSuccessStatusCode)
            throw new FeedException("Supplementary season entries are temporarily unavailable.", 502);
        var document = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellation);
        var drivers = document.GetProperty("MRData").GetProperty("DriverTable").GetProperty("Drivers").EnumerateArray()
            .Select(driver => new SeasonDriver(Property(driver, "driverId"), Property(driver, "code"), Property(driver, "givenName"), Property(driver, "familyName"), Property(driver, "permanentNumber"), Property(driver, "nationality"))).ToArray();
        cache.Set(key, drivers, new MemoryCacheEntryOptions().SetSize(24_000).SetAbsoluteExpiration(TimeSpan.FromHours(3)));
        return drivers;

        static string Property(JsonElement driver, string name) =>
            driver.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
    }
}
