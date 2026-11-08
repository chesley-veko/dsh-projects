/**
 * Spike S1 server: creates `proj-worker-` sessions and exposes them over HTTP.
 *
 * Throwaway experiment code. It is NOT shipped: it exists only to answer
 * whether a plugin can keep worker sessions out of the left column.
 *
 * Verified seams (deepseek-harness fcc0ad46, the 0.2.2-rc.1 merge point):
 * - `ctx.agents.create` (core/agent/src/index.ts:410) is the creation path
 *   plugins may call; the in-repo reference is the webhook plugin
 *   (experimental/webhook/src/session.ts:110-118): resolve the `standard`
 *   preset, acquire its scope, `mount` it in `setup`.
 * - A session's `origin` is validated at creation
 *   (core/session/src/index.ts:126-127): anything other than undefined /
 *   'subagent' throws `session header origin must be "subagent"`. The
 *   `originProbe: true` request deliberately probes this gate with
 *   `origin: 'project-worker'` and records the throw. It is a NEGATIVE
 *   probe only: ADR-0018 forbids disguising a worker as a subagent.
 * - The `standard` preset (bundle/web-app/presets/standard.patch.yml)
 *   carries tool-subagent / tool-subagent-control, so a worker created
 *   with it can spawn subagents without a custom preset.
 * - There is no session-list filter slot in the harness (ui-workspace
 *   contract/slots.ts + tree.ts carry only an archived filter); the
 *   client-side sessions probe in the panel confirms this at runtime.
 */

import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isAbsolute, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentOptions, CreateAgentOptions } from '@deepseek-ai/dsh-agent'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session'
import s from '@deepseek-ai/schemastery'

export const name = 'dsh-spike-s1'
export const inject = ['agents', 'agentPresets', 'workspaceRegistry', 'webServer']
export const Config = s.object({})
export type SpikeS1Config = ReturnType<typeof Config>

const WORKER_PREFIX = 'proj-worker-'
const MODEL: AgentOptions = { provider: 'opencode-go', model: 'deepseek-v4.1-flash' }

interface WorkerRecord {
  sessionId: SessionId
  cwd: string
  workspacePath?: string
  createdAt: number
}

function baseDir(): string {
  return process.env.DSH_HOME ?? process.cwd()
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

function sameOrigin(req: IncomingMessage, port: number): boolean {
  const host = req.headers.host
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return false
  if (req.headers['x-spike-request'] !== '1') return false
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

export async function apply(ctx: Context, _config: SpikeS1Config): Promise<void> {
  const workers = new Map<SessionId, WorkerRecord>()
  let seq = 0
  const dispose = ctx.webServer.register({
    kind: 'prefix',
    path: '/spike-s1',
    handler: async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
        if (!sameOrigin(req, ctx.webServer.port)) {
          json(res, 403, { error: 'same-origin spike requests only' })
          return
        }
        if (req.method === 'GET' && url.pathname === '/spike-s1/api/health') {
          json(res, 200, { ok: true, plugin: name })
          return
        }
        if (req.method === 'GET' && url.pathname === '/spike-s1/api/workers') {
          json(res, 200, { workers: [...workers.values()] })
          return
        }
        if (req.method === 'POST' && url.pathname === '/spike-s1/api/workers') {
          const body = await readBody(req)
          if (typeof body !== 'object' || body === null) {
            json(res, 400, { error: 'body must be a JSON object' })
            return
          }
          const { cwd: bodyCwd, workspacePath, originProbe } = body as {
            cwd?: unknown
            workspacePath?: unknown
            originProbe?: unknown
          }
          seq += 1
          const cwd = typeof bodyCwd === 'string' && isAbsolute(bodyCwd)
            ? bodyCwd
            : join(baseDir(), 'spike-proj', `worker-${seq}`)
          await mkdir(cwd, { recursive: true })
          const preset = await ctx.agentPresets.resolve('standard')
          await using presetScope = await ctx.agentPresets.acquireScope(preset.id)
          void presetScope
          if (originProbe === true) {
            // Negative probe: 'project-worker' is not a valid SessionOrigin in
            // fcc0ad46, so creation must throw. The cast is the point of the
            // probe: it smuggles the invalid value past the type gate so the
            // runtime gate can be observed. A 200 with {thrown:false} would
            // mean the runtime gate is gone, not that the probe passed.
            const probeId = brandString<SessionId>(`${WORKER_PREFIX}probe-${randomUUID()}`)
            const probeMeta = { cwd, agentPreset: preset.id, origin: 'project-worker' }
            try {
              const probeHandle = await ctx.agents.create({
                sessionId: probeId,
                meta: probeMeta as CreateAgentOptions['meta'],
                agentOptions: MODEL,
                setup: async (agentCtx) => { await ctx.agentPresets.mount(agentCtx, preset.id) },
              })
              await probeHandle.dispose()
              json(res, 200, { originProbe: true, thrown: false, sessionId: probeId })
            } catch (error) {
              json(res, 200, {
                originProbe: true,
                thrown: true,
                error: error instanceof Error ? error.message : String(error),
              })
            }
            return
          }
          const sessionId = brandString<SessionId>(`${WORKER_PREFIX}${randomUUID()}`)
          let handle: Awaited<ReturnType<Context['agents']['create']>> | undefined
          try {
            handle = await ctx.agents.create({
              sessionId,
              meta: { cwd, agentPreset: preset.id },
              agentOptions: MODEL,
              setup: async (agentCtx) => { await ctx.agentPresets.mount(agentCtx, preset.id) },
            })
            if (typeof workspacePath === 'string' && workspacePath.length > 0) {
              const workspace = await ctx.workspaceRegistry.create(workspacePath)
              await workspace.attachSession(sessionId)
            }
          } catch (error) {
            if (handle) {
              try {
                await handle.dispose()
              } catch {
                // Best-effort rollback; the create error is reported below.
              }
            }
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
            return
          }
          const record: WorkerRecord = {
            sessionId,
            cwd,
            workspacePath: typeof workspacePath === 'string' && workspacePath.length > 0 ? workspacePath : undefined,
            createdAt: Date.now(),
          }
          workers.set(sessionId, record)
          json(res, 201, record)
          return
        }
        json(res, 404, { error: 'not found' })
      } catch (error) {
        json(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
  ctx.effect(() => dispose)
}
