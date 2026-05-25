# Guess The Prompt v1.9.0 public demo

Civitai-oriented prompt guessing minigame.

This build is designed to be deployed online for developer testing:

- no bundled Civitai API Key;
- each visitor enters their own Civitai username / player name and API Key;
- the visitor API Key is stored in browser `sessionStorage` only;
- the key is sent to the backend only in request headers for Civitai actions;
- debug console and debug API routes remain enabled for developer demos;
- v1.9 Round result buttons are included: **Reroll this round** and **Next round**.

## Local launch

```bash
npm install
npm run build
npm start
```

Open:

```text
http://localhost:5174
```

## Public demo flow

1. Open the app.
2. In **Public demo session**, enter:
   - Civitai username / player name;
   - Civitai API Key.
3. Click **Connect for this session**.
4. Start the game.
5. Generate images, guess, reroll, or continue to the next round.

## Render deployment

This archive includes `render.yaml`.

Recommended Render settings:

```text
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

Environment variables:

```text
APP_MODE=civitai
PLAYER_NAME=Guest
CIVITAI_ORCHESTRATOR_URL=https://orchestration.civitai.com
CIVITAI_GENERATION_TIMEOUT_MS=120000
```

Do not set `CIVITAI_API_KEY` on the public Render service unless you intentionally want a private/shared-key deployment.

## Debug

The developer demo intentionally keeps these endpoints available:

```text
/api/debug/logs
/api/debug/orchestrator-test
```

Do not use this exact debug-open build for a non-dev public production launch.

## Safety

Never commit `.env` with a real key. If a Civitai API Key was ever committed or shared, revoke it and generate a new one.
