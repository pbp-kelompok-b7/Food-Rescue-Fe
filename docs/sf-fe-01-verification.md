# SF-FE-01: register, login, session, logout

Implements [issue #1](https://github.com/pbp-kelompok-b7/Food-Rescue-Fe/issues/1) against API Contract Revisi 2, sections 7.1.1–7.1.5. Branch: `feat/auth`, based on the existing `feat/landing-page` checkout.

## Behavior

- Register sends only normalized email, unchanged password, trimmed display name, and optional E.164 WhatsApp (`null` when empty). Password strength and uniqueness remain server validations. Success redirects to login without creating a frontend session.
- Login obtains CSRF before submitting, obtains the rotated token after success, and restores the actual server session before navigating. All API calls include cookie credentials. No credentials or fabricated users are stored in local storage.
- Guards preserve the original path, query, and hash through login/register. Redirect destinations must be internal and cannot point back to auth forms.
- Anonymous, loading, authenticated, and service-error session states remain distinct. Session errors offer retry; 501 never grants access. Stale refresh responses cannot restore a session after logout.
- Validation errors appear beside their fields with ARIA associations. Credential/inactive errors use the same generic message; service errors do not render raw server details. Pending requests disable inputs and prevent duplicate submissions.
- Logout sends an empty JSON object and accepts 204 without parsing JSON. Success or expired-session 401 clears frontend auth immediately; other failures retain the session and offer retry.

## Visual contract

Source checked directly with Figma `get_design_context` and screenshots for all four live frames:

- [Login desktop 25:159](https://www.figma.com/design/IHKy4C88HVCrLH0B3wCbsU/Food-Rescue?node-id=25-159)
- [Register desktop 25:217](https://www.figma.com/design/IHKy4C88HVCrLH0B3wCbsU/Food-Rescue?node-id=25-217)
- [Login mobile 25:846](https://www.figma.com/design/IHKy4C88HVCrLH0B3wCbsU/Food-Rescue?node-id=25-846)
- [Register mobile 25:902](https://www.figma.com/design/IHKy4C88HVCrLH0B3wCbsU/Food-Rescue?node-id=25-902)

Single centered form, 400px maximum width, white surface, 20px content gaps, 28px Unbounded heading, Google button and email divider, 44px inputs, 48px green submit buttons. Desktop content padding is 64px vertically; mobile uses 48px vertically and 24px horizontally. Login content minimum heights follow Figma's 685px desktop / 771px mobile; registration grows with content, with a 939px desktop minimum. The shared auth navbar and guest footer follow the frame structure. Existing Input/FormField/Button/Alert, fonts, and semantic tokens are reused. The Google icon is downloaded from the live frame's provided asset URL.

The WhatsApp placeholder uses E.164 to match the API contract instead of the design's local-number example. Public forms remain visible with a separate retry alert if session lookup fails; service errors do not grant protected access. The configured Google control uses Google's official rendered widget, preserving the 48px layout slot; the provider controls its internal font and button height. Final visual review belongs to the user. The in-app browser preview could not attach, so no rendered-app screenshot comparison is claimed.

## Google Sign-In

- Set `VITE_GOOGLE_CLIENT_ID` to the same public web-client ID as backend `GOOGLE_CLIENT_ID`. The local frontend `.env.local` was configured from that existing backend value and is ignored by Git. Other environments require their own configuration before building.
- Register the frontend origin (such as `http://localhost:5173`) in the Google OAuth client's authorized JavaScript origins. No client secret belongs in the frontend.
- Load [Google Identity Services](https://developers.google.com/identity/gsi/web/reference/js-reference), initialize once per client ID, and use its standard popup button and credential callback. No automatic One Tap prompt or automatic account selection is requested. The button rerenders to match its container when resized; pending auth requests disable it. Callbacks are disconnected when the user leaves the auth screen.
- Both login and registration screens send `{credential}` to `POST /auth/google/` after obtaining CSRF, fetch rotated CSRF after success, then reload `/auth/session/` before redirecting. Google authentication may create a backend account and sign it in; manual email registration still redirects to login without auto-login.
- Handle account collisions (`account_link_required`) without linking accounts automatically, invalid/inactive credentials, CSRF rejection, throttling, and Google unavailability. Google token verification remains on the backend; ID tokens are neither logged nor persisted by the frontend.
- SDK loading has a timeout and retry. Missing configuration or blocked SDK leaves email/password available. Logout disables Google's auto-selection alongside clearing the Django session; it does not sign out the user's Google account.

## Verification — 26 October 2026

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed.
- API client tests: 11 passed, including CSRF sequence, post-login and post-Google token rotation, credential-only Google payload, cookies, and empty logout.
- Component tests: 43 passed across the existing access/navigation suite and auth forms suite. Coverage includes registration payload/validation, backend field errors, protected redirect through signup/login, session reload, logout, unsafe redirect rejection, generic credential errors, CSRF retry, duplicate submits, service errors, Google login/signup callbacks, account collisions, unavailable/invalid Google credentials, SDK/configuration failure, and callbacks after navigation. Google SDK and fetch responses are mocked; they do not prove real provider or backend integration. Tests were run outside the sandbox because sandboxed Vitest workers could not start.

## Remaining verification

Real register → login → reload → logout and Google account selection have not been verified. During Google integration, direct backend session lookup briefly returned HTTP 200 with an anonymous session; subsequent frontend-proxy requests returned 502 and direct backend connections were refused. Thus no successful real Google credential exchange, origin authorization, or browser session restoration is claimed. The backend has separate uncommitted auth changes; this task does not modify them. Browser visual review is left to the user.
