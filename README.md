# Forge Sales Desk

A customer-facing prototype for industrial sales planning, resource costing, and negotiation workflows.

## Run the workspace

Deploy the repository to Vercel with no environment variables to open the illustrative workspace. Without `NEXT_PUBLIC_API_URL`, edits are saved in the current browser using local storage.

To enable server-managed Gemini AI, add `GEMINI_API_KEY` to the server environment. For local development, put the regenerated Google AI Studio key in `.env.local` (never commit that file); for Vercel, add it under the project's Environment Variables and redeploy. Gemini requests use this server-side key, so team members do not need to paste a key into the app.

The optional Render API and PostgreSQL setup is documented in [HANDOVER.md](HANDOVER.md). Workspace records are illustrative and should be replaced with verified customer outcomes before being used as business evidence.
