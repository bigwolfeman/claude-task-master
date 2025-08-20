# Task Master AI — Context Engine (MSE / Tri-Index / Usefulness) — **Consolidated PRP v4 (NEXT Branch)**

**Status:** Draft → Review → Execute
**Branch Target:** `next` (paths, commands, and conventions matched)
**Scope:** Standalone module + MCP/CLI integration; no regressions to existing tasking flows

---

## Executive Summary

Add a cost-gated evidence engine that assembles **Minimum Sufficient Evidence (MSE)** under strict token budgets. The engine implements a **Tri-Index** memory (Graph communities + RAPTOR summary tree + Hybrid evidence pool), **Usefulness 2.0** ranking (pointwise utility + pairwise micro-trainer + bubble stabilizer), **budgeted max-coverage** packing over atomic facts, an **answerability proof** router (none/small/premium), and **trained extractive compression**. It exposes **MCP tools** and **CLI** commands; preserves Task Master’s existing UX, coding conventions (JS/TS mix, **Biome**, **Jest**), and **model triad** (main/research/fallback) including the **Claude Code** path.

When ending an execution of changes, provide a change log for committing to github.

---

## Goal

**Feature Goal**
Deliver `tm-context-engine` that:

* Builds/maintains a tri-index KB from project artifacts in `.taskmaster/**`.
* Returns MSE + citations within a strict token budget.
* Routes calls across **none → small → premium** tiers only when **answerability proof** requires it.
* Integrates with MCP & CLI without altering current task flows.
* Minimizes API costs while maintaining or improving answer quality.

**Deliverables**

* Library: `src/context-engine/**` (TS-first with JS interop).
* CLI: `task-master ingest`, `task-master build-graph`, `task-master query`, `task-master proof`.
* MCP tools: `context_ingest`, `context_query`, `context_proof`, `context_explain` in `mcp-server/src/tools`.
* Docs: Command help + integration notes for `.taskmaster/**` projects.
* Tests: Unit + integration under `tests/context-engine/**`.

**Success Definition**

* Median tokens/query ↓ **≥35%** vs baseline (research + long prompts).
* Premium-tier calls ↓ **≥40%** with **≤2%** accuracy delta.
* Deterministic (“tier=none”) answers on **≥25%** factoid/dev-ops queries when coverage ≥0.8 and conflicts=0.
* P50 latency ≤ **0.8s** (tier=none), ≤ **2.5s** (tier=small).
* No regressions to existing CLI/MCP tasking flows.

---

## User Persona

**Target User**
Developers using Task Master via Cursor/Windsurf/VS Code MCP and the CLI. Local Node runtime; configured LLM keys or Claude Code path.

**Use Case**
Within `parse-prd`, `expand`, `update-*`, `research`, or ad-hoc queries, request **sufficient** cited snippets under a budget—route to higher-cost models only if needed.

**User Journey**

1. Initialize: project scaffold under `.taskmaster/**`; PRD at `.taskmaster/docs/prd.txt`.
2. `task-master ingest <paths>` builds the KB; optional `task-master build-graph`.
3. `task-master query "How do we handle auth?" --budget=1200` → brief + citations + planned tier.
4. Use editor MCP tools; if editor shows “0 tools”, remove `--package=task-master-ai` flag in args (per README guidance).
5. Existing flows (`parse-prd`, `expand`, `research`) can call the engine internally for MSE context.

**Pain Points Addressed**

* Excess token spend and long prompts.
* Redundant/irrelevant context; missing multi-hop facts.
* MCP/CLI drift on context; flaky tool visibility.
* Unnecessary premium model usage.

---

## Why

* **Lower spend:** Budgeted coverage + router + compression.
* **Higher signal:** MSE answers with verifiable citations.
* **Consistent UX:** Same CLI/MCP surfaces; deterministic where possible.
* **Future-proof:** Extensible retrieval stack; pluggable backends (SQLite/pgvector, local/sidecar models).

---

## What

Return `{ brief, context[], citations[], proof, planned_tier }` via CLI/MCP or internal calls. Default **local-first** operations; escalate only after **answerability proof**.

