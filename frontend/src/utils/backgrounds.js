// src/utils/backgrounds.js

export const GRADIENTS_CATEGORY = 'Vibrant Gradients'

export const GRADIENT_PRESETS = [
  { name: 'City Sunset', value: 'linear-gradient(135deg, #8B3A1C 0%, #E66820 40%, #1D1D2B 100%)' },
  { name: 'Purple Teal', value: 'linear-gradient(135deg, #7C6FF7 0%, #4ECDC4 100%)' },
  { name: 'Coral Violet', value: 'linear-gradient(135deg, #FF6B6B 0%, #7C6FF7 100%)' },
  { name: 'Dark Obsidian', value: 'linear-gradient(135deg, #181820 0%, #2A2A38 100%)' },
  { name: 'Emerald Glow', value: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)' },
  { name: 'Deep Indigo', value: 'linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)' },
  { name: 'Golden Hour', value: 'linear-gradient(135deg, #F12711 0%, #F5AF19 100%)' },
]

// Dynamically auto-discover image backgrounds placed in /public/Backgrounds_PrimeTeam/
export const DEFAULT_BACKGROUND = 'url("/Backgrounds_PrimeTeam/City/jahanzeb-ahsan-UZGKXvsmuJA-unsplash.jpg")'
const modules = import.meta.glob(
  [
    '/public/Backgrounds_PrimeTeam/**/*.{jpg,jpeg,png,webp,svg,JPG,JPEG,PNG,WEBP,SVG}',
    '../public/Backgrounds_PrimeTeam/**/*.{jpg,jpeg,png,webp,svg,JPG,JPEG,PNG,WEBP,SVG}'
  ],
  { eager: true }
)

export function getAutoDiscoveredBackgrounds() {
  const categoriesMap = {}

  Object.keys(modules).forEach((filePath) => {
    // Normalizing file path. e.g. "/public/Backgrounds_PrimeTeam/Cars/porsche.jpg"
    // Extract subfolder category & filename
    const cleanPath = filePath.replace(/^.*?\/public\/Backgrounds_PrimeTeam\//, '')
    const parts = cleanPath.split('/')
    if (parts.length >= 2) {
      const categoryRaw = parts[0]
      const fileNameRaw = parts.slice(1).join('/')

      // Category Name (e.g. "Cars", "City", "Cosmos")
      const categoryName = categoryRaw.charAt(0).toUpperCase() + categoryRaw.slice(1)

      // Clean display name from file name (e.g. "Black beast_.jpeg" -> "Black Beast")
      const nameWithoutExt = fileNameRaw.replace(/\.[^/.]+$/, '')
      const displayName = nameWithoutExt
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (l) => l.toUpperCase())

      // Safe production URL relative to root public folder
      // e.g. "/Backgrounds_PrimeTeam/Cars/porsche.jpg"
      // Encode URI components so spaces/special characters won't break
      const encodedCategory = encodeURIComponent(categoryRaw)
      const encodedFilename = fileNameRaw.split('/').map(encodeURIComponent).join('/')
      const urlPath = `/Backgrounds_PrimeTeam/${encodedCategory}/${encodedFilename}`

      if (!categoriesMap[categoryName]) {
        categoriesMap[categoryName] = []
      }

      categoriesMap[categoryName].push({
        id: `img-${categoryName}-${fileNameRaw}`,
        name: displayName || fileNameRaw,
        type: 'image',
        value: `url("${urlPath}")`,
        rawUrl: urlPath,
        thumbnail: urlPath
      })
    }
  })

  // Vibrant Gradients category placed at the VERY LAST
  categoriesMap[GRADIENTS_CATEGORY] = GRADIENT_PRESETS.map((g) => ({
    id: `gradient-${g.name}`,
    name: g.name,
    type: 'gradient',
    value: g.value,
    thumbnail: g.value
  }))

  return categoriesMap
}

// Helper to format CSS background style safely for both image URLs and linear gradients
export function formatBackgroundStyle(bgValue) {
  if (!bgValue) {
    return {
      backgroundImage: DEFAULT_BACKGROUND,
      backgroundPosition: 'center center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat'
    }
  }

  const isUrl = bgValue.includes('url(') || bgValue.startsWith('http://') || bgValue.startsWith('https://') || bgValue.startsWith('/')

  if (isUrl) {
    let finalUrl = bgValue
    if (!bgValue.includes('url(')) {
      finalUrl = `url("${bgValue}")`
    }
    return {
      backgroundImage: `${finalUrl}, ${DEFAULT_BACKGROUND}`,
      backgroundPosition: 'center center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#1C1C26'
    }
  }

  return { background: bgValue }
}
