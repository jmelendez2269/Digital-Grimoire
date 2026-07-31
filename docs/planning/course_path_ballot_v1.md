# Course Path Ballot V1

## Purpose

The course-path ballot is an anonymous, advisory audience signal for choosing
the next Prismarium YouTube series after PRE. It does not control course
publication, access, enrollment, the editorial schedule, or YouTube
configuration.

The launch ballot has exactly two candidates:

- `c01-how-humans-know-what-they-know`
- `fd01-mythic-imagination-from-classical-pattern-to-personal-meaning`

It cannot open unless published public records exist for PRE, C01, and FD01.
Opening and closing are manual administrator actions.

## State boundaries

Course preview access, full-course access, YouTube production, and ballot state
are separate values. Closing the ballot records an audience leader, tie, or
no-vote result. An administrator records the editorial selection separately.
When those choices differ, the public ballot view presents both.

## Guest privacy model

- A random browser token is created only after a vote is accepted.
- The token is stored only in an HttpOnly, `SameSite=Lax` cookie.
- Ballot tables receive a poll-specific HMAC, never the token.
- Rate buckets receive a different poll-specific HMAC derived from the trusted
  network header.
- Ballot tables never store an email address, account ID, raw IP address, or
  user agent.
- One browser has one current vote per ballot and may change it while open.
- Live totals stay hidden until that browser votes. Closed totals are public.
- Archiving ends admin workflow clutter but keeps the ballot's final,
  read-only public result visible.

All tables and database functions are service-role only. The public surface
uses a Server Action and a sanitized server-side read.

## Failure behavior

Missing configuration, an unapplied migration, invalid data, a database error,
or a rate-limit failure closes the voting path without breaking the homepage
or either course preview. A voter cookie is not set unless the database
confirms the vote.

## Why the ballot is not hosted on YouTube

A YouTube community poll would require the visitor to sign in to YouTube to
vote. Prismarium's first ballot is designed to accept a guest choice without an
account, so the default is the first-party ballot described here. See
[YouTube Help: Create a post](https://support.google.com/youtube/answer/7124175?hl=en).

## Release boundary

The migration may be tested locally and on staging. Applying it to production,
creating or opening the production ballot, activating public YouTube URLs, and
deploying remain separate approval steps.
