export default function Skeleton({
  label = 'Memuat resource…',
  className = '',
}: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-start gap-4 rounded-md border border-border bg-surface p-4 ${className}`} role="status" aria-busy="true">
      <p className="m-0 text-sm leading-5 font-semibold text-muted">{label}</p>
      <div aria-hidden="true" className="flex w-full flex-col gap-4 [&_span]:block [&_span]:h-4 [&_span]:rounded-sm [&_span]:bg-surface-variant [&_span:first-child]:h-16 [&_span:nth-child(2)]:h-6">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
