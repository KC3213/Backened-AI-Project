# Admin Invite And Account Updates

## Summary

This update adds two workflow rules to the workspace:

- Only the project admin can view, copy, regenerate, or share a project invite link.
- The dashboard sidebar now includes basic Account and Settings panels for the logged-in user.

## Invite Access Rule

The project owner is treated as the project admin.

Admins can:

- See the invite code.
- Copy the invite link.
- Regenerate the invite code.
- Open the Add people modal.

Members can:

- Chat in the project.
- View project members.
- Work with tickets.
- Join projects when they already have a valid invite link or code.

Members cannot:

- See the invite code in project details.
- See the invite link in the project sidebar.
- Regenerate invite codes.
- Add collaborators.

## Backend Enforcement

The backend now sanitizes project responses for non-admin users by removing `inviteCode` before returning the project payload.

The backend also checks project ownership before allowing:

- `PUT /projects/add-user`
- `POST /projects/:projectId/regenerate-invite`

This matters because hiding buttons in React is not enough. Without backend enforcement, a member could still call the API directly.

## Frontend Changes

Dashboard:

- Project cards now show `Admin access` or `Member access` instead of showing invite codes.
- Sidebar includes an Account card with email, user ID, admin project count, member project count, and total ticket count.
- Sidebar includes a Settings card showing current workspace defaults, including admin-only invite links.

Project page:

- The Add people button only renders for project admins.
- The invite code/copy/regenerate panel only renders for project admins.
- Members see a neutral `Invite access` note without the code or link.
- The `/users/all` collaborator lookup only runs for project admins.

## Verification

Expected behavior:

- Admin opens a project and sees invite controls.
- Member opens the same project and does not see invite code, invite link, copy button, regenerate button, or Add people.
- Member API response from `/projects/get-project/:projectId` does not include `inviteCode`.
- Member requests to regenerate an invite fail with `Only project admin can perform this action`.
