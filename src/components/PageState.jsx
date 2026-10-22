export default function PageState({ title, children, action, error = false }) {
  return (
    <section className={`page-state${error ? ' page-state-error' : ''}`} role={error ? 'alert' : undefined}>
      <h2>{title}</h2>
      <p>{children}</p>
      {action && <div className="state-action">{action}</div>}
    </section>
  )
}
