-- Counselor tables used by api/interfaces/counselor_routes.py

create table if not exists public.counselor_students (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (counselor_id, student_id)
);

create table if not exists public.counselor_checklists (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  category text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.counselor_documents (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  file_type text not null default 'PDF',
  size text default 'N/A',
  uploaded_at timestamptz default now()
);

create table if not exists public.counselor_invites (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  used boolean not null default false,
  used_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
