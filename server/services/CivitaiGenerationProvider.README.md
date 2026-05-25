# Future CivitaiGenerationProvider

This prototype intentionally runs in mock mode. The real provider must be wired after a Civitai OAuth app has been created.

Target flow:

1. BFF reads the httpOnly Civitai session.
2. BFF creates an orchestrator client with the user's access token.
3. BFF calls estimateWorkflow / what-if and sends the Buzz estimate to the frontend.
4. User confirms.
5. BFF calls submitWorkflow and polls until terminal status.
6. BFF returns the generated Civitai image URL to the React UI.

Do not use a personal Civitai API key for production gameplay. API keys spend the key owner's Buzz; OAuth spends the authenticated user's Buzz.
