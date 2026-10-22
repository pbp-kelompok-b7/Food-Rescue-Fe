export default function Textarea({ className = '', rows = 4, ...props }) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={`fr-control fr-textarea ${className}`}
    />
  )
}
