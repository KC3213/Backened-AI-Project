# Interview Project Walkthrough

This document explains the project in the style of a technical interview. It is written so the project can be discussed clearly with a senior engineer: what the product does, why the stack was chosen, how the main workflows work, what design tradeoffs were made, what could fail, and how the system can be scaled.

## Short Interview Pitch

This project is a collaborative project-management workspace inspired by Jira and DevRev. Users can register, log in, create projects, invite teammates, chat inside a project, create sprints, assign tickets, submit work, and use an assistant tab to summarize conversations and identify important tickets.

The system uses a React/Vite frontend, an Express backend, MongoDB with Mongoose for persistence, Socket.IO for realtime project chat, Redis for JWT logout invalidation, and Groq for project-level assistant summaries. The current implementation is designed as an MVP that is simple enough to understand and deploy, while still enforcing important product rules like project membership, admin-only invite visibility, admin-only sprint creation, and project-scoped ticket access.

If I had to explain the technical objective in one sentence:

> I built a multi-user project workspace where collaboration, project membership, realtime discussion, ticket tracking, and AI-assisted project understanding all happen inside a project-scoped boundary.

## Product Objective

The main purpose was to move from a basic project/chat application toward a realistic collaborative workflow tool.

The product goals were:

- Allow users to create a workspace project.
- Allow project admins to invite other users through a shareable invite link/code.
- Keep each project's data isolated from other projects.
- Let members communicate through realtime chat.
- Persist chat messages so refresh does not lose history.
- Let the admin create sprints.
- Let members create and update project tickets.
- Let tickets be assigned to project members.
- Show users their own pending tasks across projects.
- Allow assigned users to submit proof of work through a link or document upload.
- Add an assistant that summarizes project conversation and highlights important tickets.
- Keep the UI responsive and usable for dashboard, auth, project chat, work board, and assistant flows.

The important product idea is project-scoping. Almost every feature depends on this rule:

```text
User action is allowed only if the user belongs to that project.
Admin-only action is allowed only if the user is the project owner.
```

## Current Tech Stack

Frontend:

- React
- Vite
- React Router
- Axios
- Socket.IO client
- Tailwind CSS
- Remix Icon

Backend:

- Node.js
- Express
- Socket.IO
- MongoDB
- Mongoose
- JWT
- bcrypt
- Redis
- Groq API
- Google Gemini API for chat `@ai`

Operational/deployment pieces:

- Environment-based configuration through `.env`
- PM2 can run the backend process in production
- MongoDB Atlas can be used as managed database
- Redis can run locally on the server or be moved to managed Redis later
- OCI Compute can host the backend and frontend build

## Why This Tech Stack Was Chosen

### React And Vite

React was chosen because the product is UI-heavy. The app has multiple states: auth pages, dashboard, project list, account panel, chat messages, work board, ticket submission forms, assistant summary, and admin-only controls. React makes this manageable through components and state.

Vite was chosen because it gives fast local development and a simple production build. For a project like this, fast iteration matters more than a heavy framework.

What could be better:

- If server-side rendering or SEO mattered, Next.js would be a stronger choice.
- If the app grew significantly, state management could be improved with React Query, Zustand, Redux Toolkit, or another structured data layer.

### Express

Express was chosen because the backend API is mostly REST-style CRUD plus authentication. It is simple, widely understood, and works cleanly with Socket.IO on the same HTTP server.

What could be better:

- For a larger team, NestJS could add stronger module structure and dependency injection.
- For stronger input validation, Zod or Joi could centralize request schemas.
- For strict API contracts, OpenAPI documentation could be added.

### MongoDB And Mongoose

MongoDB was chosen because the core entity is a project document containing users, messages, sprints, and tickets. This made it quick to build a project workspace where one project read can return most of the screen.

Mongoose was used because it provides schemas, model methods, validation, population, and a clean abstraction over MongoDB.

Why this was acceptable for the MVP:

- Project data is naturally document-like.
- Early feature development is fast.
- Project workspace reads are simple.
- Embedded messages/tickets reduce the number of joins and queries for small projects.

Tradeoff:

- Embedded arrays can become a bottleneck for very active projects.
- Large chat histories can make project documents grow too much.
- Pagination is harder when messages are embedded.

What could be better:

