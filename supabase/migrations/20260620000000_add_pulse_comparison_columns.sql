alter table public.groups
add column if not exists pulse_delta integer not null default 0,
add column if not exists pulse_percentile integer not null default 0,
add column if not exists pulse_leaderboard_rank integer,
add column if not exists pulse_leaderboard_total integer not null default 0;
