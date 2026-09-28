# Academic Stress Lab

Deploy this repository on Netlify. Build: `npm run build`. Publish directory: `public`. Node.js 24.

The classroom API runs in Netlify Functions and stores classroom records in Netlify Blobs with strong reads. It does not call the former ChatGPT Sites backend and requires no external database credentials. Each participant, vote and post has a separate storage key, so different students do not overwrite one another. SQLite is used in memory to execute validated classroom queries. Writes are persisted before success is acknowledged.

Create a NEW classroom after deployment. Previous rooms on the former hosting service are not migrated. Keep the creating browser tab open to retain host access. Share the student QR code shown in the classroom.

Rooms expire after 24 hours. Expiration blocks access; it does not automatically purge stored blobs. Hosts can delete classroom contents using the classroom controls. Netlify usage limits apply.

Run `npm test` to verify 50 concurrent students, vote updates and totals, forum posts/replies, host authorization, cross-origin rejection and deletion against an in-memory storage adapter. Live deployment testing is additionally required to verify the platform storage binding.
