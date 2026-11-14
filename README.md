# SpaceApp / Launch Lab — Deployable 3D Survival Simulation Starter

A full-stack Next.js application for an educational Moon/Mars outpost survival game. The package includes a browser-rendered 3D outpost, click-to-walk movement, 15 interactive equipment stations, a deterministic fixed-minute simulation engine, incident-response choices, mission telemetry, server API routes, PostgreSQL persistence, and Docker deployment files.

> **Project status:** deployable starter / vertical-slice prototype. It is not a completed scientific spacecraft simulator and is not suitable for real mission planning, crew health decisions, or engineering design.

## Included

- Astronaut selection using the eight supplied character reference illustrations.
- Player-created call sign and three selected supporting crew members.
- Supporting crew patrol the outpost while idle. Select a crew member, choose an equipment station, then run one of its existing actions to assign the job and send them to that station.
- Moon and Mars scenario selection.
- A stylized 3D exterior outpost scene with habitat, command centre, air/water systems, greenhouse, airlock, solar field, communications mast, rover, battery bank, storm shelter, food store and maintenance area.
- Click-to-walk movement: click terrain or an equipment/building destination to send the selected astronaut there. Orbit camera controls are also available. The current scene is a playable 3D vertical slice; fully walkable indoor room interiors, door/airlock state transitions, collision-aware navigation and rover driving are not yet complete.
- Fifteen equipment objects with action definitions, duration, requirements, failure conditions and modeled consequences.
- Twenty-one daily mission objectives across the seven-day campaign (three unique, actionable objectives per day), with per-day progress and an overall completion count.
- Separate Moon and Mars objective schedules link to NASA's lunar polar imagery and dust research, Mars Trek, MOXIE results, and InSight's dust-storm power record.
- Mission HUD for kW, kWh, oxygen inventory, O₂/CO₂ partial pressure, potable water, wastewater, food and shelter readiness.
- Five-option incident-response events when model conditions trigger an alert. Mars mode schedules a Day 1 dust-training incident; this is an authored lesson, not a forecast.
- A five-choice space-weather challenge built from a recent NASA DONKI solar-flare event. Its single best response distinguishes flare classification from crew dose and points to radiation monitoring and approved mission procedures.
- MIRA's local, state-aware hint logic behind a transparent mascot icon; click to open the draggable assistant window (no AI service/API key required for this starter).
- Fixed minute tick, 1x/3x/pause controls, deterministic calculations and seeded water-check event logic.
- Each mission day remains 24 simulated hours; Normal speed runs five simulated minutes per real second (about 4m 48s per day), Fast speed runs three times faster, and an optional advance-to-next-day control simulates forward while still stopping for incidents.
- Standard, Challenging and Expert mission difficulty settings. Higher difficulties use lower starting gameplay reserves, reduced illustrative solar output and faster modeled equipment wear; NASA reference metabolism rates remain unchanged.
- Mission API routes and PostgreSQL save/load.
- Dockerfile and Docker Compose setup.

## Important model boundaries

### NASA-derived reference parameters

The science registry stores these BVAD Revision 2 references:

- Oxygen consumption: 0.90 kg per reference crewmember per day.
- CO₂ generation: 1.08 kg per reference crewmember per day.
- Early planetary-base total water use: 4.48 kg per reference crewmember per day.

Source: https://ntrs.nasa.gov/citations/20210024855

These are reference design assumptions, not universal Moon/Mars survival limits.

Planet-specific mission objectives use NASA mission results and data portals as educational context. The linked observations are historical or architectural references, not live local conditions: for example, ShadowCam identifies permanently shadowed lunar terrain as a possible volatile prospecting target, MOXIE demonstrated oxygen production but did not provide crew-scale life support, and InSight's recorded dust-storm power drop is one historical event rather than a Mars forecast.

### Explicit gameplay assumptions

The following are scenario settings, not NASA-certified values: starting inventory, cabin volume and temperature, battery capacity, array ratings, electrical loads, equipment generation/removal throughput, water processing throughput, food mass use, lighting/dust environmental profiles, equipment wear, action durations, warning triggers, and game-over boundaries.

Difficulty settings modify only those gameplay assumptions. Standard preserves the original starting balance; Challenging and Expert reduce starting stores, solar output and system condition, and shorten the modeled maintenance interval. They do not change the NASA-derived crew consumption references.

