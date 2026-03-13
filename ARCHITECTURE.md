# Architecture

## Current System

This project is a full-stack AI journal application with:

- React + Vite frontend in `client/`
- Node.js + Express backend in the project root
- SQLite as the current database
- Google Gemini for journal analysis

### Current Request Flow

1. The React frontend stores a lightweight `userId` in `localStorage` and uses it to fetch and save journal data.
2. When the user submits a journal entry, the frontend sends `userId`, `ambience`, and `text` to `POST /api/journal`.
3. The backend calls Gemini to generate:
   - dominant emotion
   - keywords
   - summary
4. The backend stores the journal entry plus analysis in SQLite.
5. The frontend reloads:
   - entries feed
   - aggregate insights
   - latest analysis result

This design is intentionally simple for a demo assignment: it is easy to run locally, easy to verify, and easy to reason about.

## How I Would Scale This to 100k Users

The current version uses a single Express process and a local SQLite file. That is fine for local development and demo traffic, but it does not scale well to 100k users because:

- SQLite is file-based and not ideal for concurrent writes across multiple app instances
- Gemini analysis currently runs inline during save requests, which increases response latency
- the backend is state-light but not horizontally optimized yet

To scale this system, I would evolve it in stages.

### 1. Replace SQLite with PostgreSQL

The first bottleneck is storage. For 100k users, I would move from SQLite to PostgreSQL because it gives:

- concurrent read/write support
- better indexing
- backup and recovery options
- managed cloud hosting support

Schema direction:

- `users`
- `journals`
- `journal_analysis`
- optional `analysis_cache`

I would index:

- `journals.user_id`
- `journals.created_at`
- `journal_analysis.journal_id`

### 2. Split API and LLM Work

Today, the save endpoint waits for Gemini before responding. At scale, that becomes expensive and slow.

I would change the flow to:

1. save journal entry immediately with status `pending_analysis`
2. publish a job to a queue
3. process LLM analysis asynchronously in a worker
4. update the record when analysis completes

Good queue options:

- BullMQ + Redis
- RabbitMQ
- cloud queue like SQS

This reduces API latency, isolates LLM failures, and allows controlled throughput.

### 3. Horizontally Scale the Backend

Once storage and analysis are decoupled, the API becomes easy to scale behind a load balancer.

I would run:

- multiple stateless Express instances
- shared PostgreSQL
- shared Redis for caching and queues

That allows horizontal scaling without coupling requests to a single machine.

### 4. Add Rate Limiting and Abuse Controls

At 100k users, protection matters as much as raw scale.

I would add:

- per-user and per-IP rate limits
- request body size limits
- auth-based quotas for analysis endpoints
- circuit breakers for LLM provider failures

### 5. Observe the System

At this size, debugging by logs alone is not enough.

I would add:

- structured logging
- request IDs
- metrics for API latency, queue depth, LLM failures, cache hit rate
- alerting for elevated error rate and provider outages


## How I Would Reduce LLM Cost

The LLM is the most expensive part of the system because it is called on every new journal save.

I would reduce cost using four practical strategies.

### 1. Use the Smallest Useful Model

The app only needs:

- one-word emotion
- a few keywords
- one-sentence summary

This is a lightweight classification/summarization task. I would keep it on a fast, cheaper model instead of a heavy reasoning model.

### 2. Make the Prompt Smaller and More Deterministic

Current prompt size is already reasonable, but I would keep it tight:

- no extra prose
- strict output schema
- low temperature
- short completion budget

That reduces token usage and parsing variability.

### 3. Analyze Only When Necessary

Not every action should trigger the LLM.

I would avoid re-analysis for:

- unchanged journal text
- repeated submissions
- duplicate retry requests

### 4. Add Usage Controls

If this became a real product, I would introduce:

- daily free-tier limits
- background analysis batching where appropriate
- feature gating for premium analysis volume


## How I Would Cache Repeated Analysis

Repeated journal text is a direct opportunity to save cost and latency.

### Current Opportunity

If the same or nearly same text is submitted multiple times, the backend currently calls Gemini every time.

### Proposed Cache Strategy

I would normalize the text first:

- trim whitespace
- lowercase
- collapse repeated spaces

Then generate a content hash, for example:

- `sha256(normalized_text)`

That hash becomes the cache key.

### Cache Design

For each unique normalized text:

- key: content hash
- value:
  - emotion
  - keywords
  - summary
  - model version
  - prompt version
  - created timestamp

Storage options:

- Redis for hot cache
- PostgreSQL table for durable cache


### Why Model Version Matters

The cache should be invalidated when:

- prompt changes
- output contract changes
- model changes

So the real cache key should include:

- text hash
- model name
- prompt version

Example:

- `sha256(normalized_text) + gemini-2.5-flash + prompt_v2`

This prevents stale or mismatched analysis results.

## How I Would Protect Sensitive Journal Data

This application handles mental-state journaling, so privacy should be treated as a first-class concern.

### 1. Add Real Authentication

The current demo uses a client-stored `userId`. That is acceptable for local testing, but not secure for a real product.

I would move to:

- authenticated user accounts
- signed sessions or JWTs
- server-side authorization checks on every journal query

That prevents one user from reading another user's entries by guessing an ID.

### 2. Encrypt Data in Transit and at Rest

I would use:

- HTTPS everywhere
- encrypted database storage
- encrypted backups

For especially sensitive deployments, I would also consider field-level encryption for raw journal text.

### 3. Minimize What Leaves the System

Journal text is sent to the LLM provider today. In production, I would reduce exposure by:

- sending only necessary text
- documenting third-party data flow clearly
- allowing users to opt out of AI analysis

If privacy requirements were stricter, I would evaluate a self-hosted model path for sensitive deployments.

### 4. Add Access Controls and Auditing

I would implement:

- role-based admin access
- audit logs for sensitive operations
- secret rotation for API keys
- strict environment-variable management

### 5. Add Data Lifecycle Controls

Users should control their data.

I would support:

- delete entry
- delete account
- export journal history
- retention policies

This improves privacy posture and product trust.

## Tradeoffs in the Current Version

The current system intentionally optimizes for simplicity and assignment clarity:

- SQLite keeps setup fast and local
- synchronous analysis keeps the flow easy to understand
- local `userId` avoids auth complexity during demo
- React frontend + Express API keep the stack straightforward

These are good choices for an assignment build, but I would not present them as final production architecture. The stronger engineering story is:

- the current version is intentionally simple
- the next production steps are clearly identified
- scale, cost, caching, and privacy have concrete solutions

