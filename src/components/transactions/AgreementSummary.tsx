export default function AgreementSummary({
  reference,
  title,
  provider,
  receiver,
  quantity,
  unit,
  sharingLabel,
  deadlineLabel = 'Batas konsumsi',
  deadline,
  location,
  condition,
}: {
  reference?: string
  title: string
  provider: string
  receiver: string
  quantity?: number | string
  unit?: string
  sharingLabel?: string
  deadlineLabel?: string
  deadline?: string
  location?: string
  condition?: string
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-md border border-border bg-surface p-4 leading-normal wrap-anywhere nav:p-6 [&_dl]:m-0 [&_dl]:flex [&_dl]:flex-col [&_dl]:gap-4 [&_dt]:mb-1 [&_dt]:text-sm [&_dt]:text-muted [&_dd]:m-0">
      <div className="flex flex-col gap-1">
        {reference && <p className="m-0 text-sm leading-[1.5] text-muted">{reference}</p>}
        <h2 className="m-0 text-xl leading-normal">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <dl>
          <div>
            <dt>Provider</dt>
            <dd>{provider}</dd>
          </div>
        </dl>
        <dl>
          <div>
            <dt>Receiver</dt>
            <dd>{receiver}</dd>
          </div>
        </dl>
      </div>
      <dl>
        {quantity != null && unit && (
          <div>
            <dt>Jumlah &amp; cara berbagi</dt>
            <dd>
              <strong>
                {quantity} {unit}
                {sharingLabel && ` · ${sharingLabel}`}
              </strong>
            </dd>
          </div>
        )}
        {deadline && (
          <div>
            <dt>{deadlineLabel}</dt>
            <dd>{deadline}</dd>
          </div>
        )}
        {location && (
          <div>
            <dt>Lokasi resource</dt>
            <dd>{location}</dd>
          </div>
        )}
        {condition && (
          <div>
            <dt>Kondisi resource</dt>
            <dd>{condition}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
