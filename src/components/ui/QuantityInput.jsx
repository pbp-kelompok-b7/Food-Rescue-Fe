import { useId } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import Input from './Input.jsx'

export default function QuantityInput({
  id: suppliedId,
  label = 'Jumlah',
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  unit,
  disabled = false,
  hint,
  ...props
}) {
  const generatedId = useId()
  const id = suppliedId || generatedId
  const numericValue = Number(value)
  const clamp = (number) =>
    Math.min(max ?? Infinity, Math.max(min, Number(number.toFixed(8))))
  const describedBy =
    [props['aria-describedby'], hint && `${id}-hint`]
      .filter(Boolean)
      .join(' ') || undefined
  return (
    <div className="fr-field">
      <label htmlFor={id}>
        {label}
        {unit && ` (${unit})`}
      </label>
      <div className="fr-stepper">
        <Button
          variant="secondary"
          aria-label="Kurangi jumlah"
          disabled={
            disabled || !Number.isFinite(numericValue) || numericValue <= min
          }
          onClick={() => onChange(clamp(numericValue - step))}
        >
          <Icon name="minus" />
        </Button>
        <Input
          {...props}
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(event) =>
            onChange(
              event.target.value === '' ? '' : event.target.valueAsNumber,
            )
          }
        />
        <Button
          variant="secondary"
          aria-label="Tambah jumlah"
          disabled={
            disabled ||
            !Number.isFinite(numericValue) ||
            (max !== undefined && numericValue >= max)
          }
          onClick={() => onChange(clamp(numericValue + step))}
        >
          <Icon name="plus" />
        </Button>
      </div>
      {hint && (
        <p className="fr-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  )
}
