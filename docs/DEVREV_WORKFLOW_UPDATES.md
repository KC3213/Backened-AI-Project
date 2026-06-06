# DevRev/Jira Workflow Updates

## Summary

This branch adds the first Jira/DevRev-style workflow layer to the project workspace:

- Reliable project chat over Socket.IO.
- Persisted project messages.
- Invite code and invite link joining.
- Project sprints.
- Project tickets with assignment, priority, and status updates.
- Responsive project dashboard with Chat, Work, and Files tabs.

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

Inside a project, members can create sprints and tickets.

Sprint fields:

- Name
- Goal
- Status: `planned`, `active`, `closed`

Ticket fields:

- Title
- Description
- Status: `todo`, `in-progress`, `review`, `done`
- Priority: `low`, `medium`, `high`, `urgent`
- Assignee: project member
- Sprint: sprint or backlog

Ticket updates are project-scoped. Only project members can update tickets for that project.

## UI Changes

Dashboard:

- Responsive project cards.
- Join-by-code form.
- Create-project modal.

Project workspace:

- Header with socket connection state.
- Chat tab for persisted realtime messages.
- Work tab for sprint and ticket management.
- Files tab for AI-generated code/file-tree editing and WebContainer preview.
- Member drawer.
- Invite card with copy-link and regenerate actions.

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
- Connected two Socket.IO clients to the same project room.
- Sent one project message.
- Confirmed both clients received the same server-saved message.
- Created a sprint.
- Created a ticket assigned to the joined member.
- Updated ticket status to `in-progress`.

Smoke-test result:

```json
{
  "ownerMessages": 1,
  "memberMessages": 1,
  "joinedMembers": 2,
  "sprint": "Sprint 1",
  "ticket": "Fix socket",
  "updatedStatus": "in-progress"
}
```

## Notes

- `@ai` chat responses still require a real `GOOGLE_AI_KEY` in `backend/.env`.
- Frontend lint still reports existing Fast Refresh warnings for the user context export pattern. There are no lint errors.
