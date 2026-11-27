using System.Runtime.CompilerServices;
using F1RaceIntelligence.Application;
using F1RaceIntelligence.Domain;
using F1RaceIntelligence.Infrastructure;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

public sealed class ReplayHub(IRaceFeed feed) : Hub
{
    public async IAsyncEnumerable<ReplayWindow> StreamWindow(int session, int? driver, DateTimeOffset start,
        DateTimeOffset end, [EnumeratorCancellation] CancellationToken cancellation)
    {
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellation, Context.ConnectionAborted);
        if (end - start > TimeSpan.FromSeconds(120)) throw new HubException("The replay window must be at most 120 seconds.");
        var location = ReadWindow("location");
        var car = driver is not null ? ReadWindow("car_data") : null;
        yield return await location;
        if (car is not null) yield return await car;

        async Task<ReplayWindow> ReadWindow(string stream) =>
            new(stream, start, end, await feed.ReadAsync(stream, new(Session: session,
                Driver: stream == "car_data" ? driver : null, Start: start, End: end), linked.Token));
    }
}

public sealed class ArchiveInitializer(IServiceScopeFactory scopes, ILogger<ArchiveInitializer> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        for (var attempt = 1; !stoppingToken.IsCancellationRequested; attempt++)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ArchiveDb>();
                await db.Database.MigrateAsync(stoppingToken);
                if (!await db.Database.CanConnectAsync(stoppingToken))
                    throw new InvalidOperationException("Archive database connection is unavailable.");
                return;
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogWarning(ex, "Archive initialization attempt {Attempt} failed", attempt);
                await Task.Delay(TimeSpan.FromSeconds(Math.Min(attempt * 2, 30)), stoppingToken);
            }
        }
    }
}
