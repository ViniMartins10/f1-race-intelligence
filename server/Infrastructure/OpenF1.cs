using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using F1RaceIntelligence.Application;
using F1RaceIntelligence.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace F1RaceIntelligence.Infrastructure;

public sealed class OpenF1(IHttpClientFactory clients, IMemoryCache cache, IServiceScopeFactory scopes,
    ILogger<OpenF1> logger) : IOpenF1Pipeline, IDisposable
{
    private readonly TokenBucketRateLimiter quota = new(new()
    {
        TokenLimit = 6, TokensPerPeriod = 1, ReplenishmentPeriod = TimeSpan.FromMilliseconds(1120),
        QueueLimit = 75, QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        AutoReplenishment = true
    });
    private readonly SemaphoreSlim concurrent = new(6);
    private readonly ConcurrentDictionary<string, Lazy<Task<JsonElement>>> pending = new();
    private static readonly JsonElement Empty = JsonSerializer.SerializeToElement(Array.Empty<object>());

    public async Task<JsonElement> ReadAsync(string stream, FeedQuery query, bool immutable, CancellationToken cancellation)
    {
        var url = BuildQuery(stream, query);
        if (cache.TryGetValue(url, out JsonElement cached)) return cached;

        var request = pending.GetOrAdd(url, _ => new Lazy<Task<JsonElement>>(() => FetchAndStoreAsync(url, immutable)));
        var task = request.Value;
        _ = task.ContinueWith(_ => pending.TryRemove(new KeyValuePair<string, Lazy<Task<JsonElement>>>(url, request)),
            CancellationToken.None, TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default);
        return await task.WaitAsync(cancellation);
    }

    public static string BuildQuery(string stream, FeedQuery query)
    {
        var filters = new List<string>();
        foreach (var (name, value) in new[] { ("year", query.Year), ("meeting_key", query.Meeting), ("session_key", query.Session), ("driver_number", query.Driver) })
            if (value is int number) filters.Add(name + "=" + number.ToString(CultureInfo.InvariantCulture));

        if (query.Start is { } start) filters.Add(Bound(">", start.AddMilliseconds(-1)));
        if (query.End is { } end) filters.Add(Bound("<", end));
        return stream + "?" + string.Join("&", filters);
    }

    private static string Bound(string comparison, DateTimeOffset value) =>
        "date" + comparison + Uri.EscapeDataString(value.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture));

    private async Task<JsonElement> FetchAndStoreAsync(string url, bool immutable)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(95));
        using var scope = scopes.CreateScope();
        var db = immutable ? scope.ServiceProvider.GetService<ArchiveDb>() : null;
        var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(url)));
        if (db is not null)
        {
            try
            {
                var archive = await db.Responses.AsNoTracking().SingleOrDefaultAsync(row => row.CacheKey == key, timeout.Token);
                if (archive is not null) return UseCache(url, JsonSerializer.Deserialize<JsonElement>(archive.Payload), true);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Archive read failed for {Stream}", url.Split('?')[0]);
            }
        }

        var rows = await FetchAsync(url, timeout.Token);
        UseCache(url, rows, immutable);
        if (db is not null && rows.GetArrayLength() > 0)
        {
            try
            {
                await db.Database.ExecuteSqlInterpolatedAsync(
                    $"INSERT IGNORE INTO Responses (CacheKey, Payload, StoredUtc) VALUES ({key}, {rows.GetRawText()}, {DateTime.UtcNow})", timeout.Token);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Archive write failed for {Stream}", url.Split('?')[0]);
            }
        }

        return rows;
    }

    private JsonElement UseCache(string key, JsonElement rows, bool immutable)
    {
        cache.Set(key, rows, new MemoryCacheEntryOptions()
            .SetSize(Math.Max(1, rows.GetRawText().Length * 2L))
            .SetAbsoluteExpiration(immutable && rows.GetArrayLength() > 0 ? TimeSpan.FromHours(2) : TimeSpan.FromMinutes(4)));
        return rows;
    }

    private async Task<JsonElement> FetchAsync(string url, CancellationToken cancellation)
    {
        using var client = clients.CreateClient("OpenF1");
        for (var attempt = 0; ; attempt++)
        {
            using var permit = await quota.AcquireAsync(1, cancellation);
            if (!permit.IsAcquired) throw new FeedException("The timing service is busy. Try again shortly.", 429);
            TimeSpan? retryAfter = null;
            await concurrent.WaitAsync(cancellation);
            try
            {
                using var response = await client.GetAsync(url, cancellation);
                if (response.StatusCode == HttpStatusCode.NotFound) return Empty;
                if (response.IsSuccessStatusCode)
                {
                    await using var stream = await response.Content.ReadAsStreamAsync(cancellation);
                    using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellation);
                    if (document.RootElement.ValueKind != JsonValueKind.Array)
                        throw new FeedException("OpenF1 sent an unexpected response.", 502);
                    var seen = new HashSet<string>();
                    var unique = document.RootElement.EnumerateArray().Where(row => seen.Add(row.GetRawText()));
                    return JsonSerializer.SerializeToElement(unique);
                }

                if (response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized)
                    throw new FeedException("OpenF1 access is temporarily restricted. Please try again later.", 503);
                if (attempt >= 2 || ((int)response.StatusCode < 500 && response.StatusCode != HttpStatusCode.TooManyRequests))
                    throw new FeedException("This timing feed is temporarily unavailable.", 502);
                retryAfter = response.Headers.RetryAfter?.Delta;
            }
            catch (HttpRequestException) when (attempt < 2) { }
            catch (HttpRequestException ex)
            {
                logger.LogWarning(ex, "OpenF1 request failed for {Stream}", url.Split('?')[0]);
                throw new FeedException("Could not connect to OpenF1.", 502);
            }
            finally { concurrent.Release(); }

            var delay = retryAfter ?? TimeSpan.FromMilliseconds(500 * Math.Pow(2, attempt));
            await Task.Delay(delay > TimeSpan.FromSeconds(25) ? TimeSpan.FromSeconds(25) : delay, cancellation);
        }
    }

    public void Dispose()
    {
        quota.Dispose();
        concurrent.Dispose();
    }
}
