# LifeOS

LifeOS is a local-first desktop notes app built with Electron and a statically
exported Next.js renderer.

## Development

Install dependencies with `npm install`, then run:

```bash
npm run dev
```

This starts the Next.js development renderer and opens it in the secure Electron
window.

## Build

```bash
npm run typecheck
npm run build
npm run package
```

`npm run build` emits the static renderer to `out/` and compiles Electron to
`dist-electron/`. `npm run package` uses electron-builder for the current OS.
Packaging uses better-sqlite3's bundled Node-API binaries and skips native
rebuilds, so creating a package does not require a platform C++ toolchain.
