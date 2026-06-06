# DevRev/Jira Workflow Updates

## Summary

This branch adds the first Jira/DevRev-style workflow layer to the project workspace:

- Reliable project chat over Socket.IO.
- Persisted project messages.
- Invite code and invite link joining.
- Project sprints.
- Project tickets with assignment, priority, and status updates.
- Responsive project dashboard with Chat and Work tabs.
- Admin-only sprint creation.
- My tasks view for tickets assigned to the logged-in user.

## Realtime Chat

The previous socket flow trusted sender data from the browser and only broadcast messages to other clients. The sender manually appended their own message locally, so chat could appear broken or inconsistent.

The new flow:

1. Socket connection authenticates the JWT.
2. Backend resolves the real user from the token.
3. Backend verifies the user belongs to the project room.
4. Backend persists the message in the project.
5. Backend emits the saved message to every connected project member, including the sender.

Socket events:

- `project-message-ready`: connection accepted for the project room.
- `project-message`: saved project message.
- `project-message-error`: server-side validation or delivery error.

## Invite Flow

Each project has an invite code.

Project members can:

- Copy a link like `/join/:inviteCode`.
- Share the code manually.
- Regenerate the invite code.

Joining:

1. User logs in or registers.
2. User opens the invite link or enters the code on the dashboard.
3. Backend adds the user to the project with `$addToSet`.
4. User lands inside the joined project.

## Sprint And Ticket Flow

Inside a project, the project admin can create sprints. The project admin is the project owner. For older projects without an owner, the backend backfills the owner from the first project member.

Sprint fields:

- Name
- Goal
- Status: `planned`, `active`, `closed`

Members can create tickets for the project and assign tickets to any project member.

Ticket fields:

- Title
- Description
- Status: `todo`, `in-progress`, `review`, `done`
- Priority: `low`, `medium`, `high`, `urgent`
- Assignee: project member
- Sprint: sprint or backlog

Ticket updates are project-scoped. Only project members can update tickets for that project.

Backend sprint permission:

1. Request user must belong to the project.
2. Backend ensures the project has an owner.
3. Backend rejects sprint creation unless `project.owner` matches the request user.

Frontend sprint permission:

- The sprint form is only shown to the project admin.
- Non-admin users can still create tickets and update ticket status.

## Chat Refresh Author Fix

The chat author display bug came from `/users/me` returning only the decoded JWT payload. Existing tokens did not include `_id`, so after refresh the frontend could not compare the logged-in user ID to the saved message sender ID.

Fix:

- `/users/me` now loads the full user from MongoDB.
- New JWTs include `_id` and `email`.
- Existing tokens still work because the backend resolves the user by email.

See [CHAT_REFRESH_AUTHOR_FIX.md](CHAT_REFRESH_AUTHOR_FIX.md) for the detailed root cause and manual verification steps.

## UI Changes

Dashboard:

- Responsive project cards.
- Join-by-code form.
- Create-project modal.

Project workspace:

- Header with socket connection state.
- Chat tab for persisted realtime messages.
- Work tab for sprint and ticket management.
- Larger Work layout with more spacing, wider board columns, and taller ticket lanes.
- My tasks panel for tickets assigned to the logged-in user.
- Member drawer.
- Invite card with copy-link and regenerate actions.

Removed:

- Files tab and WebContainer preview from the project workspace UI.
- Sprints sidebar card, since sprint creation and ticket assignment now live in the Work tab.

## Verification

Commands run:

```bash
cd backend && npm run check
cd frontend && npm run lint
cd frontend && npm run build
```

Behavior smoke-tested:

- Registered owner user.
- Registered member user.
- Created project.
- Joined project through invite code.
- Connected a Socket.IO client to the project room.
- Sent one project message.
- Confirmed the message persisted with the sender ID matching the refreshed `/users/me` user ID.
- Created a sprint.
- Confirmed only the project owner can create a sprint.
- Created a ticket assigned to the joined member.
- Updated ticket status to `in-progress`.
- Confirmed `/users/me` returns a user with `_id`.
- Checked the Work UI in the browser at desktop and 390px mobile widths.

Smoke-test result:

```json
{
  "ownerHasId": true,
  "projectOwner": "owner.<suffix>@t.dev",
  "memberSprintStatus": 400,
  "sprint": "Owner sprint",
  "ticket": "Assigned smoke ticket",
  "memberTaskCount": 1,
  "socketSenderMatchesRefreshUser": true
}
```

## Notes

- `@ai` chat responses still require a real `GOOGLE_AI_KEY` in `backend/.env`.
- Frontend lint still reports existing Fast Refresh warnings for the user context export pattern. There are no lint errors.
