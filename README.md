# Stress Lab — Academic Stress Seminar

Bilingual classroom voting, public discussion and presenter analytics.

## Deploy to Netlify

1. In Netlify choose **Add new project → Import an existing project → GitHub**.
2. Select `wxi815911-hub/academic-stress-lab` and branch `main`.
3. Configuration is in `netlify.toml`: build command `node scripts/check-deploy.mjs`, publish directory `public`, functions directory `netlify/functions`.
4. Choose the free plan if offered. Review current usage limits; do not enable paid add-ons or automatic spending unless desired.
5. Deploy and open the assigned HTTPS address. Test creating a room, joining from another phone, voting and posting before class.

Do not use static drag-and-drop or GitHub Pages alone: the API forwarding function must be deployed too.

## How this deployment works

The browser loads the compiled React application from Netlify and sends all requests to the same Netlify origin. The server-side function forwards only the classroom API to the existing public Stress Lab backend at `academic-stress-lab.wxi456.chatgpt.site`. It does not forward login cookies. Host tokens remain necessary for protected operations.

**This is not an independent database migration.** Votes and posts still live in the original backend. If that backend becomes unavailable or its access changes, shared classroom features will stop working. Netlify also has usage limits. Mainland China access is not guaranteed; test with mainland mobile data and Wi-Fi without VPN.

## Classroom flow

- Presenter: **Create a classroom**, retain that tab for host controls.
- Download the generated QR and insert it into the PPT; it uses the actual deployment address.
- Students scan, join, vote, and optionally post a reason. Posts display the selection made at posting time.
- Presenter can reveal results, moderate discussion and move through three rounds.
- A room expires after 24 hours. Create the final room on the day of the seminar; QR codes for expired rooms will not join a new room.
- Practice mode is individual and does not collect shared votes.

## Files

- `public/`: compiled frontend (HTML, CSS, JavaScript), no external font/CDN dependency.
- `netlify/functions/classroom.mjs`: same-origin API gateway.
- `scripts/`: configuration check and gateway tests.
- `server.mjs`, `handlers.mjs`, `migrations/`, `Dockerfile`, `compose.yaml`: optional standalone Node/SQLite deployment. See `SELF_HOSTING.md`. These files are not run by Netlify.

The frontend here is a production bundle rather than editable React source. No account passwords, API keys or classroom data are included. This is a classroom discussion tool, not a clinical assessment.
