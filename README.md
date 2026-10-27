# Forge Sales Desk

A customer-facing prototype for industrial sales planning, resource costing, and negotiation workflows.

## Run the workspace

Deploy the repository to Vercel with no environment variables to open the illustrative workspace. Without `NEXT_PUBLIC_API_URL`, edits are saved in the current browser using local storage.

Forge defaults to Aion Labs for AI suggestions. Add `AION_API_KEY` to `.env.local` for local development or to Vercel Environment Variables and redeploy. The key stays on the server, so team members do not paste it into the app. Aion usage may be billed to your account. Gemini remains available as an alternative with `GEMINI_API_KEY`.

The optional Render API and PostgreSQL setup is documented in [HANDOVER.md](HANDOVER.md). Workspace records are illustrative and should be replaced with verified customer outcomes before being used as business evidence.
