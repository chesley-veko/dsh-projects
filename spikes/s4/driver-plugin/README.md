# Spike S4 driver plugin — `/spike/*` HTTP driver

Implements the endpoint contract in `../plugin-interface.md` (the S4 checks'
calling contract) as a real DSH plugin, so S4 — and S3, which uses the same
driver for its prompt/compact/tools/system-prompt calls — can run against
live agents instead of source reading.

Layout:

- `driver-plugin/` — the plugin (`dsh-spike-s4-driver`, host-only, no client half):
  - `src/index.ts` — all endpoints (see below).
  - `package.json` / `tsdown.config.ts` / `tsconfig.json` / `cordis.patch.yml`
    — packaging. `tsdown` uses `fixedExtension: false` so the build emits
    `lib/index.js` matching the declared entry (the S3 fence plugin failed
    live on exactly this, 2026-11-08).
- `profile/` — standalone test profile, port **3093**, does NOT load
  superagent. Same shape as the S1 profile (3091) and S2 profile (3092).
  The route lists both `deepseek-v4.1-flash` (default) and `deepseek-v4-pro`
  (check 2's non-default model); the lab profiles get `deepseek-v4-pro`
  only via the temporary extension in `test-fixtures.md`.

## Endpoints

Base: the profile's web server (standalone: `http://127.0.0.1:3093`;
lab mount: `http://127.0.0.1:3082`). Every request must be loopback and
carry `x-orchestrator-request: 1` (the lab convention; `x-spike-request: 1`
from the S1/S2 plugins is also accepted).

| Endpoint | Method | Implemented | Notes |
|---|---|---|---|
| `/spike/health` | GET | ✅ | `{ok, plugin}` smoke check (extra, not in the contract). |
| `/spike/version` | GET | ✅ | `{dshVersion, dshPackageVersion, node, os, harnessSha, model}`. Versions come from `dsh --version` / `npm root -g` + `package.json` (the commands test-fixtures.md already uses); any failure yields `null`, never a fabricated version. `harnessSha` is the build-time locked baseline `fcc0ad46`. |
| `/spike/global-default` | GET | ✅ | `{provider, model}` (+ `reasoningEffort` when set) from `ctx.agentDefaultModel.currentSelection()`. 503 when the service is absent. |
| `/spike/workspaces` | GET | ✅ | `{count, ids}` — direct `workspaceRegistry.list()` mapping. |
| `/spike/agents.create` | POST | ✅ | `{sessionId, cwd, agentPreset?, agentOptions?, setup?, abortAfterMs?}` → `{sessionId, status: "created", agentPreset, cwd}`. See diffs below. |
| `/spike/agents.abort` | POST | ✅ | `{sessionId}` → `{status: "aborted"}` while creation is in flight, `{status: "noop", reason: "signal-detached"}` after creation, 404 when unknown. |
| `/spike/agents.prompt` | POST | ✅ | `{sessionId, text}` → `{reply, model, calls, usage, timedOut, modelSource, events, startSeq, endSeq, errors}`. Waits for `whenIdle()` (300 s timeout → 504 with partial data). |
| `/spike/agents.resume` | POST | ✅ | `{sessionId, agentPreset?, agentOptions?, setup?}` → `{sessionId, status: "resumed", agentPreset}`. |
| `/spike/agents.inspect` | GET | ✅ | `?sessionId=` → `{exists, status, agentStatus, model, cwd, agentPreset, workspaceCount, globalDefaultModel, detail?}`. |
| `/spike/tools.visible` | GET | ✅ | `?sessionId=` → `{tools: [...]}` — `ctx.tools.schemas(scope)` after shadowing + restrictions. |
| `/spike/system-prompt` | GET | ✅ | `?sessionId=` → `{sections: [{name, position, text}]}` — see the `order` diff below. |
| `/spike/agents.compact` | POST | ✅ | `{sessionId}` → compact result object, or literal JSON `null` when no safe range exists. |

Nothing is marked 未实现（缺接口）: every endpoint in
`plugin-interface.md` is implemented. The diffs below are contract
deviations, not missing endpoints.

## Contract diffs (implemented contract ≠ assumed contract)

1. **Auth header** — the contract says `x-orchestrator-request: 1`; the
   driver accepts that header OR `x-spike-request: 1` (S1/S2 convention).
   `checks.md` names no header, so no call change is needed.
2. **`agentPreset` omitted** — the contract says "lab 默认 worker preset".
   There is no such resolvable API: `agentPresets.resolve(undefined)`
   returns the deployment default preset. The driver uses that and reports
   the resolved id. `checks.md` passes `agentPreset` explicitly wherever a
   specific preset matters, so no call change is needed.
3. **`system-prompt` sections have no `order`** — `systemPrompt.assemble()`
   returns `AssembledSection {name, text, interpolate?}`; the registration
   `order` is dropped and no public seam exposes it. The driver returns
   `{name, position, text}` where `position` is the 0-based index in
   assembly (order-sorted) order. S3 step 3 only compares section *text*
   with the fixture, so no call change is needed.
