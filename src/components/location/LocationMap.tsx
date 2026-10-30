import type { ResourceLocation } from '../../services/reference.ts'

export default function LocationMap({ location }: { location: ResourceLocation }) {
  const { latitude: lat, longitude: lon } = location
  return <div className="flex min-w-0 flex-col gap-2">
    <iframe title="Peta lokasi terpilih" className="h-64 w-full rounded-md border border-border" loading="lazy" referrerPolicy="no-referrer" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.max(-180, lon - 0.008)},${Math.max(-90, lat - 0.005)},${Math.min(180, lon + 0.008)},${Math.min(90, lat + 0.005)}&layer=mapnik&marker=${lat},${lon}`} />
    <p className="m-0 text-sm wrap-anywhere">{location.label}</p>
    <a className="inline-flex min-h-11 items-center self-start text-sm" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`}>Buka peta lebih besar</a>
  </div>
}
