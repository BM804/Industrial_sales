# Forge Sales Desk

A shared industrial sales pipeline, resource cost planner, and negotiation workspace.

## Deploy

- Backend and durable database: Render Blueprint from `render.yaml`.
- Frontend: import this repository into Vercel and set `NEXT_PUBLIC_API_URL` to the Render API URL.
- Deployment setup and feature notes: see [HANDOVER.md](HANDOVER.md).

The Render Blueprint uses paid plans for persistent data and an always-on API. Review the plan price before confirming deployment. Configure a strong workspace password when Render asks for `APP_LOGIN_PASSWORD`.