4. **`agents.prompt` usage** — `inputTokens`/`outputTokens` are summed from
   the `assistant/message` events that carry `usage`; when no event carries
   usage they are `null` (the contract's example shows `0`, but S3
   `prompts.md` says missing = null, never fabricate — prompts.md wins).
   Cache fields are `null` unless at least one event reports them.
   Extra fields: `timedOut`, `modelSource` (`request/header` or `none`),
   `events`, `startSeq`, `endSeq`, `errors` (turn-level `agent/error`
   messages observed during the turn, usually `[]`).
5. **`agents.prompt` `model`** — taken from the latest `request/header`
   event in the turn, never an echo of the requested model; `null` when the
   turn made no model request.
6. **`agents.compact`** — `CompactionResult` carries no token accounting, so
   `tokenAccounting` comes from the `compaction/summary` event's optional
   `usage` field, or `null` when absent. Extra fields: `shadowedSeqs`,
   `shadowedTokenCount`, `startSeq`, `summarySeq`, `endSeq`, `compactionId`.
   A busy agent (turn running) yields 409 with the original error.
7. **`agents.inspect`** — `status` uses the contract vocabulary
   (`live` | `disposed` | `unknown`); live agents additionally report
   `agentStatus` (`idle` | `running`). `exists` means "live, or known to
   this driver process": a persisted-but-not-resumed session reads
   `exists: false` until a successful `resume` (check 7 resumes before
   inspecting, so it is unaffected). Creation failures are recorded with
   `status: "unknown"` and a `detail` string carrying the original error.
8. **`agents.create` `cwd`** — passed through untouched: no `mkdir`, no
   existence check. Source shows only absolute-path validation
   (session header validation), so check 3's nonexistent-cwd counter-example
   may NOT be rejected by the harness — that outcome is itself a finding,
   to be recorded as observed, not forced by the driver.
9. **`abortAfterMs` races setup** — the signal is passed to `create` and
   aborted on schedule, but preset mount is fast: a 200 ms abort will
   usually land after setup completes (create succeeds; a later abort then
   returns `noop`). Check 6a's fallback (separate abort call within 200 ms
   of issuing create) has the same race. If create succeeds, record
   "signal window already closed" as the observation; do not treat it as a
   driver failure.
10. **`agents.resume` accepts extras** — optional `agentPreset`,
    `agentOptions`, `setup` beyond the contract's `{sessionId}`. Defaults:
    preset from the restored session header, `setup: "none"`. Probe
    registration is NOT persisted — resume re-applies the requested variant.
11. **Setup `projects-probe` is idempotent-safe** — if the mounted preset
    already provides `spike_projects_probe` (the S3 fence preset does), the
    driver skips registration instead of throwing on a duplicate. S3
    coordinator creates should still pass `setup: "none"` (the preset
    provides the probe); S4 check 4 uses `"projects-probe"` with a plain
    preset.
12. **`agents.create` returns extras** — `agentPreset` (resolved id) and
    `cwd` alongside the contract's `{sessionId, status}`.

## Verified seams (fcc0ad46)

See the header comment in `driver-plugin/src/index.ts` for the full list
with file:line citations. The load-bearing ones:

- `ctx.agents.create({sessionId, meta: {cwd, agentPreset}, agentOptions,
  signal, setup})` — `signal` is creation-only, detached before the handle
  becomes visible.
- Turn observation via the sanctioned `session/event` append feed
  (subscribe before `followup`, collect until `whenIdle()`, unsubscribe).
  The deprecated synchronous readers (`snapshotEvents` / `eventAt` /
  `ownEvents`) are NOT used (Agent Note 2026-09-09).
- `request/header` events are the source of the actually-used model;
  `assistant/message` events carry per-step `TokenUsage`.

## 推断（源码） — not proven by an in-repo example, live-verified by smoke

- A `session/event` listener registered on `agent.ctx` receives that
  agent's events (the doc says agent-scoped listeners receive only sessions
  entered through that agent's context; `agent.ctx` IS that context).
- `ctx.agentDefaultModel` / `ctx.compaction` are reachable on the plugin
  context without injecting them (both are loaded by dsh-base). The driver
  reads them defensively and answers 503 when absent instead of failing to
  load.
- A bundle row may omit the `client` entry (see
  `driver-plugin/cordis.patch.yml`). If the profile fails to load with a
  complaint about a missing client entry, add a stub client entry mirroring
  `dsh-spike-s1`'s shape and note it in the live report.

## dsh-01 install & start (standalone profile, port 3093)

