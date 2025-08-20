# Task Master AI — Context Engine (MSE / Tri-Index / Usefulness)

Drop-in module for **Task Master AI (`next`)** that returns **Minimum Sufficient Evidence (MSE)** with citations under a strict token budget. Local-first; escalates to bigger models only when evidence is insufficient.

---

## What it adds (in one screen)

* **Tri-Index memory:** Graph communities + RAPTOR summary tree + Hybrid evidence (BM25+dense; optional late-interaction).
* **Usefulness 2.0:** pointwise utility + pairwise micro-trainer, bubble stabilizer.
* **Packing:** **budgeted max-coverage** over atomic facts (ENT/NUM/DATE/REL) + MMR.
* **Answerability router:** `none` (deterministic) → `small` (self-critique) → `premium`.
* **Compression:** trained extractive (entity/number-safe), ≤160 tokens/snippet.

Targets: **−35% tokens/query**, **−40% premium calls**, **≤2%** accuracy delta.

---

## Install

```bash
git clone <your-fork-url>
cd <repo>
git checkout next
npm ci
```

---

## Quickstart

```bash
# 1) Ingest docs
node scripts/ingest.js .taskmaster/docs

# 2) (Optional) Build graph & summaries
node scripts/build-graph.js

# 3) Ask under a budget
node index.js query "How does auth work?" --budget=1200 --format=pretty
```

Output (example):

```
Answer [small]
<brief>

Proof: 86% coverage, 0 conflicts
Sources:
  1. file://.../auth.md
  2. file://.../architecture.md
```

---

## Commands (added)

* `node scripts/ingest.js <path|url> [...]`
* `node scripts/build-graph.js [--rebuild]`
* `node index.js query "<question>" --budget=<tokens> [--format=json|pretty]`
* `node index.js proof "<question>"` (if enabled)

---

## Editor (MCP) tools

`context_ingest`, `context_query`, `context_proof`, `context_explain`.

> If your editor shows **“0 tools”**, remove `--package=task-master-ai` from its MCP launch args.

---

## Config (env)

```bash
export CONTEXT_ENGINE_ENABLED=true
export CONTEXT_VECTOR_BACKEND=sqlite        # or pgvector
export CONTEXT_DB_PATH="$HOME/.taskmaster/kb/context.db"
export CONTEXT_GRAPH_ENABLED=true
export CONTEXT_CACHE_SIZE=1000
# optional sidecars
# export CONTEXT_COMPRESSOR_URL="http://127.0.0.1:4507"
# export CONTEXT_LATE_INTERACTION_URL="http://127.0.0.1:4508"
```

Model triad (main/research/fallback) + Claude Code are reused from Task Master config.

---

## Added structure

```
src/context-engine/
  orchestrator.ts  types.ts
  ingest/   retrieve/   rank/   pack/   router/   compress/   cache/   metrics/

mcp-server/src/tools/
  context_ingest.js  context_query.js  context_proof.js  context_explain.js

scripts/
  ingest.js  build-graph.js  metrics/roi.js

tests/context-engine/
  orchestrator.test.ts  rank/*.test.ts  pack/*.test.ts  router/*.test.ts
```

---

## Defaults & gotchas

* Uses **`.taskmaster/**`** (PRD default: `.taskmaster/docs/prd.txt`).
* **Biome** is the formatter/linter. Don’t add ESLint/Prettier.
* JS/TS mix; compile TS to match existing runtime (CJS/ESM interop).

---

## Disable quickly

Set `CONTEXT_ENGINE_ENABLED=false` (existing Task Master commands keep working).
