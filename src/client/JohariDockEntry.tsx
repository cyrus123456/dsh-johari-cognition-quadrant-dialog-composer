/**
 * Johari Window dock entry — a button above the composer that opens a 2×2
 * quadrant modal. The user fills in what they know / don't know and what they
 * believe the AI knows / doesn't know, then "生成 Prompt" composes a
 * structured prompt and writes it into the active session's draft.
 *
 * Axis convention (per user spec):
 *   X (left → right): 我知道 → 我不知道
 *   Y (bottom → top): AI知道 → AI不知道
 *
 * Quadrants:
 *   左上 TL: 我知道   · AI不知道 → 我的隐藏区 (需要告知 AI 的背景)
 *   右上 TR: 我不知道 · AI不知道 → 共同未知区
 *   左下 BL: 我知道   · AI知道  → 公开共识区
 *   右下 BR: 我不知道 · AI知道  → 我的盲区 (AI 可以教我)
 *
 * @module dsh-johari-cognition-quadrant-dialog-composer/client/JohariDockEntry
 */

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactElement, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { dictFor, type DictKey, type LocaleService } from './locales.ts'

/** Injected actions handed to the dock entry by the client apply body. */
export interface JohariInjected {
  /** Write the composed prompt into the active session's draft. */
  setDraft: (text: string) => void
  /** DSH locale service for reactive language switching. */
  locale: LocaleService
}

/** Composed props: slot runtime share (sessionId) + injected verb. */
export interface JohariDockEntryProps extends JohariInjected {
  /** Active session id (provided by the conversation.input.dock slot). */
  sessionId?: string
}

/** The four quadrant keys in CSS grid order (TL, TR, BL, BR). */
type QuadrantKey = 'blind' | 'open' | 'unknown' | 'hidden'

/** Metadata for each quadrant: display name, description, CSS class, placeholder. */
interface QuadrantMeta {
  key: QuadrantKey
  /** Short name shown in the quadrant header. */
  name: string
  /** One-line description of what belongs here. */
  desc: string
  /** CSS class for the color accent (prefixed with johari-). */
  cssClass: string
  /** Placeholder text for the textarea. */
  placeholder: string
}

/** A locale dictionary record keyed by DictKey. */
type Dict = Record<DictKey, string>

/**
 * Build quadrant metadata from the active dictionary, in CSS grid order TL, TR, BL, BR.
 * @param dict - the active locale dictionary.
 */
function buildQuadrants(dict: Dict): readonly QuadrantMeta[] {
  return [
    {
      key: 'hidden',
      name: dict['q.hidden.name'],
      desc: dict['q.hidden.desc'],
      cssClass: 'johari-q-hidden',
      placeholder: dict['q.hidden.placeholder'],
    },
    {
      key: 'unknown',
      name: dict['q.unknown.name'],
      desc: dict['q.unknown.desc'],
      cssClass: 'johari-q-unknown',
      placeholder: dict['q.unknown.placeholder'],
    },
    {
      key: 'open',
      name: dict['q.open.name'],
      desc: dict['q.open.desc'],
      cssClass: 'johari-q-open',
      placeholder: dict['q.open.placeholder'],
    },
    {
      key: 'blind',
      name: dict['q.blind.name'],
      desc: dict['q.blind.desc'],
      cssClass: 'johari-q-blind',
      placeholder: dict['q.blind.placeholder'],
    },
  ] as const
}

/** Empty quadrant state factory. */
function emptyQuadrants(): Record<QuadrantKey, string> {
  return { blind: '', open: '', unknown: '', hidden: '' }
}

/* ---- 八方向缩放（4 边 + 4 角） ---- */

/** 缩放方向：n/s/e/w 为边，ne/nw/se/sw 为角。 */
const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
type ResizeDir = (typeof RESIZE_DIRS)[number]

/** 弹窗几何状态：相对视口的左上角坐标与宽高（px）。 */
interface ModalRect {
  left: number
  top: number
  width: number
  height: number
}

/** 弹窗最小尺寸（与 CSS 的 min-width/min-height 保持一致）。 */
const MIN_WIDTH = 320 // 20rem
const MIN_HEIGHT = 256 // 16rem

/** 默认尺寸：宽 min(900px, 94vw)，高 min(640px, 86vh)。 */
const DEFAULT_WIDTH_PX = 900
const DEFAULT_HEIGHT_PX = 640

/** 各方向对应的鼠标光标，拖拽时同步到 body 上保持视觉一致。 */
const CURSOR_BY_DIR: Record<ResizeDir, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
}

