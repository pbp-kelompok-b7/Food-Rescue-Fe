import type * as React from 'react'
import { useId } from 'react'

export default function Checkbox({
  label,
  id: suppliedId,
  className = '',
  ...props
}: React.ComponentPropsWithRef<'input'> & { label: React.ReactNode }) {
  const generatedId = useId()
  const id = suppliedId || generatedId
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2 text-sm leading-5 font-semibold ${className}`} htmlFor={id}>
      <input
        {...props}
        id={id}
        type="checkbox"
        className="m-0 size-5 shrink-0 appearance-none rounded-sm border border-outline bg-surface checked:border-primary checked:bg-primary checked:bg-[url('/assets/figma/9-269-check.svg')] checked:bg-center checked:bg-no-repeat disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span>{label}</span>
    </label>
  )
}
