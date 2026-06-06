# Backend AI Project

Collaborative AI coding workspace built with an Express API, MongoDB, Redis, Socket.IO, Google Gemini, and a Vite React frontend. Users can register, create projects, invite collaborators, chat in a project room, ask `@ai` for code, edit the generated file tree, run generated projects in the browser with WebContainer, and manage project sprints/tickets.

## Project Structure

```text
backend/   Express API, MongoDB models, JWT auth, Redis logout blacklist, Socket.IO, Gemini service
frontend/  Vite React app, project chat UI, collaborator modal, file tree editor, WebContainer runner
```

## Requirements

- Node.js 20 or newer
- MongoDB running locally or a MongoDB Atlas URI
- Redis running locally or a reachable Redis host
- Google AI Studio/Gemini API key

## Environment Setup

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Create the frontend environment file:

```bash
cp frontend/.env.example frontend/.env
```

Update the values in both `.env` files before running the app.

## Install Dependencies

Install backend dependencies:

```bash
cd backend
npm ci
```

Install frontend dependencies:

```bash
cd ../frontend
npm ci
```

## Run Locally

Start the backend API:

```bash
cd backend
npm run dev
```

The backend runs on `http://localhost:3000` by default.

Start the frontend:

```bash
cd frontend
npm run dev
```

The frontend runs on the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Useful Scripts

Backend:

```bash
npm start      # run the API
npm run dev    # run the API with Node watch mode
npm run check  # syntax-check server.js
npm test       # alias for npm run check
```

Frontend:

```bash
npm run dev      # run Vite
npm run build    # production build
npm run lint     # ESLint
npm run preview  # preview the production build
```

## API Notes

- Auth endpoints are under `/users`.
- Project endpoints are under `/projects`.
- AI generation is available through `/ai`.
- Socket.IO uses the same backend URL and requires a valid JWT plus `projectId`.
- Send `@ai` in a project chat message to ask Gemini to return a JSON response with `text` and optional `fileTree`.
- Invite links use `/join/:inviteCode`; users can also paste an invite code on the dashboard.
- Sprints and tickets are scoped to a project. Tickets support assignment, priority, and status updates.

## Workflow Notes

See [docs/DEVREV_WORKFLOW_UPDATES.md](docs/DEVREV_WORKFLOW_UPDATES.md) for the socket, invite, sprint, ticket, UI, and verification details for the Jira/DevRev-style workflow branch.

## Troubleshooting

- If protected routes return `Unauthorized User`, confirm the frontend has a token in local storage and `VITE_API_URL` points to the backend.
- If project routes hang or fail after login, confirm Redis and MongoDB are running and match `backend/.env`.
- If WebContainer does not boot in the browser, use the Vite dev server. The Vite config sends the cross-origin isolation headers WebContainer needs.
- If npm install fails with certificate or proxy errors, fix the local npm/proxy configuration first; the app dependencies are managed through the committed lockfiles.
