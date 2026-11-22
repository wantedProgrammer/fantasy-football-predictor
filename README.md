# Fantasy Predictor

Fantasy Predictor picks the best Fantasy Premier League (FPL) and UEFA Champions League Fantasy teams for every gameweek. It also gives analytics and tips built from the official fantasy APIs.

For each upcoming gameweek it:

- projects expected points for every player
- builds the highest-scoring legal 15-player squad, starting XI and captain
- lists captain picks, differentials, value picks, injury news, transfer trends and a fixture-difficulty ticker
- writes tips based on that week's data

---

## Features

### Best XI (`/team`)

- Optimal squad for any upcoming gameweek in either competition, shown on a pitch.
- **Plan for** sets how far ahead to plan: 1 gameweek (like a Free Hit), 3 gameweeks, or 5 gameweeks (like a Wildcard).
- Follows the game rules: £/€100m budget, 2 GK / 5 DEF / 5 MID / 3 FWD, at most 3 players per club, and legal formations (1 GK, 3–5 DEF, 2–5 MID, 1–3 FWD).
- Captain and vice-captain, bench order, squad cost and money left in the bank.
- Click any player to see why they were picked: fixture, form, xGI, clean-sheet chance and availability.

### Insights (`/insights`)

- Generated tips: deadline, captain, double and blank gameweeks, best and worst fixture runs, injuries, differentials, value picks and transfer trends.
- Captain shortlist with projected points.
- Differentials (under 10% owned), best value (points per million), in-form players.
- Injury and availability watch for popular players.
- Most transferred in and out this round.
- Fixture ticker for the next 5 gameweeks, colour-coded by difficulty.

### Players (`/players`)

- Every player with price, projected points for the next gameweek, total points, form, ownership and injury news.
- Search, filter by team and position, sort by projection, points, form, value or price, and shuffle.
- Select a favourite player, shown on the Profile page.

### Accounts

- Register and log in with a mobile number and password. Passwords are hashed with bcrypt and sessions use a JWT that lasts one hour.
- Every data query requires a valid bearer token.

---

## How the predictions work

### Projection model (`backend/src/Predictor/projection.ts`)

For each fixture, a player's expected points combine two views of the data:

1. **Event model:** 2 points for an appearance, plus expected goal and assist points. These use xG and xA per 90 minutes when FPL provides them, and goals and assists adjusted for small samples otherwise. The total is scaled by how many goals the opponent concedes and by home advantage. Clean-sheet points use a Poisson estimate of goals conceded. Goalkeepers also get save points, and every player gets their average bonus.
2. **Track-record model:** points per appearance blended with recent form, then scaled by fixture difficulty (1–5).

The result is multiplied by the chance the player is available (from injury and suspension status) and the chance they start (starts or minutes compared with their team's games played). Double gameweeks add up both fixtures, and blank gameweeks score zero.

Team attack and defence ratings come from finished results and are pulled towards the league average, so a handful of games doesn't dominate. For the next FPL gameweek, 20% of the projection comes from FPL's own `ep_next` figure.

### Squad optimiser (`backend/src/Predictor/optimizer.ts`)

The optimiser runs a local search from two starting squads: the cheapest legal squad, and a greedy squad that keeps enough budget to fill every slot. It repeatedly makes the best single-player swap. When no single swap helps, it tries two-player swaps, so a downgrade can pay for an upgrade elsewhere. The score is the best XI's points with the captain counted twice, plus 10% of the bench's points. The best formation is chosen for each squad.

These are statistical estimates, not guarantees. Team news, rotation and luck still matter.

---

## Technologies

**Backend:** TypeScript, Node.js, NestJS, GraphQL (Apollo Server, code-first), TypeORM, SQLite (better-sqlite3), Passport JWT, bcrypt, Axios, class-validator.

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Apollo Client, React Router.

---

## Data sources

| Competition | Endpoints |
| --- | --- |
| Premier League | `https://fantasy.premierleague.com/api/bootstrap-static/` and `/api/fixtures/` |
| Champions League | `https://gaming.uefa.com/en/uclfantasy/services/feeds/fixtures/fixtures_{season}_en.json` and `.../players/players_{season}_en_{matchday}.json` |

- API responses are cached in memory for 10 minutes.
- UEFA numbers each season (80 = 2025/26, 90 = 2026/27). The backend picks the newest season with a published fixture feed, so it keeps working when a new season starts. Set `UCL_SEASON_ID` to force a particular season.
- The UEFA feeds are not documented public APIs, so their format or availability may change.

---

## Requirements

- Node.js **20.19+ or 22.12+** (Vite 8 needs this; Node 24 works)
- npm

## Installation and running

```bash
# Backend: http://localhost:4000/graphql
cd backend
npm ci
npm run start

# Frontend: http://localhost:5173 (in a second terminal)
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173, register an account, and log in with your mobile number and password. You'll land on the Best XI page.

### Configuration (optional)

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | backend | `4000` | HTTP port |
| `JWT_SECRET` | backend | development value | Secret for signing JWTs. **Set this in production.** |
| `CORS_ORIGIN` | backend | `http://localhost:5173` | Comma-separated list of allowed frontend origins |
| `UCL_SEASON_ID` | backend | auto-detected | Forces a specific UEFA fantasy season |
| `VITE_API_URL` | frontend | `http://localhost:4000/graphql` | GraphQL endpoint the frontend calls |

---

## GraphQL API

All queries except `health`, `register` and `login` need the header `Authorization: Bearer <accessToken>`.

```graphql
# Season rules and gameweeks
query { season(league: PREMIER_LEAGUE) { currency budget defaultGameweek gameweeks { id name deadline isNext } } }

# Best squad (gameweek defaults to the next one; horizon 1–5)
query {
  predictedTeam(league: CHAMPIONS_LEAGUE, horizon: 3) {
    gameweekName formation totalCost bank predictedPoints
    starters { isCaptain predictedPoints reasons player { displayName teamShort position price } }
    bench { player { displayName } predictedPoints }
  }
}

# Analytics and tips
query {
  insights(league: PREMIER_LEAGUE) {
    tips { category title body }
    captainPicks { predictedPoints player { displayName } }
    fixtureTicker { team averageDifficulty fixtures { gameweek opponent home difficulty } }
  }
}

# All players with next-gameweek projections
query { players(league: PREMIER_LEAGUE) { displayName team position price predictedPoints } }
```

Account operations: `register(input)`, `login(input)`, `me`, `setFavouritePlayer(player)`.

---

## Tests and builds

```bash
cd backend
npm test          # unit tests for the projection model, optimiser, services and resolvers
npm run build

cd ../frontend
npm run lint
npm run build
```

---

## Project structure

```text
backend/src/
├── App/          # Root module (GraphQL, TypeORM)
├── Auth/         # Register, login, JWT strategy and guards
├── User/         # User entity and service (SQLite)
├── Players/      # API clients (FPL, UEFA), normalised domain model, players query
└── Predictor/    # Projection model, squad optimiser, insights, GraphQL resolver

frontend/src/
├── components/   # App layout, gameweek picker, loading/error states
├── graphql/      # Queries and mutations
├── lib/          # League context, formatting helpers
└── pages/        # Login, Register, Team (Best XI), Insights, Players, Profile
```
