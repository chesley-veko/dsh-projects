/**
 * Spike S2 server: creates `proj-coordinator-` sessions and forwards a
 * message into one of them (the takeover composer posts here).
 *
 * Throwaway experiment code. It is NOT shipped.
 *
 * Verified seams (deepseek-harness fcc0ad46, the 0.2.2-rc.1 merge point):
 * - Creation mirrors the S1 spike / webhook plugin
 *   (experimental/webhook/src/session.ts:110-118): resolve the `standard`
 *   preset, acquire its scope, `mount` it in `setup`, `ctx.agents.create`
 *   with `meta: { cwd, agentPreset }` and `agentOptions`
 *   (core/agent/src/runtime-types.ts:35).
 * - Sending into a live agent is `handle.agent.followup(message)`
 *   (core/agent/src/runtime-types.ts:251); a user-role message is built
 *   with `createUserMessage({ content, source: { kind: 'user' } })`
 *   (llm/src/message.ts:246; the acp tests use exactly this shape).
 *   The superagent delivery path (src/app/delivery.ts:79-81) is the
 *   in-repo example of followup in production code.
 */

import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isAbsolute, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentOptions } from '@deepseek-ai/dsh-agent'
import { brandString } from '@deepseek-ai/dsh-brand'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'
import s from '@deepseek-ai/schemastery'

export const name = 'dsh-spike-s2'
export const inject = ['agents', 'agentPresets', 'workspaceRegistry', 'webServer']
export const Config = s.object({})
export type SpikeS2Config = ReturnType<typeof Config>

const COORDINATOR_PREFIX = 'proj-coordinator-'
const MODEL: AgentOptions = { provider: 'opencode-go', model: 'deepseek-v4.1-flash' }

interface CoordinatorRecord {
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

export async function apply(ctx: Context, _config: SpikeS2Config): Promise<void> {
  const coordinators = new Map<SessionId, {
    handle: Awaited<ReturnType<Context['agents']['create']>>
    record: CoordinatorRecord
  }>()
  let seq = 0
  const dispose = ctx.webServer.register({
    kind: 'prefix',
    path: '/spike-s2',
    handler: async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
        if (!sameOrigin(req, ctx.webServer.port)) {
          json(res, 403, { error: 'same-origin spike requests only' })
          return
        }
        if (req.method === 'GET' && url.pathname === '/spike-s2/api/health') {
          json(res, 200, { ok: true, plugin: name })
          return
        }
        if (req.method === 'GET' && url.pathname === '/spike-s2/api/coordinators') {
          json(res, 200, { coordinators: [...coordinators.values()].map((c) => c.record) })
          return
        }
        if (req.method === 'POST' && url.pathname === '/spike-s2/api/coordinators') {
          const body = await readBody(req)
          if (typeof body !== 'object' || body === null) {
            json(res, 400, { error: 'body must be a JSON object' })
            return
          }
          const { cwd: bodyCwd, workspacePath } = body as { cwd?: unknown; workspacePath?: unknown }
          seq += 1
          const cwd = typeof bodyCwd === 'string' && isAbsolute(bodyCwd)
            ? bodyCwd
            : join(baseDir(), 'spike-proj', `coordinator-${seq}`)
          await mkdir(cwd, { recursive: true })
          const preset = await ctx.agentPresets.resolve('standard')
          await using presetScope = await ctx.agentPresets.acquireScope(preset.id)
          void presetScope
          const sessionId = brandString<SessionId>(`${COORDINATOR_PREFIX}${randomUUID()}`)
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
          const record: CoordinatorRecord = {
            sessionId,
            cwd,
            workspacePath: typeof workspacePath === 'string' && workspacePath.length > 0 ? workspacePath : undefined,
            createdAt: Date.now(),
          }
          coordinators.set(sessionId, { handle, record })
          json(res, 201, record)
          return
        }
        const messageMatch = /^\/spike-s2\/api\/coordinators\/([^/]+)\/message$/.exec(url.pathname)
        if (req.method === 'POST' && messageMatch !== null) {
          const sessionId = brandString<SessionId>(decodeURIComponent(messageMatch[1] ?? ''))
          const entry = coordinators.get(sessionId)
          if (entry === undefined) {
            json(res, 404, { error: `unknown coordinator ${sessionId}` })
            return
          }
          const body = await readBody(req)
          if (typeof body !== 'object' || body === null) {
            json(res, 400, { error: 'body must be a JSON object' })
            return
          }
          const { text } = body as { text?: unknown }
          if (typeof text !== 'string' || text.trim() === '') {
            json(res, 400, { error: 'text must be a non-empty string' })
            return
          }
          entry.handle.agent.followup(createUserMessage({
            content: [{ type: 'text', text }],
            source: { kind: 'user' },
          }))
          json(res, 200, { ok: true, sessionId })
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
