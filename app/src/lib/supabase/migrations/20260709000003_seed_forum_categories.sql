-- Starter forum categories.

insert into public.forum_categories (slug, name, description, sort_order) values
  ('general-discussion', 'General Discussion', 'Open floor for anything practice- or community-related.', 0),
  ('rituals-practice', 'Rituals & Practice', 'Technique questions, working reports, troubleshooting rites.', 1),
  ('correspondences-study', 'Correspondences & Study', 'Discussion of texts, tables, symbolism, and interpretive questions.', 2),
  ('tarot-divination', 'Tarot & Divination', 'Readings, spreads, and divinatory technique.', 3),
  ('study-groups', 'Study Groups', 'Coordinate course cohorts and study partners.', 4),
  ('feedback-bugs', 'Feedback & Bugs', 'Site feedback and bug reports.', 5)
on conflict (slug) do nothing;
