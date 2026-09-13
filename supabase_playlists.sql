-- Playlist mode (opensource, tanpa akun) — jalankan sekali di Supabase SQL Editor.
-- Tabel terpisah dari PirateStudio21_DB agar tidak mengganggu situs utama.

create table if not exists ps_playlists (
  code text primary key check (code ~ '^[A-Za-z0-9_-]{1,32}$'),
  pin_hash text,
  created_at timestamptz default now()
);

create table if not exists ps_playlist_items (
  id bigint generated always as identity primary key,
  playlist_code text references ps_playlists(code) on delete cascade,
  type text check (type in ('movie','series')),
  title text not null,
  year int,
  poster text,
  backdrop text,
  synopsis text,
  genre text,
  rating float,
  "cast" text,
  director text,
  duration text,
  tmdb_id int,
  imdb_id text,
  embeds jsonb default '[]',
  downloads jsonb default '[]',
  mirrors jsonb default '[]',
  subtitles jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists ps_items_code_idx on ps_playlist_items(playlist_code);

-- RLS terbuka seperti tabel utama (akses = siapa pegang kode; PIN dicek di aplikasi)
alter table ps_playlists enable row level security;
alter table ps_playlist_items enable row level security;

drop policy if exists "open all" on ps_playlists;
create policy "open all" on ps_playlists for all using (true) with check (true);

drop policy if exists "open all" on ps_playlist_items;
create policy "open all" on ps_playlist_items for all using (true) with check (true);
