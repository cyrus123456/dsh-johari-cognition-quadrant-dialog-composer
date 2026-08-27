/**
 * dsh-johari-window — host half.
 *
 * The Johari Window prompt composer is a pure browser-side UI: it injects a
 * button into the conversation input dock and writes the generated prompt into
 * the active session's draft. No host-side services, routes, or settings are
 * needed, so this half is a no-op apply that keeps the plugin loadable as a
 * standard dsh bundle entry.
 *
 * @module dsh-johari-window
 */

// ---------------------------------------------------------------------------
// Minimal cordis Context type (the @deepseek-ai/cordis package is provided
// by the DSH runtime; we declare only the effect surface we touch).
// ---------------------------------------------------------------------------

/** The subset of the cordis plugin context the host half depends on. */
interface HostContext {
  /**
   * Effect registration: runs the callback immediately; the callback's return
   * value (if a function) is used as the fiber disposer.
   */
  effect(fn: () => (() => void) | void, label: string): () => void
}

/** Single-instance guard key (shared across hot-reloads). */
const MOUNTED = Symbol.for('dsh-johari-window.mounted')

interface MountRegistry {
  [MOUNTED]?: boolean
}

/**
 * Host plugin apply. Registers nothing — the entire feature lives in the
 * client half. The guard prevents duplicate registration during bundle reload.
 * @param ctx - cordis plugin context.
 */
export function apply(ctx: HostContext): void {
  const registry = globalThis as MountRegistry
  if (registry[MOUNTED]) return
  registry[MOUNTED] = true
  ctx.effect(
    () => () => {
      registry[MOUNTED] = false
    },
    'dsh-johari-window: host lifecycle',
  )
}
