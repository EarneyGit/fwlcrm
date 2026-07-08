# FWL CRM - WhatsApp Lead Control Module: Audit, Design & Roadmap

> STATUS: Batches 1-7 implemented (2026-07-08). Remaining external setup: WABA + Cloud API number, WA_TOKEN / WA_PHONE_NUMBER_ID / WA_WABA_ID env vars, webhook registration in Meta App dashboard, template approval in WhatsApp Manager, optional CRM_API_KEY for write-endpoint auth.

## 1. Codebase Audit

### Architecture summary
- **Frontend module pattern:** Vanilla JS IIFEs on `window.LP`. Each page = `LP.pages.<name>` exposing `{ init(container), destroy?, renderTable? }`. Components = `LP.<name>` (sidebar, drawer, toast, icons, utils).
- **Routing:** Hash-based router in `app.js` (`LP.router`), static `pageMap` + `pageTitles`. Adding a page = 1 file + 2 map entries + 1 sidebar nav item + 1 script tag in `index.html`.
- **State:** Global `LP.data` store (leads, clients, agents, stats) hydrated by `initGlobalData()`, refreshed by a 15s poll (`initPolling`). `LP.stream` is a no-op stub reserved for future realtime.
- **API conventions:** One file per resource in `/api`, `export default async function handler(req,res)` with method switch, `const db = require('./_db')`, raw SQL with `$n` params, snake_case DB -> camelCase JSON mapping done in the handler.
- **DB access:** `api/_db.js` exports a shared `pg` Pool. No ORM, no migration framework - schema lives in `scripts/init-db.js` (destructive) plus ad-hoc `scripts/migrate-*.js` and self-migrating `ALTER TABLE IF NOT EXISTS` in `api/oauth.js`.
- **Integration patterns:** Meta OAuth (multi-page, per-page tokens in `clients.page_token`), leadgen webhook with HMAC SHA-256 verification + raw-body parsing, CAPI sender module (`api/capi.js`) exported via `module.exports` and consumed by other handlers.
- **Activity logging:** `activities` table (lead_id, type, text, user_name, ts) via `api/activities.js` POST + direct inserts. Types in use: note, status_change, contacted, called.

