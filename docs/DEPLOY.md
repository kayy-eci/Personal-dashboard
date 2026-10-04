# Deployment

The app is a static Vite PWA. Any static host works.

## Build

```sh
npm install
npm run build
```

Output is in `dist/`. Serve that folder with SPA fallback (all routes →
`index.html`).

## Example: Netlify / Vercel / Cloudflare Pages

- Build command: `npm run build`
- Publish directory: `dist`
- Settings → Data shows that the current deployment must not change origin.

## Required headers

```
/sw.js        Cache-Control: no-cache
/index.html   Cache-Control: no-cache
```

`manifest.webmanifest` and assets use hashed filenames and can be cached.

## Post-deploy checklist

- [ ] App loads over HTTPS
- [ ] Manifest + service worker register (DevTools → Application)
- [ ] Hard reload works offline after one visit
- [ ] New deploy shows the update toast, and Reload picks it up
- [ ] Create a habit, check it in, reload — data persists
- [ ] Settings → Data shows IndexedDB and persistence status
- [ ] Export → import round-trip works

## Same URL forever

IndexedDB data is tied to the exact origin. If you must move the app to a new
domain or port, use Settings → Data → Export before cutting over and Import
after.

## Rollback

Redeploy the previous build from the host. User data is unaffected because the
service worker never touches IndexedDB. Bump the database version only with a
schema migration (see docs/DATA.md).
