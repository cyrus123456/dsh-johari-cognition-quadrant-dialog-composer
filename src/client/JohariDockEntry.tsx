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

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'

/** Injected actions handed to the dock entry by the client apply body. */
export interface JohariInjected {
  /** Write the composed prompt into the active session's draft. */
  setDraft: (text: string) => void
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

/** Quadrant metadata in CSS grid order: TL, TR, BL, BR. */
const QUADRANTS: readonly QuadrantMeta[] = [
  {
    key: 'hidden',
    name: '我的隐藏区',
    desc: '我知道 · AI不知道',
    cssClass: 'johari-q-hidden',
    placeholder: '我掌握但 AI 还不知道的背景、偏好、约束…',
  },
  {
    key: 'unknown',
    name: '共同未知区',
    desc: '我不知道 · AI不知道',
    cssClass: 'johari-q-unknown',
    placeholder: '需要双方一起探索、调研的问题…',
  },
  {
    key: 'open',
    name: '公开共识区',
    desc: '我知道 · AI知道',
    cssClass: 'johari-q-open',
    placeholder: '双方都清楚的背景、共识、已知事实…',
  },
  {
    key: 'blind',
    name: '我的盲区',
    desc: '我不知道 · AI知道',
    cssClass: 'johari-q-blind',
    placeholder: '我希望 AI 教我、解释清楚的领域…',
  },
] as const

/** Empty quadrant state factory. */
function emptyQuadrants(): Record<QuadrantKey, string> {
  return { blind: '', open: '', unknown: '', hidden: '' }
}

/**
 * Compose the final structured prompt from the four quadrant values.
 * Empty quadrants are skipped to keep the prompt concise.
 * @param values - the four quadrant text values.
 * @returns the composed prompt string, or '' when all quadrants are empty.
 */
function composePrompt(values: Record<QuadrantKey, string>): string {
  const sections: Array<{ heading: string; body: string }> = []

  if (values.open.trim()) {
    sections.push({ heading: '公开共识区（我知道 · AI知道）', body: values.open.trim() })
  }
  if (values.blind.trim()) {
    sections.push({ heading: '我的盲区（我不知道 · AI知道）', body: values.blind.trim() })
  }
  if (values.hidden.trim()) {
    sections.push({ heading: '我的隐藏信息（我知道 · AI不知道）', body: values.hidden.trim() })
  }
  if (values.unknown.trim()) {
    sections.push({ heading: '共同未知区（我不知道 · AI不知道）', body: values.unknown.trim() })
  }

  if (sections.length === 0) return ''

  const body = sections
    .map((section) => `## ${section.heading}\n${section.body}`)
    .join('\n\n')

  return `【乔哈里认知四象限 · 对话上下文梳理】\n\n${body}\n\n---\n请基于以上认知分布展开对话：优先解答我的盲区，结合我提供的隐藏信息作为背景，并与我共同探索未知区。`
}

/**
 * The dock entry: a pill button that toggles the Johari Window modal.
 * The modal is rendered via React portal onto document.body so it escapes
 * the dock's stacking / overflow context.
 */
export function JohariDockEntry(props: JohariDockEntryProps): ReactElement {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<QuadrantKey, string>>(emptyQuadrants)

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

  const composed = useMemo(() => composePrompt(values), [values])
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

  return (
    <>
      <button
        type="button"
        className="johari-dock-btn"
        onClick={() => setOpen(true)}
        data-testid="johari-dock-btn"
        title="乔哈里认知四象限对话梳理工具"
      >
        <span className="johari-dock-btn-icon" aria-hidden>◈</span>
        <span>乔哈里认知四象限对话梳理工具</span>
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
              <div className="johari-modal" role="dialog" aria-modal="true" aria-label="乔哈里认知四象限">
                {/* Header */}
                <div className="johari-header">
                  <div>
                    <h2 className="johari-title">乔哈里认知四象限</h2>
                    <div className="johari-subtitle">按「我知道/不知道 × AI知道/不知道」梳理对话上下文</div>
                  </div>
                  <button
                    type="button"
                    className="johari-close-btn"
                    onClick={() => setOpen(false)}
                    aria-label="关闭"
                  >
                    ×
                  </button>
                </div>

                {/* Grid with Y-axis label */}
                <div className="johari-axis-wrap">
                  <div className="johari-y-axis-label">
                    {/*<span className="johari-y-axis-combine">AI</span>*/}
                    ↑不知道
                    <span className="johari-y-axis-combine">AI</span>
                    知道↓
                  </div>
                  <div className="johari-grid-and-x-axis">
                    <div className="johari-grid">
                      {QUADRANTS.map((q) => (
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
                      <span>← 我知道</span>
                      <span>我不知道 →</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="johari-footer">
                  <span className="johari-hint">
                    {hasContent ? `已生成 ${composed.length} 字` : '填写至少一个象限后可生成 Prompt'}
                  </span>
                  <div className="johari-actions">
                    <button type="button" className="johari-btn johari-btn-secondary" onClick={handleClear}>
                      清空
                    </button>
                    <button
                      type="button"
                      className="johari-btn johari-btn-primary"
                      onClick={handleGenerate}
                      disabled={!hasContent}
                    >
                      生成 Prompt 并填入
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
