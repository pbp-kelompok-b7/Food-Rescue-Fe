import type * as React from 'react'
export default function Input({ className = '', trailing, ...props }: React.ComponentPropsWithRef<'input'> & { trailing?: React.ReactNode }) {
  const control = <input {...props} className={`fr-control ${trailing ? 'pr-11' : ''} ${className}`} />
  if (!trailing) return control
  return (
    <div className="relative w-full">
      {control}
      <span className="absolute inset-y-0 right-0 flex items-center">{trailing}</span>
    </div>
  )
}
