import React from 'react'

type IconProps = {
  size?: number
  className?: string
  style?: React.CSSProperties
}

const svgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function XIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} style={style} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function MessageIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} style={style} aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} style={style} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} style={style} aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export function CheckIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} style={style} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function UserPlusIcon({ size = 18, className, style }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className} style={style} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  )
}