- Move messages into a separate `messages` collection.
- Move tickets into a separate `tickets` collection when ticket volume grows.
- Add indexes on `projectId`, `createdAt`, `assignee`, and `status`.
- Keep project metadata separate from high-volume event data.

### Socket.IO

Socket.IO was chosen for realtime chat because chat needs server-push behavior. HTTP polling would work, but it would be slower and more wasteful.

Socket.IO provides:

- Persistent client-server connection.
- Named events.
- Project rooms.
- Reconnect handling.
- A simpler developer experience than raw WebSockets.

Why not raw WebSocket:

- Raw WebSocket would require manually building room management, reconnect behavior, event naming conventions, and error handling.
- Socket.IO gives those features directly, which is good for an MVP.

What could be better:

- Use the Socket.IO Redis adapter for multiple backend instances.
- Add socket-level token blacklist checking.
- Disconnect active sockets when a token is revoked.
- Add rate limiting on socket events.
- Add delivery and read receipts if needed.

### JWT Authentication

JWT was chosen because it keeps normal API authentication stateless. The frontend stores a token, sends it with requests, and the backend verifies it with `JWT_SECRET`.

The project also includes Redis-backed logout invalidation. This matters because a JWT by itself cannot be revoked until it expires. Redis stores logged-out tokens with a TTL so future REST requests reject those tokens.

Current reality:

- REST routes check the Redis blacklist.
- Socket.IO authenticates token during connection.
- Existing socket connections are not forcibly disconnected on logout yet.

What could be better:

- Check Redis blacklist in Socket.IO middleware.
- Track active socket IDs per user and disconnect them during logout.
- Rotate refresh tokens and use short-lived access tokens for stronger security.

### Redis

Redis was used for the JWT blacklist because revoked-token checks need to be fast and temporary.

Why Redis fits:

- Token revocation data is temporary.
- TTL expiry matches JWT expiry.
- Reads are fast.
- It avoids doing database lookups for every authenticated request.

What could be better:

- Use managed Redis for production reliability.
- Add Redis health checks.
- Add fallback behavior when Redis is unavailable.
- Add metrics around blacklist lookup latency.

### Groq Assistant

Groq was used for the project assistant because the assistant needs fast LLM output for summarizing conversations and ranking tickets. The backend sends a compact project payload and asks Groq to return structured JSON.

Why Groq fits:

- Fast inference for summary-style tasks.
- OpenAI-compatible API shape.
- The backend can enforce a strict JSON response contract.

Fallback:

- If Groq fails or the key is missing, the app falls back to local heuristic analysis.
- That keeps the feature usable during local development or network issues.

What could be better:

- Cache assistant summaries.
- Regenerate summaries in background jobs.
- Use embeddings for long project memory.
- Store assistant runs and debug metadata.
- Add per-project summary freshness windows.

## Main Architecture

```text
React frontend
  |
  | REST API requests: auth, projects, tickets, sprints, assistant
  | Socket.IO events: realtime project chat
  v
Express + Socket.IO backend
  |
  | Mongoose models
  v
MongoDB
  |
  | JWT blacklist
  v
Redis
  |
  | Assistant summary
  v
Groq API
```

The backend owns the important decisions:

- Who is logged in.
- Which project the user belongs to.
- Whether the user is admin.
- Who sent a chat message.
- Whether an assignee is a member of the project.
- Whether invite code access is valid.

The frontend is responsible for:

- UI state.
- Forms.
- Calling APIs.
- Rendering project state.
- Maintaining the Socket.IO connection.
- Showing admin-only controls when applicable.

The security assumption is:

> Never trust the browser to decide ownership, project access, or sender identity.

## Data Model Overview

The main models are `user` and `project`.

User fields include:

- `name`
- `email`
- `password`
- `googleId`
- `authProvider`
- `avatar`

Project fields include:

- `name`
- `users`
- `owner`
- `inviteCode`
- `messages`
- `sprints`
- `tickets`
- `fileTree`

Message fields include:

- `message`
- `sender`
- `editedAt`
- `isDeleted`
- `deletedAt`
- timestamps

Ticket fields include:

- `title`
- `description`
- `status`
- `priority`
- `assignee`
- `sprintId`
- `createdBy`
- `submissions`

Submission fields include:

