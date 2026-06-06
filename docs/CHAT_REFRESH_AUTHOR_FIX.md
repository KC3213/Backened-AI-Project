# Chat Refresh Author Fix

## Problem

After sending a chat message and refreshing the browser, the same saved message could render as if it was written by another user.

## Root Cause

The chat UI decides whether a message belongs to the logged-in user by comparing:

```js
msg.sender?._id === user?._id?.toString()
```

Persisted project messages already store `sender._id`, but the refreshed frontend user came from `GET /users/me`.

Before this fix, `/users/me` returned only the decoded JWT payload. Existing JWTs contained only the user's email, not the database `_id`. After refresh, `UserContext.user._id` was missing, so the ownership comparison failed and the UI treated the logged-in user's saved messages as someone else's messages.

## Fix

- `/users/me` now resolves the full user from MongoDB by `req.user.email`.
- New JWTs now include both `_id` and `email`.
- The socket server continues to resolve the real user from MongoDB before saving chat messages, so sender IDs are controlled by the backend.

This keeps old tokens working because the backend can still use the email in the token to load the full user.

## Verification

1. Log in as a user.
2. Open a project where that user is a member.
3. Send a project chat message.
4. Refresh the browser.
5. Confirm the saved message still renders on the logged-in user's side of the chat.
6. Confirm `GET /users/me` returns a `user` object with `_id`.

## Related Files

- `backend/controllers/user.controller.js`
- `backend/models/user.model.js`
- `backend/server.js`
- `frontend/src/context/user.context.jsx`
- `frontend/src/screens/Project.jsx`
