import React, { useId } from 'react'

/**
 * StatusBarsLogo Component
 * Vector status bars app logo with transparent background and SVG mask cutouts.
 * Blends 100% seamlessly into any container or app background without dark square patches.
 */
export const StatusBarsLogo = ({ size = 48, className = '', showBg = false, bgFill = 'transparent' }) => {
  const maskIdMiddle = useId()
  const maskIdBottom = useId()

  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Vector masks cut out the circle dots from the 2nd and 3rd bars so they are 100% transparent */}
        <mask id={maskIdMiddle}>
          <rect x="0" y="32" width="100" height="24" rx="6" fill="#FFFFFF" />
          <circle cx="13" cy="44" r="5.5" fill="#000000" />
        </mask>
        <mask id={maskIdBottom}>
          <rect x="0" y="64" width="76" height="24" rx="6" fill="#FFFFFF" />
          <circle cx="13" cy="76" r="5.5" fill="#000000" />
        </mask>
      </defs>

      {/* Optional outer container background */}
      {showBg && <rect width="160" height="120" rx="16" fill={bgFill} />}

      <g transform="translate(20, 16)">
        {/* Top Bar */}
        <rect x="0" y="0" width="120" height="24" rx="6" fill="#5F4BB6" />
        <circle cx="13" cy="12" r="5.5" fill="#E2DEFF" />

        {/* Middle Bar with transparent dot cutout */}
        <rect x="0" y="32" width="100" height="24" rx="6" fill="#9D88DE" mask={`url(#${maskIdMiddle})`} />

        {/* Bottom Bar with transparent dot cutout */}
        <rect x="0" y="64" width="76" height="24" rx="6" fill="#E2DEFF" mask={`url(#${maskIdBottom})`} />
      </g>
    </svg>
  )
}

export default StatusBarsLogo