/**
 * 计算弹窗初始居中几何：尺寸取默认值与视口的较小值，再居中放置。
 * @returns 居中的 ModalRect。
 */
function initialRect(): ModalRect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(DEFAULT_WIDTH_PX, vw * 0.94)
  const height = Math.min(DEFAULT_HEIGHT_PX, vh * 0.86)
  return {
    left: Math.max(0, (vw - width) / 2),
    top: Math.max(0, (vh - height) / 2),
    width,
    height,
  }
}

/**
 * Compose the final structured prompt from the four quadrant values.
 * Empty quadrants are skipped to keep the prompt concise.
 * @param values - the four quadrant text values.
 * @param dict - the active locale dictionary for section headings & footer.
 * @returns the composed prompt string, or '' when all quadrants are empty.
 */
function composePrompt(values: Record<QuadrantKey, string>, dict: Dict): string {
  const sections: Array<{ heading: string; body: string }> = []

  if (values.open.trim()) {
    sections.push({ heading: dict['prompt.section.open'], body: values.open.trim() })
  }
  if (values.blind.trim()) {
    sections.push({ heading: dict['prompt.section.blind'], body: values.blind.trim() })
  }
  if (values.hidden.trim()) {
    sections.push({ heading: dict['prompt.section.hidden'], body: values.hidden.trim() })
  }
  if (values.unknown.trim()) {
    sections.push({ heading: dict['prompt.section.unknown'], body: values.unknown.trim() })
  }

  if (sections.length === 0) return ''

  const body = sections
    .map((section) => `## ${section.heading}\n${section.body}`)
    .join('\n\n')

  return `${dict['prompt.header']}\n\n${body}\n\n---\n${dict['prompt.footer']}`
}

/**
 * The dock entry: a pill button that toggles the Johari Window modal.
 * The modal is rendered via React portal onto document.body so it escapes
 * the dock's stacking / overflow context.
 */
