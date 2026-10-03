import { ATTRIBUTES, type Attribute } from './xp'

const CATEGORY_MAP: [string[], Attribute][] = [
  [['fitness', 'health'], 'STR'],
  [['learning', 'study', 'reading'], 'INT'],
  [['discipline', 'routine', 'planning'], 'DISC'],
  [['creative', 'design'], 'CREAT'],
  [['coding', 'deep work', 'focus'], 'FOCUS'],
  [['social', 'family', 'communication'], 'SOC'],
]

export function attributeFromCategory(category: string | undefined): Attribute | null {
  if (!category) return null
  const c = category.toLowerCase()
  for (const [keys, attr] of CATEGORY_MAP) {
    if (keys.some((k) => c.includes(k))) return attr
  }
  return null
}

/**
 * Resolve the attributes an award goes to: explicit item attributes first,
 * then the linked goal's attribute (milestones/goal bonus pass it), then the
 * category map. Returns [] when nothing matches -> caller writes one
 * attribute=null ledger row.
 */
export function resolveAttributes(item?: Attribute[], goalAttribute?: Attribute, category?: string): Attribute[] {
  if (item && item.length > 0) return [...item]
  if (goalAttribute) return [goalAttribute]
  const fromCategory = attributeFromCategory(category)
  return fromCategory ? [fromCategory] : []
}

/** Split final XP evenly across attributes; remainder to the first in enum order. */
export function splitXp(final: number, attributes: Attribute[]): { attribute: Attribute; xp: number }[] {
  if (attributes.length === 0) return []
  const sorted = [...attributes].sort((a, b) => ATTRIBUTES.indexOf(a) - ATTRIBUTES.indexOf(b))
  const base = Math.floor(final / sorted.length)
  let remainder = final - base * sorted.length
  return sorted.map((attribute) => ({ attribute, xp: base + (remainder-- > 0 ? 1 : 0) }))
}
