using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using F1RaceIntelligence.Application;
using F1RaceIntelligence.Domain;
using F1RaceIntelligence.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace F1RaceIntelligence.Tests;

public sealed class FeedTests
{
    [Theory]
    [InlineData("car_data", 400)]
    [InlineData("location", 400)]
    [InlineData("../invalid", 404)]
    public async Task RejectsInvalidQueries(string stream, int status)
    {
        var source = new TestSource();
        var feed = new RaceFeed(source, false, TimeProvider.System);
        var answer = await Assert.ThrowsAsync<FeedException>(() =>
            feed.ReadAsync(stream, new FeedQuery(Session: 123), default));
        Assert.Equal(status, answer.Status);
        Assert.Equal(0, source.Requests);
    }

    [Fact]
    public async Task CachesOnlyCompletedHistoricalSessions()
    {
        var source = new TestSource();
        var feed = new RaceFeed(source, false, TimeProvider.System);
        await feed.ReadAsync("drivers", new FeedQuery(Session: 123), default);
        Assert.True(source.LastImmutable);
        Assert.Equal(2, source.Requests);
    }

    [Fact]
    public void UsesValidatedOpenF1TimeFilters()
    {
        var start = DateTimeOffset.Parse("2025-07-06T14:00:00Z");
        var query = OpenF1.BuildQuery("location", new FeedQuery(Session: 123, Driver: 4, Start: start, End: start.AddMinutes(1)));
        Assert.Equal("location?session_key=123&driver_number=4&date>2025-07-06T13%3A59%3A59.999Z&date<2025-07-06T14%3A01%3A00.000Z", query);
    }

    [Fact]
    public async Task ApiReturnsDataAndProblemDetails()
    {
        await using var app = new ApiFactory();
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
        var response = await client.GetAsync("/api/feed/drivers?session=123");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("TEST DRIVER", await response.Content.ReadAsStringAsync());
        var invalid = await client.GetAsync("/api/feed/car_data?session=123&driver=4");
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal("application/problem+json", invalid.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task PublishedGridUsesRaceNumbersWhenTimingAccessIsRestricted()
    {
        await using var app = new ApiFactory(restrictOpenF1: true);
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/api/feed/sessions?year=2025")).StatusCode);

        var grids = await client.GetFromJsonAsync<PublishedRaceGrid[]>("/api/feed/race_grid?year=2025&date=2025-07-06");
        var grid = Assert.Single(grids!);
        Assert.Equal("British Grand Prix", grid.RaceName);
        Assert.Equal(new DateOnly(2025, 7, 6), grid.Date);
        var driver = Assert.Single(grid.Drivers);
        Assert.Equal(4, driver.Number);
        Assert.Equal("McLaren", driver.Team);
        Assert.Equal("British", driver.Nationality);
        Assert.Equal(1, driver.Position);
    }

    private sealed class ApiFactory(bool restrictOpenF1 = false) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder) =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IOpenF1Pipeline>();
                services.AddSingleton<IOpenF1Pipeline>(new TestSource(restrictOpenF1));
                if (restrictOpenF1) services.AddHttpClient("Jolpica").ConfigurePrimaryHttpMessageHandler(() => new JolpicaFixture());
            });
    }

    private sealed class TestSource(bool restricted = false) : IOpenF1Pipeline
    {
        public int Requests { get; private set; }
        public bool LastImmutable { get; private set; }
        public Task<JsonElement> ReadAsync(string stream, FeedQuery query, bool immutable, CancellationToken cancellation)
        {
            Requests++;
            LastImmutable = immutable;
            if (restricted) throw new FeedException("OpenF1 access is restricted.", 503);
            var fixture = stream == "sessions"
                ? """[{"session_key":123,"date_end":"2025-07-06T16:00:00Z"}]"""
                : """[{"driver_number":4,"full_name":"TEST DRIVER"}]""";
            return Task.FromResult(JsonSerializer.Deserialize<JsonElement>(fixture));
        }
    }

    private sealed class JolpicaFixture : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var json = request.RequestUri?.AbsolutePath switch
            {
                "/ergast/f1/2025/races.json" =>
                    """{"MRData":{"RaceTable":{"Races":[{"round":"11","date":"2025-06-29"},{"round":"12","date":"2025-07-06"}]}}}""",
                "/ergast/f1/2025/12/results.json" =>
                    """
                    {"MRData":{"RaceTable":{"Races":[{"date":"2025-07-06","raceName":"British Grand Prix","Results":[
                      {"number":"4","positionText":"1","laps":"52","points":"25","status":"Finished",
                       "Driver":{"permanentNumber":"1","givenName":"Lando","familyName":"Norris","code":"NOR","nationality":"British"},
                       "Constructor":{"name":"McLaren"}}
                    ]}]}}}
                    """,
                _ => null,
            };
            return Task.FromResult(json is null ? new HttpResponseMessage(HttpStatusCode.NotFound)
                : new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
        }
    }
}
