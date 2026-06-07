# Chat And Workflow Architecture

This document explains how the realtime chat, sprint board, ticket board, and dashboard task view were built. It is written so a fresher can understand the implementation, but it also uses professional engineering language so it can be shown in a review, interview, or project walkthrough.

## Product Goal

The goal of this project is to move from a simple AI/project app toward a DevRev or Jira style collaborative workspace.

In practical terms, the app now supports:

- A user can register, log in, and log out.
- A user can create a project.
- A project can have multiple members.
- Members can join through an invite code or invite link.
- Members can discuss inside a project chat room.
- Messages are realtime and persisted.
- The project owner acts as the admin.
- Only the admin can create sprints.
- Project members can create tickets.
- Tickets can be assigned to members.
- Tickets can move through statuses: `todo`, `in-progress`, `review`, and `done`.
- A project-level Work tab shows the board and the logged-in user's tasks.
- The dashboard shows the logged-in user's pending tasks across all projects.

The implementation is intentionally simple enough to ship quickly, while still following the correct ownership, authentication, and project-scoping rules.

## Technology Used

Frontend:

- React with Vite.
- React Router for pages.
- Axios for HTTP requests.
- Socket.IO client for realtime chat.
- Tailwind CSS utility classes for UI.
- Remix icons for button icons.

Backend:

- Express for HTTP APIs.
- Socket.IO for realtime project chat rooms.
- MongoDB with Mongoose for users, projects, messages, sprints, and tickets.
- JWT for authentication.
- Redis for logout token blacklist.
- Google Gemini service for `@ai` chat responses.

Why these were used:

- React keeps the UI component-based and easy to split into screens.
- Express is simple for REST APIs and works well with Socket.IO.
- Socket.IO is easier than raw WebSockets because it handles rooms, reconnects, events, and fallbacks.
- MongoDB fits the current project shape because projects contain arrays of messages, sprints, and tickets.
- JWT keeps auth stateless for normal API requests.
- Redis handles logout because JWTs cannot be invalidated by themselves unless the server tracks revoked tokens.

## High-Level Architecture

```text
Browser
  |
  | HTTP: login, projects, tickets, sprints
  | WebSocket: project chat messages
  v
Express API + Socket.IO server
  |
  | Mongoose queries
  v
MongoDB
  |
  | token blacklist
  v
Redis
```

The browser talks to the backend in two ways:

- HTTP APIs are used for login, project creation, invite joins, sprints, tickets, and dashboard data.
- Socket.IO is used for project chat because chat needs realtime delivery.

All protected actions use the JWT token. The backend validates the user and checks that the user belongs to the project before allowing project-specific operations.

## Data Model

The main model is `project`.

Important project fields:

- `name`: project name.
- `users`: project members.
- `owner`: project admin.
- `inviteCode`: shareable project join code.
- `messages`: embedded chat messages.
- `sprints`: embedded sprint records.
- `tickets`: embedded ticket records.

Important ticket fields:

- `title`
- `description`
- `status`
- `priority`
- `assignee`
- `sprintId`
- `createdBy`

Important message fields:

- `message`
- `sender._id`
- `sender.email`
- timestamps from Mongoose

The current design embeds messages, sprints, and tickets inside a project document. This is simple and fast to build because one project read can return the whole workspace state.

## Chat Application

### What Was Achieved

The chat system now works as a project room:

- A user opens a project.
- The frontend connects to Socket.IO with the JWT and project ID.
- The backend verifies the JWT.
- The backend loads the real user from MongoDB.
- The backend verifies that the user is a member of the project.
- The socket joins a room named after the project ID.
- When a message is sent, the backend saves it to MongoDB.
- The backend emits the saved message to everyone in the project room, including the sender.
- The frontend appends the saved message and avoids duplicates.
- Refreshing the page still shows the correct message owner.

### Why Socket.IO Was Used

Chat needs realtime communication. If normal HTTP polling were used, the frontend would need to keep asking the server every few seconds for new messages. That is wasteful and feels delayed.

Socket.IO solves this better:

