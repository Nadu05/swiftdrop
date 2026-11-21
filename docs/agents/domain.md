# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root (if present), or **`GLOSSARY-MAP.md`** if it exists.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in (if present).
- **Existing SwiftDrop domain & contract docs** (do not overwrite; consult the ones relevant to your task):
  - `agents/SwiftDrop_Business_Process.md` — end-to-end operational flows
  - `agents/SwiftDrop_Finalized_Business_Decisions.md` — confirmed business rules (`BD-01`+)
  - `docs/api-integration-documentation.md` — REST API integration contracts
  - `docs/event-contract-documentation.md` — RabbitMQ / async event contracts
  - `docs/system_initials.md` — roles, demo accounts, and branch/org scopes
  - `docs/audit-remediation/` — `API_CONTRACT_CHANGES.md`, `KNOWN_LIMITATIONS.md`, `REMEDIATION_TRACKER.md`, `IMPLEMENTATION_LOG.md`
  - `docs/implementation/` — `IMPLEMENTATION_STATUS.md`, `API_GAP_ANALYSIS.md`, `REMAINING_GAPS.md`, `IMPLEMENTATION_DEPENDENCIES.md`

If `GLOSSARY.md` or `docs/adr/` don't exist yet, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (`api-gateway/`, `frontend/`, `services/*`):

```
/
├── AGENTS.md
├── GLOSSARY.md                        ← (created lazily via /domain-modeling)
├── agents/
│   ├── agent.backend.md
│   ├── agent.frontend.md
│   ├── SwiftDrop_Business_Process.md
│   └── SwiftDrop_Finalized_Business_Decisions.md
└── docs/
    ├── adr/                           ← (created lazily via /domain-modeling)
    ├── agents/                        ← engineering skill config
    ├── audit-remediation/
    ├── implementation/
    ├── api-integration-documentation.md
    ├── event-contract-documentation.md
    └── system_initials.md
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md` (and `agents/SwiftDrop_Finalized_Business_Decisions.md`). Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR or confirmed business decision (`BD-*`), surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
