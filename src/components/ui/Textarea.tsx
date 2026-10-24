import type * as React from 'react'
export default function Textarea({ className = '', rows = 4, ...props }: React.ComponentPropsWithRef<'textarea'>) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={`fr-control h-30 min-h-30 resize-y py-3 ${className}`}
    />
  )
}
