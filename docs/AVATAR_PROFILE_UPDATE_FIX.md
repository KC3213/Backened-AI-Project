# Avatar Profile Update Fix

## Problem

The avatar picker could show a selected avatar during signup, but existing users had no way to persist a new avatar choice after the account was already created.

That made the app look like it was taking the old avatar because login and `/users/me` returned the avatar saved in MongoDB. The frontend rendered that saved user object correctly, but the saved object was stale for users created before the local avatar picker existed.

## Root Cause

The application had:

- A frontend avatar picker on registration.
- Local SVG avatar assets under `frontend/public/avatars`.
- A `user.avatar` field in MongoDB.

The missing piece was a profile update API. Once a user account existed, selecting another avatar in the UI could not update MongoDB or the active React user session.

## Fix

Backend changes:

- Added `PUT /users/profile`.
- Added `updateUserProfile` in `backend/services/user.service.js`.
- Normalized legacy avatar styles into local downloaded SVG avatars.
- Changed the default user avatar from legacy `adventurer` to a local avatar SVG.
- Ensured `/users/me` and login normalize stale avatar data before returning the user.

Frontend changes:

- Added an `updateSessionUser` helper in the user context.
- Added avatar and display-name editing to the dashboard Account panel.
- Updated the account panel after a successful save so the avatar changes immediately without requiring logout/login.
- Made avatar rendering resolve the active style from the saved user object instead of trusting stale URLs.
- Replaced the old six placeholder avatar choices with the new local avatar SVG set.

## Expected Behavior

1. A user opens the dashboard.
2. The Account panel shows the current saved avatar.
3. The user selects a different local avatar and clicks `Save profile`.
4. The frontend calls `PUT /users/profile`.
5. MongoDB stores the new `avatar.style`, `avatar.seed`, and `avatar.url`.
6. The React user session updates immediately.
7. Refreshing the page keeps the selected avatar because `/users/me` now returns the saved avatar.

## Why This Is Better

The fix stores avatar choice as user profile data instead of treating avatar selection as temporary frontend state. It also avoids third-party avatar fetches because all avatar images are local SVG files committed in the frontend.
