# Deploy v1.9 public demo with GitHub and Render

This app is not a GitHub Pages app because it needs a Node backend. Use GitHub for the repository and Render for the running web service.

## 1. Prepare the folder

Unzip the archive, then open a terminal in the folder containing `package.json`.

Check that no real key is present:

```bash
grep -R "CIVITAI_API_KEY=.*[A-Za-z0-9]\{20,\}" -n . --exclude-dir=node_modules --exclude-dir=.git
```

Expected: no result.

## 2. Test locally

```bash
npm install
npm run typecheck
npm run build
npm start
```

Open:

```text
http://localhost:5174
```

In the page, enter your Civitai username / player name and API Key in the **Public demo session** panel.

## 3. Create the GitHub repository

Create an empty GitHub repository, for example:

```text
civitai-prompt-minigame-public-demo
```

Then push the app:

```bash
git init
git add .
git commit -m "Deploy public demo v1.9"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/civitai-prompt-minigame-public-demo.git
git push -u origin main
```

## 4. Create the Render Web Service

In Render:

1. New > Web Service.
2. Connect GitHub.
3. Select the repository.
4. Use these values:

```text
Runtime: Node
Branch: main
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

Do not add `CIVITAI_API_KEY` for the public demo.

## 5. Test the deployed app

Open Render's `onrender.com` URL.

Check health:

```text
https://YOUR-SERVICE.onrender.com/api/health
```

Expected before entering a visitor key:

```json
"mode": "civitai",
"apiKeyConfigured": false
```

Then open the app page, enter a Civitai username / player name and API Key, and generate a round.

## 6. Known demo limits

- Debug routes are intentionally left open for developer testing.
- The leaderboard uses local JSON storage. It can reset after service redeploys/restarts on free hosting.
- Use a real database or persistent disk before treating it as production.
