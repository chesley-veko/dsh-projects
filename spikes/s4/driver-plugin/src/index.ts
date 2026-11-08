/**
 * Spike S4 driver plugin: HTTP driver for the `/spike/*` experiment endpoints.
 *
 * Throwaway experiment code. It is NOT shipped: it exists only to drive the
 * S4 checks (spikes/s4/checks.md) and the S3 fence runs (spikes/s3/prompts.md)
 * against real DSH agents, so the experiment evidence comes from live runs
 * instead of source reading.
 *
 * The driver is mounted in a standalone test profile (spikes/s4/profile,
 * port 3093) and can also be mounted in the lab profile; it never loads
 * superagent itself and never calls `workspaceRegistry.create`.
 *
 * Verified seams (deepseek-harness fcc0ad46, the 0.2.2-rc.1 merge point):
 * - `ctx.agents.create` / `resume` / `get` (packages/core/agent/src/index.ts):
 *   `create` takes `{sessionId, meta: {cwd, agentPreset}, agentOptions,
 *   signal, setup}`; `signal` is creation-only and detached before the
 *   handle becomes visible; `resume` takes `{resumeSessionId, agentOptions?,
 *   signal?, setup?}`; `get(id)` returns the live `Agent | undefined`.
 *   A duplicate live id throws `agent "<id>" is already registered`
 *   (enter-collision boundary, index.ts:482).
 * - Preset composition mirrors the S1 spike / webhook plugin
 *   (experimental/webhook/src/session.ts:110-118): `agentPresets.resolve(id?)`
 *   (id omitted = deployment default; unknown id throws
 *   `agent-preset/not-found` with the available list),
 *   `agentPresets.acquireScope(id)` held across the create call,
 *   `agentPresets.mount(agentCtx, id)` inside `setup`.
 * - Agent handle (runtime-types.ts): `agent.followup(message)` queues one
 *   turn and wakes the driver; `agent.whenIdle()` resolves after whole-agent
 *   quiescence; `agent.model.current()` returns the recorded selection
 *   (pending ?? lastUsed) or the `agentOptions` fallback; `agent.status` is
 *   `'idle' | 'running'`; `agent.ctx` is the agent-scoped context;
 *   `agent.session.header` carries the durable `{cwd, agentPreset}`.
 * - Turn observation uses the sanctioned `session/event` append feed
 *   (`agent.ctx.on('session/event', (session, event) => ...)`; the ACP bridge
 *   and headless CLI use exactly this shape): the driver subscribes before
 *   `followup`, collects newly committed events until `whenIdle()`, then
 *   unsubscribes. It does NOT call the deprecated synchronous readers
 *   (`snapshotEvents` / `eventAt` / `ownEvents`, Agent Note
 *   2026-09-09-deprecate-synchronous-session-event-reads).
 * - Session event facts (packages/core/session/src/types.ts): `request/header`
 *   carries `header.config: {provider, model}` — the route the step actually
 *   used; `assistant/message` carries `usage?: TokenUsage` with the step's
 *   accounting; `tool/call` carries `{callId, name, arguments}` (raw JSON
 *   string); `tool/result` carries `{message, error?: {name, code, reason?}}`.
 * - `TokenUsage` (packages/llm/llm/src/types.ts:182-200): `inputTokens` /
 *   `outputTokens` plus OPTIONAL `cacheReadTokens` / `cacheWriteTokens` —
 *   missing cache fields are reported as `null`, never 0.
 * - `ctx.tools.schemas(scope)` (packages/core/tools/src/index.ts:316)
 *   returns the definitions "after scoped shadowing and restrictions" — the
 *   agent-visible tool list S3 step 1a needs. `ctx.tools.register` +
 *   `defineTool` register the scoped probe tool (same definition as the S3
 *   fence plugin's `spike_projects_probe`).
 * - `ctx.systemPrompt.assemble({scope, agent})`
 *   (packages/core/system-prompt/src/index.ts:613) returns the post-waterfall
 *   `PromptAssembly` whose `sections` are `{name, text, interpolate?}`.
 *   NOTE: the assembly drops the registration `order` — see the
 *   `system-prompt` endpoint below.
 * - `ctx.compaction.compactNow(agent, signal, sourceCommandId?)`
 *   (packages/compaction/compaction/src/index.ts:162) returns
 *   `CompactionResult | null`; the result carries `summary: ContentBlock[]`,
 *   `shadowedRange`, `shadowedSeqs`, `shadowedTokenCount` — and NO token
 *   accounting. The `compaction/summary` event optionally carries `usage`.
 *   A bare `Agent` structurally satisfies `ManualCompactAgentContext`
 *   (`{session, options, runMaintenance}`); command-compact calls it the
 *   same way (packages/compaction/command-compact/src/index.ts:67).
 * - `ctx.agentDefaultModel.currentSelection()`
 *   (packages/core/agent-default-model/src/index.ts) reads the global
 *   default model selection.
 * - `ctx.workspaceRegistry.list()` (packages/workspace/workspace/src/index.ts:292)
 *   returns the live workspace entities in durable order; each has `.id`.
 * - `ctx.sessions.get(id)` (packages/core/session/src/index.ts:1375) returns
 *   only LIVE sessions — there is no driver-side "exists in storage" check.
 *   `inspect.exists` therefore means "live, or known to this driver process";
 *   a persisted-but-not-resumed session reads `exists: false` until a
 *   successful `resume` (check 7 resumes before inspecting, so it is unaffected).
 * - `cwd` is validated for absoluteness only (session header validation,
 *   packages/core/session/src/index.ts:116): no existence check was found in
 *   session/agent code. The driver passes `cwd` through untouched (it must
 *   NOT `mkdir` it — that would destroy check 3's nonexistent-cwd
 *   counter-example); whether a nonexistent cwd is rejected is a live
 *   observation, not a driver decision.
 * - Version: no in-process version export was found, so `/spike/version`
 *   shells out to the same commands test-fixtures.md already uses
 *   (`dsh --version`, `npm root -g` + `package.json` read); any failure
 *   yields `null`, never a fabricated version.
 *
 * Inferences (marked 推断（源码） in the README, live-verified by the smoke
 * test, not proven by an in-repo example):
 * - A `session/event` listener registered on `agent.ctx` receives that
 *   agent's events (the doc says agent-scoped listeners receive only sessions
 *   entered through that agent's context; `agent.ctx` IS that context).
 * - `ctx.agentDefaultModel` / `ctx.compaction` are reachable on the plugin
 *   context without injecting them (both are loaded by dsh-base's
 *   cordis.patch.yml). The driver reads them defensively and answers 503
 *   when absent instead of failing to load.
 *
 * @module dsh-spike-s4-driver
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isAbsolute } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent, AgentHandle, AgentOptions } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {} from '@deepseek-ai/dsh-agent-preset-registry'
import type {} from '@deepseek-ai/dsh-compaction'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-workspace'
import { brandString } from '@deepseek-ai/dsh-brand'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import s from '@deepseek-ai/schemastery'

export const name = 'dsh-spike-s4-driver'
export const inject = ['agents', 'agentPresets', 'workspaceRegistry', 'webServer']
export const Config = s.object({})
export type SpikeS4DriverConfig = ReturnType<typeof Config>

/** Locked harness baseline this driver was verified against. */
const HARNESS_SHA = 'fcc0ad46'
const PROBE_TOOL_NAME = 'spike_projects_probe'
const PROBE_SENTINEL = 'PROBE-OK-51D2'
const PROMPT_TIMEOUT_MS = 300_000
const COMPACT_TIMEOUT_MS = 120_000