- `type`
- `note`
- `url`
- file metadata and file data
- `submittedBy`

## Workflow 1: Registration And Login

### Registration Flow

1. User enters email, password, name, and avatar.
2. Backend validates required fields.
3. Password is hashed using bcrypt.
4. User is saved in MongoDB.
5. Local avatar metadata is saved with the user.
6. Backend creates a JWT containing `_id` and `email`.
7. Frontend stores the token and uses it for future requests.

Why bcrypt:

- Passwords should never be stored in plain text.
- bcrypt is intentionally slow, which makes brute-force attacks harder.

### Login Flow

1. User enters email and password.
2. Backend normalizes the email.
3. Backend checks if a user exists.
4. If user does not exist, backend returns `USER_NOT_FOUND`.
5. Frontend can redirect that user toward registration.
6. If the user exists, bcrypt compares the password.
7. Backend returns user and JWT.

### Logout Flow

1. Frontend calls logout.
2. Backend reads the token.
3. Token is added to Redis blacklist with expiry.
4. Later REST requests using the same token are rejected.

Interview point:

> JWT is stateless by default, so logout is not automatic. I used Redis as a revocation layer to reject tokens after logout without storing sessions in MongoDB.

Current limitation:

- Existing Socket.IO connections are not force-disconnected on logout yet.

Better future design:

- Store active sockets by user ID.
- On logout, emit a forced logout event and disconnect all active sockets for that user.
- Also check the Redis blacklist during socket connection.

## Workflow 2: Project Creation

1. Logged-in user enters a project name.
2. Frontend calls `POST /projects/create`.
3. Backend validates the request.
4. Backend creates a project document.
5. The creator is added to `users`.
6. The creator is set as `owner`.
7. A unique invite code is generated.
8. The project is returned to the frontend.

Important rule:

```text
Project owner = project admin.
```

Why this matters:

- Only the project admin can see/share invite links.
- Only the project admin can regenerate invite links.
- Only the project admin can create sprints.
- Only the project admin can remove members.

What could be better:

- Add formal roles like `owner`, `admin`, `member`, `viewer`.
- Store membership in a separate `project_members` collection for advanced permissions.
- Add audit logs for admin actions.

## Workflow 3: Invite Link And Join

### Invite Link Creation

Each project has an `inviteCode`. The frontend builds the link:

```text
/join/:inviteCode
```

Only the project admin can see the invite code and copy the link.

Why admin-only:

- Invite links control access to a private workspace.
- If every member can share the link, access control becomes weaker.
- Admin-only sharing mirrors tools like Jira, Linear, Slack, and DevRev.

### Join Flow

1. User opens invite link or enters invite code.
2. Frontend calls `POST /projects/join`.
3. Backend finds the project by `inviteCode`.
4. Backend adds the current user with `$addToSet`.
5. `$addToSet` prevents duplicate membership.
6. User is routed into the project.

### Regenerating Invite Link

When the admin regenerates an invite code:

- The same project receives a new invite code.
- The old invite code becomes invalid.
- The new invite code still joins the same project.
- Existing members are not duplicated if they open the new link.
- The code is generated uniquely, so it should not be assigned to another current project.

Interview explanation:

> Regenerating an invite link is not creating a new project. It rotates the access code on the same project. The old code stops working, which is useful if the link was accidentally shared.

Current limitation:

- Invite codes do not expire automatically.
- There is no max-use count.
- There is no audit trail for who joined from which code.

Better future design:

- Store invite records separately with expiry.
- Add `createdBy`, `createdAt`, `expiresAt`, and `maxUses`.
- Add audit logs for joins.
- Allow admins to revoke specific invite links.

## Workflow 4: Member Management

### Add Member

The admin can add existing users to a project. The backend validates:

- The current user belongs to the project.
- The current user is the project owner/admin.
- The users being added are valid user IDs.

### Remove Member

The admin can remove a non-owner member from the project.

Current behavior:

- Only the project admin can remove members.
- The project owner cannot be removed.
- Removed users are removed from `project.users`.
- Tickets assigned to the removed user are set to unassigned.

Why tickets become unassigned:

- Keeping a removed user assigned to active work would create stale ownership.
- Unassigning the tickets makes the problem visible to the team.
- The admin can reassign those tickets to active members.

What could be better:

