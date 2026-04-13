<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# QUEST

This repo now contains a MongoDB-backed backend and a frontend with separate solver and runner pages.

## Structure

- `frontend/` - Vite app for the solver and runner experiences.
- `backend/` - Express API that handles team login, isolated game state, and resets.

## Backend Setup

1. Copy [backend/.env.example](../backend/.env.example) to `backend/.env`.
2. Set `MONGODB_URI`, `MONGODB_DB_NAME`, and `JWT_SECRET`.
3. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` for admin panel login.
4. (Optional) Create a team record from CLI:
   `npm run seed:team -- --team "Team Name" --password "secret"`
5. Start the backend:
   `npm run dev`

## Frontend Setup

1. Install dependencies:
   `npm install`
2. Start the frontend:
   `npm run dev`
3. Open `/solver` or `/runner` in the browser.
4. Open `/admin` for admin panel to create teams and manage questions.

The frontend proxies `/api` to `http://localhost:4000` in development, so both pages share the same team data without mixing teams.
