-- Migrasi v2: slug per item untuk URL cantik /p/KODE/slug-judul/EP
-- Jalankan sekali di Supabase SQL Editor (setelah v1).

alter table ps_playlist_items add column if not exists slug text;

-- Isi slug dari judul untuk baris lama
update ps_playlist_items
set slug = nullif(trim(both '-' from lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))), '')
where slug is null;

-- Yang duplikat dalam satu playlist: tempel -id
update ps_playlist_items p
set slug = p.slug || '-' || p.id
where exists (
  select 1 from ps_playlist_items q
  where q.playlist_code = p.playlist_code
    and q.slug = p.slug
    and q.id < p.id
);

create unique index if not exists ps_items_code_slug
  on ps_playlist_items(playlist_code, slug);
