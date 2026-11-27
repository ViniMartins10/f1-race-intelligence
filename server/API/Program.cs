using System.Net.Http.Headers;
using System.Threading.RateLimiting;
using F1RaceIntelligence.Application;
using F1RaceIntelligence.Domain;
using F1RaceIntelligence.Infrastructure;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((_, configuration) => configuration.WriteTo.Console());
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddHealthChecks();
builder.Services.AddMemoryCache(options => options.SizeLimit = 65 * 1024 * 1024);
builder.Services.AddSingleton<SeasonRoster>();
builder.Services.AddHttpClient("Jolpica", client =>
{
    client.BaseAddress = new Uri("https://api.jolpi.ca/ergast/f1/");
    client.Timeout = TimeSpan.FromSeconds(12);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("F1RaceIntelligence/1.0");
});

var token = builder.Configuration["OpenF1:AccessToken"];
builder.Services.AddHttpClient("OpenF1", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["OpenF1:BaseUrl"] ?? "https://api.openf1.org/v1/");
    client.Timeout = TimeSpan.FromSeconds(22);
    if (!string.IsNullOrWhiteSpace(token)) client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
});

var archive = builder.Configuration.GetConnectionString("Archive");
if (!string.IsNullOrWhiteSpace(archive))
{
    builder.Services.AddDbContext<ArchiveDb>(options =>
        options.UseMySql(archive, new MySqlServerVersion(new Version(8, 0, 36))));
    builder.Services.AddHostedService<ArchiveInitializer>();
}

builder.Services.AddSingleton<IOpenF1Pipeline, OpenF1>();
builder.Services.AddSingleton<IRaceFeed>(services =>
    new RaceFeed(services.GetRequiredService<IOpenF1Pipeline>(), !string.IsNullOrWhiteSpace(token), TimeProvider.System));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("feed", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 180, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var status = error switch { FeedException feed => feed.Status, OperationCanceledException => 504, _ => 500 };
    var message = error is FeedException problem ? problem.Message : "The data service is temporarily unavailable.";
    await Results.Problem(title: message, statusCode: status).ExecuteAsync(context);
}));
app.UseSerilogRequestLogging();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseSwagger();
app.UseSwaggerUI();
app.MapHealthChecks("/health");
app.MapGet("/api/status", (IRaceFeed feed) => new { source = "OpenF1", liveConfigured = feed.LiveConfigured });
app.MapGet("/api/feed/season_drivers", async (int year, SeasonRoster roster, CancellationToken cancellation) =>
    Results.Json(await roster.GetAsync(year, cancellation))).RequireRateLimiting("feed");
app.MapGet("/api/feed/race_grid", async (int year, DateOnly? date, SeasonRoster roster, CancellationToken cancellation) =>
    Results.Json(await roster.GetRaceGridAsync(year, date, cancellation))).RequireRateLimiting("feed");
app.MapGet("/api/feed/{stream}", async (string stream, int? year, int? meeting, int? session, int? driver,
        DateTimeOffset? start, DateTimeOffset? end, IRaceFeed feed, CancellationToken cancellation) =>
    Results.Json(await feed.ReadAsync(stream, new(year, meeting, session, driver, start, end), cancellation)))
    .RequireRateLimiting("feed");
app.MapHub<ReplayHub>("/hubs/replay");
var staticIndex = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "index.html");
if (File.Exists(staticIndex)) app.MapFallbackToFile("index.html");
app.Run();

public partial class Program;