- The connection stays open.
- The server can push messages immediately.
- Rooms allow project-level isolation.
- Reconnection is built in.
- It can fall back to polling if WebSocket is unavailable.

### Chat Flow

Frontend flow:

1. The Project screen gets `projectId`.
2. `initializeSocket(projectId)` creates a Socket.IO connection.
3. The JWT from local storage is sent in `auth.token`.
4. The project ID is sent in the query.
5. The frontend listens for:
   - `project-message-ready`
   - `project-message`
   - `project-message-error`
6. When the user sends a message, the frontend emits `project-message`.

Backend flow:

1. Socket middleware reads the token and project ID.
2. JWT is verified.
3. The backend loads the user by email.
4. The backend checks that the project exists and includes that user in `users`.
5. The socket joins the project room.
6. On `project-message`, the backend validates and trims the message.
7. `addMessageToProject()` saves the message to the project.
8. The saved message is emitted to the whole project room.

This means the browser does not decide who sent the message. The backend decides that from the verified token.

### Chat Refresh Bug And Fix

There was a specific bug where a user's own message could appear as if someone else wrote it after refresh.

Root cause:

- The UI checks message ownership by comparing `msg.sender._id` with `user._id`.
- Before the fix, `/users/me` returned only the decoded JWT payload.
- Older JWT payloads only had `email`, not `_id`.
- After refresh, `user._id` was missing.
- Because `user._id` was missing, the UI could not match the sender ID.

Fix:

- `/users/me` now loads the full user from MongoDB.
- New JWTs include both `_id` and `email`.
- Socket.IO also loads the real user from MongoDB before saving messages.

Why this is correct:

- The source of truth for the current user is the database, not whatever the browser sends.
- It works even for older tokens that only contain email.
- It keeps message ownership stable across refreshes.

### Chat Bottlenecks

Current bottlenecks:

- Messages are embedded inside the project document.
- A very active project can make the project document large.
- Loading a project returns all messages unless pagination is added.
- Every new message saves the whole project document path.
- There is no message pagination.
- There is no message search.
- There is no rate limit for message sending.
- Socket.IO is currently configured for a single server process.
- CORS is open with `origin: '*'`.
- `@ai` response generation happens in the same server flow.
- There is no delivery/read receipt system.
- There is no moderation or spam protection.

These are acceptable for a student or early MVP project, but they become issues when traffic grows.

### Can Chat Scale?

Yes, but the architecture needs changes before high usage.

For small scale:

- Current setup is fine for demos, college projects, and low user count.
- One Node process can handle many idle sockets, but persistence and database growth become the real limit.

For medium scale:

- Add message pagination.
- Move messages into a separate `messages` collection.
- Add indexes on `projectId` and `createdAt`.
- Fetch latest 30 or 50 messages first.
- Load older messages on scroll.
- Add rate limiting per user and per project.
- Add CORS restrictions.
- Add structured server logs.

For large scale:

- Run multiple backend instances.
- Use the Socket.IO Redis adapter so rooms work across instances.
- Put the app behind a load balancer.
- Use sticky sessions if required by the transport setup.
- Move AI response generation to a job queue.
- Store events in a separate message/event table.
- Use observability tools for latency, socket count, dropped events, and database write time.

Recommended scalable message model:

```text
messages
  _id
  projectId
  senderId
  senderEmailSnapshot
  body
  createdAt
  updatedAt
```

Recommended indexes:

```text
projectId + createdAt
senderId + createdAt
```

This allows efficient query patterns like:

- Get latest messages for a project.
- Get older messages before a timestamp.
- Search or filter messages later.

## Task And Sprint Board

### What Was Achieved

The task and sprint system creates a project workflow similar to Jira or DevRev.

Current capabilities:

- Project owner is treated as project admin.
- Admin can create sprints.
- Members can create tickets.
- Tickets can be assigned to project members.
- Tickets can be attached to a sprint or kept in backlog.
- Tickets have status and priority.
- Members can update ticket status.
- The Work tab shows tickets grouped by status.
- The Work tab shows `My tasks` for the logged-in user.
- The dashboard shows `My pending tasks` across all projects.

### Why The Project Owner Is Admin

