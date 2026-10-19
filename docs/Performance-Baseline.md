# LifeOS — Baseline Performa

> Dibuat saat penutupan P0 (Step 10), 19 Oktober 2026. Tujuan: setiap
> regresi berikutnya dibandingkan dengan angka yang diukur, bukan rasa.
> Jalankan ulang: `npm run test:perf` — hasil khusus tergantung mesin.

## Lingkungan pengukuran

- Windows (mesin pengembang), Node 26, Electron 44, build produksi (`npm run build`).
- Workspace baru per putaran; 3 putaran default; laporan rata-rata.

## Metrik (rata-rata dari 3 putaran)

| Metrik | Nilai | Arti |
| --- | --- | --- |
| `startupMs` | ~991 ms | Electron launch → `domcontentloaded` jendela pertama. |
| `pageReadyMs` | ~588 ms | Klik "Create a page" → editor `.ProseMirror` tampil dan interaktif. |
| `typeMsPerKey` | ~6,7 ms/ketikan | 160 ketikan tanpa jeda → waktu rata-rata per ketikan (proxy kecepatan interaktif mengetik). |
| `autosaveMs` | ~835 ms | Ketikan terakhir → indikator kembali "Saved" (termasuk debounce 500 ms + write SQLite; di bawah hard flush 1,5 s). |

Angka mentah per putaran (2026-10-19): startup 999/1046/927, pageReady 619/594/550,
type 8,1/6,4/5,7, autosave 837/828/839.

## Cara pakai ulang

```bash
npm run build      # hasil out/ + dist-electron/ yang diukur
npm run test:perf  # LIFEOS_PERF_RUNS=N untuk jumlah putaran
```

Skrip: `tests/perf-baseline.e2e.mjs` (Playwright `_electron`). Metrik baru
(seperti muat ulang dokumen besar) ditambahkan ke skrip yang sama.
