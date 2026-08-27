/**
 * Johari plugin locale dictionaries — zh / en.
 *
 * The DSH locale service exposes getSnapshot().active ('zh' | 'en') and
 * subscribe() for reactive updates. We don't register into the global
 * namespace; we just pick the dictionary by active language in the component.
 */

/** Chinese copy. */
export const zh = {
  'btn.text': '乔哈里认知四象限对话梳理工具',
  'btn.title': '乔哈里认知四象限对话梳理工具',
  'modal.title': '乔哈里认知四象限',
  'modal.subtitle': '按「我知道/不知道 × AI知道/不知道」梳理对话上下文',
  'q.hidden.name': '我的隐藏区',
  'q.hidden.desc': '我知道 · AI不知道',
  'q.hidden.placeholder': '我掌握但 AI 还不知道的背景、偏好、约束…',
  'q.unknown.name': '共同未知区',
  'q.unknown.desc': '我不知道 · AI不知道',
  'q.unknown.placeholder': '需要双方一起探索、调研的问题…',
  'q.open.name': '公开共识区',
  'q.open.desc': '我知道 · AI知道',
  'q.open.placeholder': '双方都清楚的背景、共识、已知事实…',
  'q.blind.name': '我的盲区',
  'q.blind.desc': '我不知道 · AI知道',
  'q.blind.placeholder': '我希望 AI 教我、解释清楚的领域…',
  'axis.x.left': '← 我知道',
  'axis.x.right': '我不知道 →',
  'axis.y.top': '↑不知道',
  'axis.y.ai': 'AI',
  'axis.y.bottom': '知道↓',
  'footer.hint.empty': '填写至少一个象限后可生成 Prompt',
  'footer.hint.count': '已生成 {count} 字',
  'footer.clear': '清空',
  'footer.generate': '生成 Prompt 并填入',
  'prompt.header': '【乔哈里认知四象限 · 对话上下文梳理】',
  'prompt.section.open': '公开共识区（我知道 · AI知道）',
  'prompt.section.blind': '我的盲区（我不知道 · AI知道）',
  'prompt.section.hidden': '我的隐藏信息（我知道 · AI不知道）',
  'prompt.section.unknown': '共同未知区（我不知道 · AI不知道）',
  'prompt.footer': '请基于以上认知分布展开对话：优先解答我的盲区，结合我提供的隐藏信息作为背景，并与我共同探索未知区。',
} as const

/** English copy. */
export const en = {
  'btn.text': 'Johari Cognition Quadrant',
  'btn.title': 'Johari Cognition Quadrant Dialog Composer',
  'modal.title': 'Johari Cognition Quadrants',
  'modal.subtitle': 'Structure context by known/unknown × AI-known/AI-unknown',
  'q.hidden.name': 'Hidden Area',
  'q.hidden.desc': "I know · AI doesn't",
  'q.hidden.placeholder': "Background, preferences, constraints I know but AI doesn't…",
  'q.unknown.name': 'Unknown Area',
  'q.unknown.desc': "I don't know · AI doesn't",
  'q.unknown.placeholder': 'Problems to explore together…',
  'q.open.name': 'Open Area',
  'q.open.desc': 'I know · AI knows',
  'q.open.placeholder': 'Shared background, consensus, known facts…',
  'q.blind.name': 'Blind Area',
  'q.blind.desc': "I don't know · AI knows",
  'q.blind.placeholder': 'Areas where I hope AI can teach me…',
  'axis.x.left': '← I know',
  'axis.x.right': "I don't know →",
  'axis.y.top': '↑Unknown',
  'axis.y.ai': 'AI',
  'axis.y.bottom': 'Known↓',
  'footer.hint.empty': 'Fill in at least one quadrant to generate a prompt',
  'footer.hint.count': 'Generated {count} chars',
  'footer.clear': 'Clear',
  'footer.generate': 'Generate Prompt & Insert',
  'prompt.header': '[Johari Cognition Quadrants · Conversation Context]',
  'prompt.section.open': 'Open Area (I know · AI knows)',
  'prompt.section.blind': "Blind Area (I don't know · AI knows)",
  'prompt.section.hidden': "Hidden Area (I know · AI doesn't know)",
  'prompt.section.unknown': "Unknown Area (I don't know · AI doesn't know)",
  'prompt.footer': 'Please proceed based on the above cognitive distribution: prioritize my blind area, use my hidden information as background, and explore the unknown area together.',
} as const

/** Dictionary key union. */
export type DictKey = keyof typeof zh

/** A dictionary record. */
type Dict = Record<DictKey, string>

/** Pick the dictionary for the given active language. */
export function dictFor(active: string): Dict {
  return active.toLowerCase().startsWith('zh') ? (zh as Dict) : (en as Dict)
}

/** Minimal locale service surface we consume from ctx.locale. */
export interface LocaleService {
  subscribe(callback: () => void): () => void
  getSnapshot(): { active: string }
}