The simplest admin model is:

- The user who creates the project becomes `owner`.
- `owner` is the project admin.
- Only the owner can create sprints.

This avoids introducing a full role system too early.

Why this was chosen:

- It is simple.
- It matches the current product stage.
- It prevents every member from creating sprints.
- It leaves room for future roles.

Future role model:

```text
projectMembers
  projectId
  userId
  role: owner | admin | member | viewer
```

That would allow multiple admins, read-only users, and cleaner permission checks.

### Invite Flow

Each project has an invite code.

Flow:

1. Project is created.
2. Backend generates a unique invite code.
3. UI shows the invite code and copy-link button.
4. A user can open `/join/:inviteCode`.
5. Backend finds the project by invite code.
6. Backend adds the user with `$addToSet`.
7. `$addToSet` prevents duplicate membership.

Why this was used:

- It is simple and practical.
- It matches common project collaboration products.
- Users do not need manual database access or admin-only user selection.

Potential improvements:

- Expiring invite links.
- Invite permissions.
- Admin-only invite regeneration.
- Email invites.
- Invite audit logs.
- Per-project join approvals.

### Sprint Creation Flow

Frontend:

- The Project screen calculates `isProjectAdmin`.
- It compares the logged-in user's `_id` with `project.owner`.
- The sprint form only renders if the user is admin.

Backend:

- `createSprint()` first checks project membership.
- It ensures older projects have an owner.
- It calls `requireProjectOwner()`.
- If the user is not the owner, it rejects the action.

Why both frontend and backend checks are needed:

- Frontend checks improve UX by hiding actions the user cannot perform.
- Backend checks enforce security.
- A user can modify frontend code, so backend validation is mandatory.

### Ticket Creation Flow

Ticket creation works like this:

1. User fills title, description, assignee, priority, and sprint.
2. Frontend sends the ticket to `/projects/:projectId/tickets`.
3. Backend verifies the user belongs to the project.
4. Backend validates the title.
5. If there is an assignee, backend checks the assignee is a project member.
6. If there is a sprint, backend checks the sprint exists in that project.
7. Backend saves the ticket inside the project.

Why this is important:

- Tickets cannot be assigned to random users outside the project.
- Tickets cannot be attached to a sprint from another project.
- All ticket data stays project-scoped.

### Board Flow

The Work tab groups tickets by status:

- `todo`
- `in-progress`
- `review`
- `done`

The dashboard groups only the logged-in user's pending tasks:

- `todo`
- `in-progress`
- `review`

It excludes `done` tasks because the dashboard is meant to answer:

```text
What do I still need to work on?
```

Each dashboard task card includes:

- Ticket title.
- Ticket priority.
- Project name.

Clicking a task card opens that project.

### Why Dashboard Pending Tasks Were Added

Project-level `My tasks` is useful only after a user opens a specific project.

The dashboard-level pending task board solves a different problem:

- A user may belong to many projects.
- They need one place to see all assigned pending work.
- They need to know which project each task belongs to.
- They should not need to manually open each project to check assignments.

This improves the workflow from:

```text
Open project A -> check tasks
Open project B -> check tasks
Open project C -> check tasks
```

to:

```text
Open dashboard -> see all pending tasks across projects
```

### Task Board Bottlenecks

Current bottlenecks:

- Tickets are embedded inside project documents.
- Sprints are embedded inside project documents.
- Dashboard reads all projects for the user and scans tickets in the frontend.
- This is fine for a few projects and tickets.
- It will become inefficient when a user has many projects or each project has many tickets.
- There is no ticket pagination.
- There is no due date or ordering.
- There is no role model beyond owner/admin.
- There is no audit trail for ticket changes.
- There is no drag-and-drop board yet.
- There is no sprint capacity, sprint status workflow, or sprint closing behavior.
- There is no notification system for newly assigned tasks.

### Can The Task Board Scale?

Yes, but the data model should change before serious scale.

Current MVP model:

```text
project
  tickets: []
  sprints: []
```

Scalable model:

