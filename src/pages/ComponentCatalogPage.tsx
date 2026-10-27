import type { LocationResult } from '../components/location/LocationPicker.tsx'
import { useState } from 'react'
import ReferenceDataExamples from './ReferenceDataExamples.tsx'
import {
  Button,
  FormField,
  Input,
  Textarea,
  Select,
  Checkbox,
  QuantityInput,
  Badge,
  Alert,
  Toast,
  EmptyState,
  ErrorState,
  Skeleton,
  ConfirmDialog,
  Tabs,
  Navbar,
  Footer,
  SupplyCard,
  RequestCard,
  SearchBar,
  ResourceFilters,
  FilterSheet,
  LocationPicker,
  AgreementSummary,
  TransactionFooter,
  ReservationCard,
  PickupStatus,
} from '../components/index.ts'

const filterFields = [
  {
    name: 'type',
    label: 'Jenis resource',
    options: [
      { value: 'packaged', label: 'Pangan kemasan' },
      { value: 'organic', label: 'Bahan organik' },
    ],
  },
  {
    name: 'mode',
    label: 'Cara berbagi',
    options: [
      { value: 'DONATE', label: 'Donasi' },
      { value: 'SELL', label: 'Jual' },
    ],
  },
]
const demoLocation = {
  label: 'Beji, Kota Depok, Jawa Barat',
  area: 'Depok',
  latitude: -6.368,
  longitude: 106.829,
  attribution: 'OpenStreetMap / Nominatim · Contoh hasil pencarian, bukan data lokasi aktif.',
}
const agreement = {
  title: 'Nasi kotak surplus',
  reference: 'SUP-012 · Makanan kemasan',
  provider: 'Dapur Bu Rani',
  receiver: 'Komunitas Berbagi',
  quantity: 4,
  unit: 'box',
  sharingLabel: 'Donasi',
  deadline: '13 Oktober 2026, 17.00 WIB',
  location: 'Balai Warga Beji, Depok',
  condition: 'Tersegel, belum dikonsumsi. Disimpan sejuk. Alergen: telur.',
}

