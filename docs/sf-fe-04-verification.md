# SF-FE-04 — Reference-data dan pemilihan lokasi bersama

Scope: shared frontend components/services for [issue #4](https://github.com/pbp-kelompok-b7/Food-Rescue-Fe/issues/4). Backend endpoints and business pages remain separate tasks.

## Contract and design

- Checked local Technical Design & API Contract Food Rescue 2026 — Revisi 2, sections 7.0, 7.6.1–7.6.2 and the Supply/Request compatibility rules.
- Checked live Figma LocationPicker instance `18:785` directly using design context and its screenshot, file `IHKy4C88HVCrLH0B3wCbsU`. Existing 20px padding, 16px gaps, 44px controls, result row, selection button, attribution, fonts, tokens and location icon are reused. Optional area and retry controls extend that component for the API contract.
- Visual contract: reusable platform form fields inside each module's dedicated create/edit page; moderate density; no extra dashboard or business route. Required states are loading, reference failure/retry, dependent options, search pending/empty/error, selection and 429 cooldown. Final visual review belongs to the user.

## Behavior

- Typed reference-data service normalizes enum strings or code/label objects and preserves server codes. Categories follow resource_type; consumption/waste suitability follows canonical compatibility rules. Switching type resets dependent category/suitability/intended_use.
- ResourceFieldControls can use one page-owned reference response; ResourceFields loads its own response. Loading/error states never invent fallback choices. Validation and partial payload helpers support Supply, Request and Offer.
- Quantities/prices stay strings, with quantity precision from the selected unit and the contract quantity maximum. DONATE clears the sell price to `0.00`; SELL requires a positive price with at most two decimals. Invalid or past deadlines are rejected, and input time is explicitly interpreted as Asia/Jakarta and serialized with `+07:00`.
- LocationSearch calls only the application's `/locations/search/` service after an explicit click or Enter. It sends q/area/limit only; short queries never reach the server. It does not use browser geolocation, direct Nominatim calls, autocomplete, radius or nearest search.
- Complete result objects include label, area, coordinates and attribution; locationPayload excludes attribution from business writes. Editing query/area invalidates selection and aborts/ignores old responses. Search/selection cannot submit an enclosing form.
- Empty results, loading, service/network failure, safe error copy, retry and Retry-After seconds/HTTP dates are handled. A 429 cooldown survives query edits. Existing API error consumers remain compatible.

## Verification — 27 October 2026

- 16 API/helper tests passed, including reference vocabulary, query/selected-location shape, invalid coordinates, Retry-After seconds/date, decimal precision and Jakarta timestamp validation.
- 66 component tests passed across the existing auth/profile suites and the new shared-fields suite. New coverage includes manual search, minimum query, parent-form isolation, selection, stale response, double search, cooldown, 501/502/503 retry, reference failure/retry, dependent-field reset, Supply/Request/Offer payload mapping, unit precision and DONATE/SELL switching.
- Typecheck, lint and production build passed. Typecheck/build and tests needed execution outside the sandbox because filesystem/worker restrictions prevented generated types or test workers from running normally.
- Opened the real development catalog and inspected the rendered reference/location error state. The live frontend showed reference failure and a retryable location-search provider error. No successful real reference-data/geocoding response or complete business transaction is claimed.

## Usage and remaining integration

- Development preview: `/components#reference-location`, with Supply/Request/Offer examples calling the configured API. It never posts a business transaction; this preview is excluded from the production route tree.
- Module owners should compose ResourceFieldControls and LocationSearch in their own forms, validate the shared fields before write, then add module-specific fields and constraints (such as an offer's target request requirements).
- SF-BE-04 remains a backend prerequisite. The local backend source still returns 501 for both endpoints. Success/provider integration, full Supply/Request/Offer pages, and final desktop/mobile visual review remain unverified here.