```text
projects
  _id
  name
  ownerId

project_members
  projectId
  userId
  role

sprints
  _id
  projectId
  name
  goal
  status
  startDate
  endDate

tickets
  _id
  projectId
  sprintId
  title
  description
  status
  priority
  assigneeId
  createdBy
  createdAt
  updatedAt
```

Recommended indexes:

```text
tickets: assigneeId + status
tickets: projectId + status
tickets: projectId + sprintId
project_members: userId + projectId
sprints: projectId + status
```

With this model, the dashboard query becomes direct:

```text
Find tickets where assigneeId = current user and status != done
Join or populate project names
Sort by priority or due date
Limit results
```

That is much better than scanning every project and every embedded ticket.

## What Was Done Well

Good decisions in the current implementation:

- Backend validates project membership before project actions.
- Backend controls chat sender identity.
- Messages are persisted, not only broadcast.
- Sender sees the same server-saved message as everyone else.
- Invite code uses `$addToSet` to avoid duplicate members.
- Admin-only sprint creation is enforced on backend and frontend.
- Ticket assignment is validated against project members.
- Dashboard pending tasks improve cross-project visibility.
- Login/logout is centralized in the user context.
- Logout calls the backend and clears local session state.
- Socket cleanup was fixed to avoid crashing on project logout.
- Lint warnings were removed by splitting context exports.

## What Can Be Done Better

Improvements for the next phase:

- Move messages to a separate collection.
- Move tickets and sprints to separate collections.
- Add pagination for messages and tickets.
- Add due dates to tickets.
- Add task ordering inside each status column.
- Add drag-and-drop status updates.
- Add multiple project roles: owner, admin, member, viewer.
- Add notification when a ticket is assigned.
- Add audit logs for ticket changes.
- Add read receipts or message delivery status.
- Add Socket.IO Redis adapter for multiple backend instances.
- Add rate limiting for chat and project APIs.
- Restrict CORS to known frontend origins.
- Add integration tests for socket chat and task flows.
- Add error boundaries in React.
- Add production logging and metrics.

## Main Bottlenecks Summary

Chat bottleneck:

- Embedded messages make the project document grow.
- No pagination means project load becomes heavier over time.
- Single-process Socket.IO is not enough for horizontal scaling.

Task bottleneck:

- Embedded tickets make dashboard queries indirect.
- The frontend currently groups dashboard tasks after receiving projects.
- This is fine now, but large task volume should be handled by backend queries.

Auth bottleneck:

- JWT logout depends on Redis blacklist.
- If Redis is unavailable, logout blacklist behavior is affected.
- Token storage in local storage is simple but can be improved for production security.

UI bottleneck:

- The board is functional, but drag-and-drop and filters would make it closer to Jira or DevRev.
- The dashboard should eventually support sorting by due date, priority, and sprint.

## How To Explain This Professionally

A concise professional explanation:

```text
I built a project-scoped collaboration workflow. Chat uses Socket.IO rooms keyed by project ID. The socket handshake authenticates the JWT, resolves the real user from MongoDB, validates project membership, and only then joins the project room. Messages are persisted in MongoDB and broadcast back to the full room, including the sender, so all clients render the same server-saved message.

For the workflow layer, I extended the project model with owner, invite code, sprints, and tickets. The owner acts as admin and is the only user allowed to create sprints. Tickets are project-scoped, can be assigned only to project members, and move through todo, in-progress, review, and done. The project page shows a board plus user-specific tasks, while the dashboard aggregates pending assigned tasks across all projects.

The current model is suitable for an MVP because messages, sprints, and tickets are embedded in the project document. For scale, I would split messages, tickets, sprints, and project memberships into separate collections with indexes, add pagination, use a Socket.IO Redis adapter, and move AI work to a background queue.
```

## Final Architecture Decision

The project currently uses an MVP-first architecture:

- Simple enough to understand.
- Fast enough for small teams.
- Secure enough for basic project membership enforcement.
- Structured enough to evolve into a more scalable architecture.

The most important future change is to separate high-growth data:

- Messages should become their own collection.
- Tickets should become their own collection.
- Sprints should become their own collection.
- Project membership should become its own role-based collection.

That is the path from a working student project to a production-grade collaboration platform.