### Integration decision points
- **Inbox page:** new `pages/whatsapp.js` (own layout: 3-pane inbox, doesn't fit leads table). Nav item between Leads and Clients.
- **Drawer:** reuse `LP.drawer` untouched; the inbox gets its own right-hand CRM side panel component instead (drawer is modal-overlay style, wrong shape for a persistent panel).
- **Settings UI:** new card section in `pages/integrations.js` (matches Meta/Webhook/CAPI card pattern).
- **Server side:** `api/whatsapp-webhook.js` (webhook), `api/_whatsapp.js` (shared utils - underscore prefix = non-routed, same as `_db.js`).

### Reusable modules
Filters/status-pill pattern (`pages/leads.js`), activity logging (`api/activities.js`), stage logic + CAPI hooks (`api/leads.js` PATCH + `STATUS_EVENT_MAP`), agents list (`api/agents.js`), stats SQL pattern (`api/stats.js`), card/drawer CSS tokens, `LP.utils` formatters, phone normalization (exists in `api/leads/[id]/convert.js` - promoted into `_whatsapp.js`).

### Risks / gaps found
1. **No auth at all** - every `/api/*` endpoint is public. Acceptable for read paths today but WhatsApp send/settings endpoints must not ship without at least a shared-secret header. Flagged, extension-ready pattern provided (`X-CRM-Key` check helper in `_whatsapp.js`).
2. **No conversation/message/task tables** - added by this module's migration.
3. **Status naming drift** - `stats.js` counts `status='won'` but pipeline uses `converted`. Pre-existing bug, worth fixing in Batch 6.
4. **Exotel & Zoho are UI stubs** (toast-only, no backend). Not blockers.
5. **Serverless caveats:** no long-lived listeners; webhook must respond < 10s; poll-based UI refresh (15s) is the realtime ceiling until SSE/WebSocket phase.
6. **15s poll + inbox:** acceptable for launch; inbox will poll its own endpoint at 5-10s while page is active.
7. **Write-path duplication risk:** WhatsApp wamid used as message PK -> idempotent `ON CONFLICT DO NOTHING`, same trick as leadgen_id.

## 2. WhatsApp Module Design

### Data model (migration in `scripts/migrate-whatsapp.js`, self-migrating via `api/_whatsapp.js`)
- `whatsapp_accounts` - one row per WABA phone number; `client_id` FK routes conversations to a CRM client.
- `whatsapp_conversations` - one row per (phone_number_id, wa_id); holds `lead_id`, `client_id`, `status` open/closed, `unread_count`, `assigned_to`, window + response-time timestamps, `referral` JSONB (CTWA ad attribution).
- `whatsapp_messages` - PK = wamid; direction in/out, msg_type, body, template_name, delivery `status`, raw `payload` JSONB.
- `whatsapp_templates` - synced from Meta, status + components JSONB.
- `webhook_event_logs` - raw event audit trail (source, event_type, payload, processed, error_text).
- `lead_stage_history` - from/to status audit (backfills the reporting gap).
- `followups` - lead_id, title, due_at, status, owner (Calendar page upgrade target).
- `leads` additions: `tags TEXT[]`, `wa_id VARCHAR(30)`, `next_followup_at TIMESTAMPTZ`.

### API plan
| File | Purpose | Batch |
|---|---|---|
| `api/_whatsapp.js` | schema ensure, phone normalize, lead match/create, config, auth helper | 1 |
| `api/whatsapp-webhook.js` | GET verify + POST messages/statuses ingestion | 1-2 |
| `api/whatsapp-conversations.js` | GET list (filters), PATCH assign/close/read | 3 |
| `api/whatsapp-messages.js` | GET thread, POST send (freeform inside 24h window) | 3/5 |
| `api/whatsapp-templates.js` | GET synced list, POST sync-from-Meta, POST send-template | 5 |
| `api/whatsapp-settings.js` | GET/PUT account config + assignment rules | 4 |
| `api/followups.js` | CRUD follow-ups | 4 |
| `api/analytics-whatsapp.js` | reporting SQL | 6 |

### UI plan
- `pages/whatsapp.js` - 3-pane inbox (conversation list / thread / CRM side panel) with filter chips All, Mine, Unassigned, Unread, Open, Closed + client/stage/owner filters + search.
- `components/chat-thread.js` - bubbles, delivery ticks, template/freeform labels, inline note/stage/assignment timeline events.
- `components/contact-sidepanel.js` - lead info, attribution, stage selector, follow-up, tags, notes, purchase value, quick actions (reuses drawer section CSS).
- `components/template-picker.js` - modal listing approved templates with variable inputs.
- Settings card in `pages/integrations.js`; sidebar item + router entries; script tags in `index.html`.

### Workflows
1. **Inbound message:** webhook -> signature check -> raw event log -> upsert conversation (open, unread+1, window = now+24h) -> insert message (idempotent) -> match lead by normalized phone -> create lead (`source='whatsapp'`, client from account map, campaign/ad from CTWA referral) if none -> activity log -> (Batch 4) assignment rule -> (Batch 6) SLA clock.
2. **Status events:** webhook statuses[] -> update message status + error text.
3. **Outbound:** inside 24h window = freeform POST; outside = template only; both insert message rows with direction out and pending status, then updated by status events.
4. **Stage move from chat:** side panel PATCH `/api/leads` (existing endpoint, keeps CAPI hooks) + insert `lead_stage_history` + activity.
5. **Reporting:** SQL over conversations/messages/stage history (first response = first_response_at - first_inbound_at).

## 3. Feasibility matrix
| Feature | Class | Notes |
|---|---|---|
| Webhook ingestion (messages + statuses) | A | Cloud API webhook, same HMAC pattern as leadgen |
| Shared team inbox, filters, thread UI | A | Pure CRM UI over stored data |
| Auto-match/create lead from WhatsApp | A | Phone normalization, last-10-digit match |
| Conversation-lead attach, notes, tags, follow-ups | A | Internal only |
| Stage moves + CAPI feedback from chat | A | Reuses existing PATCH + CAPI |
| CTWA ad attribution | A/B | Works when message carries `referral` (Click-to-WhatsApp ads); organic messages have none |
| Freeform replies | B | Needs WABA + phone number on Cloud API + `WA_TOKEN`; only inside 24h window |
| Template messaging | B | Templates must be approved in WhatsApp Manager first; sync then send |
| Proactive outreach / re-engagement | B | Template-only, opt-in required, quality rating risk |
| Bulk messaging | C | Policy-restricted; not built |
| Chatbot / automation builder | C (future) | Architecture ready: webhook_event_logs + rules table pattern |
| Multi-number per client | B | Schema supports; needs additional WABA numbers |

## 4. Batch roadmap
| Batch | Scope | Files | Risk |
|---|---|---|---|
| 1 | Schema + webhook foundation + utilities | NEW: `api/_whatsapp.js`, `api/whatsapp-webhook.js`, `scripts/migrate-whatsapp.js` | None to existing flows (all new files; schema additive) |
| 2 | Inbound ingestion + lead matching + activity log | extend webhook (done in 1 where safe) + tests | Low |
| 3 | Inbox UI + thread + side panel | NEW: `pages/whatsapp.js`, `components/chat-thread.js`, `components/contact-sidepanel.js`; MOD: `app.js`, `components/sidebar.js`, `index.html`, `styles.css` (append-only) | Low (routing map additions) |
| 4 | Assignment rules + stage controls + follow-ups + notes | NEW: `api/whatsapp-settings.js`, `api/followups.js`; MOD: side panel, `pages/calendar.js` | Low |
| 5 | Template + outbound send + status sync | NEW: `api/whatsapp-templates.js`, `api/whatsapp-messages.js` POST, `components/template-picker.js` | Medium (external API, token scope) |
| 6 | Reporting + SLA + response metrics | NEW: `api/analytics-whatsapp.js`; MOD: `pages/reports.js`, `pages/dashboard.js`; fix `won` vs `converted` in `stats.js` | Low |
| 7 | Polish, `X-CRM-Key` enforcement on write endpoints, test scripts, cleanup | MOD: all whatsapp endpoints; NEW: `scripts/_test_wa_webhook.js` | Low |

**Test checklist per batch:** syntax check all files; POST simulated signed webhook payload; verify idempotency (same wamid twice); verify existing `/api/webhook` leadgen path untouched; UI smoke on all existing pages.

## Environment variables required (add in Vercel)
- `WA_WEBHOOK_VERIFY_TOKEN` (defaults to existing `WEBHOOK_VERIFY_TOKEN`)
- `WA_APP_SECRET` (defaults to `META_APP_SECRET` - set only if WhatsApp lives in a different Meta app)
- `WA_TOKEN` - Cloud API access token (needed from Batch 5)
- `WA_PHONE_NUMBER_ID`, `WA_WABA_ID` - default account (or insert rows in `whatsapp_accounts`)
- `CRM_API_KEY` - shared secret for write endpoints (Batch 7 enforcement)

Webhook URL to register in Meta App > WhatsApp > Configuration:
`https://fwl-crm.vercel.app/api/whatsapp-webhook` with the verify token above, subscribed to `messages`.