type SetupVariant = 'projects-probe' | 'none'

interface AgentRecord {
  sessionId: SessionId
  state: 'live' | 'creation-failed' | 'disposed'
  handle?: AgentHandle
  cwd?: string
  agentPreset?: string
  agentOptions?: AgentOptions
  setup?: SetupVariant
  /** Creation failure message, when state is 'creation-failed'. */
  error?: string
  createdAt: number
}

interface PromptCall {
  name: string
  args: unknown
  result: string | null
  error: string | null
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

function sameOrigin(req: IncomingMessage, port: number | undefined): boolean {
  const host = req.headers.host
  // `port` is undefined when the webserver picked its own port; then any
  // loopback host is accepted (the contract header below still gates it).
  if (port === undefined) {
    if (host !== '127.0.0.1' && host !== 'localhost' && !host?.startsWith('127.0.0.1:') && !host?.startsWith('localhost:')) return false
  } else if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
    return false
  }
  // Contract header (lab convention) or the S1/S2 spike header; either is
  // loopback-only experiment traffic. Both are accepted so the coordinator
  // can reuse either curl pattern.
  const header = req.headers['x-orchestrator-request'] ?? req.headers['x-spike-request']
  if (header !== '1') return false
  const origin = req.headers.origin
  return origin === undefined || origin === `http://${host}`
}

