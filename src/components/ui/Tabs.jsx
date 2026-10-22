import { useId } from 'react'

// Each item is { value, label, content, disabled? }. Selection is owned by the page.
export default function Tabs({ items, value, onChange, label = 'Tab konten' }) {
  const id = useId()
  const enabled = items.filter((item) => !item.disabled)
  function handleKeyDown(event, current) {
    const index = enabled.findIndex((item) => item.value === current)
    let target
    if (event.key === 'ArrowRight')
      target = enabled[(index + 1) % enabled.length]
    if (event.key === 'ArrowLeft')
      target = enabled[(index - 1 + enabled.length) % enabled.length]
    if (event.key === 'Home') target = enabled[0]
    if (event.key === 'End') target = enabled.at(-1)
    if (!target) return
    event.preventDefault()
    onChange(target.value)
    document.getElementById(`${id}-tab-${target.value}`)?.focus()
  }
  return (
    <div className="fr-tabs">
      <div className="fr-tab-list" role="tablist" aria-label={label}>
        {items.map((item) => (
          <button
            key={item.value}
            id={`${id}-tab-${item.value}`}
            type="button"
            role="tab"
            aria-selected={value === item.value}
            aria-controls={`${id}-panel-${item.value}`}
            tabIndex={value === item.value ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${id}-panel-${item.value}`}
          aria-labelledby={`${id}-tab-${item.value}`}
          hidden={value !== item.value}
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
