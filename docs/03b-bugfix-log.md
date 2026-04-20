# Bugfix Log

## Failure Summary
- Reported issue: `/login` kept re-rendering/looping instead of stabilizing on the login form.

## Root Cause Analysis
- `AuthBootstrap` in the client app was re-running session restore logic on auth-state changes.
- Repeated refresh/clear-auth cycles during boot could keep the app in a redirect/re-render loop around the login route.

## Fixes Applied
- Updated `client/src/App.tsx` to read auth store slices with selectors (`user`, `setAuth`, `clearAuth`) instead of subscribing to the whole store object.
- Changed session restore effect to run once per app boot with an unmount guard.
- Read the current user from `useAuthStore.getState()` inside restore logic to avoid stale closure behavior.

## Verification Results
- Code-level verification completed by inspecting route/auth bootstrap flow after the patch.
- Runtime browser/terminal verification was not executed in this tool session.

## Remaining Known Issues
- None identified from static review of this bugfix.