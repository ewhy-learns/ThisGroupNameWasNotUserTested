This directory contains generated mock data for the web frontend (accounts, profiles, events).

Files:
- `accounts.json` — array of organiser accounts (id, createdAt)
- `profiles.json` — array of organiser profiles (Profile shape)
- `events.json` — array of EventItem objects (as used by AuthService.saveEvent/listEvents)

How to load into the running dev frontend (Vite):

1. Start the web dev server from the `web` folder:

```powershell
cd web
npm install   # if you haven't already
npm run dev
```

2. Open the app in your browser (usually http://localhost:5173). In the browser console you can run the following snippet to import the mock data into localStorage:

```javascript
;(async () => {
  const base = '/mock-data'
  const [accounts, profiles, events] = await Promise.all([
    fetch(base + '/accounts.json').then(r=>r.json()),
    fetch(base + '/profiles.json').then(r=>r.json()),
    fetch(base + '/events.json').then(r=>r.json()),
  ])

  // write accounts
  localStorage.setItem('demo1_accounts_v1', JSON.stringify(accounts))

  // write profiles (save under demo1_profile_v1_<id>)
  for (const p of profiles) {
    localStorage.setItem('demo1_profile_v1_' + p.id, JSON.stringify(p))
  }

  // write events
  localStorage.setItem('demo1_events_v1', JSON.stringify(events))

  console.log('Imported mock data: accounts=', accounts.length, 'profiles=', profiles.length, 'events=', events.length)
})()
```

3. After running the snippet, refresh the app UI. You should see the mock events in lists and the organiser accounts available for testing (organiser01@example.org ... organiser100@example.org).

Notes:
- These mock accounts are for prototype/testing only and are not linked to the server authentication API. If you want the server to accept these organisers as seed users, we can also write them into the server side store (ask and I will add them).
- The generator script used to create these files is `web/scripts/generate-mock-data.mjs`.