### Core Components

1. **Tri-Index Memory**

* **Graph index** (themes/temporal): neighborhood expansion for broad/ambiguous asks.
* **RAPTOR summary tree**: retrieve at the right abstraction before raw chunks.
* **Hybrid evidence**: BM25 + dense; optional **late-interaction** (ColBERT-class) for high-recall tenants.

2. **Usefulness 2.0**

* Pointwise utility:
  `U = α·Rel + β·InfoGain + γ·Trust + δ·Reusability − η·TokenCost − ζ·ConflictRisk`
* Pairwise micro-trainer (RankNet/Bradley-Terry) learns from implicit wins/losses.
* Bubble stabilizer: 1–2 passes for cheap local swaps.

3. **Intelligent Packing**

* **Budgeted max-coverage** over **atoms** (ENT/NUM/DATE/REL) with MMR (λ≈0.3).
* Knapsack fallback for tie-breaks and residual budget.

4. **Answerability Router**

* **Proof** = coverage %, conflicts count, support style (span/paraphrase/none).
* Tier: **none** (deterministic) → **small** (with self-critique) → **premium** (complex reasoning).

5. **Trained Extractive Compression**

* LLMLingua-class compressor; preserve entities/numbers/IDs; ≤160 tokens/snippet.
* Optional sidecar HTTP for advanced compression.

---

## All Needed Context

### Context Completeness Check

* New contributors can implement with only this PRP + repo README for `next`.
* Paths aligned to `next`: `.taskmaster/**` project scaffolding; MCP/CLI layout; Biome/Jest configs.
* `.taskmasterconfig` may exist in projects; treat as **optional** overrides.

### Documentation & References (for implementers)