export function JohariDockEntry(props: JohariDockEntryProps): ReactElement {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<QuadrantKey, string>>(emptyQuadrants)
  // 弹窗几何状态；open 为 true 时一定有值（由 openModal 一并写入）。
  const [rect, setRect] = useState<ModalRect | null>(null)

  // 响应式读取 DSH 当前语言，语言切换时自动 re-render。
  const active = useSyncExternalStore(
    props.locale.subscribe,
    () => props.locale.getSnapshot().active,
  )
  const dict = useMemo(() => dictFor(active), [active])
  const quadrants = useMemo(() => buildQuadrants(dict), [dict])

  // Close on Escape; lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const composed = useMemo(() => composePrompt(values, dict), [values, dict])
  const hasContent = composed.length > 0

  const handleGenerate = (): void => {
    if (!hasContent) return
    props.setDraft(composed)
    setOpen(false)
  }

  const handleClear = (): void => {
    setValues(emptyQuadrants())
  }

  const updateQuadrant = (key: QuadrantKey, value: string): void => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  /** 打开弹窗：先写入居中几何，再置 open=true，避免首帧闪烁。 */
  const openModal = (): void => {
    setRect(initialRect())
    setOpen(true)
  }

  /**
   * 生成某方向的 mousedown 处理器：按下时记录起点与起始几何，
   * 在 document 上监听 mousemove 实时更新 left/top/width/height，
   * mouseup 时卸载监听。拖拽期间锁定 body 的 cursor 与选区，
   * 保证跨越子元素时光标与拖拽语义不中断。
   * @param dir - 缩放方向（n/s/e/w/ne/nw/se/sw）。
   */
  const onHandleMouseDown = (dir: ResizeDir) => (event: ReactMouseEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    if (!rect) return

    const startRect = rect
    const startX = event.clientX
    const startY = event.clientY

    const onMove = (ev: MouseEvent): void => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      let left = startRect.left
      let top = startRect.top
      let width = startRect.width
      let height = startRect.height

      // 东/西/南/北对各边的影响：拉动一侧时该侧跟随鼠标，对侧固定。
      if (dir.includes('e')) width = startRect.width + dx
      if (dir.includes('s')) height = startRect.height + dy
      if (dir.includes('w')) {
        left = startRect.left + dx
        width = startRect.width - dx
      }
      if (dir.includes('n')) {
        top = startRect.top + dy
        height = startRect.height - dy
      }

      const vw = window.innerWidth
      const vh = window.innerHeight

      // 最小尺寸约束：低于下限时回退到下限，并把对侧边缘钉住。
      if (width < MIN_WIDTH) {
        if (dir.includes('w')) left = startRect.left + startRect.width - MIN_WIDTH
        width = MIN_WIDTH
      }
      if (height < MIN_HEIGHT) {
        if (dir.includes('n')) top = startRect.top + startRect.height - MIN_HEIGHT
        height = MIN_HEIGHT
      }
      // 视口边界约束：不让弹窗超出屏幕。
      if (left < 0) {
        width += left
        left = 0
      }
      if (top < 0) {
        height += top
        top = 0
      }
      if (left + width > vw) width = vw - left
      if (top + height > vh) height = vh - top
      // 边界裁剪后再次保证最小尺寸。
      width = Math.max(MIN_WIDTH, width)
      height = Math.max(MIN_HEIGHT, height)

      setRect({ left, top, width, height })
    }

    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = CURSOR_BY_DIR[dir]
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <>
      <button
        type="button"
        className="johari-dock-btn"
        onClick={openModal}
        data-testid="johari-dock-btn"
        title={dict['btn.title']}
      >
        <svg className="johari-dock-btn-icon" aria-hidden viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
          <line x1="8" y1="1.5" x2="8" y2="14.5" />
          <line x1="1.5" y1="8" x2="14.5" y2="8" />
        </svg>
        <span>{dict['btn.text']}</span>
      </button>

      {open
        ? createPortal(
            <div
              className="johari-overlay"
              onClick={(event) => {
                if (event.target === event.currentTarget) setOpen(false)
              }}
              data-testid="johari-overlay"
            >
              <div
                className="johari-modal"
                role="dialog"
                aria-modal="true"
                aria-label={dict['modal.title']}
                style={
                  rect
                    ? { position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                    : undefined
                }
              >
                {/* 八方向缩放手柄：4 边 + 4 角，全部可拖拽拉伸 */}
                {rect
                  ? RESIZE_DIRS.map((d) => (
                      <div
                        key={d}
                        className={`johari-rh johari-rh-${d}`}
                        onMouseDown={onHandleMouseDown(d)}
                        data-testid={`johari-rh-${d}`}
                      />
                    ))
                  : null}
                {/* Header */}
                <div className="johari-header">
                  <div>
                    <h2 className="johari-title">{dict['modal.title']}</h2>
                    <div className="johari-subtitle">{dict['modal.subtitle']}</div>
                  </div>
                  <button
                    type="button"
                    className="johari-close-btn"
                    onClick={() => setOpen(false)}
                    aria-label={dict['btn.close']}
                  >
                    ×
                  </button>
                </div>

                {/* Grid with Y-axis label */}
                <div className="johari-axis-wrap">
                  <div className="johari-y-axis-label">
                    {/*<span className="johari-y-axis-combine">AI</span>*/}
                    <span>
                      {dict['axis.y.top.arrow']}
                      <span className="johari-y-axis-combine">{dict['axis.y.ai']}</span>
                      {dict['axis.y.top']}
                    </span>
                      <span>
                        <span className="johari-y-axis-combine">{dict['axis.y.ai']}</span>
                      {dict['axis.y.bottom']}
                      </span>
                  </div>
                  <div className="johari-grid-and-x-axis">
                    <div className="johari-grid">
                      {quadrants.map((q) => (
                        <div key={q.key} className={`johari-quadrant ${q.cssClass}`}>
                          <div className="johari-quadrant-header">
                            <span className="johari-quadrant-name">{q.name}</span>
                            <span className="johari-quadrant-desc">{q.desc}</span>
                          </div>
                          <textarea
                            value={values[q.key]}
                            onChange={(event) => updateQuadrant(q.key, event.target.value)}
                            placeholder={q.placeholder}
                            spellCheck={false}
                          />
                        </div>
                      ))}
                    </div>
                    {/* X-axis label */}
                    <div className="johari-x-axis-label">
                      <span>{dict['axis.x.left']}</span>
                      <span>{dict['axis.x.right']}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="johari-footer">
                  <span className="johari-hint">
                    {hasContent
                      ? dict['footer.hint.count'].replace('{count}', String(composed.length))
                      : dict['footer.hint.empty']}
                  </span>
                  <div className="johari-actions">
                    <button type="button" className="johari-btn johari-btn-secondary" onClick={handleClear}>
                      {dict['footer.clear']}
                    </button>
                    <button
                      type="button"
                      className="johari-btn johari-btn-primary"
                      onClick={handleGenerate}
                      disabled={!hasContent}
                    >
                      {dict['footer.generate']}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
