# Optional cloud saves — setup and verification

Guest play is independent of Firebase. No project has been provisioned and no production authentication session has been verified. Missing configuration disables Google sign-in with a clear message; it does not prevent local campaigns, exports or imports.

## No-cost deployment

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/). Keep **Spark** selected. Do not link a billing account or enable Analytics.
2. Register a Web app. Copy only its public `apiKey`, `authDomain`, `projectId` and `appId`. Never use an Admin SDK credential or service-account key here.
3. Under Authentication → Sign-in method, enable Google. Under Settings → Authorized domains, add `jeenal4801.github.io` and `localhost` for local verification. Select the required support email yourself.
4. Create a **Standard** Cloud Firestore database in production mode. Choose its region deliberately; it cannot simply be changed later. Publish the exact repository `firestore.rules`, or run `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID` from this repository after signing in with the Firebase CLI.
5. In GitHub repository Settings → Secrets and variables → Actions → Variables, set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` to the registered app's actual public values. The Pages workflow passes these to Vite. Run the workflow again.
6. For local builds, set the same names in `frontend/.env.local` (ignored by Git). Do not commit fabricated values.

No Functions, paid services, background polling, Analytics or advertising are used. Rules restrict each account to its own `/players/{uid}/campaigns/{id}` documents. Each save has a strict envelope, monotonically increasing revision and at most 120,000 characters of serialized, client-validated campaign state. The serialized payload is user-controlled; rules enforce ownership and envelope/size, not truthful achievements or the semantics of every serialized field. There are no competitive leaderboards.

## Quotas checked against official documentation

Firestore Standard provides one free database, 1 GiB storage, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, and 10 GiB monthly outbound transfer. See [official quotas](https://firebase.google.com/docs/firestore/quotas) and [Spark pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans). These are project-wide quotas, not guaranteed per-player capacity. Google sign-in avoids paid SMS authentication. Leave billing disconnected to prevent automatic paid usage. Traffic exceeding Spark quotas can interrupt sync; guest saves remain available.

Writes occur at campaign checkpoints with a two-second debounce. No frames or request traces are uploaded. A list request fetches at most 20 campaigns; there are no realtime database listeners. Review the Firebase Usage dashboard before enabling wider traffic. Production usage cannot be verified until the project exists.

## Required acceptance checks before declaring cloud saves operational

- Sign in as account A, explicitly keep the guest campaign, then resume it from a second browser/device.
- Edit the same campaign on both devices. Verify a stale revision produces a conflict, preserves local progress and offers loading the cloud copy or creating a separate campaign.
- Sign out, then sign in as B. Verify A's remote campaigns are absent and cannot be read or written through direct SDK calls.
- Disconnect networking and exceed/reject a test write. Verify local progress remains, sync pauses with an actionable message, and no silent overwrite occurs.
- Delete one cloud campaign; then test account-data deletion with a disposable account. Recent Google sign-in may be required to delete authentication identity. Local saves have a separate explicit removal control.

The emulator test suite in `firebase-tests/` tests actual Firestore ownership, unauthenticated access, envelope fields, payload size, list limits, revision sequencing and deletion rules. It uses a demo project, not production credentials. CI runs it with Java 21. Run locally with `npm ci --prefix firebase-tests` and `npm test --prefix firebase-tests` when Java 21 is installed.
