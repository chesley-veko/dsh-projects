/**
 * S3 spike: coordinator tool fence (throwaway experiment plugin).
 *
 * Mounted in the coordinator test preset's agent scope, this plugin:
 *  1. enumerates the agent-visible inherited (global) tools at mount time,
 *  2. denies all of them with `tools.restrict({ deny })`,
 *  3. installs a monotonic guard that denies every tool outside the
 *     Projects whitelist,
 *  4. injects the INDEX fixture as a system-prompt section,
 *  5. registers two scoped probe tools:
 *     - `spike_projects_probe` (whitelisted: proves scoped tools survive
 *       the fence and remain callable),
 *     - `spike_decoy_shell` (visible but guard-denied: proves the guard
 *       fires before a tool body runs; its body would write a marker file,
 *       which must NOT exist after the test).
 *
 * Order matters inside apply(): enumerate FIRST (before registering own
 * tools), then restrict, then register own tools, then guard, then section.
 * `tools.restrict()` can only name global tools: naming a scoped (own) tool
 * throws "unknown global tool" (tools/src/index.ts:182), so the deny list
 * must come from the enumeration, never from a hand-written list.
 *
 * Verified seams (deepseek-harness@fcc0ad46):
 *  - tools.restrict: packages/core/tools/src/index.ts:162-191
 *    (scoped ctx required; empty filter throws; unknown names throw with
 *    the known-global list; RUN_CODE_NAME reserved).
 *  - tools.guard / checkGuards: index.ts:384-404; denial returns
 *    isError:true with `Error: <reason>` and the body never runs
 *    (pipeline.ts:213-228).
 *  - systemPrompt.section: packages/core/system-prompt/src/index.ts:54-75
 *    (unique name, duplicate throws; order ascending; text re-evaluated
 *    at every assembly).
 *  - setup throw rolls back: CreateAgentOptions.setup doc,
 *    packages/core/agent/src/index.ts:100-119 ("A setup throw/rejection
 *    ... rolls the scope back without announcing Agent creation").
 *
 * @module @spike/s3-coordinator-fence
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { writeFileSync } from 'node:fs'

/** Cordis plugin name. */
export const name = 's3-coordinator-fence'

/** Services used by the fence. */
export const inject = ['tools', 'systemPrompt']

/** Tools the coordinator is allowed to execute. Everything else is denied by the guard. */
export const PROJECTS_WHITELIST: ReadonlySet<string> = new Set([
  'spike_projects_probe',
])

/** Marker file the decoy tool would write if its body ever ran. Must NOT exist after the test. */
export const DECOY_MARKER_PATH = '/tmp/spike-s3-decoy-ran.txt'

export interface Config {
  /** Extra names appended to the deny list. Used by variant B to inject an unknown tool name. */
  extraDeny?: string[]
  /** INDEX text injected as the `spike-s3-index` system-prompt section. Defaults to the fixture. */
  indexText?: string
  /** Order of the INDEX section. Defaults to 10. */
  indexOrder?: number
}

/** Schemastery config for Loader defaults. Schemastery object fields are
 * optional by default (`.required()` is what makes one required); there is
 * no `.optional()` method — that is Zod syntax. Live 2026-11-08: the
 * `.optional()` calls threw `z.array(...).optional is not a function` at
 * module load and `tsc --noEmit` failed on the same three lines. */
export const Config: z<Config> = z.object({
  extraDeny: z.array(z.string()),
  indexText: z.string(),
  indexOrder: z.number(),
})

/**
 * Mount the fence in the calling agent scope.
 * @param ctx - agent-scoped context (setup runs inside AgentRegistry.create setup).
 * @param config - fence configuration.
 */
export function apply(ctx: Context, config: Config): void {
  const scope = scopeOf(ctx)

  // 1. Enumerate inherited (global) tools BEFORE registering own tools,
  //    otherwise own names would leak into the deny list and restrict()
  //    would throw "unknown global tool".
  const inheritedNames = ctx.tools.schemas(scope).map((tool) => tool.name)

  // 2. Deny every inherited global tool. Throws if any name is unknown
  //    (e.g. config.extraDeny with a nonexistent name): the throw propagates
  //    out of mountPreset, agents.create setup rolls the scope back, and no
  //    agent is announced. That throw IS the S3 step-2 observation.
  const deny = [...inheritedNames, ...(config.extraDeny ?? [])]
  ctx.tools.restrict({ deny })

  // 3. Register the two scoped probe tools (exempt from the restriction:
  //    a scope's own registrations remain visible, tools/src/index.ts:234).
  ctx.tools.register(defineTool({
    name: 'spike_projects_probe',
    description: 'S3 probe: a Projects tool the coordinator is allowed to call. Returns a fixed sentinel string.',
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
      return { echo: 'PROBE-OK-51D2' }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'spike_decoy_shell',
    description: 'S3 decoy: visible to the model but guard-denied. Its body would write a marker file; the guard must prevent that.',
    parameters: {
      command: { type: 'string', description: 'Shell command (never executed: the guard denies this tool).' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { ran: { type: 'string', required: true, description: 'Always "no" when the guard works.' } },
      },
      render: (_args, value) => [{ type: 'text', text: value.ran }],
    },
    async execute(args) {
      // Deliberate side effect: if this ever runs, the guard failed.
      writeFileSync(DECOY_MARKER_PATH, `decoy ran with: ${args.command}\n`)
      return { ran: 'yes' }
    },
  }))

  // 4. Monotonic guard: deny every tool outside the Projects whitelist.
  //    A denial returns isError:true with `Error: <reason>`; the body never runs.
  ctx.tools.guard((exec) => {
    if (PROJECTS_WHITELIST.has(exec.name)) return undefined
    return `spike-s3-fence: tool "${exec.name}" is outside the coordinator whitelist`
  })

  // 5. Inject the INDEX as a system-prompt section. Sections are
  //    re-evaluated at every prompt assembly, so compaction of the message
  //    history cannot remove it by construction; S3 step 3 verifies this
  //    at runtime.
  ctx.systemPrompt.section({
    name: 'spike-s3-index',
    order: config.indexOrder ?? 10,
    interpolate: false,
    text: config.indexText ?? 'INDEX fixture missing: the preset did not pass indexText.',
  })
}