- Ask admin to select a replacement assignee during removal.
- Add an audit log: "Admin removed X; 3 tickets were unassigned."
- Notify the removed user.
- Revoke active sockets for the removed user inside that project.

## Workflow 5: Realtime Chat

### Chat Connection Flow

1. User opens a project page.
2. Frontend initializes a Socket.IO connection.
3. JWT is sent in `auth.token`.
4. `projectId` is sent in the socket query.
5. Backend verifies the JWT.
6. Backend loads the real user from MongoDB.
7. Backend checks that the project contains that user.
8. Socket joins a room named by project ID.
9. Backend emits `project-message-ready`.

Important point:

> The backend decides the sender from the verified token. The frontend does not send sender identity as trusted data.

### Message Send Flow

1. User types a message.
2. Frontend emits `project-message`.
3. Backend trims and validates the message.
4. Backend saves the message into MongoDB.
5. Backend emits the saved message to everyone in the project room.
6. Frontend renders the persisted message.

Why save before emit:

- The message has a real database ID.
- Refresh will show the same message.
- All clients receive the same saved object.

### Message Edit/Delete Flow

Messages can be edited or deleted by the sender within 15 minutes.

Backend checks:

- Message exists.
- Message is not already deleted.
- Current user is the sender.
- Message is not from AI.
- Message is still inside the 15-minute window.

Why this rule:

- It gives users a practical correction window.
- It prevents old conversation history from being silently rewritten.
- It mirrors behavior in real collaboration tools.

What could be better:

- Store edit history.
- Add deleted-by metadata.
- Add admin moderation rules.
- Add message pagination.
- Add search.
- Add rate limiting.

### Chat Refresh Bug That Was Fixed

Problem:

- After refresh, a user's own message could appear as if it was written by someone else.

Root cause:

- The UI compared `message.sender._id` with `user._id`.
- Older `/users/me` behavior did not reliably return a full user with `_id`.
- After refresh, the current user identity was incomplete.

Fix:

- `/users/me` now loads the full user from MongoDB.
- JWT includes `_id` and `email`.
- Socket.IO also loads the real user before saving messages.

Lesson:

> Identity should be resolved from a trusted backend source, not inferred from stale frontend state.

## Workflow 6: Sprints And Tickets

### Sprint Creation

Only project admin can create sprints.

Why:

- Sprint planning is usually a project-management responsibility.
- If every member creates sprints, the board can become messy.
- Admin-only sprint creation creates clearer ownership.

What could be better:

- Add roles so project managers can create sprints without being owner.
- Add sprint start/end validation.
- Add active/closed sprint transitions.
- Add sprint reports.

### Ticket Creation

Project members can create tickets. A ticket can include:

- title
- description
- priority
- assignee
- sprint

Backend checks:

- The user belongs to the project.
- The title exists.
- The assignee, if present, is a project member.
- The sprint, if present, exists in the project.

Why assignee validation matters:

- It prevents assigning work to users outside the project.
- It protects project boundaries.
- It keeps dashboard "My tasks" accurate.

### Ticket Status Flow

Current statuses:

```text
todo -> in-progress -> review -> done
```

The UI board groups tickets by status. Users can update ticket status through REST.

What could be better:

- Enforce allowed transitions.
- Add comments on ticket status changes.
- Add activity history.
- Add due dates.
- Add labels and estimates.
- Add sprint burndown metrics.

## Workflow 7: My Tasks And Dashboard

The dashboard shows pending tasks assigned to the logged-in user across all projects.

Flow:

1. Frontend loads all projects where the user is a member.
2. It scans project tickets.
3. It filters tickets assigned to the current user.
4. It excludes completed tickets.
5. It groups tasks into pending status columns.

Why this is useful:

- Users do not need to open each project to know what they owe.
- It makes the app feel like a real work dashboard, not only a chat app.

Current limitation:

- Filtering happens on the frontend after loading projects.

Better future design:

- Add a backend endpoint like `GET /users/me/tasks`.
- Query tickets directly by `assignee`.
- Return paginated task results.
- Add indexes on `assignee` and `status`.

## Workflow 8: Ticket Submissions

Assigned users can submit work for a ticket as either:

- a link
- a PDF/DOC/DOCX file

Backend checks:

