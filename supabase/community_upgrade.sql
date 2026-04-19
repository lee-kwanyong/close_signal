begin;

alter table public.community_posts
  add column if not exists topic text,
  add column if not exists is_solved boolean not null default false,
  add column if not exists popularity_score numeric not null default 0;

alter table public.community_comments
  add column if not exists is_expert_reply boolean not null default false;

create index if not exists idx_community_posts_topic
  on public.community_posts(topic);

create index if not exists idx_community_posts_is_solved
  on public.community_posts(is_solved);

create index if not exists idx_community_posts_popularity_score
  on public.community_posts(popularity_score desc);

create index if not exists idx_community_comments_is_expert_reply
  on public.community_comments(is_expert_reply);

create or replace function public.refresh_community_post_popularity()
returns void
language sql
as $$
  update public.community_posts p
  set popularity_score =
      coalesce(comment_stats.comment_count, 0) * 10
      + greatest(
          0,
          100 - floor(extract(epoch from (now() - coalesce(p.created_at, now()))) / 3600)
        )
  from (
    select post_id, count(*)::numeric as comment_count
    from public.community_comments
    group by post_id
  ) comment_stats
  where p.id = comment_stats.post_id;

  update public.community_posts p
  set popularity_score =
      greatest(
        0,
        100 - floor(extract(epoch from (now() - coalesce(p.created_at, now()))) / 3600)
      )
  where not exists (
    select 1
    from public.community_comments c
    where c.post_id = p.id
  );
$$;

create or replace view public.v_community_posts_latest as
select
  p.id,
  p.title,
  p.content,
  p.region_code,
  p.topic,
  p.is_solved,
  p.popularity_score,
  p.created_at,
  coalesce(p.author_name, '익명') as author_name,
  p.category_name,
  p.category_l1,
  rm.region_name,
  coalesce(comment_stats.comment_count, 0)::int as comment_count
from public.community_posts p
left join public.region_master rm
  on rm.region_code = p.region_code
left join (
  select post_id, count(*) as comment_count
  from public.community_comments
  group by post_id
) comment_stats
  on comment_stats.post_id = p.id;

commit;