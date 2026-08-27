/**
 * dsh-johari-cognition-quadrant-dialog-composer — browser half.
 *
 * Registers a dock entry in the `conversation.input.dock` slot. The entry is
 * a pill button ("乔哈里四象限") that opens a 2×2 quadrant modal; filling in
 * the quadrants and clicking "生成 Prompt" composes a structured prompt and
 * writes it into the active session's draft via the conversation input facade.
 *
 * The plugin CSS is injected as a <style> tag at apply time so the bundle is
 * self-contained (no separate .css file to load).
 *
 * Failure policy: every service / slot wiring failure is logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws.
 *
 * @module dsh-johari-cognition-quadrant-dialog-composer/client
 */

import { createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { JohariDockEntry, type JohariInjected } from './JohariDockEntry.tsx'
// Imported as plain text via the esbuild `--loader:.css=text` option; injected
// into a <style> tag below so the client bundle is fully self-contained.
import cssText from './johari.css'

// ---------------------------------------------------------------------------
// CSS injection — one <style> tag for the whole plugin, idempotent.
// ---------------------------------------------------------------------------

const STYLE_ID = 'dsh-johari-window-styles'

/** Inject the plugin CSS into document.head if not already present. */
function injectStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.setAttribute('data-dsh-plugin', 'johari-window')
  style.textContent = cssText
  document.head.appendChild(style)
}

// ---------------------------------------------------------------------------
// Minimal runtime type declarations (the @deepseek-ai/dsh-client-* packages
// are provided by the DSH web shell at runtime; we declare only the surface
// we touch so the build does not need them as installable devDependencies).
// ---------------------------------------------------------------------------

/** A session identifier (opaque string in the DSH runtime). */
type SessionId = string

/** The session-scoped context returned by `sessions.scope(id)`. */
interface SessionScope {
  // Marker: the actual shape is runtime-provided; we only pass it through.
  readonly __brand: 'session-scope'
}

/** The conversation input shell for a specific session. */
interface ConversationInputShell {
  /** Replace the current draft text. */
  setDraft(text: string): void
  /** Read the current draft snapshot (used for append-style operations). */
  state: { getSnapshot(): { draft: string } }
}

/** The conversation input facade (session-routed). */
interface ConversationInput {
  /** Resolve the input shell for a given session scope. */
  for(scope: SessionScope): ConversationInputShell
}

/** The conversation service on the client context. */
interface ConversationService {
  /** Session-routed input facade. */
  input: ConversationInput
}

/** The sessions service on the client context. */
interface SessionsService {
  /** Resolve a session scope by id. Returns undefined when the id is unknown. */
  scope(id: SessionId | undefined): SessionScope | undefined
}

/** Slot registration descriptor for a list-typed slot. */
interface SlotRegistration {
  /** Slot name (must match the declared slot, e.g. 'conversation.input.dock'). */
  name: string
  /** Unique entry id within the slot. */
  id: string
  /** Render order (lower = earlier / higher in the stack). */
  order: number
  /**
   * Factory for the owner-injected props; receives the slot's runtime share
   * (for dock entries, the active sessionId).
   */
  inject(sessionId: SessionId | undefined): JohariInjected
}

/** The slots service on the client context. */
interface SlotsService {
  /**
   * Wait for a slot to be available, then register an entry. Returns a
   * disposer that unregisters the entry when called.
   */
  inject(name: string, factory: () => () => void): void
  /**
   * Register a component entry into a list slot. Returns an unregister
   * function.
   */
  register(desc: SlotRegistration, component: (props: JohariInjected & { sessionId?: SessionId }) => ReactElement): () => void
}

/** The subset of the DSH client context we depend on. */
interface ClientContext {
  /** Wait for the named services to be available, then run the callback. */
  inject(names: string[], callback: (ctx: ClientContext) => void): void
  /** Effect registration: runs immediately, return value is the disposer. */
  effect(fn: () => (() => void) | void, label: string): () => void
  /** Slots service (available after 'slots' is injected). */
  slots: SlotsService
  /** Conversation service (available after 'conversation' is injected). */
  conversation: ConversationService
  /** Sessions service (available after 'sessions' is injected). */
  sessions: SessionsService
}