- The user belongs to the project.
- The ticket exists.
- The current user is the assigned user.
- Link submissions are valid HTTP/HTTPS URLs.
- File submissions are supported document types.
- File size is limited.

Why this matters:

- It prevents random project members from submitting on behalf of the assignee.
- It keeps ticket work tied to responsibility.
- It supports practical interview/demo workflows where a task has proof of completion.

Current limitation:

- Files are stored as data in MongoDB.

Better future design:

- Store files in object storage such as OCI Object Storage, S3, or Cloudinary.
- Store only file metadata and URL in MongoDB.
- Add virus scanning for uploads.
- Add signed URLs for private access.

## Workflow 9: Assistant Bot

The Assistant tab summarizes project state.

Flow:

1. User opens the Assistant tab.
2. Frontend calls `POST /projects/:projectId/assistant/summary`.
3. Backend loads the project with membership check.
4. Backend builds a compact payload:
   - recent messages
   - tickets
   - assignees
   - priorities
   - statuses
   - submission counts
5. Backend asks Groq for structured JSON.
6. Backend normalizes the response.
7. If Groq fails, backend returns local fallback analysis.

Why local fallback exists:

- The app remains usable without an AI key.
- Network/proxy failures do not break the assistant page.
- Demos are more reliable.

What the assistant helps with:

- Summarizing recent conversation.
- Highlighting important tickets.
- Suggesting next steps.

Current limitation:

- Assistant summary is generated on demand.
- It does not have long-term memory beyond the selected payload.
- It does not write decisions back into tickets automatically.

Better future design:

- Cache summaries by project and timestamp.
- Regenerate in a background worker.
- Use event streams to detect meaningful changes.
- Use embeddings for long-term memory.
- Provide role-specific summaries for admin, assignee, and reviewer.

## Important Security Decisions

### Project Membership Checks

Protected project operations use a membership check. The backend verifies that the current user belongs to the project before returning or changing project data.

Why:

- Without this, a user could guess a project ID and access another project.

### Admin-Only Controls

Admin-only features include:

- invite link visibility
- invite regeneration
- sprint creation
- member removal

Why:

- These actions affect project structure and access.
- Admin-only enforcement must happen on backend, not only frontend.

### Token Blacklist On Logout

Logout writes the token into Redis.

Why:

- A JWT remains cryptographically valid until expiry.
- Redis lets the backend reject logged-out tokens immediately for REST requests.

### Password Hashing

Passwords are hashed with bcrypt.

Why:

- Plain-text passwords are never acceptable.
- bcrypt slows down brute-force attacks.

### File Upload Limits

Submission files are limited by type and size.

Why:

- Prevent huge payloads.
- Reduce storage abuse.
- Keep the MVP safer.

## Where The Project Is Strong

The project is strong in these areas:

- Clear project-scoped data model.
- Realtime chat with persisted messages.
- Backend-controlled sender identity.
- Invite-code join workflow.
- Admin-only invite and sprint rules.
- Ticket assignment validation.
- My Tasks dashboard.
- Ticket submission flow.
- Redis logout blacklist for REST routes.
- Groq assistant with local fallback.
- Responsive UI for dashboard, project, chat, work, and assistant pages.
- Practical deployment path using OCI Compute, PM2, MongoDB Atlas, and Redis.

## Bottlenecks And Weak Points

### Embedded Messages And Tickets

Current state:

- Messages and tickets are embedded inside the project document.

Problem at scale:

- A busy project can create a very large document.
- Loading the project can become slow.
- Message pagination is difficult.
- Writes to one project document can become a hotspot.

Better design:

- Separate `messages`, `tickets`, `sprints`, and `projectMembers` collections.
- Keep `projects` for metadata.
- Add proper indexes.

### Single Backend Process

Current state:

- Express and Socket.IO run in the same process.

Problem at scale:

- Scaling REST and WebSocket traffic independently is not possible yet.
- Socket.IO rooms are local to one process.

Better design:

- Run multiple backend instances.
- Add Socket.IO Redis adapter.
- Put instances behind a load balancer.
- Consider separate services for REST API, realtime gateway, and worker jobs.

### Socket Logout Handling

Current state:

- REST routes check Redis blacklist.
- Existing sockets are not automatically disconnected on logout.

Better design:

- Check blacklist during socket connection.
- Track active sockets per user.
- Disconnect sockets when logout happens.

