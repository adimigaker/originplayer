# OriginPlayer

Playlist streaming opensource. Tanpa akun — cukup kode.

- Landing: `/playlists` (Buat / Muat)
- Buka playlist: `/p/KODE` (deep link buat share)
- Embed per episode: URL seeks / abyss / MP4-HLS langsung (diputar via Clean Player)

## Setup

1. Jalankan `supabase_playlists.sql` sekali di Supabase SQL Editor (bikin tabel
   `ps_playlists` + `ps_playlist_items`).
2. Isi env `TMDB_API_KEY` (key gratis dari themoviedb.org) untuk autofill
   metadata IMDb/TMDB. Tanpa key, form manual tetap jalan.
3. `npm install && npm run dev` — deploy ke Vercel untuk production.

## Aturan kode playlist

Huruf, angka, `-` dan `_` saja (tanpa spasi), case-sensitive. PIN opsional
(gembok biasa, bukan brankas — siapa pegang kode tetap bisa baca via API).
