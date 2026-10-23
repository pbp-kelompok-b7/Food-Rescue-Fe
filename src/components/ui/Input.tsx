import type * as React from 'react'
export default function Input({ className = '', ...props }: React.ComponentPropsWithRef<'input'>) {
  return <input {...props} className={`fr-control ${className}`} />
}