The application calculates oxygen and CO₂ partial pressures from inventory using an ideal-gas calculation and the configured cabin volume and temperature. It does **not** calculate total cabin pressure because inert-gas inventory and a complete atmosphere model are not included.

The game-over boundaries are deliberately labelled training-only. They are not medical thresholds, human-rating limits, or NASA safety requirements.

The water recovery model does not claim that ISS recovery performance is guaranteed on the Moon or Mars. Processed water is held in a quarantined inventory until a simplified quality gate passes.

The Moon illumination and Mars dust factors are deterministic illustrative profiles, not live Moon Trek data, ephemeris calculations or a live Mars weather feed. The space-weather challenge reads recent solar-flare records from the current DONKI endpoint, but it does not calculate radiation exposure or make operational forecasts. DONKI describes its real-time research products as prototyping-quality; NOAA's Space Weather Prediction Center is the official U.S. forecast source. RadLab provides a reference archive of radiation measurements, not live crew dosimetry. Real crews must follow their mission's approved radiation-monitoring and response procedures.

## Requirements

- Node.js 20.9 or newer for local development. Node.js 26 LTS is the Docker base image.
- Docker Engine and Docker Compose for the one-command container deployment.
- A PostgreSQL database for durable production mission saves.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Without `DATABASE_URL`, development uses an in-memory store. Mission saves will not survive a server restart in this mode.

For durable local saves, start PostgreSQL and set `DATABASE_URL` in `.env`. The sample `.env` intentionally leaves it unset so a plain `npm run dev` uses the in-memory development store.

## Run with Docker Compose

```bash
# Copy the sample environment and replace POSTGRES_PASSWORD with a long URL-safe random hex value.
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000.

The application container waits for PostgreSQL health before starting. The API creates the small `mission_saves` table on first access. The database is stored in the named `launchlab-db` volume.

Health endpoint:

```text
GET /api/health
```

Expected production response includes `database.mode: "postgres"` and `connected: true`.

## Deploy to Vercel (recommended for this Next.js app)

Vercel detects Next.js automatically. The project uses native Next.js deployment output on Vercel and keeps standalone output for Docker builds.

1. Push the project folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository, and keep the detected **Next.js** framework settings.
3. In the Vercel Marketplace, add a PostgreSQL integration. Neon is a supported option and can provision a database from the Vercel dashboard.
4. Connect the database to this Vercel project and make sure `DATABASE_URL` is the provider's pooled connection string (not an unpooled/direct connection string) for serverless use.
5. Ensure `DATABASE_URL` is available in **Production** and **Preview** as appropriate. The project creates its `mission_saves` table on the first health check / database request.
6. Deploy. Then open `https://YOUR-PROJECT.vercel.app/api/health`. A successful production response should report `database.mode: "postgres"` and `connected: true`.
7. Test creating, saving, reloading, and updating a mission before sharing the URL.

Vercel settings should normally be left at their automatic Next.js defaults:

- Framework Preset: Next.js
- Build Command: `npm run build` (auto-detected)
- Output Directory: default / auto-detected
- Install Command: `npm install` (auto-detected)
- Node.js runtime: Node.js; API routes explicitly use `runtime = "nodejs"` because they use `pg`.

The database pool is configured for Vercel Fluid Compute using `attachDatabasePool`. Keep the pooled database URL secret and never prefix it with `NEXT_PUBLIC_`.

### Production security warning

This starter does not yet implement user authentication, mission ownership checks, rate limiting, or student privacy controls. Mission IDs are UUIDs, but UUID secrecy is not an authorization system: anyone who obtains a mission ID can currently read and change that mission through the API. Treat the first Vercel deployment as a public prototype/demo, and add authentication, authorization, abuse protection, and privacy controls before using it with real students or sensitive player data.

Do not use the in-memory development store in production. The production server returns an error when `DATABASE_URL` is missing.

## Deploy to a Docker-capable host

1. Create a web service from this repository using the included `Dockerfile`.
2. Provision a managed PostgreSQL database.
3. Set `DATABASE_URL` to the provider's private connection string.
4. If the provider requires TLS, use its recommended `sslmode=require` connection string or set `PGSSL=true` where appropriate.
5. Set the health-check path to `/api/health`.
6. Expose HTTP port `3000`.
7. Deploy and verify `/api/health` before sharing the app.