async function readBody(req: IncomingMessage, maxBytes = 64 * 1024): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) throw new Error('request body too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf-8')
  if (text.trim() === '') return {}
  return JSON.parse(text) as unknown
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Best-effort shell-out; `null` on any failure (never fabricate). */
function shellOut(argv: string[]): string | null {
  try {
    const [file, ...args] = argv
    if (file === undefined) return null
    const out = execFileSync(file, args, { encoding: 'utf-8', timeout: 15_000 }).trim()
    return out === '' ? null : out
  } catch {
    return null
  }
}

function dshPackageVersion(): string | null {
  try {
    const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf-8', timeout: 15_000 }).trim()
    const pkg = JSON.parse(readFileSync(`${root}/@deepseek-ai/dsh/package.json`, 'utf-8')) as { version?: unknown }
    return typeof pkg.version === 'string' ? pkg.version : null
  } catch {
    return null
  }
}

/** Join the `text` blocks of a message `content` array; non-text blocks are skipped. */
function textOfContent(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content as readonly unknown[]) {
    if (typeof block === 'object' && block !== null
      && (block as { type?: unknown }).type === 'text'
      && typeof (block as { text?: unknown }).text === 'string') {
      parts.push((block as { text: string }).text)
    }
  }
  return parts.join('')
}

function parseToolArgs(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function parseAgentOptions(body: Record<string, unknown>): AgentOptions | undefined {
  const raw = body.agentOptions
  if (raw === undefined) return undefined
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('agentOptions must be an object')
  }
  const options: AgentOptions = {}
  const record = raw as Record<string, unknown>
  if (record.provider !== undefined) {
    if (typeof record.provider !== 'string') throw new Error('agentOptions.provider must be a string')
    options.provider = record.provider
  }
  if (record.model !== undefined) {
    if (typeof record.model !== 'string') throw new Error('agentOptions.model must be a string')
    options.model = record.model
  }
  if (record.reasoningEffort !== undefined) {
    if (typeof record.reasoningEffort !== 'string') throw new Error('agentOptions.reasoningEffort must be a string')
    options.reasoningEffort = record.reasoningEffort as AgentOptions['reasoningEffort']
  }
  if (record.maxTokens !== undefined) {
    if (typeof record.maxTokens !== 'number') throw new Error('agentOptions.maxTokens must be a number')
    options.maxTokens = record.maxTokens
  }
  return options
}

function parseSetupVariant(body: Record<string, unknown>): SetupVariant {
  const raw = body.setup
  if (raw === undefined) return 'none'
  if (raw !== 'projects-probe' && raw !== 'none') {
    throw new Error('setup must be "projects-probe" or "none"')
  }
  return raw
}

function requireSessionId(body: Record<string, unknown>): SessionId {
  const raw = body.sessionId
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error('sessionId must be a non-empty string')
  }
  return brandString<SessionId>(raw)
}

/**
 * Mount the preset in setup, then register the probe tool when the
 * `projects-probe` variant was requested — unless the preset already provides
 * it (the S3 fence preset registers `spike_projects_probe` itself; a duplicate
 * registration would throw and fail creation). Mount runs first so the
 * preset's own tools are visible to the check.
 */
