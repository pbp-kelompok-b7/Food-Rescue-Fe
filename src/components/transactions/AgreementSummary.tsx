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
}: { reference?: string; title: string; provider: string; receiver: string; quantity: number; unit: string; sharingLabel?: string; deadlineLabel?: string; deadline?: string; location?: string; condition?: string }) {
  return (
    <section className="fr-agreement">
      <div>
        {reference && <p className="fr-hint">{reference}</p>}
        <h2>{title}</h2>
      </div>
      <div className="fr-participants">
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
        <div>
          <dt>Jumlah &amp; cara berbagi</dt>
          <dd>
            <strong>
              {quantity} {unit}
              {sharingLabel && ` · ${sharingLabel}`}
            </strong>
          </dd>
        </div>
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
