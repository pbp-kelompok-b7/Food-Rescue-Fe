# SL-FE-01 / SL-FE-02 verification

Branch: `feat/supply`. Implements `/supply`, `/supply/:id`, `/supply/new`, and `/supply/:id/edit`. Uses the existing SF-FE-04 reference/location changes in this working tree. Backend files were not changed.

## Sources

- Technical Design & API Contract Food Rescue 2026 - Revisi 2, sections 7.2.1–7.2.4, inspected directly from the local document.
- Live frontend issues #6 and #7.
- Live Figma file `IHKy4C88HVCrLH0B3wCbsU`: browse `38:591` / `38:781`, detail `42:886` / `42:887`, form `42:888` / `42:889`. Desktop and mobile contexts/screenshots were inspected directly. The no-photo icon is bundled from the detail frame. Required category/suitability controls are included according to the API contract. No stock listing photo or fabricated production listing is included.

## Behavior

- Browse uses public listing queries only. Search, area, type, category, mode, suitability, ordering, and page live in URL parameters; query changes reset pagination. Aborted responses cannot overwrite newer results. Pagination constructs local page queries instead of following arbitrary API URLs.
- Cards show `quantity_available`, unit, mode/price, area, deadline and status. Detail explicitly renders public fields, never WhatsApp/email. Guest claim links preserve the claim destination through login. Owners cannot self-claim; expired, archived, empty and terminal listings disable the claim action. Actual reservation submission remains the separate claim task.
- Create/edit load reference choices and use manual LocationSearch selection. Type changes clear incompatible category/suitability. Decimal quantities/prices remain strings, donation price is `0.00`, and local dates are explicitly interpreted as Asia/Jakarta.
- Writes bootstrap CSRF and include session credentials. Synchronous submission locking prevents duplicate writes. Successful writes navigate to detail with a success notice; failures preserve input. Known backend field errors map to controls. CSRF, permission, missing resource, quantity-floor, unit-lock, service and expired-session failures are handled without displaying raw internal server messages.
- Edit checks ownership/admin for the UI, with the backend remaining authoritative. PATCH contains only changed writable fields and preserves an unchanged timestamp including its seconds/offset. Editing an expired listing does not reopen its status. Conflict detail opens separately to preserve the current draft.

## Automated verification

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd test`: 16 API/helper tests and 95 UI tests, including 29 Supply tests.
- `npm.cmd run build`

Supply tests cover URL parameters, pagination/reset, stale responses, empty/error/retry, public contact privacy, owner/non-owner edit, guest redirects, terminal/expired availability, both sharing modes, selected-location payloads, CSRF bootstrap/failure, duplicate submission, field errors, minimal PATCH, Jakarta timestamps, 401/403/404/409/500/501, and mobile filter-sheet apply/cancel. UI tests run in jsdom with mocked HTTP; native dialog methods are stubbed for the filter-sheet interaction test.

## Browser verification and limits

The normal local frontend loaded the real Supply route and its connection-error state. A separate frontend on port 5189 and temporary local contract mock on port 18993 verified populated browse, detail, owner-edit prefill, and save-to-detail success in a real browser. The mock was isolated from the backend and normal frontend, then stopped and removed.

This is not successful integration with the real Supply backend. The inspected backend checkout still has 501 scaffold handlers for listing GET/POST/detail/PATCH. End-to-end DONATE/SELL and transaction-conflict verification against the implemented backend remains pending. Desktop/mobile Figma references were consulted; visual approval and mobile device review remain with the user.