### Hosting notes

- Vercel: import as a standard Next.js project; do not select Docker.
- Render / Railway / Fly.io / Hostinger VPS: deploy the Dockerfile and attach PostgreSQL. Use the host's private/internal database URL when available.
- A static-only hosting plan is not suitable: this app requires server routes and PostgreSQL.

## API

### Create a mission

`POST /api/missions`

```json
{
  "planet": "MOON",
  "playerName": "Cadet",
  "playerCharacterId": "user-magenta",
  "supportCrewIds": ["sofia", "christopher", "jewel"]
}
```

### Load a mission

`GET /api/missions/{missionId}`

### Execute a command

`POST /api/missions/{missionId}/command`

```json
{ "command": { "type": "ADVANCE", "minutes": 1 } }
```

Supported commands include `ADVANCE`, `SET_SPEED`, `TOGGLE_SYSTEM`, `DECIDE`, `INTERACT` and `OPERATE`.

### Load the NASA space-weather challenge

`GET /api/challenges/space-weather` retrieves recent solar-flare records from the public CCMC DONKI API, caches the response for 15 minutes, and creates a five-option training question with exactly one best response. This endpoint requires no API key.

## Tests

```bash
npm run typecheck
npm test
npm run build
```

The repository includes unit tests for resource calculations, deterministic replay, power balance, gas inventory separation, the Day 1 Mars dust lesson and the equipment catalog.

## Character assets and 3D status

The supplied PNG illustrations are included under `public/assets/characters/` and used for selection/crew reference cards and in-world head portraits. The in-world crew bodies are procedural low-poly geometry with character-specific accent colours and are not rigged 3D models. Exact face, hair, suit and accessories matching the references requires creating and validating rigged GLB/GLTF assets, which are not included in this package.

Some source images have opaque backgrounds baked into the pixels. The application uses a CSS blend treatment on known opaque previews; it does not destructively overwrite the originals or claim that those files have been perfectly background-removed.

## Security and production readiness

This is a deployable prototype, not a finished public classroom platform. The starter does not include user accounts, per-user mission authorization, rate limiting, an admin panel, or student privacy controls. Mission IDs are UUIDs, but UUID secrecy is not a substitute for authentication. Add authentication and ownership checks before allowing public, multi-user or student use.

The DONKI challenge uses a server-side cached request to CCMC's public API and does not expose a key to the browser. `NASA_API_KEY` and `OPENAI_API_KEY` remain reserved for future integrations; no OpenAI chat/voice integration is active. Never put keys in `NEXT_PUBLIC_*` variables or browser code.

## Main folders

```text
src/
  app/
    api/health/                  Health endpoint
    api/challenges/              Live DONKI space-weather challenge
    api/missions/                Mission create/load/command routes
  components/
    GameApp.tsx                  Setup, HUD, mission and interaction UI
    WorldCanvas.tsx              3D outpost and player movement
  lib/
    simulation/
      engine.ts                  Pure fixed-step simulation logic
      science.ts                 Versioned NASA references and game assumptions
      equipment.ts               Fifteen physical equipment interaction specs
      types.ts                   Typed mission and command contracts
    server/
      db.ts                      PostgreSQL persistence
      donki.ts                   DONKI response validation and challenge builder
public/assets/                   Supplied Launch Lab images
 tests/                          Simulation unit tests
```

## Next production milestones

1. Replace procedural crew shapes with rigged, reference-matched GLB character models.
2. Add collision-aware room navigation, interior room geometry, true door/airlock states and animated rover driving.
3. Replace training environment profiles with source-backed Moon Trek illumination/time-series and validated Mars environmental data.
4. Add RadLab measurement ingestion and connect its historical readings to future lessons; retain source timestamps and provenance for every NASA feed.
5. Validate oxygen/water/food/equipment subsystem equations against mission-specific design sources.
6. Add authentication, player ownership, audit trail, rate limiting and classroom privacy safeguards.
7. Add MIRA's secure, server-side AI and optional voice integration, grounded in current mission telemetry and source registry.
8. Produce rigged 3D animation assets from the supplied character designs.
