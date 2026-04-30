import React from 'react'

type Props = {
  checked?: boolean
  onChange?: (next: boolean) => void
  ariaLabel?: string
  className?: string
}

export default function Switch({ checked = false, onChange, ariaLabel, className }: Props) {
  return (
    <label className={"switch " + (className || '')} aria-label={ariaLabel}>
      <input
        type="checkbox"
        className="switch-input"
        checked={checked}
        onChange={e => onChange && onChange(e.target.checked)}
      />
      <span className="switch-slider" />
    </label>
  )
}

