import { createAvatar } from '@dicebear/core'
import { botttsNeutral } from '@dicebear/collection'

// 8 Pre-configured Bottts Neutral Seeds
export const BOT_SEEDS = [
  { id: 'bot-1', seed: 'Gizmo', name: 'Gizmo' },
  { id: 'bot-2', seed: 'Astro', name: 'Astro' },
  { id: 'bot-3', seed: 'Spark', name: 'Spark' },
  { id: 'bot-4', seed: 'Buster', name: 'Buster' },
  { id: 'bot-5', seed: 'Ziggy', name: 'Ziggy' },
  { id: 'bot-6', seed: 'Circuit', name: 'Circuit' },
  { id: 'bot-7', seed: 'Echo', name: 'Echo' },
  { id: 'bot-8', seed: 'Byte', name: 'Byte' }
]

// Generate DiceBear Bottts Neutral SVG Data URI string
export const getDiceBearAvatar = (seedStr = 'User') => {
  if (!seedStr) seedStr = 'User'
  if (typeof seedStr === 'string' && (seedStr.startsWith('http://') || seedStr.startsWith('https://') || seedStr.startsWith('data:image'))) {
    return seedStr
  }
  try {
    const avatar = createAvatar(botttsNeutral, {
      seed: String(seedStr),
      radius: 12
    })
    return avatar.toDataUri()
  } catch (err) {
    console.error('Error generating DiceBear avatar:', err)
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%238B5CF6"/><text x="16" y="21" font-size="14" font-weight="bold" text-anchor="middle" fill="white">U</text></svg>'
  }
}
