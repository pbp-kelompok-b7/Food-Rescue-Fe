# SF-FE-02: profile and contact

`/profile` requires a session and loads the account from `GET /api/v1/users/me/`.
Saving bootstraps CSRF and sends only `display_name` and `whatsapp_number` to
`PATCH /api/v1/users/me/`. Email stays read-only. Empty contact becomes `null`;
nonempty contact must match E.164 (`+` followed by 8–15 digits, first digit nonzero).
A successful response updates the page and shared account state without rechecking
the session or unmounting the form. Errors retain edits; 401 clears the session.

The layout follows the live Figma profile frames `25:675` (desktop) and `25:764`
(mobile) in file `IHKy4C88HVCrLH0B3wCbsU`, using existing controls and tokens.
Because this checkout has no dashboard route, the back link goes to `/my/supply`
and says “Kembali ke aktivitas”. Shared account navigation remains functional.

## Verification

Automated UI tests cover server-loaded values, read-only email, editable-only
payloads, CSRF, account-state synchronization, null contact, E.164 validation,
duplicate submissions, field errors, retry, expired sessions, and logout.
Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

On 2026-10-27, browser checks against the current local Django implementation in
an isolated PostgreSQL test database verified name/contact updates, persistence
after reload, removal of contact, invalid-contact feedback, and guest redirection.
Desktop (1280px) and mobile (390px) viewports had no horizontal overflow.

The tested backend profile implementation is currently an uncommitted local
change in the backend repository. This frontend does not implement or alter it.
The pickup scheduling page remains a scaffold, so rejection of scheduling when
either party lacks WhatsApp has not been verified end to end. The profile UI
explains that requirement; enforcement belongs to the pickup/backend work.