### AI In Request Path

Current state:

- Assistant generation happens during the API request.

Problem at scale:

- Slow AI responses can keep HTTP requests open.
- Repeated calls cost more.

Better design:

- Queue assistant jobs.
- Cache summaries.
- Add freshness windows.
- Return last known summary while a new one is generating.

### File Storage

Current state:

- File submissions are stored as data payloads.

Problem at scale:

- Database grows quickly.
- Large documents are inefficient.

Better design:

- Use object storage.
- Save metadata and file URL in MongoDB.
- Use signed URLs.

### Authorization Model

Current state:

- Owner/admin is a single project owner.

Problem at scale:

- Real teams need multiple roles.

Better design:

- Add role-based access control:
  - owner
  - admin
  - member
  - viewer
- Store permissions per project membership.
- Add audit logs.

## How I Would Scale This Project

### Phase 1: Make The MVP Production-Safer

Immediate improvements:

- Restrict CORS to known frontend domains.
- Add request validation with Zod or Joi.
- Add rate limiting for auth, chat, invite joins, and AI summary.
- Add centralized error handling.
- Add structured logs.
- Add health check endpoints.
- Add environment validation on server startup.
- Add automated tests for auth, project membership, invites, and tickets.

### Phase 2: Split High-Volume Data

Refactor data model:

```text
projects
projectMembers
messages
tickets
sprints
ticketSubmissions
activityLogs
```

Important indexes:

```text
projectMembers: userId + projectId
messages: projectId + createdAt
tickets: projectId + status
tickets: assignee + status
tickets: projectId + sprintId
activityLogs: projectId + createdAt
```

Benefits:

- Fast project load.
- Paginated messages.
- Efficient My Tasks query.
- Better reporting.
- Lower risk of oversized project documents.

### Phase 3: Scale Realtime Chat

Steps:

- Add Socket.IO Redis adapter.
- Run multiple backend instances.
- Use a load balancer.
- Add event acknowledgement for important events.
- Add rate limiting per socket.
- Add monitoring for connected sockets, messages per second, and emit latency.

Architecture:

```text
Client sockets
  |
Load balancer
  |
Realtime gateway instances
  |
Socket.IO Redis adapter
  |
MongoDB messages collection
```

### Phase 4: Make AI Async

Steps:

- Add a job queue.
- Store assistant summaries.
- Trigger summary regeneration after meaningful changes.
- Return cached summary immediately.
- Show "refreshing" state while a new summary is generated.

Architecture:

```text
Project update
  |
Queue summary job
  |
Worker calls Groq
  |
Save assistant summary
  |
Frontend reads latest summary
```

### Phase 5: Improve Reliability And Observability

Add:

- API latency metrics.
- Socket event latency metrics.
- Database query timings.
- Redis availability checks.
- AI provider latency/error metrics.
- Error tracking.
- Audit logs.
- Load testing.

Metrics to prove later:

- p95 API latency.
- p95 socket message delivery latency.
- number of concurrent connected users tested.
- database query latency for project load.
- assistant summary latency.
- Redis blacklist lookup latency.

Important interview honesty:

> I should not claim exact numbers unless I have load tests and measurements. I can say the architecture is designed to be measurable, and these are the metrics I would collect to prove scale.

## How This Is Better Than A Basic CRUD App

This project is more than CRUD because it includes:

- Realtime collaboration through project-scoped Socket.IO rooms.
- Persistent chat with correct sender ownership.
- Admin/member permission rules.
- Invite-based project joining.
- Ticket board workflow.
- Sprint planning.
- User-specific task dashboard.
- Ticket submissions with validation.
- AI project assistant with fallback.
- Redis-backed logout invalidation.
- Practical deployment path.

A basic CRUD app usually stores and retrieves records. This project coordinates multiple users working inside the same project boundary.

## What I Would Say In A Senior Interview

### Explain The Project

I built a Jira/DevRev-inspired collaborative workspace. A user can create projects, invite teammates, chat in realtime, create sprints and tickets, assign work, submit deliverables, and use an assistant to summarize project context. The backend is Express with MongoDB and Redis, the frontend is React/Vite, chat runs on Socket.IO rooms, and the assistant uses Groq with a local fallback.