```yaml
- file: README (next branch)
  why: CLI/MCP usage; model triad; `.taskmaster/**` layout; editor caveats
  critical: Follow help/flag shapes; address “0 tools” by removing `--package` arg in editor config.

- file: biome.json
  why: Enforced formatting/lint; do not introduce ESLint/Prettier
  critical: Keep CI green by using Biome commands in scripts.

- file: jest.config.js
  why: Unit/integration test runner configuration
  critical: Match test file placement under `tests/**`.

- file: index.js (CLI entry)
  why: Command dispatch pattern
  pattern: Add subcommands using the established parsing approach.

- file: mcp-server/** (tools)
  why: Tool registration pattern for MCP
  gotcha: Tool visibility in Cursor/Windsurf can fail with `--package`; avoid it.
```

---

## Codebase Trees

### Current (abridged)

```
.
├─ .taskmaster/            # project artifacts/PRD location
├─ mcp-server/             # MCP server code
├─ scripts/                # CLI glue/utilities
├─ src/                    # core libraries
├─ tests/                  # jest tests
├─ docs/                   # docs sources
├─ index.js                # CLI entry
├─ package.json
├─ biome.json              # Biome (formatter/linter)
└─ jest.config.js
```

### Desired Additions

```
src/
  context-engine/
    orchestrator.ts
    types.ts
    ingest/
      chunker.ts
      atoms.ts
      raptor.ts
      graph.ts
      store.ts
    retrieve/
      hybrid.ts
      rerank_ce.ts
      late_interaction.ts
    rank/
      usefulness.ts
      pairwise.ts
      bubble.ts
    pack/
      coverage.ts
      max_coverage.ts
    router/
      proof.ts
      route.ts
    compress/
      extractive.ts
    cache/
      kv.ts
    metrics/
      ragas.ts
      roi.ts

mcp-server/
  src/tools/context_ingest.js
  src/tools/context_query.js
  src/tools/context_proof.js
  src/tools/context_explain.js

scripts/
  ingest.js
  build-graph.js
  metrics/roi.js

tests/
  context-engine/
    orchestrator.test.ts
    rank/usefulness.test.ts
    rank/pairwise.test.ts
    pack/max_coverage.test.ts
    router/proof_route.test.ts
```

---

## Known Gotchas & Library Quirks

```js
// Use Biome only; do not add ESLint/Prettier.
// MCP “0 tools” in some editors; remove `--package=task-master-ai` from args.
// JS/TS mix with ESM/CJS interop; keep new TS compiled to match current runtime.
// `.taskmaster/**` is project-local; do not assume repo-root execution.
// `.taskmasterconfig` may exist; parse if present, but do not require it.
```

---

## Technical Architecture

### Types (TS)

```ts
// src/context-engine/types.ts
export type AtomType = 'ENT' | 'NUM' | 'DATE' | 'REL';

export interface Atom {
  id: string; type: AtomType; surface: string; norm: string;
  provenance: { chunkId: string; offset: number };
}

export interface Chunk {
  id: string; docId: string; text: string; tokens: number;
  embedding?: number[]; start?: number; end?: number;
  authority?: number; recency?: number;
}

export interface Usefulness {
  rel: number; infoGain: number; trust: number; reusability: number;
  tokenCost: number; conflictRisk: number; score: number;
}

export interface Proof {
  coverage: number; conflicts: number;
  supportStyle: 'span'|'paraphrase'|'none';
  selected: Array<{ chunkId: string; span?: [number, number] }>;
}

export interface QueryPlan {
  path: 'GraphFirst'|'TreeFirst'|'EvidenceFirst';
  multiQuery: string[]; hyde?: string; budget: number;
}

export interface ContextResponse {
  brief: string; context: Chunk[]; citations: Array<{id:string; uri:string}>;
  proof: Proof; plannedTier: 'none'|'small'|'premium';
}
```

### DB Schema (SQLite default; Postgres optional)

```sql
CREATE TABLE IF NOT EXISTS documents(
  id TEXT PRIMARY KEY, uri TEXT, title TEXT,
  authority REAL DEFAULT 1.0, created_at TEXT
);

CREATE TABLE IF NOT EXISTS chunks(
  id TEXT PRIMARY KEY, doc_id TEXT REFERENCES documents(id),
  text TEXT, tokens INT, start INT, end INT
);

CREATE TABLE IF NOT EXISTS atoms(
  id TEXT PRIMARY KEY, type TEXT, surface TEXT, norm TEXT, provenance TEXT
);

CREATE TABLE IF NOT EXISTS coverage(
  chunk_id TEXT, atom_id TEXT, PRIMARY KEY(chunk_id, atom_id)
);

CREATE TABLE IF NOT EXISTS pairwise(
  query_id TEXT, winner_id TEXT, loser_id TEXT,
  signal TEXT, weight REAL, ts TEXT
);

CREATE TABLE IF NOT EXISTS answers(
  query_id TEXT PRIMARY KEY, coverage REAL, conflicts INT,
  support_style TEXT, decided_by TEXT, tokens_saved INT, tier_used TEXT
);

-- Graph + RAPTOR
CREATE TABLE IF NOT EXISTS graph_nodes(
  id TEXT PRIMARY KEY, type TEXT, label TEXT, metadata TEXT
);

CREATE TABLE IF NOT EXISTS graph_edges(
  source_id TEXT, target_id TEXT, edge_type TEXT, weight REAL,
  PRIMARY KEY(source_id, target_id, edge_type)
);

CREATE TABLE IF NOT EXISTS summaries(
  id TEXT PRIMARY KEY, level INT, parent_id TEXT,
  summary TEXT, child_chunks TEXT, tokens INT
);
```

### Orchestrator (TS)

```ts
// src/context-engine/orchestrator.ts
export class ContextOrchestrator {
  constructor(
    private store: StorageBackend,
    private retriever: HybridRetriever,
    private ranker: UsefulnessRanker,
    private packer: MaxCoveragePacker,
    private router: AnswerabilityRouter,
    private compressor?: ExtractiveCompressor
  ) {}

  async answerWithMSE(query: string, budget: number): Promise<ContextResponse> {
    const plan = await analyzeQuery(query, budget); // Graph/Tree/Evidence + MultiQuery + optional HyDE
    const cands = await this.retriever.retrieve(plan);
    const reranked = await this.ranker.rankCandidates(cands, query);
    const stabilized = await this.ranker.bubbleStabilize(reranked);
    const atoms = await extractAtoms(stabilized);
    const packed = await this.packer.packMaxCoverage(stabilized, atoms, budget, { mmr: 0.3 });
    const proof = await this.router.computeProof(packed, query);
    const tier = this.router.decideTier(proof, plan, budget);

    if (tier === 'none') {
      return {
        brief: synthesizeDeterministic(packed, query),
        context: packed,
        citations: genCitations(packed),
        proof, plannedTier: tier
      };
    }

    const compressed = this.compressor ? await this.compressor.compress(packed, Math.floor(budget*0.8)) : packed;
    const brief = await generateWithTier(query, compressed, tier);
    return { brief, context: compressed, citations: genCitations(compressed), proof, plannedTier: tier };
  }
}
```

---

## Implementation Blueprint

### Phase 1 — Foundation (Weeks 1–2)

* **chunker.ts**: MD/code-aware chunking; token counts; parent links.
* **atoms.ts**: ENT/NUM/DATE/REL extraction; coverage edges.
* **store.ts**: SQLite backend (upgrade path to Postgres + pgvector).
* **cache/kv.ts**: LRU caches with TTL; disk persistence.

### Phase 2 — Knowledge Building (Weeks 2–3)

* **raptor.ts**: build hierarchical summaries (bottom-up).
* **graph.ts**: build theme & temporal graphs + weights.
* **scripts**: `ingest.js`, `build-graph.js` (progress UI, incremental updates).

### Phase 3 — Retrieval (Weeks 3–4)

* **retrieve/hybrid.ts**: BM25 + dense; RRF fusion; Multi-Query & optional HyDE.
* **retrieve/rerank\_ce.ts**: cross-encoder rerank (local first; API fallback).
* **retrieve/late\_interaction.ts**: optional ColBERT-class sidecar (off by default).

### Phase 4 — Ranking (Weeks 4–5)

* **rank/usefulness.ts**: compute U(d).
* **rank/pairwise.ts**: RankNet/BT online nudge from implicit judgments.
* **rank/bubble.ts**: 1–2 pass pairwise swaps; early cutoff threshold.

### Phase 5 — Packing & Compression (Weeks 5–6)

* **pack/coverage.ts**: atom coverage matrix (sparse ops).
* **pack/max\_coverage.ts**: budgeted max-coverage + MMR; token budget enforcement.
* **compress/extractive.ts**: LLMLingua-class sidecar integration; entity/number locks.

### Phase 6 — Router (Week 6)

* **router/proof.ts**: coverage %, conflict detection, support style.
* **router/route.ts**: tier selection: none|small|premium; per-scenario thresholds.

### Phase 7 — Integration (Weeks 6–7)

* **orchestrator.ts**: end-to-end pipeline.
* **MCP tools**: `context_ingest/query/proof/explain.js` registered in `mcp-server/src/tools`.
* **CLI**: add `query`, `ingest`, `build-graph`, `proof` in `index.js`.

### Phase 8 — Quality & Monitoring (Weeks 7–8)

* **metrics/ragas.ts** + **metrics/roi.ts**: RAGAS + ROI/Router Savings.
* Tests: unit, integration (CLI/MCP), performance.
* Dashboards (local scripts) for savings and quality.

---

## Implementation Patterns & Conventions

### Retrieval Fusion (RRF)

```ts
private fuseRRF(bm25: Chunk[], dense: Chunk[]): Chunk[] {
  const s = new Map<string, number>();
  const B = 60; // RRF constant
  bm25.forEach((c,i)=> s.set(c.id,(s.get(c.id)||0) + 1/(i+B)));
  dense.forEach((c,i)=> s.set(c.id,(s.get(c.id)||0) + 1/(i+B)));
  return [...s.entries()].sort((a,b)=>b[1]-a[1]).map(([id])=> bm25.find(x=>x.id===id) ?? dense.find(x=>x.id===id)!).filter(Boolean);
}
```

### MCP Tool Wrapper

```js
// mcp-server/src/tools/context_query.js
const { answerWithMSE } = require('../../src/context-engine/orchestrator');

mcp.tool('context_query', {
  description: 'Return Minimum Sufficient Evidence (MSE) with citations',
  inputSchema: { type: 'object', properties: {
    question: { type:'string' }, budget_tokens: { type:'number', default: 1200 }, include_proof: { type:'boolean', default: true }
  }, required: ['question'] }
}, async ({ question, budget_tokens = 1200, include_proof = true }) => {
  if (!question || !question.trim()) throw new Error('question is required');
  const result = await answerWithMSE(String(question), Number(budget_tokens));
  const out = { brief: result.brief, planned_tier: result.plannedTier,
                token_count: result.context.reduce((n,c)=>n+c.tokens,0),
                citations: result.citations };
  if (include_proof) out.proof = result.proof;
  return JSON.stringify(out, null, 2);
});
```

### CLI Integration

```js
// index.js
case 'query': {
  const { question, budget='1200', format='pretty' } = parseArgs(args);
  const res = await answerWithMSE(question, parseInt(budget,10));
  if (format==='json') { console.log(JSON.stringify(res, null, 2)); break; }
  console.log(`\nAnswer [${res.plannedTier}]`); console.log(res.brief);
  console.log(`\nProof: ${Math.round(res.proof.coverage*100)}% coverage, ${res.proof.conflicts} conflicts`);
  console.log(`\nSources:`); res.citations.forEach((c,i)=> console.log(`  ${i+1}. ${c.uri}`));
  break;
}
```

---

## Configuration Matrix

```yaml
ENV:
  CONTEXT_ENGINE_ENABLED: true
  CONTEXT_VECTOR_BACKEND: sqlite | pgvector
  CONTEXT_DB_PATH: ~/.taskmaster/kb/context.db
  CONTEXT_CACHE_SIZE: 1000
  CONTEXT_GRAPH_ENABLED: true
  CONTEXT_COMPRESSOR_URL: http://127.0.0.1:4507   # optional
  CONTEXT_LATE_INTERACTION_URL: http://127.0.0.1:4508   # optional
MODELS:
  TRIAD: main | research | fallback  # preserve existing semantics
PROJECT:
  PRD_PATH: ./.taskmaster/docs/prd.txt
  CONFIG_OVERRIDES: ./.taskmasterconfig (optional)
```

---

## Validation Loop

### Level 1 — Syntax & Style

```bash
npx biome check "src/context-engine/**/*.{ts,js}" --apply
npx biome format "src/context-engine/**/*.{ts,js}" --write
npx tsc -p tsconfig.json --noEmit
```

### Level 2 — Unit Tests

```bash
npm run test -- tests/context-engine/rank/usefulness.test.ts
npm run test -- tests/context-engine/rank/pairwise.test.ts
npm run test -- tests/context-engine/pack/max_coverage.test.ts
npm run test -- tests/context-engine/router/proof_route.test.ts
npm run test -- tests/context-engine/orchestrator.test.ts
```

### Level 3 — Integration Tests

```bash
node scripts/ingest.js .
node scripts/build-graph.js --dry-run
node index.js query "What is the authentication flow?" --budget=1200 --format=json
# MCP: verify tools appear in editor; if “0 tools”, remove --package flag in args.
```

### Level 4 — Performance/Load

```bash
npx autocannon -c 8 -d 30 \
  -H 'Content-Type: application/json' \
  -b '{"question":"JWT validation","budget_tokens":1200}' \
  http://localhost:3000/context/query
