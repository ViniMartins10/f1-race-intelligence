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
- Thirty-two verified licensed portraits are bundled. The 20 drivers in the default British Grand Prix replay all have photos. The number treatment covers other historical entries.
- The project can run without MySQL. Docker and MySQL are covered by the CI configuration and require a Docker environment for the container smoke check.

## Visual refinement

- Added GSAP headline, parallax and scroll sequences to the overview, with a separate reveal for driver profiles. Motion respects system preferences.
- Replaced the concept car with original lofted bodywork, sculpted wings, profiled tyres, suspension and a lit Three.js studio.
- The studio offers three camera angles, manual orbit, zoom and optional auto-rotation, with a static fallback for devices without WebGL.
- Playwright covers the studio controls, mobile sizing, reduced motion and the WebGL fallback.

## Driver data continuity

- Confirmed HTTP 401 from OpenF1 for the Silverstone 2025 roster and season catalog during a live-session restriction. The local API and alternate source remained healthy.
- The gallery and driver profiles use published race results from Jolpica F1 when session drivers are unavailable. The source notice names the event and offers a retry of OpenF1.
- The fallback uses the car number recorded for that race and does not produce OpenF1 session identifiers. Server and browser regression tests exercise the restricted-feed path.