The main engineering challenge was enforcing project boundaries consistently. Every project operation checks that the user belongs to the project, and admin-only operations check the project owner. For chat, the server authenticates the socket, verifies project membership, joins a project-specific room, persists messages, and broadcasts the saved message to all members.

### Why Did You Use MongoDB?

I used MongoDB because the early project shape is document-oriented. A project contains members, chat messages, sprints, and tickets, so a single project read can hydrate most of the workspace. That made the MVP simpler and faster to build.

The tradeoff is that embedded arrays do not scale well for very active chat or large ticket volume. My next step would be to split messages and tickets into separate collections with indexes on `projectId`, `createdAt`, `assignee`, and `status`.

### Why Did You Use Socket.IO?

Chat needs realtime updates. Socket.IO gave me project rooms, reconnect handling, custom events, and a simpler API than raw WebSocket. Each project maps to a Socket.IO room, so messages are only emitted to members in that project room.

For horizontal scaling, I would add the Socket.IO Redis adapter so room events can fan out across multiple backend instances.

### How Do You Prevent Unauthorized Project Access?

The frontend can hide buttons, but the backend enforces access. For project routes, the backend loads the project with the current user inside `users`. Admin-only routes also compare the current user with `project.owner`. For sockets, the handshake verifies JWT, loads the real user, validates project membership, and only then joins the project room.

### What Was A Real Bug You Fixed?

A saved chat message could appear as if it was written by someone else after refresh. The UI compared message sender ID with the current user ID, but the refreshed user object did not always include `_id`. I fixed it by making `/users/me` load the full user from MongoDB and by ensuring JWTs include `_id`. Socket.IO also resolves the user from the database before saving messages.

### How Does Logout Work?

The backend uses JWT for auth and Redis for logout invalidation. On logout, the token is stored in Redis with TTL. Protected REST routes reject blacklisted tokens.

The next improvement is to apply the same revocation check to Socket.IO and disconnect existing sockets on logout.

### How Does The Assistant Work?

The assistant endpoint loads the project after membership validation, builds a compact payload of recent messages and tickets, and sends it to Groq with a JSON-only prompt. The response is normalized. If Groq fails, the backend returns local heuristic analysis based on priority, status, assignment, and submissions.

### What Would You Improve First?

I would improve data modeling and authorization:

- Move messages and tickets into separate collections.
- Add project membership roles.
- Add audit logs.
- Add message pagination.
- Add Socket.IO Redis adapter.
- Add tests around access control.

These changes would make the app safer and more scalable without changing the product experience.

## Follow-Up Questions And Strong Answers

### Q: Why not use PostgreSQL?

PostgreSQL would be a good option, especially for relational reporting, audit logs, and complex ticket queries. I chose MongoDB because the MVP project data was naturally nested and I wanted fast iteration. If the product became reporting-heavy, I would strongly consider PostgreSQL or a hybrid design.

### Q: What is your biggest technical debt?

The biggest technical debt is embedding high-growth arrays like messages and tickets inside the project document. It is fine for an MVP, but for scale I would split them into separate collections and add pagination/indexes.

### Q: How would you handle 10,000 concurrent chat users?

I would not rely on a single Node process. I would run multiple realtime gateway instances behind a load balancer, use the Socket.IO Redis adapter, store messages in a separate indexed collection, add rate limits, and track p95 delivery latency. I would also load test before claiming a concurrency number.

### Q: How do you avoid duplicate invite members?

The join flow uses MongoDB `$addToSet`, so if the same user joins again through the invite link, they are not duplicated in the project members array.

### Q: What happens when an invite code is regenerated?

The same project gets a new code. The old code no longer finds a project and becomes invalid. The new code still joins the original project.

### Q: How do you handle member removal?

Only the project owner can remove members. The owner cannot be removed. When a member is removed, any tickets assigned to them are set to unassigned so stale ownership is visible and can be reassigned.

### Q: How would you test this project?

I would add:

- Unit tests for service-level permission checks.
- Integration tests for auth, project creation, invite join, member removal, sprint creation, and ticket assignment.
- Socket.IO tests for room isolation and message persistence.
- UI tests for dashboard task visibility and admin-only controls.
- Load tests for chat message latency and project read performance.

### Q: How would you deploy this properly?

For the current size:

