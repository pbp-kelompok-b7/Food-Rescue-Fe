import { Link } from 'react-router'
import Icon from '../components/ui/Icon.tsx'

export const meta = () => [{ title: 'Berbagi pangan & bahan organik | Food Rescue' }]

export default function Page() {
  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="border-b border-border pb-10 sm:pb-14" aria-labelledby="home-title">
        <p className="mb-4 text-sm font-bold text-primary">Surplus hari ini, manfaat berikutnya.</p>
        <h1 id="home-title" className="max-w-200 font-brand text-3xl leading-tight sm:text-4xl">Pangan berlebih masih punya tempat.</h1>
        <p className="mt-5 max-w-170 text-lg text-muted">Food Rescue mempertemukan pemilik surplus pangan dengan orang dan komunitas yang dapat memanfaatkannya sebelum menjadi waste.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link className="fr-button" to="/supply">Cari resource di Supply</Link>
          <Link className="fr-button border border-outline bg-surface text-primary-hover shadow-none hover:not-disabled:bg-organic" to="/requests">Lihat kebutuhan di Request Board</Link>
        </div>
        <p className="mt-4 mb-0 text-sm text-muted">Jelajahi tanpa akun. Masuk untuk menawarkan resource, membuat request, atau mengajukan reservasi.</p>
      </section>
      <section aria-labelledby="resource-types">
        <h2 id="resource-types">Dua jenis resource, tujuan yang berbeda</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <article className="rounded-md border border-border bg-surface p-6">
            <Icon name="packageLarge" />
            <h3 className="mt-4 mb-2 text-lg font-bold">Packaged Food Surplus</h3>
            <p className="mb-0 text-muted">Makanan siap konsumsi yang masih layak dan belum dikonsumsi, seperti rice box, snack box, bakery packs, dan makanan acara yang belum dibuka.</p>
          </article>
          <article className="rounded-md border border-border bg-organic p-6">
            <Icon name="organicLarge" />
            <h3 className="mt-4 mb-2 text-lg font-bold">Compostable Food Waste</h3>
            <p className="mb-0 text-muted">Sisa pangan organik untuk kompos, BSF/maggot, pakan tertentu, atau upcycling sesuai kondisi dan kesesuaiannya. Bukan untuk konsumsi manusia.</p>
          </article>
        </div>
      </section>
      <section className="grid gap-6 border-t border-border pt-8 sm:grid-cols-2" aria-labelledby="sharing-options">
        <div>
          <h2 id="sharing-options">Donasikan atau jual</h2>
          <p className="text-muted"><strong className="text-ink">DONATE</strong> berarti gratis. <strong className="text-ink">SELL</strong> memakai harga per unit dari pemilik; pembayaran dan negosiasi dilakukan di luar platform.</p>
          <Link className="inline-flex min-h-11 items-center font-bold" to="/supply/new">Tawarkan resource</Link>
        </div>
        <div>
          <h2>Punya kebutuhan khusus?</h2>
          <p className="text-muted">Buat request agar pemilik resource dapat menawarkan langsung tanpa membuat listing publik. Satu akun dapat memberi sekaligus menerima.</p>
          <Link className="inline-flex min-h-11 items-center font-bold" to="/requests/new">Buat request</Link>
        </div>
      </section>
      <section className="border-t border-border pt-8" aria-labelledby="how-it-works">
        <h2 id="how-it-works">Dari temuan sampai pickup</h2>
        <ol className="mt-4 grid list-inside list-decimal gap-4 text-muted sm:grid-cols-3">
          <li>Temukan Supply dan ajukan claim, atau tawarkan resource ke Request.</li>
          <li>Sepakati reservasi. Kontak pasangan transaksi terbuka setelah diterima (ACCEPTED).</li>
          <li>Koordinasikan pickup sebelum deadline, lalu penerima mencatat penerimaan.</li>
        </ol>
      </section>
    </div>
  )
}
