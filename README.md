# Voyago

AI-powered travel planner. Pick a destination and trip length — Voyago builds a full day-by-day itinerary with meals, activities, costs, and map pins in seconds.

## Features

- **AI itineraries** — Structured day plans (breakfast, activities, lunch, dinner) generated with OpenAI via the Vercel AI SDK
- **Maps & places** — Google Maps pins, place photos, and destination autocomplete
- **Activity swap** — Replace a single stop on a saved trip without regenerating the whole plan
- **Travel preferences** — Signed-in users can add constraints (e.g. vegan, no museums) that shape generation
- **Trip dashboard** — Save trips to your account and revisit them later
- **Rate limiting** — Optional Upstash Redis limits on trip generation

## Tech stack

| Layer         | Choice                                               |
| ------------- | ---------------------------------------------------- |
| Framework     | [Next.js](https://nextjs.org) (App Router)           |
| UI            | React, Tailwind CSS, Radix UI                        |
| Auth          | [better-auth](https://www.better-auth.com)           |
| Database      | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) |
| AI            | [Vercel AI SDK](https://sdk.vercel.ai) + OpenAI      |
| Maps          | Google Maps JavaScript API, Places, Geocoding        |
| Rate limits   | [Upstash Redis](https://upstash.com)                 |
| Lint / format | [Biome](https://biomejs.dev)                         |
| Tests         | [Vitest](https://vitest.dev)                         |

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (e.g. [Neon](https://neon.tech))
- API keys for OpenAI and (optionally) Google Maps and Upstash

### Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable                                              | Required | Purpose                                               |
| ----------------------------------------------------- | -------- | ----------------------------------------------------- |
| `BETTER_AUTH_SECRET`                                  | Yes      | Auth session secret                                   |
| `DATABASE_URL`                                        | Yes      | Postgres connection string                            |
| `OPENAI_API_KEY`                                      | Yes      | Trip generation                                       |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | No       | Rate limit `/api/trips/generate` (unlimited if unset) |
| `GOOGLE_MAPS_SERVER_KEY`                              | No       | Server-side Places / Geocoding (pins & photos)        |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`                 | No       | Maps JS API + Places Autocomplete                     |
| `MAPS_PHOTO_SECRET`                                   | No       | HMAC for the map photo proxy                          |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`                      | No       | Advanced markers / styled maps                        |

Apply migrations, then start the dev server:

```bash
npx drizzle-kit migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `npm run dev`      | Start Next.js in development |
| `npm run build`    | Production build             |
| `npm start`        | Run the production server    |
| `npm test`         | Run tests (watch)            |
| `npm run test:run` | Run tests once               |
| `npm run lint`     | Biome check                  |
| `npm run lint:fix` | Biome check + auto-fix       |
| `npm run format`   | Format with Biome            |

## How it works

1. Enter a **destination** and **duration** on the home page (signed-in users can add preferences).
2. The app calls OpenAI to produce a structured itinerary, then resolves each activity against Google Places for coordinates and photos.
3. Review the plan on a day-by-day view with an interactive map.
4. Sign in to **save** the trip; from a saved trip you can **swap** individual activities.

Guests can generate and preview trips. Saving and preferences require an account.

## Project structure

```
src/
  app/           # Next.js routes (home, auth, trip, dashboard)
  features/      # Domain modules (auth, trips, maps, home-search)
  components/    # Shared UI
  db/            # Drizzle client and schema
drizzle/         # SQL migrations
```

## License

Private — all rights reserved.