```

### Level 5 — E2E Scenario

```bash
task-master init
echo "# Auth\nWe use JWT..." > .taskmaster/docs/auth.md
task-master ingest .taskmaster/docs/
task-master query "How does auth work?" --budget=800
task-master proof --query="JWT validation"
```

---

## Success Metrics & KPIs

* **Token Efficiency:** median tokens/query ↓ ≥35%.
* **Cost Optimization:** premium tier calls ↓ ≥40%.
* **Quality:** accuracy delta ≤2% vs baseline; deterministic answers ≥25% when coverage≥0.8 && conflicts=0.
* **Latency:** tier=none ≤0.8s P50; tier=small ≤2.5s P50; MCP ≤1.5s P90.
* **Integration Health:** no regressions in existing CLI flows; MCP tools visible & stable; caches coherent between MCP/CLI.

---

## Risk Mitigation & Contingencies

### Technical

1. **ESM/CJS friction**
   *Mitigation:* compile TS to match current runtime; avoid deep ESM-only imports.
   *Fallback:* dual build (CJS out) for context-engine.

2. **Vector search performance**
   *Mitigation:* SQLite-VSS with tuned indices; cache embeddings.
   *Fallback:* BM25-only mode with CE rerank.

3. **Sidecar availability (compressor/ColBERT)**
   *Mitigation:* feature flags off by default; health checks; timeouts.
   *Fallback:* disable sidecar and proceed with core pipeline.

4. **LLM rate limits**
   *Mitigation:* aggressive caching + router; batch small tasks.
   *Fallback:* deterministic answers when proof is sufficient.

5. **Memory growth**
   *Mitigation:* explicit disposals, bounded LRU caches, streaming iterators.
   *Fallback:* process-level soft restart hooks; cache eviction tuning.

### Integration

1. **MCP tool registration/visibility**
   *Mitigation:* follow current tool pattern; avoid `--package` arg in editors; doc quick fix.
   *Fallback:* CLI-only usage enabled; export answers to file for editor consumption.

2. **Project file watching / cache coherence**
   *Mitigation:* fs-watch `.taskmaster/**`; invalidate affected entries.
   *Fallback:* manual `task-master ingest` re-index command.

3. **DB migrations**
   *Mitigation:* versioned migrations; dry-run; backup DB.
   *Fallback:* clean rebuild from sources.

### Operational

1. **Long-running node process leaks**
   *Mitigation:* explicit cleanup in retriever/ranker; heap snapshots in CI perf job; cache size limits with TTLs.

2. **Quality regressions with compression**
   *Mitigation:* atom coverage checks pre/post; block release if coverage < threshold.
   *Fallback:* auto-rollback to uncompressed path for affected tenants.

3. **Online pairwise learner instability**
   *Mitigation:* capped LR; minimum evidence for updates; shadow mode first.
   *Fallback:* freeze weights; revert to static U(d)+bubble.

---

## Security & Compliance

* **Data locality:** on-disk DB under `~/.taskmaster/kb`; configurable path; no data exfiltration without explicit provider calls.
* **PII/Secrets:** basic redact rules on ingest (e.g., tokens/keys patterns); opt-out flag to skip sensitive files.
* **Access control:** local single-user by default; future multi-user requires process isolation or DB ACLs.
* **Logging:** structured logs sans raw chunk text; toggleable redaction.

---

## Observability

* **Metrics:** tokens in/out, tier chosen, router savings, cache hit rates, latency percentiles.
* **Tracing (optional):** span per stage (retrieve → rerank → pack → proof → route).
* **Dashboards:** local script `scripts/metrics/roi.js` to summarize ROI and quality by scenario.

---

## Deployment & Rollback

* **Feature flags:** `CONTEXT_ENGINE_ENABLED`, `CONTEXT_GRAPH_ENABLED`, `CONTEXT_COMPRESSOR_URL`, `CONTEXT_LATE_INTERACTION_URL`.
* **Rollout:** P0 minimal (no sidecars) → P1 graph/tree + compressor → P2 late-interaction.
* **Rollback:** disable flags; previous CLI/MCP continue unaffected.

---

## Migration Notes

* Initial DB create under `~/.taskmaster/kb/context.db`.
* Safe to delete DB for rebuild; ingestion is idempotent.
* Postgres upgrade path via env; run SQL migrations once.

---

## Anti-Patterns (DO NOT)

* Don't Add ESLint/Prettier alongside **Biome**.
* Don't Route to premium without **proof**.
* Don't Bypass coverage/atom checks when compressing.
* Don't Block the event loop with large sync I/O.
* Don't Hardcode provider names; always honor the **model triad** and Claude Code path.
* Don't Long prompts without **answerability proof**.
* Don't Assuming `tasks/`—**use `.taskmaster/**`** on `next`; PRD path remains `.taskmaster/docs/prd.txt`. ([GitHub][1])
* Don't Ignoring `.taskmasterconfig` if present—treat as optional override. ([GitHub][2])
* Don't Registering MCP tools in a way that triggers “0 tools.” Follow README guidance. ([GitHub][1])
* Don't Ignoring file-watch invalidation → MCP/CLI drift. ([GitHub][3])
* Don't Hardcoding provider names—respect model triad & Claude Code path. ([GitHub][1])
* Don't Registering MCP tools in a way that triggers “0 tools” in editors; follow docs. ([GitHub][1])
* Don't create new patterns when existing ones work
* Don't skip validation because "it should work"
* Don't ignore failing tests - fix them
* Don't use sync functions in async context
* Don't hardcode values that should be config
* Don't catch all exceptions - be specific


---

## Open Questions

* Thresholds by scenario: do we want per-command budgets (e.g., `research` gets higher B)?
* ColBERT sidecar footprint: ship recommended defaults or keep opt-in only?
* Expose citations into `tasks.json` fields (e.g., `detailsCitations`)?
* Per-tenant policy file under `.taskmasterconfig` for router weights?

---

## Timeline (8 weeks)

* **W1–2:** Foundation (chunker/atoms/store/cache).
* **W2–3:** RAPTOR + graph; CLI ingest/build-graph.
* **W3–4:** Hybrid retrieval + CE rerank; optional HyDE.
* **W4–5:** Usefulness 2.0 + pairwise + bubble.
* **W5–6:** Max-coverage packer + compression.
* **W6:** Proof + router; orchestrator wiring.
* **W7:** MCP/CLI surfacing; tests; docs.
* **W8:** Perf hardening; dashboards; flag-guarded release.

---

## Acceptance Criteria (Go/No-Go)

* Tokens/query ↓ ≥35%; premium calls ↓ ≥40%; accuracy delta ≤2%.
* Deterministic answers ≥25% when coverage≥0.8 && conflicts=0.
* P50 latency targets met (none ≤0.8s; small ≤2.5s).
* MCP tools visible and working in editors; CLI unchanged for legacy commands.
* Unit + integration + perf tests pass; Biome clean; `tsc --noEmit` clean.

---

## Appendix A — Example Policies

```yaml
budgets:
  default: 1200
  research: 2000
  faq: 800

router:
  none:
    coverage_min: 0.80
    conflicts_max: 0
  small:
    fallback_when: ["coverage_below", "minor_conflict"]
  premium:
    escalate_when: ["low_support", "multi_hop_reasoning", "legal_safety"]

usefulness_weights:
  alpha_rel: 0.45
  beta_ig:   0.20
  gamma_tr:  0.15
  delta_re:  0.10
  eta_cost:  0.08
  zeta_cfr:  0.02
```

---

## Appendix B — Minimal Sidecar Specs (Optional)

* **Compressor:** HTTP `/compress` accepts `{chunks[], budget}`; returns compressed snippets; preserves entities/numbers/IDs.
* **Late-interaction:** HTTP `/search` accepts embeddings & query; returns docIDs + positions; timeouts at 400ms.

---

## Appendix C — Sample Tests (Jest)

```ts
test('max_coverage selects atoms under budget', () => {
  const atoms = /* ... */;
  const cands = /* chunks with coverage... */;
  const out = packMaxCoverage(cands, atoms, 900, { mmr: 0.3 });
  expect(totalTokens(out)).toBeLessThanOrEqual(900);
  expect(coverageRatio(out, atoms)).toBeGreaterThan(0.8);
});

test('router chooses none when coverage high and no conflicts', () => {
  const proof = { coverage: 0.9, conflicts: 0, supportStyle: 'span', selected: [] };
  expect(route(proof, { budget: 900 } as any, 900)).toBe('none');
});
```

---

### Final Notes (NEXT alignment)

* Uses `.taskmaster/**` for project artifacts and PRD path.
* MCP tools registered under `mcp-server/src/tools`; address “0 tools” by removing `--package` arg in editor launch config.
* JS/TS mix preserved; **Biome** and **Jest** remain the standard.
* All new features are **opt-in** behind flags; zero regression risk to existing workflows.
