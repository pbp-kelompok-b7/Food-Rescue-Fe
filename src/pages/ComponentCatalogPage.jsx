import { useState } from 'react'
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
} from '../components/index.js'

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
  id: 'beji',
  label: 'Beji, Kota Depok, Jawa Barat',
  latitude: -6.368,
  longitude: 106.829,
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
  const [quantity, setQuantity] = useState(3)
  const [tab, setTab] = useState('reservations')
  const [filters, setFilters] = useState({})
  const [query, setQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('Beji, Depok')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [searched, setSearched] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const [message, setMessage] = useState('')
  const [checked, setChecked] = useState(true)

  return (
    <div className="fr-catalog">
      <div className="page-heading">
        <h1>Komponen Food Rescue</h1>
        <p>
          Katalog development · Semua data adalah contoh, tanpa transaksi atau
          pencarian lokasi aktif.
        </p>
      </div>
      <section className="fr-catalog-section">
        <h2>Button</h2>
        <div className="fr-catalog-row">
          {['primary', 'secondary', 'ghost', 'destructive', 'brand'].map(
            (variant) => (
              <Button
                key={variant}
                variant={variant}
                onClick={() => setMessage(`Tombol ${variant} diklik.`)}
              >
                {variant}
              </Button>
            ),
          )}
          <Button disabled>Tidak tersedia</Button>
          <Button loading>Menyimpan…</Button>
        </div>
        <p role="status" className="fr-catalog-message">
          {message}
        </p>
      </section>
      <section className="fr-catalog-section">
        <h2>Form controls</h2>
        <div className="fr-catalog-pair">
          <form
            className="fr-catalog-form"
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
          <div className="fr-catalog-form">
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
      <section className="fr-catalog-section">
        <h2>Badge</h2>
        <div className="fr-catalog-row">
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
      <section className="fr-catalog-section">
        <h2>Feedback</h2>
        <div className="fr-catalog-pair">
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
        <div className="fr-catalog-row">
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
      <section className="fr-catalog-section">
        <h2>Resource cards</h2>
        <div className="fr-catalog-grid">
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
          />
        </div>
        <div className="fr-catalog-pair">
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
      <section className="fr-catalog-section">
        <h2>Search, filters &amp; tabs</h2>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={(value) => setMessage(`Pencarian contoh: ${value}`)}
        />
        <div className="fr-catalog-form">
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
      <section className="fr-catalog-section">
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
          selectedId={selected?.id}
          onSelect={setSelected}
          searched={searched}
          attribution="OpenStreetMap / Nominatim · Contoh hasil pencarian, bukan data lokasi aktif."
        />
        {selected && (
          <p role="status">Lokasi contoh terpilih: {selected.label}</p>
        )}
      </section>
      <section className="fr-catalog-section">
        <h2>Transaction components</h2>
        <div className="fr-catalog-pair">
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
      <section className="fr-catalog-section">
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