async function mountPresetAndProbe(
  ctx: Context,
  agentCtx: Context,
  presetId: string,
  setup: SetupVariant,
): Promise<void> {
  await ctx.agentPresets.mount(agentCtx, presetId)
  if (setup !== 'projects-probe') return
  const scope = scopeOf(agentCtx)
  const already = agentCtx.tools.schemas(scope).some((tool) => tool.name === PROBE_TOOL_NAME)
  if (already) return
  agentCtx.tools.register(defineTool({
    name: PROBE_TOOL_NAME,
    description: 'S4 probe: a Projects tool registered by the driver setup variant. Returns a fixed sentinel string.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { echo: { type: 'string', required: true, description: 'Sentinel echo.' } },
      },
      render: (_args, value) => [{ type: 'text', text: value.echo }],
    },
    async execute() {
      return { echo: PROBE_SENTINEL }
    },
  }))
}

/**
 * Reduce the events collected during one prompt turn into the contract's
 * response. Every field comes from the log: `model` from the latest
 * `request/header` event (never an echo of the requested model), `usage`
 * summed from the `assistant/message` events that carry it, `calls` paired
 * by `callId`. Anything unobserved is `null`, never invented.
 */
function summarizeTurn(events: readonly SessionEvent[]): {
  reply: string
  model: string | null
  modelSource: 'request/header' | 'none'
  calls: PromptCall[]
  usage: { inputTokens: number | null; outputTokens: number | null; cacheReadTokens: number | null; cacheWriteTokens: number | null }
} {
  const replies: string[] = []
  let model: string | null = null
  let modelSource: 'request/header' | 'none' = 'none'
  const callsById = new Map<string, PromptCall>()
  const callOrder: string[] = []
  let inputTokens: number | null = null
  let outputTokens: number | null = null
  let cacheReadTokens: number | null = null
  let cacheWriteTokens: number | null = null

  for (const event of events) {
    const data = event.data as Record<string, unknown>
    switch (event.type) {
      case 'request/header': {
        const header = data.header as { config?: { provider?: unknown; model?: unknown } } | undefined
        const provider = header?.config?.provider
        const modelName = header?.config?.model
        if (typeof provider === 'string' && typeof modelName === 'string') {
          model = `${provider}/${modelName}`
          modelSource = 'request/header'
        }
        break
      }
      case 'assistant/message': {
        const message = data.message as { content?: unknown } | undefined
        const text = textOfContent(message?.content)
        if (text !== '') replies.push(text)
        const usage = data.usage as {
          inputTokens?: unknown; outputTokens?: unknown
          cacheReadTokens?: unknown; cacheWriteTokens?: unknown
        } | undefined
        if (usage !== undefined) {
          if (typeof usage.inputTokens === 'number') inputTokens = (inputTokens ?? 0) + usage.inputTokens
          if (typeof usage.outputTokens === 'number') outputTokens = (outputTokens ?? 0) + usage.outputTokens
          if (typeof usage.cacheReadTokens === 'number') cacheReadTokens = (cacheReadTokens ?? 0) + usage.cacheReadTokens
          if (typeof usage.cacheWriteTokens === 'number') cacheWriteTokens = (cacheWriteTokens ?? 0) + usage.cacheWriteTokens
        }
        break
      }
      case 'tool/call': {
        const callId = data.callId
        const name = data.name
        if (typeof callId === 'string' && typeof name === 'string') {
          callsById.set(callId, {
            name,
            args: parseToolArgs(data.arguments),
            result: null,
            error: 'no-result-recorded',
          })
          callOrder.push(callId)
        }
        break
      }
      case 'tool/result': {
        const message = data.message as { toolCallId?: unknown; content?: unknown; isError?: unknown } | undefined
        const callId = message?.toolCallId
        if (typeof callId !== 'string') break
        const call = callsById.get(callId)
        if (call === undefined) break
        call.result = textOfContent(message?.content)
        const error = data.error as { name?: unknown; code?: unknown; reason?: unknown } | undefined
        if (message?.isError === true || error !== undefined) {
          call.error = typeof error?.reason === 'string' ? error.reason
            : typeof error?.code === 'string' ? error.code
              : typeof error?.name === 'string' ? error.name
                : 'tool-error'
        } else {
          call.error = null
        }
        break
      }
      default:
        break
    }
  }
  return {
    reply: replies.join('\n'),
    model,
    modelSource,
    calls: callOrder.map((callId) => callsById.get(callId) as PromptCall),
    usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens },
  }
}

