# Backend AI Project

Collaborative project workspace built with an Express API, MongoDB, Redis, Socket.IO, Google Gemini for chat `@ai`, Groq for project assistant summaries, and a Vite React frontend. Users can register, create projects, invite collaborators, chat in a project room, ask `@ai` for help, and manage project sprints/tickets.

## Project Structure

```text
backend/   Express API, MongoDB models, JWT auth, Redis logout blacklist, Socket.IO, Gemini chat, Groq assistant
frontend/  Vite React app, project dashboard, realtime chat, invite flow, work board
```

## Requirements

- Node.js 20 or newer
- MongoDB running locally or a MongoDB Atlas URI
- Redis running locally or a reachable Redis host
- Google AI Studio/Gemini API key for chat `@ai`
- Groq API key for the project Assistant tab

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
- Project assistant summaries are available through `POST /projects/:projectId/assistant/summary` and use Groq when `GROQ_API_KEY` is configured.
- Socket.IO uses the same backend URL and requires a valid JWT plus `projectId`.
- Send `@ai` in a project chat message to ask Gemini for a response in the project chat.
- Invite links use `/join/:inviteCode`; users can also paste an invite code on the dashboard.
- Invite codes and invite-link sharing are visible only to the project admin.
- Sprints and tickets are scoped to a project.
- Only the project admin, currently the project owner, can create sprints.
- Tickets support assignment, priority, and status updates.
- The Work tab includes the project board and a My tasks section for tickets assigned to the logged-in user.
- The Assistant tab summarizes project conversation, ranks important tickets, and falls back to local analysis when Groq is unavailable.

## Workflow Notes

See [docs/DEVREV_WORKFLOW_UPDATES.md](docs/DEVREV_WORKFLOW_UPDATES.md) for the socket, invite, sprint, ticket, UI, and verification details for the Jira/DevRev-style workflow branch.

See [docs/CHAT_REFRESH_AUTHOR_FIX.md](docs/CHAT_REFRESH_AUTHOR_FIX.md) for the chat refresh issue where saved messages could render as another user's message.

See [docs/CHAT_AND_WORKFLOW_ARCHITECTURE.md](docs/CHAT_AND_WORKFLOW_ARCHITECTURE.md) for the fresher-to-professional explanation of how the chat, sprint board, task board, bottlenecks, and scaling plan work.

See [docs/UI_REDESIGN_IMPLEMENTATION.md](docs/UI_REDESIGN_IMPLEMENTATION.md) for the current UI redesign implementation details and browser verification notes.

See [docs/ADMIN_INVITE_AND_ACCOUNT_UPDATES.md](docs/ADMIN_INVITE_AND_ACCOUNT_UPDATES.md) for the admin-only invite rule and dashboard account/settings sidebar details.

See [docs/AI_ASSISTANT_BOT.md](docs/AI_ASSISTANT_BOT.md) for the project assistant bot implementation, fallback ranking logic, bottlenecks, and scaling notes.

See [docs/GROQ_ASSISTANT_DEBUGGING.md](docs/GROQ_ASSISTANT_DEBUGGING.md) for the Groq API key, proxy, fallback, and backend diagnostic debugging trail.

## Troubleshooting

- If protected routes return `Unauthorized User`, confirm the frontend has a token in local storage and `VITE_API_URL` points to the backend.
- If project routes hang or fail after login, confirm Redis and MongoDB are running and match `backend/.env`.
- If the Assistant tab shows `Local fallback: fetch failed` while `GROQ_API_KEY` is set, confirm the backend process can reach Groq. Behind a corporate proxy, set `GROQ_PROXY_URL` in `backend/.env` or start the backend with `HTTP_PROXY` and `HTTPS_PROXY`; the Groq helper reads those environment variables on Node 20. For faster summaries, set `GROQ_MODEL=llama-3.1-8b-instant`. Run `npm run check:groq` from `backend/` to test the exact assistant Groq path and print the provider/model/proxy/error without exposing the API key.
- If your own saved chat messages look like another user's messages after refresh, confirm `/users/me` returns a user object with `_id`.
- If npm install fails with certificate or proxy errors, fix the local npm/proxy configuration first; the app dependencies are managed through the committed lockfiles.