// ---------------------------------------------------------------------------
// Hero workspace button — mounts the Johari entry into the "new conversation"
// landing page's `.wSkVaW_heroWorkspaceRow` element as its last child.
// ---------------------------------------------------------------------------

/** CSS class of the DSH hero workspace row (CSS-module-hashed, stable at runtime). */
const HERO_WORKSPACE_CLASS = 'wSkVaW_heroWorkspaceRow'

/**
 * Scan the DOM for the hero workspace row and mount/unmount the Johari button.
 * Returns a disposer that stops observing and cleans up the mounted root.
 * @param setDraft - fallback draft writer for the no-session hero page.
 */
function setupHeroWorkspaceButton(setDraft: (text: string) => void): () => void {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  /** Mount the Johari button as the last child of the hero row. */
  function attach(parent: Element): void {
    if (container !== null && container.isConnected) return
    container = document.createElement('div')
    container.className = 'johari-hero-mount'
    container.dataset.dshPlugin = 'johari-window'
    container.dataset.slot = 'conversation.hero.johari'
    root = createRoot(container)
    root.render(createElement(JohariDockEntry, { setDraft }))
    parent.appendChild(container)
  }

  /** Unmount the Johari button and remove the container. */
  function detach(): void {
    if (root !== null) {
      root.unmount()
      root = null
    }
    if (container !== null) {
      container.remove()
      container = null
    }
  }

  /** Check whether the hero row is present and attach/detach accordingly. */
  function scan(): void {
    // If the container was detached from the DOM (e.g. DSH replaced the
    // hero row on workspace switch), clean up before re-attaching.
    if (container !== null && !container.isConnected) {
      detach()
    }
    const el = document.querySelector(`.${HERO_WORKSPACE_CLASS}`)
    if (el !== null) {
      attach(el)
    } else {
      detach()
    }
  }

  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })
  scan()

  return (): void => {
    observer.disconnect()
    detach()
  }
}

// ---------------------------------------------------------------------------
// Plugin body
// ---------------------------------------------------------------------------

/** Required services: slots for the dock entry, conversation + sessions for draft write. */
export const inject = ['slots', 'conversation', 'sessions']

/**
 * Apply the browser half: inject the plugin CSS and register the Johari Window
 * dock entry into the `conversation.input.dock` slot. The entry's `inject`
 * factory resolves the active session's input shell and hands a `setDraft`
 * closure to the component.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  injectStyles()

  ctx.inject(['slots', 'conversation', 'sessions'], (scope: ClientContext) => {
    const sessions = scope.sessions
    const conversation = scope.conversation

    scope.slots.inject('conversation.input.dock', () => {
      try {
        return scope.slots.register(
          {
            name: 'conversation.input.dock',
            id: 'johari-window',
            order: 85,
            inject: (sessionId: SessionId | undefined): JohariInjected => ({
              setDraft: (text: string): void => {
                if (sessionId === undefined) return
                const actx = sessions.scope(sessionId)
                if (actx === undefined) return
                const input = conversation.input
                if (input === undefined) return
                const shell = input.for(actx)
                shell.setDraft(text)
              },
            }),
          },
          JohariDockEntry,
        )
      } catch (error) {
        // Slot registration failure is non-fatal: log and degrade to no-op.
        console.error('[dsh-johari-window] failed to register dock entry:', error)
        return () => {}
      }
    })
  })

  // -------------------------------------------------------------------------
  // Hero workspace button — shown on the "new conversation" landing page.
  // The DSH web shell renders a `.wSkVaW_heroWorkspaceRow` element when no
  // session is active yet. We MutationObserver-scan for it and mount the
  // Johari button as its last child. When the user enters a conversation the
  // hero element is removed and we clean up; the dock entry above takes over.
  // -------------------------------------------------------------------------
  ctx.effect(() => {
    return setupHeroWorkspaceButton((text: string): void => {
      // Fallback setDraft for the hero (no-session) page: find the composer
      // textarea inside the hero row and write via the native value setter +
      // an 'input' event so React's controlled component picks up the change.
      const hero = document.querySelector('.wSkVaW_heroWorkspaceRow')
      if (hero === null) return
      const textarea = hero.querySelector('textarea') as HTMLTextAreaElement | null
      if (textarea === null) return
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value',
      )?.set
      if (setter !== undefined) {
        setter.call(textarea, text)
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
  }, 'johari-hero-workspace')
}
