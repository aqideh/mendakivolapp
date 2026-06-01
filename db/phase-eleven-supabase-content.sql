-- Phase 11: Supabase content consolidation
-- Makes Supabase the source of truth for operational/content listings:
-- opportunities, training sessions, and newsfeed.
-- Run this after:
-- 1. db/phase-one-schema.sql
-- 2. db/phase-eight-supabase-signups.sql
-- 3. db/phase-nine-supabase-attendance.sql
-- 4. db/phase-ten-supabase-training.sql

create extension if not exists pgcrypto;

create table if not exists public.app_news_items (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Announcement',
  emoji text,
  title text not null,
  publication_date date not null default current_date,
  read_time text,
  featured boolean not null default false,
  body text[] not null default '{}',
  status text not null default 'published',
  source text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_news_items_publication_date
on public.app_news_items(publication_date desc);

create index if not exists idx_app_news_items_category
on public.app_news_items(category);

create index if not exists idx_app_news_items_status
on public.app_news_items(status);

alter table public.app_news_items enable row level security;

drop policy if exists "Anyone can read published app news" on public.app_news_items;
create policy "Anyone can read published app news"
on public.app_news_items
for select
using (status = 'published' or public.current_app_role() in ('admin', 'super_admin'));

drop policy if exists "Admins can manage app news" on public.app_news_items;
create policy "Admins can manage app news"
on public.app_news_items
for all
using (public.current_app_role() in ('admin', 'super_admin'))
with check (public.current_app_role() in ('admin', 'super_admin'));

-- Keep existing operational tables readable/manageable if they were created by earlier migrations.
alter table if exists public.app_opportunities enable row level security;
alter table if exists public.app_training_sessions enable row level security;

-- Seed current CMS news into Supabase. Re-runs safely because IDs are stable.
insert into public.app_news_items (
  id, category, emoji, title, publication_date, read_time, featured, body, status, source
)
values
  ('7dc0db21-d9c8-57dc-a5c3-15a6fb688206', 'Announcement', '📣', 'MENDAKI 2030 Work Plan: With You, Every Step Forward', '2026-01-15', '3 min read', true, array[
    'MENDAKI has unveiled its MENDAKI 2030 Work Plan - a bold roadmap to uplift the Malay/Muslim community through education, mentorship, and community resilience over the next five years.',
    'The plan centres on three pillars: strengthening early childhood support, expanding youth mentorship programmes, and building a resilient community through lifelong learning. CEO Feroz Akber shared that the plan was co-created with more than 800 community stakeholders over six months.',
    'This is not MENDAKI''s plan alone - it belongs to everyone who believes in the community, he said at the launch ceremony held at Our Tampines Hub.',
    'Volunteers will play a central role in its delivery. MENDAKI aims to grow its volunteer base to 5,000 by 2027 and launch 15 new programme streams by 2028.'
  ], 'published', 'seed'),
  ('c5ef8aea-7c4c-50d8-adef-4df29b1f709a', 'Programme', '📐', 'New RSL Maths Explorer Cohort Now Open', '2026-03-05', '2 min read', true, array[
    'MENDAKI''s Ready, Set, Learn (RSL) Maths Explorer programme has opened registrations for its second cohort of 2026. The programme supports preschool-aged children from lower-income families in building early numeracy skills through play-based learning.',
    'Volunteer facilitators are needed at 14 Community Clubs across Singapore, including Bedok, Tampines, Jurong West, and Woodlands. Sessions run on weekends and are typically 2 hours long.',
    'No teaching experience is necessary - MENDAKI provides a full training workshop before your first session. Interested volunteers can sign up via the Opportunities tab.'
  ], 'published', 'seed'),
  ('0034a15e-9dbd-519f-a245-ed948c27c94e', 'Volunteer', '⭐', 'Meet Our Volunteer of the Month: Nurul Huda', '2026-02-28', '4 min read', true, array[
    'This month, we spotlight Nurul Huda Binte Rahmat, a 28-year-old accountant who has been volunteering with MENDAKI''s #amPowered mentorship programme for over two years.',
    'I wanted to give back to a community that gave so much to me, she shared. Watching my mentee grow from a shy 15-year-old into someone who speaks confidently about her ambitions - that''s everything.',
    'Nurul Huda currently mentors two students and facilitates a monthly peer-learning circle for young women in her neighbourhood. She was recently recognised at MENDAKI''s Volunteer Appreciation Evening for her exceptional contribution.'
  ], 'published', 'seed'),
  ('57b0413f-581f-546e-aff7-daa8f73766d0', 'Announcement', '🏆', 'Raikan Ilmu 2026: Nominations Now Open', '2026-02-20', '2 min read', false, array[
    'MENDAKI is calling for nominations for the Raikan Ilmu 2026 awards, celebrating outstanding academic achievement among Malay/Muslim students across primary, secondary, and post-secondary levels.',
    'Parents, teachers, and community members are encouraged to nominate deserving students by 31 March 2026. Nominees will be assessed on academic results, co-curricular achievements, and community involvement.',
    'Volunteers are also needed to assist as ushers and registration helpers at the ceremony - sign up via the Opportunities tab.'
  ], 'published', 'seed'),
  ('85d6ae8a-3805-5d92-8cb4-70eda2431513', 'Programme', '💡', '#amPowered 2026 Mentor Intake Open', '2026-02-10', '2 min read', false, array[
    'MENDAKI''s #amPowered mentorship programme is accepting applications for its 2026 cohort of mentors. The programme pairs Malay/Muslim youths aged 15-18 with working adult mentors.',
    'Mentors commit to a 6-month journey, meeting mentees at least twice a month through a structured curriculum covering goal-setting, career exploration, and building a growth mindset.',
    'The impact goes both ways, said programme manager Jaeza Jamil. Mentors often tell us they gain as much as they give. Apply through the Opportunities tab.'
  ], 'published', 'seed'),
  ('91d67bab-9735-5d9f-8480-74a10d5b8caa', 'Volunteer', '🌟', 'Volunteer Appreciation Evening 2026 Highlights', '2026-02-03', '3 min read', false, array[
    'MENDAKI hosted its annual Volunteer Appreciation Evening on 1 February 2026 at Wisma MENDAKI, bringing together over 200 volunteers to celebrate another year of community service.',
    'Eighteen volunteers received special recognition awards across categories including Most Dedicated Mentor, Most Hours Contributed, and Rising Star. The evening featured testimonials from beneficiaries whose lives had been touched by MENDAKI volunteers.',
    'Our volunteers are the heartbeat of everything we do, said MENDAKI Chairman Zaqy Mohamad. This evening is our way of saying - your work matters, and we see you.'
  ], 'published', 'seed')
on conflict (id) do update
set
  category = excluded.category,
  emoji = excluded.emoji,
  title = excluded.title,
  publication_date = excluded.publication_date,
  read_time = excluded.read_time,
  featured = excluded.featured,
  body = excluded.body,
  status = excluded.status,
  updated_at = now();
