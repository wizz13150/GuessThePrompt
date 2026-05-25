# Architecture

This build is intentionally structured like a portable Civitai App prototype.

```text
src/                 React PWA interface
server/app.ts        Hono API routes
server/index.ts      Local production server and static build host
server/services/     Game engine, providers, scoring, leaderboard
server/data/         Mock Civitai-like prompt cache and local leaderboard store
```

## Current mock flow

```text
Frontend
  -> POST /api/game/new-round
  -> POST /api/game/:id/estimate
  -> POST /api/game/:id/generate
  -> POST /api/game/:id/guess
  -> GET  /api/leaderboard
```

The answer is kept server-side until the player solves the round or gives up.

## Future Civitai flow

```text
Frontend
  -> calls BFF only
BFF
  -> holds Civitai OAuth client secret
  -> stores opaque httpOnly session
  -> estimates Buzz cost
  -> submits Civitai orchestrator workflow
  -> polls workflow status
  -> returns safe image URL and safe round state
```

## Provider boundary

The production Civitai implementation should replace:

```text
server/services/MockGenerationProvider.ts
```

with a real provider matching the same interface:

```text
GenerationProvider.estimate()
GenerationProvider.generate()
```

## Security rules

```text
- No Civitai client secret in React
- No user access token in localStorage
- No direct browser call to the orchestrator
- Always preview Buzz cost before generation
- Keep the hidden answer server-side
- Filter Civitai prompt cache records before using them as game rounds
```
