-- Create tables for Custom Tarot Decks

-- Table: user_decks
create table if not exists user_decks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'My Custom Deck',
  theme text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: user_cards
create table if not exists user_cards (
  id uuid default gen_random_uuid() primary key,
  deck_id uuid references user_decks(id) on delete cascade not null,
  name text not null,
  arcana text not null, -- 'Major' or 'Minor'
  suit text, -- 'Wands', 'Cups', 'Swords', 'Pentacles' or null for Major
  meaning_upright text,
  image_url text, -- URL to the generated image in Supabase Storage
  image_prompt text, -- The prompt used to generate the image
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(deck_id, name) -- Prevent duplicates of the same card in a deck
);

-- Enable RLS
alter table user_decks enable row level security;
alter table user_cards enable row level security;

-- Policies for user_decks
create policy "Users can view their own decks"
  on user_decks for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own decks"
  on user_decks for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own decks"
  on user_decks for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own decks"
  on user_decks for delete
  using ( auth.uid() = user_id );

-- Policies for user_cards
create policy "Users can view cards in their decks"
  on user_cards for select
  using ( exists ( select 1 from user_decks where user_decks.id = user_cards.deck_id and user_decks.user_id = auth.uid() ) );

create policy "Users can insert cards into their decks"
  on user_cards for insert
  with check ( exists ( select 1 from user_decks where user_decks.id = user_cards.deck_id and user_decks.user_id = auth.uid() ) );

create policy "Users can update cards in their decks"
  on user_cards for update
  using ( exists ( select 1 from user_decks where user_decks.id = user_cards.deck_id and user_decks.user_id = auth.uid() ) );

create policy "Users can delete cards in their decks"
  on user_cards for delete
  using ( exists ( select 1 from user_decks where user_decks.id = user_cards.deck_id and user_decks.user_id = auth.uid() ) );