```bash
# 0. Record versions first (every live run starts here).
dsh --version
cat "$(npm root -g)/@deepseek-ai/dsh/package.json" | grep '"version"'
node --version && uname -a

# 1. Sync this branch to dsh-01, then build the driver.
cd ~/workspace/dsh-projects/spikes/s4/driver-plugin
pnpm install && pnpm build
# Expect lib/index.js to exist. If `pnpm build` reports type errors, see
# "Known risks" below before changing anything.

# 2. Copy the profile under the lab and fix the link path if needed.
cp -r ~/workspace/dsh-projects/spikes/s4/profile \
  ~/workspace/dsh-superagent-lab/profiles/spike-s4
# profile/package.json links the driver by absolute dsh-01 path
# (/data/home/workspace/dsh-projects/spikes/s4/driver-plugin) — confirm
# it points at the real location after the sync.
cd ~/workspace/dsh-superagent-lab/profiles/spike-s4 && pnpm install

# 3. Start it like the lab service (tmux, DSH_HOME = lab dir, key from
#    ~/.config/dsh-lab/opencode.env — never print the key).
tmux new-session -d -s dsh-spike-s4
tmux send-keys -t dsh-spike-s4 \
  'set -a; . ~/.config/dsh-lab/opencode.env; set +a; DSH_HOME=~/workspace/dsh-superagent-lab dsh --profile spike-s4' Enter
# Wait ~20 s, then smoke-test (see below). The service stays up for the
# whole S4 run; check 7 restarts the LAB service (3082), not this one.
```

Lab-profile mount (for S3, which needs the fence preset from the lab
patch): add the driver to the lab profile instead — link the package from
`profiles/superagent/package.json`, add `dsh-spike-s4-driver` to its
`dsh.profile.bundles`, `pnpm install`, restart the lab service. The driver
then answers on port 3082 under the same `/spike` prefix, next to
`/orchestrator`. The S3 fence preset must be in the lab patch for the
coordinator creates (see `spikes/s3/coordinator-preset.patch.yml`).

## Smoke test (curl)

```bash
BASE=http://127.0.0.1:3093
H='-H "x-orchestrator-request: 1"'

curl -s $H $BASE/spike/health
curl -s $H $BASE/spike/version
curl -s $H $BASE/spike/global-default
curl -s $H $BASE/spike/workspaces

ID="spike-s4-$(python3 -c 'import uuid; print(uuid.uuid4())')"
curl -s $H -X POST $BASE/spike/agents.create \
  -H 'content-type: application/json' \
  -d "{\"sessionId\": \"$ID\", \"cwd\": \"/data/home/workspace/spike-s4-test/wt-1\", \"setup\": \"none\"}"
curl -s $H "$BASE/spike/agents.inspect?sessionId=$ID"
curl -s $H "$BASE/spike/tools.visible?sessionId=$ID"
curl -s $H "$BASE/spike/system-prompt?sessionId=$ID"
curl -s $H -X POST $BASE/spike/agents.prompt \
  -H 'content-type: application/json' \
  -d "{\"sessionId\": \"$ID\", \"text\": \"用一句话回答：你现在用的模型是哪一个？只报 provider 和 model 名，不要多说。\"}"
# Expect model "opencode-go/deepseek-v4.1-flash" (the profile default).
curl -s $H -X POST $BASE/spike/agents.compact \
  -H 'content-type: application/json' -d "{\"sessionId\": \"$ID\"}"
# Expect literal `null` (short history, no safe range).
curl -s $H -X POST $BASE/spike/agents.resume \
  -H 'content-type: application/json' -d "{\"sessionId\": \"$ID\"}"
# Expect 409 — the agent is already live (resume is for post-restart).
```

## Known risks (live)

- Build-time devDeps are pinned to `0.2.2-rc.1` — the same version as the
  live runtime on dsh-01 — **not** `0.2.1-alpha.2` (S1 / superagent).
  The pin was moved because `agent.model` (used by `agents.inspect`)
  only exists in the `Agent` augmentation from 0.2.2 onward; against
  0.2.1-alpha.2 types `tsc` rejects `agent.model.current()` (verified
  locally). `tsc --noEmit` passes and `pnpm build` emits `lib/index.js`
  against the 0.2.2-rc.1 pins (verified 2026-11-08 on the coordinator VM,
  node v24.22.1; `npm install` there needed `--legacy-peer-deps` for the
  `cordis-plugin-include` peer conflict — `pnpm install` on dsh-01
  should not need it, as with S1; if it does, that flag is the fix).
- If the profile fails to load, check first: (a) the `bundles:` row's
  missing `client` entry (see 推断 above); (b) a service the driver reads
  defensively (`agentDefaultModel`, `compaction`) being absent — those
  surface as endpoint 503s, not load failures.
- `agents.prompt` waits up to 300 s for `whenIdle()`. A model call that
  hangs (e.g. a route outage) returns 504 with partial collected events —
  that partial payload IS the evidence, not a driver bug.
- The driver keeps its agent records in memory only. After a service
  restart the map is empty: `inspect` reads `exists: false` for
  pre-restart sessions until `resume` re-registers them (check 7).
