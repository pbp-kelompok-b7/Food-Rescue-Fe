import EmptyState from './ui/EmptyState.jsx'
import ErrorState from './ui/ErrorState.jsx'

export default function PageState({ title, children, action, error = false }) {
  if (error) return <ErrorState title={title}>{children}{action && <div className="state-action">{action}</div>}</ErrorState>
  return (
    <EmptyState title={title} action={action}><p>{children}</p></EmptyState>
  )
}
