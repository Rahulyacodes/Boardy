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
  try {
    const avatar = createAvatar(botttsNeutral, {
      seed: seedStr,
      radius: 12
    })
    return avatar.toDataUri()
  } catch (err) {
    console.error('Error generating DiceBear avatar:', err)
    return null
  }
}