- Build frontend with Vite.
- Serve frontend through Nginx.
- Run backend with PM2 on OCI Compute.
- Use MongoDB Atlas.
- Run Redis locally or use managed Redis.
- Configure environment variables.
- Open only required ports.
- Put Nginx in front as reverse proxy.
- Add HTTPS with a domain and certificate.

For production scale:

- Use container images.
- Use a managed load balancer.
- Run multiple backend instances.
- Use managed Redis.
- Add CI/CD.
- Add monitoring and logs.

## Mistakes And Lessons Learned

### Clipboard Copy On HTTP

Problem:

- Invite link copy can fail on plain HTTP because browser clipboard APIs often require a secure context.

Fix:

- Added a fallback copy mechanism.

Lesson:

- Browser APIs often behave differently on localhost, HTTPS, and public HTTP deployments.

### Groq API Behind Proxy

Problem:

- Backend could reach Groq in some environments but failed behind corporate proxy settings.

Fix:

- Added diagnostic script and proxy-aware Groq request behavior.

Lesson:

- AI provider failures need clear diagnostics and fallback behavior.

### Avatar Persistence

Problem:

- Selected avatars were not always reflected because old avatar styles and remote avatar assumptions conflicted.

Fix:

- Switched to local avatar assets and normalized avatar style storage.

Lesson:

- External avatar generation can be unreliable for demos. Local assets make the UI predictable.

### Chat Sender Identity

Problem:

- Message ownership could break after refresh.

Fix:

- Load full user identity from database and save backend-resolved sender data.

Lesson:

- Authentication payload and frontend session shape must stay consistent.

## Defensible Claims For Resume Or Interview

These are safe claims based on the current project:

- Built a Jira/DevRev-style collaborative workspace with project-scoped chat, sprints, tickets, invite links, and member management.
- Implemented realtime project chat using Socket.IO rooms with server-side JWT authentication and project membership checks.
- Persisted chat messages and added sender-only edit/delete within a 15-minute window.
- Implemented JWT authentication with bcrypt password hashing and Redis-backed logout token blacklist for REST routes.
- Added admin-only invite sharing, invite regeneration, sprint creation, and member removal.
- Added ticket assignment validation so tasks can only be assigned to project members.
- Added dashboard-level "My Tasks" visibility across projects.
- Integrated Groq-powered project assistant summaries with local fallback analysis.
- Added deployment-ready environment configuration for MongoDB, Redis, Groq, Gemini, and frontend API URL.

Avoid claiming these unless measured or implemented:

- Do not claim sub-100ms p95 socket synchronization without a benchmark.
- Do not claim 50+ concurrent users unless load tested.
- Do not claim independent horizontal scaling yet because REST and Socket.IO currently run in the same backend process.
- Do not claim full RBAC yet because current roles are owner/admin and member.
- Do not claim sockets are revoked immediately on logout until socket blacklist checks and disconnect logic are added.

## Strong Future Roadmap

Short-term:

- Add backend tests.
- Restrict CORS.
- Add request validation schemas.
- Add message pagination.
- Add activity logs.
- Add role-based project members.

Medium-term:

- Split messages and tickets into separate collections.
- Add indexes for dashboard and board queries.
- Add Socket.IO Redis adapter.
- Add object storage for submissions.
- Add cached assistant summaries.
- Add audit logs for invite/member/admin actions.

Long-term:

- Split REST API, realtime gateway, and worker into separate services.
- Add load balancer and horizontal scaling.
- Add CI/CD pipeline.
- Add metrics, tracing, and alerting.
- Add organization/workspace hierarchy.
- Add billing-style tenant isolation if required.

## Final Senior-Level Summary

This project is a strong MVP because it solves a real collaboration problem end to end: users can form project groups, communicate, plan work, assign tasks, submit deliverables, and get AI-assisted project context. The best engineering decisions are the backend-enforced project membership checks, Socket.IO project rooms, persisted chat, admin-only controls, and fallback behavior for AI.

The biggest architectural tradeoff is using embedded arrays inside the project document. That helped ship the MVP quickly, but the next serious scaling step is to split high-growth data into separate collections and add indexes. The realtime layer also needs a Redis adapter before horizontal scaling. With those changes, the project can evolve from a strong demo/MVP into a more production-ready collaboration platform.