export async function apply(ctx: Context, _config: SpikeS4DriverConfig): Promise<void> {
  const records = new Map<SessionId, AgentRecord>()
  /** Creation signals still in flight, keyed by sessionId (for the abort endpoint). */
  const inflight = new Map<SessionId, AbortController>()

  const dispose = ctx.webServer.register({
    kind: 'prefix',
    path: '/spike',
    handler: async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
        if (!sameOrigin(req, ctx.webServer.port)) {
          json(res, 403, { error: 'same-origin spike requests only' })
          return
        }
        const pathname = url.pathname

        if (req.method === 'GET' && pathname === '/spike/health') {
          json(res, 200, { ok: true, plugin: name })
          return
        }

        if (req.method === 'GET' && pathname === '/spike/version') {
          const fallback = ctx.agentDefaultModel?.currentSelection()
          json(res, 200, {
            dshVersion: shellOut(['dsh', '--version']),
            dshPackageVersion: dshPackageVersion(),
            node: process.version,
            os: shellOut(['uname', '-a']) ?? `${process.platform} ${process.release.name ?? ''}`.trim(),
            harnessSha: HARNESS_SHA,
            model: fallback !== undefined ? `${fallback.provider}/${fallback.model}` : null,
          })
          return
        }

        if (req.method === 'GET' && pathname === '/spike/global-default') {
          const selection = ctx.agentDefaultModel?.currentSelection()
          if (selection === undefined) {
            json(res, 503, { error: 'agentDefaultModel service is not available in this profile' })
            return
          }
          json(res, 200, {
            provider: selection.provider,
            model: selection.model,
            ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: String(selection.reasoningEffort) }),
          })
          return
        }

        if (req.method === 'GET' && pathname === '/spike/workspaces') {
          const list = ctx.workspaceRegistry.list()
          json(res, 200, { count: list.length, ids: list.map((workspace) => workspace.id) })
          return
        }

        if (req.method === 'GET' && pathname === '/spike/agents.inspect') {
          const rawId = url.searchParams.get('sessionId')
          if (rawId === null || rawId === '') {
            json(res, 400, { error: 'sessionId query parameter is required' })
            return
          }
          const sessionId = brandString<SessionId>(rawId)
          const globalDefault = ctx.agentDefaultModel?.currentSelection()
          const workspaceCount = ctx.workspaceRegistry.list().length
          const agent = ctx.agents.get(sessionId)
          if (agent !== undefined) {
            const current = agent.model.current()
            json(res, 200, {
              exists: true,
              status: 'live',
              agentStatus: agent.status,
              model: current !== undefined ? `${current.provider}/${current.model}` : null,
              cwd: agent.session.header.cwd ?? null,
              agentPreset: agent.session.header.agentPreset ?? ctx.agentPresets.composedPreset(agent.ctx) ?? null,
              workspaceCount,
              globalDefaultModel: globalDefault !== undefined ? `${globalDefault.provider}/${globalDefault.model}` : null,
            })
            return
          }
          const record = records.get(sessionId)
          if (record !== undefined) {
            json(res, 200, {
              exists: true,
              status: record.state === 'live' ? 'disposed' : 'unknown',
              agentStatus: null,
              model: record.agentOptions?.provider !== undefined && record.agentOptions?.model !== undefined
                ? `${record.agentOptions.provider}/${record.agentOptions.model}` : null,
              cwd: record.cwd ?? null,
              agentPreset: record.agentPreset ?? null,
              workspaceCount,
              globalDefaultModel: globalDefault !== undefined ? `${globalDefault.provider}/${globalDefault.model}` : null,
              detail: record.state === 'creation-failed'
                ? `creation failed, agent never announced: ${record.error ?? ''}`
                : 'recorded as live by this driver; the agent has left the registry',
            })
            return
          }
          if (ctx.sessions.get(sessionId) !== undefined) {
            json(res, 200, {
              exists: true,
              status: 'unknown',
              agentStatus: null,
              model: null,
              cwd: null,
              agentPreset: null,
              workspaceCount,
              globalDefaultModel: globalDefault !== undefined ? `${globalDefault.provider}/${globalDefault.model}` : null,
              detail: 'live session in the store without a live agent',
            })
            return
          }
          json(res, 200, {
            exists: false,
            status: 'unknown',
            agentStatus: null,
            model: null,
            cwd: null,
            agentPreset: null,
            workspaceCount,
            globalDefaultModel: globalDefault !== undefined ? `${globalDefault.provider}/${globalDefault.model}` : null,
          })
          return
        }

        if (req.method === 'GET' && pathname === '/spike/tools.visible') {
          const rawId = url.searchParams.get('sessionId')
          if (rawId === null || rawId === '') {
            json(res, 400, { error: 'sessionId query parameter is required' })
            return
          }
          const sessionId = brandString<SessionId>(rawId)
          const agent = ctx.agents.get(sessionId)
          if (agent === undefined) {
            json(res, 404, { error: `unknown live session "${sessionId}"` })
            return
          }
          const scope = scopeOf(agent.ctx)
          const tools = agent.ctx.tools.schemas(scope).map((tool) => tool.name)
          json(res, 200, { tools })
          return
        }

        if (req.method === 'GET' && pathname === '/spike/system-prompt') {
          const rawId = url.searchParams.get('sessionId')
          if (rawId === null || rawId === '') {
            json(res, 400, { error: 'sessionId query parameter is required' })
            return
          }
          const sessionId = brandString<SessionId>(rawId)
          const agent = ctx.agents.get(sessionId)
          if (agent === undefined) {
            json(res, 404, { error: `unknown live session "${sessionId}"` })
            return
          }
          const scope = scopeOf(agent.ctx)
          const assembly = await agent.ctx.systemPrompt.assemble({ scope, agent })
          // AssembledSection carries {name, text, interpolate?} — the
          // registration `order` is dropped by assemble(), so the response
          // reports the assembly `position` (0-based, order-sorted) instead.
          // The order value itself is not observable through any public seam.
          json(res, 200, {
            sections: assembly.sections.map((section, position) => ({
              name: section.name,
              position,
              text: section.text,
            })),
          })
          return
        }

        if (req.method === 'POST' && pathname === '/spike/agents.create') {
          const body = await readBody(req)
          if (typeof body !== 'object' || body === null) {
            json(res, 400, { error: 'body must be a JSON object' })
            return
          }
          const record = body as Record<string, unknown>
          let sessionId: SessionId
          let agentOptions: AgentOptions | undefined
          let setup: SetupVariant
          try {
            sessionId = requireSessionId(record)
            agentOptions = parseAgentOptions(record)
            setup = parseSetupVariant(record)
          } catch (error) {
            json(res, 400, { error: errorText(error) })
            return
          }
          const cwd = record.cwd
          if (typeof cwd !== 'string' || !isAbsolute(cwd)) {
            json(res, 400, { error: 'cwd must be an absolute path' })
            return
          }
          if (ctx.agents.get(sessionId) !== undefined) {
            json(res, 409, { error: `agent "${sessionId}" is already registered` })
            return
          }
          const requestedPreset = typeof record.agentPreset === 'string' && record.agentPreset !== ''
            ? record.agentPreset
            : undefined
          const abortAfterMs = typeof record.abortAfterMs === 'number' && record.abortAfterMs > 0
            ? record.abortAfterMs
            : 0
          let preset: Awaited<ReturnType<Context['agentPresets']['resolve']>>
          try {
            preset = await ctx.agentPresets.resolve(requestedPreset)
          } catch (error) {
            json(res, 500, { error: errorText(error) })
            return
          }
          const controller = new AbortController()
          inflight.set(sessionId, controller)
          const timer = abortAfterMs > 0
            ? setTimeout(() => { controller.abort() }, abortAfterMs)
            : undefined
          let handle: AgentHandle | undefined
          try {
            await using presetScope = await ctx.agentPresets.acquireScope(preset.id)
            void presetScope
            handle = await ctx.agents.create({
              sessionId,
              meta: { cwd, agentPreset: preset.id },
              ...(agentOptions === undefined ? {} : { agentOptions }),
              signal: controller.signal,
              setup: async (agentCtx) => {
                await mountPresetAndProbe(ctx, agentCtx, preset.id, setup)
              },
            })
          } catch (error) {
            const message = errorText(error)
            records.set(sessionId, {
              sessionId,
              state: 'creation-failed',
              cwd,
              agentPreset: preset.id,
              agentOptions,
              setup,
              error: message,
              createdAt: Date.now(),
            })
            json(res, 500, { error: message })
            return
          } finally {
            if (timer !== undefined) clearTimeout(timer)
            inflight.delete(sessionId)
          }
          records.set(sessionId, {
            sessionId,
            state: 'live',
            handle,
            cwd,
            agentPreset: preset.id,
            agentOptions,
            setup,
            createdAt: Date.now(),
          })
          json(res, 200, { sessionId, status: 'created', agentPreset: preset.id, cwd })
          return
        }

        if (req.method === 'POST' && pathname === '/spike/agents.abort') {
          const body = await readBody(req)
          if (typeof body !== 'object' || body === null) {
            json(res, 400, { error: 'body must be a JSON object' })
            return
          }
          let sessionId: SessionId
          try {
            sessionId = requireSessionId(body as Record<string, unknown>)
          } catch (error) {
            json(res, 400, { error: errorText(error) })
            return
          }
          const controller = inflight.get(sessionId)
          if (controller !== undefined) {
            controller.abort()
            json(res, 200, { sessionId, status: 'aborted' })
            return
          }
          if (ctx.agents.get(sessionId) !== undefined) {
            json(res, 200, { sessionId, status: 'noop', reason: 'signal-detached' })
            return
          }
          json(res, 404, { error: `unknown session "${sessionId}"` })
          return
        }

        if (req.method === 'POST' && pathname === '/spike/agents.prompt') {
          const body = await readBody(req)
          if (typeof body !== 'object' || body === null) {
            json(res, 400, { error: 'body must be a JSON object' })
            return
          }
          const record = body as Record<string, unknown>
          let sessionId: SessionId
          try {
            sessionId = requireSessionId(record)
          } catch (error) {
            json(res, 400, { error: errorText(error) })
            return
          }
          const text = record.text
          if (typeof text !== 'string' || text.trim() === '') {
            json(res, 400, { error: 'text must be a non-empty string' })
            return
          }
          const agent: Agent | undefined = ctx.agents.get(sessionId)
          if (agent === undefined) {
            json(res, 404, { error: `unknown live session "${sessionId}"` })
            return
          }
          const collected: SessionEvent[] = []
          const agentErrors: string[] = []
          const stopEvents = agent.ctx.on('session/event', (session, event) => {
            if (session.id === sessionId) collected.push(event)
          })
          const stopErrors = agent.ctx.on('agent/error', ({ agent: subject, error }) => {
            if (subject.id === sessionId) agentErrors.push(errorText(error))
          })
          const startSeq = agent.session.seq
          agent.followup(createUserMessage({
            content: [{ type: 'text', text }],
            source: { kind: 'user' },
          }))
          let timedOut = false
          try {
            await Promise.race([
              agent.whenIdle(),
              new Promise((_resolve, reject) => {
                setTimeout(() => { reject(new Error('prompt timeout')) }, PROMPT_TIMEOUT_MS)
              }),
            ])
          } catch (error) {
            if (error instanceof Error && error.message === 'prompt timeout') {
              timedOut = true
            } else {
              throw error
            }
          } finally {
            stopEvents()
            stopErrors()
          }
          const summary = summarizeTurn(collected)
          const payload = {
            ...summary,
            timedOut,
            events: collected.length,
            startSeq,
            endSeq: agent.session.seq,
            errors: agentErrors,
          }
          if (timedOut) {
            json(res, 504, { error: `prompt timed out after ${PROMPT_TIMEOUT_MS}ms`, ...payload })
            return
          }
          json(res, 200, payload)
          return
        }

        if (req.method === 'POST' && pathname === '/spike/agents.resume') {
          const body = await readBody(req)
          if (typeof body !== 'object' || body === null) {
            json(res, 400, { error: 'body must be a JSON object' })
            return
          }
          const record = body as Record<string, unknown>
          let sessionId: SessionId
          let agentOptions: AgentOptions | undefined
          let setup: SetupVariant
          try {
            sessionId = requireSessionId(record)
            agentOptions = parseAgentOptions(record)
            setup = parseSetupVariant(record)
          } catch (error) {
            json(res, 400, { error: errorText(error) })
            return
          }
          if (ctx.agents.get(sessionId) !== undefined) {
            json(res, 409, { error: `agent "${sessionId}" is already live` })
            return
          }
          const requestedPreset = typeof record.agentPreset === 'string' && record.agentPreset !== ''
            ? record.agentPreset
            : undefined
          const controller = new AbortController()
          inflight.set(sessionId, controller)
          let handle: AgentHandle | undefined
          try {
            handle = await ctx.agents.resume({
              resumeSessionId: sessionId,
              ...(agentOptions === undefined ? {} : { agentOptions }),
              signal: controller.signal,
              setup: async (agentCtx, agent) => {
                // The durable preset from the restored header wins, unless the
                // caller overrides it explicitly. Probe registration is NOT
                // persisted — resume re-applies the requested variant.
                const presetId = requestedPreset
                  ?? agent.session.header.agentPreset
                  ?? 'standard'
                const preset = await ctx.agentPresets.resolve(presetId)
                await mountPresetAndProbe(ctx, agentCtx, preset.id, setup)
              },
            })
          } catch (error) {
            const message = errorText(error)
            records.set(sessionId, {
              sessionId,
              state: 'creation-failed',
              agentPreset: requestedPreset,
              agentOptions,
              setup,
              error: message,
              createdAt: Date.now(),
            })
            json(res, 500, { error: message })
            return
          } finally {
            inflight.delete(sessionId)
          }
          const live = ctx.agents.get(sessionId)
          const presetId = live?.session.header.agentPreset
            ?? ctx.agentPresets.composedPreset(live?.ctx as Context)
            ?? requestedPreset
            ?? null
          records.set(sessionId, {
            sessionId,
            state: 'live',
            handle,
            cwd: live?.session.header.cwd,
            agentPreset: presetId ?? undefined,
            agentOptions,
            setup,
            createdAt: Date.now(),
          })
          json(res, 200, { sessionId, status: 'resumed', agentPreset: presetId })
          return
        }

        if (req.method === 'POST' && pathname === '/spike/agents.compact') {
          const body = await readBody(req)
          if (typeof body !== 'object' || body === null) {
            json(res, 400, { error: 'body must be a JSON object' })
            return
          }
          let sessionId: SessionId
          try {
            sessionId = requireSessionId(body as Record<string, unknown>)
          } catch (error) {
            json(res, 400, { error: errorText(error) })
            return
          }
          const agent: Agent | undefined = ctx.agents.get(sessionId)
          if (agent === undefined) {
            json(res, 404, { error: `unknown live session "${sessionId}"` })
            return
          }
          if (ctx.compaction === undefined) {
            json(res, 503, { error: 'compaction service is not available in this profile' })
            return
          }
          const collected: SessionEvent[] = []
          const stopEvents = agent.ctx.on('session/event', (session, event) => {
            if (session.id === sessionId) collected.push(event)
          })
          let result: Awaited<ReturnType<Context['compaction']['compactNow']>>
          try {
            result = await ctx.compaction.compactNow(agent, AbortSignal.timeout(COMPACT_TIMEOUT_MS))
          } catch (error) {
            json(res, 409, { error: errorText(error) })
            return
          } finally {
            stopEvents()
          }
          if (result === null) {
            json(res, 200, null)
            return
          }
          // The compaction/summary event optionally carries the summarization
          // request's provider-reported usage; absent means unknown (null),
          // never 0.
          let tokenAccounting: unknown = null
          for (const event of collected) {
            if (event.type !== 'compaction/summary') continue
            const usage = (event.data as { usage?: unknown }).usage
            if (usage !== undefined) tokenAccounting = usage
          }
          json(res, 200, {
            summary: textOfContent(result.summary),
            replacedRange: [result.shadowedRange.start, result.shadowedRange.end],
            shadowedSeqs: result.shadowedSeqs,
            shadowedTokenCount: result.shadowedTokenCount,
            startSeq: result.startSeq,
            summarySeq: result.summarySeq,
            endSeq: result.endSeq,
            compactionId: result.compactionId,
            tokenAccounting,
          })
          return
        }

        json(res, 404, { error: 'not found' })
      } catch (error) {
        json(res, 500, { error: errorText(error) })
      }
    },
  })
  ctx.effect(() => dispose)
}
