# Ringkasan Pengerjaan P0 — Branch `feature/lifeos-p0`

Tanggal: 19 Oktober 2026 | Referensi: `docs/LifeOS-PRD.md`

Lingkup: menutup sisa gap P0 saja, tidak memulai fitur P1. Setiap item
melewati `typecheck`, `lint`, `test`, dan `build` sebelum commit.

## Item yang dikerjakan

| # | Item | Komit | Inti perubahan |
|---|------|-------|----------------|
| 1 | Verifikasi FR-1.5, FR-1.9, FR-1.10 | `6d189a8` | FR-1.5 dan FR-1.10 dinyatakan lulus (input rules StarterKit + History). Gap FR-1.9 ditutup: markdown paste kini menjadi blok (`lib/markdown-paste.ts` + ekstensi `MarkdownPaste`), 6 uji unit baru. |
| 2 | FR-2.7 breadcrumbs + kolom cover | `a721073` | Breadcrumbs sudah lulus (klik-able, pemotongan tengah). Kolom `pages.cover` ditambah lewat migrasi v3 dengan cadangan pra-migrasi; uji migrasi v3 baru. |
| 3 | FR-1.1 block IDs | `1652206` | `normalizeBlockIds()` memberi UUIDv7 pada blok top-level tanpa id saat halaman dimuat/disimpan; `schema_version` dokumen naik ke 2; global attribute Tiptap menjaga id saat round-trip; uji migrasi dokumen tanpa id. |
| 4 | FR-1.3 Ctrl/Cmd+K | `59d9a7f` | Ctrl/Cmd+K membuka editor link pada seleksi aktif; seleksi kolaps otomatis memilih kata; tercantum di lembar pintasan. |
| 5 | FR-3.2 hard flush | `beb8d9b` | Hard flush ketik berkelanjutan 5 s → 1,5 s; debounce tetap 500 ms; uji default hard flush 1,5 s ditambahkan. |
| 6 | Uji paksa-bunuh | `4c287e9` | `tests/forced-kill.e2e.mjs` (Playwright `_electron`): 50 putaran ketik → SIGKILL → jalankan ulang → periksa DB. Hasil: 50/50 ALL PASS, `quick_check=ok`, kerugian ≤ 1,5 s. Skrip `LIFEOS_USER_DATA_DIR` di `electron/main.ts` agar uji memakai folder uji. Jalankan: `npm run test:kill`. |
| 7 | FR-4.5 CI installer | `9d30ca7` | `.github/workflows/build.yml`: Windows (NSIS, unsigned) di `windows-latest`, hasil `release/*.exe` diunggah sebagai artefak `LifeOS-windows-installer`. |
| 8 | change_log per jalur tulis | `16bdec0` | Audit semua jalur tulis (simpan konten, ganti nama, pindah, sampah, pulihkan, hapus permanen) — semua sudah menulis `change_log` dalam transaksi; uji urutan operasi per entitas ditambahkan. |
| 9 | FR-1.4 fuzzy + alias | `39be1c1` | Filter menu slash kini fuzzy berbobot (`lib/slash-filter.ts`): prefix awal kata > substring > subsequence, label > alias > keyword > deskripsi; alias eksplisit per item (`h1`, `hr`, `img`, `tdl`…). 8 uji unit baru. |
| 10 | FR-1.7 menu drag handle | `bb9e7fb` | Klik/klik-kanan grip membuka menu (block-menu.tsx): Duplicate, Turn into (semua tipe), Color (warna teks blok), Delete; tutup lewat overlay/Esc; CSS mengikuti gaya slash popup. |
| 11 | FR-1.1 duplicate block ids | `bb9e7fb` | Akar masalah terpecerah: ProseMirror menyalin attrs `id` saat Enter (split) dan turn-into, serta saat paste. Pengaman invariant `appendTransaction` pada `BlockIds` memberi UUIDv7 baru ke id ganda (renderer memakai `lib/uuid.ts` versi Web Crypto); duplicate menu memberi id baru langsung; `normalizeBlockIds` (electron) memperbaiki id duplikat tersimpan (uji unit). |
| 12 | Baseline performa | `test: tambahkan pengukur...` | `npm run test:perf` mengukur startup/pageReady/type/autosave; hasil di `docs/Performance-Baseline.md` (start ~0,99 s; pageReady ~0,59 s; 6,7 ms/ketikan; autosave ~0,83 s). |
| 13 | Verifikasi installer | `chore: metadata package...` | `npm run package` menghasilkan NSIS `release/LifeOS Setup 0.1.0.exe`; `node scripts/packaged-smoke.mjs` meluncurkan `win-unpacked/LifeOS.exe` — shell tampil, tutup bersih. Metadata package.json (description/author) dilengkapi. |

Status uji akhir: 45 unit test lulus, lint bersih, build sukses;
`npm run test:block-menu` ALL PASS; `npm run test:perf` lulus; packaged smoke OK.

## Gap P0 yang tersisa

Tidak ada gap kode P0 yang tersisa. Catatan verifikasi terbuka:

- Instalasi installer NSIS di **mesin bersih** hanya dapat dikonfirmasi manual
  (bagian dogfooding 1-2 minggu); artefak dan smoke test packaged lulus di
  mesin pengembang.
- FR-2.6 masa simpan sampah yang dapat dikonfigurasi berpindah ke Step 11
  (jendela Settings, FR-4.10) sesuai roadmap.

## Catatan

- PRD kini sudah ter-commit (revisi 1.1): Status property type, operator
  tanggal relatif, board/calendar/relation/rollup/formula naik ke P1,
  FR-6.13/6.14/6.15 baru, FR-7.10 otomasi cek-in harian, F10 starter pack,
  urutan rilis mengikuti roadmap, pertanyaan terbuka 6 diputuskan.
- `src/app/chat/ChatBox.tsx` dan `tailwind.config.js` tetap untracked di
  luar cakupan.
- Item berikutnya sesuai roadmap: dogfooding 1-2 minggu, lalu Step 11
  (Settings window).
