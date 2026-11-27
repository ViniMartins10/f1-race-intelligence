# Development guidance

- Work from this directory. Follow SPEC.md and record meaningful milestones and validation in PROGRESS.md.
- Keep the site interface in English. Keep the motorsport visual identity consistent across desktop and mobile.
- Treat OpenF1 timestamps as UTC. Keep one playback clock per browser view and derive all replay readings from it.
- Use OpenF1 for telemetry and timing. Document the provenance of any supplemental dataset. Keep mock feeds in tests only and show missing values explicitly.
- Keep external data fetching, rate limits, caching and authentication on the ASP.NET Core server. Keep credentials in environment variables or the host secret store.
- Bound high-volume requests by session, time window and driver as appropriate. Keep archived envelopes immutable and preserve the source timestamp.
- Use only images with confirmed permission and keep attribution metadata with each photo. Keep custom artwork original and give all Three.js views a WebGL fallback.
- Respect reduced motion, keyboard navigation and mobile screens. Keep real-time replay calculations labeled as estimates where applicable.
- Run the TypeScript/Vite build, .NET tests and Playwright for relevant changes. Exercise production integrations against the real API when the source is available.
- Keep public deployment on the free plan unless the project owner approves cost.
