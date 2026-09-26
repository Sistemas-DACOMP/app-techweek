### Verdict
**PASS**

### Acceptance Criteria
- **1. QR client-side with qrcode.react:** Met. The external API call to `api.qrserver.com` was removed and replaced with `<QRCodeSVG />` from `qrcode.react`.
- **2. QR content = ticketId:** Met. The `getBadgeQrValue` correctly extracts `qrCodeData` or `ticketNumber` from the Sympla ticket, ensuring consistency with the physical badge.
- **3. Mascots component and accumulated points:** Met. `<MascotDuo />` and `{points} pts` elements are now rendered correctly alongside the QR code.
- **4. Must work offline:** Met. SVG generation happens entirely on the client, removing the network dependency for displaying the badge.

### Bugs Found
- None. No left-over dead code was found; `qrData` and `qrUrl` were correctly removed. 

### Edge Cases Checked
- **Null/Undefined Profile:** `getBadgeQrValue` uses optional chaining (`profile?.symplaTicket`) and avoids crashing if the profile is undefined, generating a safe default JSON payload. Antigravity flagged that `Profile.jsx` accesses `profile.symplaTicket` directly without optional chaining as something to double-check — verified afterward (Claude Code, same session): `profile` is a `useState` object initialized with `symplaTicket: null` and is never set to `null`/`undefined` anywhere in the component, so the direct access is safe in practice. Real, useful catch to verify even though it turned out not to be a bug — exactly the kind of thing an independent second reviewer should surface.
- **Missing Ticket:** Handled correctly. If no ticket is linked, it falls back to a local JSON identifier containing the username and course, while visually blurring the badge.
- **Undefined values in fallback JSON:** Optional chaining guarantees values like `course` or `period` don't throw, and fallback values (like `'user'`) are assigned properly.