// Fixtures are isolated to this development-only catalog; no backend actions occur.
export default function ComponentCatalogPage() {
  const [quantity, setQuantity] = useState<number | ''>(3)
  const [tab, setTab] = useState('reservations')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('Beji, Depok')
  const [results, setResults] = useState<LocationResult[]>([])
  const [selected, setSelected] = useState<LocationResult | null>(null)
  const [searched, setSearched] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const [message, setMessage] = useState('')
  const [checked, setChecked] = useState(true)

  return (
    <div className="flex flex-col gap-10">
      <div className="mb-8 [&_p]:mb-0 [&_p]:max-w-[64ch] [&_p]:text-muted">
        <h1>Komponen Food Rescue</h1>
        <p>
          Katalog development · Data visual adalah contoh. Bagian reference-data
          dan lokasi memakai API backend, tanpa membuat transaksi.
        </p>
      </div>
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>Button</h2>
        <div className="flex flex-wrap items-start gap-4">
          {(['primary', 'secondary', 'ghost', 'destructive', 'brand'] as const).map(
            (variant) => (
              <Button
                key={variant}
                className="w-52.5"
                variant={variant}
                onClick={() => setMessage(`Tombol ${variant} diklik.`)}
              >
                {variant}
              </Button>
            ),
          )}
          <Button className="w-52.5" disabled>Tidak tersedia</Button>
          <Button className="w-52.5" loading>Menyimpan…</Button>
        </div>
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      </section>
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>Form controls</h2>
        <div className="grid grid-cols-1 items-start gap-6 nav:grid-cols-2">
          <form
            className="flex w-full max-w-82 flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              setMessage('Form contoh dikirim.')
            }}
          >
            <FormField
              label="Nama pangan"
              hint="Gunakan nama yang singkat dan jelas."
              required
            >
              <Input name="title" placeholder="Contoh: Nasi kotak tersegel" />
            </FormField>
            <FormField label="Kondisi pangan">
              <Textarea placeholder="Jelaskan kondisi dan penyimpanannya." />
            </FormField>
            <FormField label="Kategori">
              <Select
                placeholder="Pilih kategori"
                options={filterFields[0].options}
              />
            </FormField>
            <Checkbox
              label="Cocok untuk pakan ternak"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <QuantityInput
              label="Jumlah (wajib)"
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={12}
              unit="box"
              hint="dari 12 box tersedia"
            />
            <Button type="submit">Kirim contoh</Button>
          </form>
          <div className="flex w-full max-w-82 flex-col gap-5">
            <FormField label="Nama pangan" error="Nama pangan wajib diisi.">
              <Input placeholder="Masukkan nama pangan" />
            </FormField>
            <FormField label="Input nonaktif">
              <Input value="Tidak dapat diubah" disabled />
            </FormField>
            <FormField label="Input hanya baca">
              <Input value="SUP-012" readOnly />
            </FormField>
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>Badge</h2>
        <div className="flex flex-wrap items-start gap-4">
          {[
            'AVAILABLE',
            'RESERVED',
            'COMPLETED',
            'CLOSED',
            'EXPIRED',
            'OPEN',
            'ALLOCATED',
            'FULFILLED',
            'PENDING',
            'ACCEPTED',
          ].map((status) => (
            <Badge key={status} status={status} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>Feedback</h2>
        <div className="grid grid-cols-1 items-start gap-6 nav:grid-cols-2">
          <Alert title="Periksa kondisi sebelum digunakan">
            Kondisi dan kesesuaian dijelaskan penyedia, bukan diverifikasi
            platform.
          </Alert>
          <Alert tone="warning" title="Pembayaran disepakati langsung">
            Platform tidak memproses pembayaran.
          </Alert>
          <Alert tone="danger" title="Pencarian lokasi tidak tersedia">
            Coba kembali atau masukkan lokasi secara manual.
          </Alert>
          <Alert tone="success" title="Pengambilan dikonfirmasi">
            Menunggu konfirmasi pihak lainnya.
          </Alert>
          <EmptyState
            action={
              <Button
                onClick={() => {
                  setFilters({})
                  setMessage('Filter direset.')
                }}
              >
                Reset filter
              </Button>
            }
          >
            Coba area lain atau ubah filter pencarian.
          </EmptyState>
          <ErrorState
            onRetry={() => setMessage('Callback coba lagi dijalankan.')}
          >
            Resource gagal dimuat. Periksa koneksi dan coba lagi.
          </ErrorState>
          <EmptyState variant="dashboard" title="Belum ada aktivitas">
            Bagikan resource atau buat request pertamamu.
          </EmptyState>
          <Skeleton />
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <Button onClick={() => setToast(true)}>Tampilkan toast</Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Buka konfirmasi
          </Button>
        </div>
        {toast && (
          <Toast onDismiss={() => setToast(false)}>
            Contoh perubahan berhasil disimpan.
          </Toast>
        )}
        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            setToast(true)
          }}
          title="Hapus supply ini?"
          confirmLabel="Hapus supply"
          destructive
        >
          Supply contoh belum terkait transaksi. Aksi ini hanya simulasi
          katalog.
        </ConfirmDialog>
      </section>
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>Resource cards</h2>
        <div className="grid grid-cols-1 items-start gap-6 nav:grid-cols-2 xl:grid-cols-[repeat(3,296px)]">
          <SupplyCard
            title="Nasi kotak"
            quantity={12}
            unit="box"
            deadline="13 Okt, 17.00"
            area="Kukusan, Depok"
            intendedUse="Konsumsi manusia"
            condition="Belum dikonsumsi"
            action={
              <Button
                variant="secondary"
                onClick={() => setMessage('Detail supply contoh dipilih.')}
              >
                Lihat detail →
              </Button>
            }
          />
          <SupplyCard
            title="Ampas kopi"
            resourceType="organic"
            quantity={5}
            unit="kg"
            deadline="14 Okt, 17.00"
            area="Beji, Depok"
            intendedUse="Pengomposan"
            condition="Basah, tanpa campuran"
            action={<Button variant="secondary" onClick={() => setMessage('Detail bahan organik contoh dipilih.')}>Lihat detail →</Button>}
          />
          <SupplyCard
            title="Roti kemasan surplus"
            mode="SELL"
            quantity={12}
            unit="box"
            deadline="13 Okt, 17.00"
            area="Coblong, Kota Bandung"
            intendedUse="Konsumsi manusia"
            condition="Belum dikonsumsi"
            action={<Button variant="secondary" onClick={() => setMessage('Detail supply jual contoh dipilih.')}>Lihat detail →</Button>}
          />
        </div>
        <div className="grid grid-cols-1 items-start gap-6 nav:grid-cols-[repeat(2,minmax(0,400px))]">
          <RequestCard
            title="Pangan untuk dapur warga"
            remaining={12}
            total={20}
            allocated={4}
            fulfilled={4}
            unit="box"
            budgetHint={
              'Max-price: Rp15.000 / box (opsional)\nBatas harga per unit, bukan total budget.'
            }
            deadline="31 Okt, 12.00"
            intendedUse="konsumsi manusia"
            area="Coblong, Kota Bandung"
          />
          <RequestCard
            title="Sisa sayur untuk BSF"
            resourceType="organic"
            remaining={9}
            total={15}
            allocated={4}
            fulfilled={2}
            unit="kg"
            budgetHint={'Donasi saja (DONATE)\nUnit penawaran wajib kg.'}
            deadline="31 Okt, 12.00"
            intendedUse="BSF"
            area="Coblong, Kota Bandung"
          />
        </div>
      </section>
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>Search, filters &amp; tabs</h2>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={(value) => setMessage(`Pencarian contoh: ${value}`)}
        />
        <div className="flex w-full max-w-82 flex-col gap-5">
          <ResourceFilters
            fields={filterFields}
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters({})}
          />
        </div>
        <div>
          <Button variant="secondary" onClick={() => setFilterOpen(true)}>
            Buka filter mobile
          </Button>
        </div>
        <FilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={() => setFilterOpen(false)}
        >
          <ResourceFilters
            fields={filterFields}
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters({})}
          />
        </FilterSheet>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            {
              value: 'reservations',
              label: 'Reservasi',
              content: 'Konten reservasi contoh.',
            },
            {
              value: 'requests',
              label: 'Request',
              content: 'Konten request contoh.',
            },
            {
              value: 'resources',
              label: 'Resource',
              content: 'Konten resource contoh.',
            },
          ]}
        />
      </section>
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>LocationPicker</h2>
        <LocationPicker
          query={locationQuery}
          onQueryChange={setLocationQuery}
          onSearch={(value) => {
            setSearched(true)
            setResults(/beji|depok/i.test(value) ? [demoLocation] : [])
            setSelected(null)
          }}
          results={results}
          selected={selected}
          onSelect={setSelected}
          searched={searched}
          attribution="OpenStreetMap / Nominatim · Contoh hasil pencarian, bukan data lokasi aktif."
        />
        {selected && (
          <p role="status">Lokasi contoh terpilih: {selected.label}</p>
        )}
      </section>
      <ReferenceDataExamples />
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>Transaction components</h2>
        <div className="grid grid-cols-1 items-start gap-6 nav:grid-cols-2">
          <AgreementSummary {...agreement} />
          <div>
            <ReservationCard
              title="Nasi kotak surplus"
              reference="RSV-001"
              status="ACCEPTED"
              quantity={4}
              unit="box"
              counterpart="Provider: Dapur Bu Rani"
              pickupTime="13 Oktober 2026, 16.00 WIB"
            />
            <PickupStatus
              status="SCHEDULED"
              label="Terjadwal"
              tone="info"
              scheduledAt="13 Oktober 2026, 16.00 WIB"
              location="Balai Warga Beji, Depok"
              instructions="Bawa wadah sendiri."
            />
            <TransactionFooter />
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-5 [&>h2]:border-b [&>h2]:border-border [&>h2]:pb-3">
        <h2>Navigation · login variant</h2>
        <Navbar
          user={{ name: 'Akun saya' }}
          accountLinks={[{ to: '/components', label: 'Katalog komponen' }]}
          onLogout={() =>
            setMessage(
              'Callback keluar dijalankan; ini bukan autentikasi aktif.',
            )
          }
        />
        <Footer />
      </section>
    </div>
  )
}
