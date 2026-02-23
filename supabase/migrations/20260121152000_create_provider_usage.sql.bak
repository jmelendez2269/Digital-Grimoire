-- Create table for storing imported provider usage data
create table if not exists provider_daily_usage (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  provider text not null, -- 'openai', 'anthropic', 'azure'
  model text default 'all', -- optional breakdown by model, 'all' for aggregated
  input_tokens bigint default 0,
  output_tokens bigint default 0,
  requests int default 0,
  cost numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure one record per day/provider/model
  unique(date, provider, model)
);

-- Enable RLS
alter table provider_daily_usage enable row level security;

-- Policies
create policy "Admins can manage provider usage"
  on provider_daily_usage
  for all
  to authenticated
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Grant permissions (if needed for service role or authenticated users)
grant all on provider_daily_usage to authenticated;
grant all on provider_daily_usage to service_role;
