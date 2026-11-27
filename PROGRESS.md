# Milestones

| Milestone | Status |
| --- | --- |
| Guide, design reference, API and environment | Requirements tracked in SPEC.md. Original motorsport visual direction selected. |
| React shell, hero and licensed driver imagery | Implemented. Portrait coverage depends on verified source licenses. |
| ASP.NET API, OpenF1 integration and archive | Implemented with shared cache, request quota, SignalR windows and optional MySQL. |
| Race Control, track, telemetry and historical clock | Implemented. Verified with the 2025 British Grand Prix replay. |
| Calendar, comparisons and radio | Implemented with upstream coverage and empty states. |
| Automated verification and hosting | CI, Docker Compose and free Render Blueprint prepared. The public deployment requires a signed-in Render workspace. |

## Validation log

- OpenF1 documentation and current response formats reviewed.
- Anonymous historical access returned HTTP 401 during one practice window and subsequently returned HTTP 200 for historical catalog queries.
- The real Silverstone archive returned 20 drivers and 222 telemetry samples for Lando Norris in a one-minute test window.
- The .NET Release suite passed all six unit and integration cases. The Playwright suite against OpenF1 passed all three browser cases covering portraits, driver navigation, replay and telemetry, and mobile navigation.
- Captured and reviewed desktop, mobile, Race Control and telemetry screenshots in docs/screenshots.
- Eleven verified licensed portraits are bundled. Other drivers use a team-colored number treatment.
- The project can run without MySQL. Docker and MySQL are covered by the CI configuration and require a Docker environment for the container smoke check.
