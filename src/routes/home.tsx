import { Link } from 'react-router'
import SupplyCard from '../components/resources/SupplyCard.tsx'
import Icon from '../components/ui/Icon.tsx'
import { useAuth } from '../auth/useAuth.ts'

export const meta = () => [{ title: 'Makanan berlebih? Bagikan, jangan buang. | Food Rescue' }]

const brandButton = 'fr-button bg-brand text-on-brand hover:not-disabled:bg-brand-hover active:not-disabled:bg-brand-active'
const secondaryButton = 'fr-button border border-outline bg-surface text-ink shadow-none hover:not-disabled:bg-organic'

export default function HomePage() {
  const { status } = useAuth()
  const authenticated = status === 'authenticated'

  return (
    <div className="bg-surface">
      <section className="bg-organic" aria-labelledby="home-title">
        <div className="landing-container grid gap-12 pt-10 pb-8 lg:grid-cols-[minmax(0,.895fr)_minmax(0,1fr)] lg:items-center lg:py-16">
          <div className="flex min-w-0 flex-col gap-5 lg:gap-6 [&_p]:m-0">
            <p className="font-caption text-xs leading-4.5 text-primary lg:leading-4"><span className="lg:hidden">Berbagi pangan, kurangi sisa</span><span className="hidden lg:inline">Pangan masih punya guna</span></p>
            <h1 id="home-title" className="m-0 font-brand text-[32px] leading-10 font-semibold text-on-primary-container lg:text-[44px] lg:leading-13 lg:text-ink">Makanan berlebih?<br className="hidden lg:block" /> Bagikan, jangan buang.</h1>
            <p className="text-[17px] leading-6.5 text-muted lg:text-lg lg:leading-7"><span className="lg:hidden">Temukan makanan siap konsumsi atau bahan organik yang masih bisa dimanfaatkan.</span><span className="hidden lg:inline">Temukan makanan siap konsumsi atau bahan organik yang bisa dimanfaatkan. Punya surplus? Tawarkan untuk didonasikan atau dijual.</span></p>
            <div className="flex flex-col gap-2.5 lg:flex-row lg:gap-3">
              <Link className="fr-button h-11 py-0 lg:w-41" to="/supply">Cari resource</Link>
              <Link className={`${brandButton} h-11 py-0 lg:w-44.5`} to="/supply/new">Tawarkan resource</Link>
            </div>
            <p className="text-sm leading-5.25 text-muted lg:leading-5"><span className="lg:hidden">Jelajahi tanpa akun. Daftar saat ingin berbagi atau reservasi.</span><span className="hidden lg:inline">Boleh lihat-lihat tanpa akun. Masuk untuk reservasi atau menawarkan resource.</span></p>
          </div>
          <aside className="hidden min-w-0 flex-col gap-4 lg:flex" aria-label="Contoh tampilan listing">
            <p className="m-0 font-caption text-xs leading-4 text-primary">Contoh resource • Depok</p>
            <div className="grid grid-cols-2 items-start gap-4">
              <SupplyCard title="Nasi kotak" quantity={12} unit="box" deadline="18 Okt, 17.00" area="Kukusan, Depok" intendedUse="Konsumsi manusia" condition="Belum dikonsumsi" action={<Link className={secondaryButton} to="/supply">Lihat detail →<span className="sr-only"> contoh nasi kotak, jelajahi Supply</span></Link>} />
              <SupplyCard title="Ampas kopi" resourceType="organic" quantity={5} unit="kg" deadline="14 Okt, 17.00" area="Beji, Depok" intendedUse="Pengomposan" condition="Basah, tanpa campuran" action={<Link className={secondaryButton} to="/supply">Lihat detail →<span className="sr-only"> contoh ampas kopi, jelajahi Supply</span></Link>} />
            </div>
            <p className="m-0 text-sm leading-5 text-muted">Contoh tampilan listing, bukan ketersediaan langsung.</p>
          </aside>
        </div>
      </section>

      <section className="landing-container py-8 lg:py-14" aria-labelledby="resource-types">
        <h2 id="resource-types" className="landing-heading mb-4 lg:mb-7">Apa yang bisa dibagikan?</h2>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-12">
          <article className="flex flex-col gap-2.5 rounded-xl bg-brand p-5 text-on-brand lg:flex-row lg:gap-5 lg:rounded-none lg:bg-transparent lg:p-0 lg:text-ink">
            <span className="inline-flex lg:hidden"><Icon name="packageLarge" /></span>
            <span className="hidden self-start rounded-xl bg-brand p-4 lg:inline-flex"><Icon name="landingFood" /></span>
            <div className="lg:space-y-2">
              <h3 className="mb-2.5 text-xl leading-7.5 font-bold lg:mb-2 lg:leading-7 lg:font-semibold">Makanan siap konsumsi</h3>
              <p className="m-0 leading-6 lg:text-muted"><span className="lg:hidden">Nasi kotak, roti, dan makanan kemasan yang masih layak dan belum dikonsumsi.</span><span className="hidden lg:inline">Nasi kotak, snack box, atau bakery yang masih layak dan belum dikonsumsi. Untuk konsumsi manusia.</span></p>
            </div>
          </article>
          <article className="flex flex-col gap-2.5 rounded-xl bg-organic-container p-5 text-on-organic lg:flex-row lg:gap-5 lg:rounded-none lg:bg-transparent lg:p-0 lg:text-ink">
            <span className="inline-flex lg:hidden"><Icon name="organicLarge" /></span>
            <span className="hidden self-start rounded-xl bg-organic-container p-4 lg:inline-flex"><Icon name="landingOrganic" /></span>
            <div className="lg:space-y-2">
              <h3 className="mb-2.5 text-xl leading-7.5 font-bold lg:mb-2 lg:leading-7 lg:font-semibold">Bahan organik</h3>
              <p className="m-0 leading-6 lg:text-muted"><span className="lg:hidden">Ampas kopi, kulit buah, atau cangkang telur untuk kompos dan pemanfaatan yang sesuai.</span><span className="hidden lg:inline">Ampas kopi, sisa buah dan sayur, atau cangkang telur. Untuk kompos, BSF, atau pemanfaatan lain yang sesuai.</span></p>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-harvest" aria-labelledby="request-heading">
        <div className="landing-container flex flex-col items-start gap-4 py-8 lg:gap-5 lg:py-12">
          <span className="inline-flex lg:hidden"><Icon name="landingRequest" /></span>
          <p className="m-0 hidden font-caption text-xs leading-4 text-on-warning-container lg:block">Papan request</p>
          <h2 id="request-heading" className="landing-heading m-0 lg:text-[32px] lg:leading-10"><span className="lg:hidden">Butuh resource tertentu?</span><span className="hidden lg:inline">Belum ketemu yang dibutuhkan?</span></h2>
          <p className="m-0 leading-6 lg:text-lg lg:leading-7 lg:text-muted">Buat request kebutuhanmu. Provider dapat menawarkan resource langsung tanpa membuat listing publik.</p>
          <div className="flex w-full gap-3 lg:w-auto">
            <Link className={`${secondaryButton} h-11 w-full py-0 lg:w-46`} to="/requests">Lihat papan request<span className="lg:hidden"> →</span></Link>
            <Link className="hidden min-h-11 w-35 items-center justify-center text-sm font-semibold no-underline lg:inline-flex" to="/requests/new">Buat request</Link>
          </div>
          <p className="m-0 hidden text-sm leading-5 text-muted lg:block">Jelajahi tanpa akun. Masuk untuk membuat request.</p>
        </div>
      </section>

      <section id="cara-kerja" className="landing-container scroll-mt-6 py-10 lg:py-14" aria-labelledby="workflow-heading">
        <h2 id="workflow-heading" className="landing-heading mb-6 lg:mb-8"><span className="lg:hidden">Ketemu, sepakat, ambil.</span><span className="hidden lg:inline">Dari ketemu sampai dijemput</span></h2>
        <ol className="m-0 grid list-none gap-6 p-0 lg:grid-cols-3 lg:gap-8">
          <li className="flex items-start gap-4 lg:flex-col lg:gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-container lg:hidden"><Icon name="landingSearchMobile" /></span>
            <span className="hidden lg:inline-flex"><Icon name="landingSearch" /></span>
            <div>
              <h3 className="mb-1 text-lg leading-6.75 font-bold lg:mb-3 lg:text-xl lg:leading-7 lg:font-semibold"><span className="lg:hidden">Temukan yang cocok</span><span className="hidden lg:inline">Temukan resource</span></h3>
              <p className="m-0 leading-6 text-muted"><span className="lg:hidden">Cek kondisi, jumlah, lokasi, dan batas waktu. Atau tawarkan resource milikmu.</span><span className="hidden lg:inline">Cari supply atau tanggapi request. Cek kondisi, jumlah, area, dan deadline.</span></p>
            </div>
          </li>
          <li className="flex items-start gap-4 lg:flex-col lg:gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-container lg:hidden"><Icon name="landingAgreementMobile" /></span>
            <span className="hidden lg:inline-flex"><Icon name="landingAgreement" /></span>
            <div>
              <h3 className="mb-1 text-lg leading-6.75 font-bold lg:mb-3 lg:text-xl lg:leading-7 lg:font-semibold"><span className="lg:hidden">Sepakati reservasi</span><span className="hidden lg:inline">Tunggu persetujuan</span></h3>
              <p className="m-0 leading-6 text-muted"><span className="lg:hidden">Klaim disetujui provider; tawaran ke request disetujui receiver. ACCEPTED baru mengalokasikan quantity.</span><span className="hidden lg:inline">Klaim disetujui provider; tawaran ke request disetujui receiver. Quantity baru dialokasikan setelah ACCEPTED.</span></p>
            </div>
          </li>
          <li className="flex items-start gap-4 lg:flex-col lg:gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-container lg:hidden"><Icon name="landingPickupMobile" /></span>
            <span className="hidden lg:inline-flex"><Icon name="landingPickup" /></span>
            <div>
              <h3 className="mb-1 text-lg leading-6.75 font-bold lg:mb-3 lg:text-xl lg:leading-7 lg:font-semibold"><span className="lg:hidden">Atur waktu pengambilan</span><span className="hidden lg:inline">Atur pickup</span></h3>
              <p className="m-0 leading-6 text-muted"><span className="lg:hidden">WhatsApp kedua pihak wajib diisi. Provider menjadwalkan; receiver menandai penerimaan selesai.</span><span className="hidden lg:inline">Lengkapi WhatsApp kedua pihak. Provider mencatat jadwal sebelum deadline; receiver menandai resource sudah diterima.</span></p>
            </div>
          </li>
        </ol>
        <div className="mt-6 border-t border-border pt-4 lg:mt-8 lg:flex lg:gap-5 lg:rounded-md lg:border-0 lg:bg-surface-variant lg:p-6">
          <span className="hidden lg:inline-flex"><Icon name="landingInfo" /></span>
          <div className="flex flex-col gap-2 text-sm leading-5 text-muted [&_p]:m-0">
            <h3 className="m-0 text-base leading-6 font-bold text-ink lg:text-xl lg:leading-7 lg:font-semibold"><span className="lg:hidden">Cek dulu, baru reservasi.</span><span className="hidden lg:inline">Cek detail, lalu sepakati bersama.</span></h3>
            <p className="leading-5.25 lg:hidden">Kondisi dijelaskan pemilik, bukan diverifikasi otomatis. Kontak hanya tersedia bagi pasangan transaksi setelah ACCEPTED; pembayaran di luar platform.</p>
            <p className="hidden lg:block">Kondisi dan catatan penyimpanan berasal dari provider, bukan verifikasi keamanan otomatis. Bahan organik tidak selalu cocok untuk pakan ternak.</p>
            <p className="hidden lg:block">Pembayaran dan negosiasi final dilakukan di luar platform. Lanjutkan kontak melalui WhatsApp/pihak ketiga; pengambilan diatur bersama, bukan layanan antar.</p>
          </div>
        </div>
      </section>

      <section className="bg-primary-container text-on-primary-container" aria-labelledby="join-heading">
        <div className="landing-container flex flex-col gap-4 py-8 lg:flex-row lg:items-center lg:gap-16 lg:py-12">
          <div className="flex flex-1 flex-col gap-4 lg:gap-3">
            <h2 id="join-heading" className="m-0 font-brand text-[22px] leading-8.25 font-semibold lg:leading-7.5"><span className="lg:hidden">Punya lebih? Ada yang membutuhkan.</span><span className="hidden lg:inline">Punya surplus atau butuh resource?</span></h2>
            <p className="m-0 leading-6"><span className="lg:hidden">Satu akun untuk berbagi sekaligus menerima.</span><span className="hidden lg:inline">Satu akun untuk memberi dan menerima. Mulai dari yang kamu punya atau butuhkan.</span></p>
          </div>
          <Link className={`${brandButton} h-11 py-0 lg:w-45`} to={authenticated ? '/supply/new' : '/register'}>{authenticated ? 'Tawarkan resource' : <><span className="lg:hidden">Daftar gratis</span><span className="hidden lg:inline">Daftar dan mulai</span></>}</Link>
        </div>
      </section>
    </div>
  )
}
