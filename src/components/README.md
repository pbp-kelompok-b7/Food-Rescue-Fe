# Food Rescue components

Komponen React + CSS berdasarkan library Figma Food Rescue. Satu file untuk setiap komponen; state bisnis, request API, permission, dan formatting tanggal/harga tetap milik page atau service.

```text
components/
  ui/             # Kontrol dasar, feedback, dialog, tabs
  navigation/     # Navbar dan Footer
  resources/      # SupplyCard, RequestCard, pencarian dan filter
  location/       # LocationPicker
  transactions/   # AgreementSummary, ReservationCard, PickupStatus, footer transaksi
  index.ts        # Public exports (27 komponen)
  PageState.tsx   # Adapter halaman placeholder yang sudah ada
```

Styling global komponen ada di `src/styles/components.css`, diimpor sekali melalui `src/root.tsx`. Ikon asli Figma disimpan di `public/assets/figma/`. `ui/Icon.tsx` dan `ui/Dialog.tsx` merupakan building block internal.

## Penggunaan

```tsx
import { Button, FormField, Input, QuantityInput } from '../components/index.ts'

<FormField label="Nama pangan" error={errors.title} required>
  <Input name="title" value={title} onChange={event => setTitle(event.target.value)} />
</FormField>

<QuantityInput value={quantity} onChange={setQuantity} min={1} max={12} unit="box" />
<Button type="submit" loading={saving}>Simpan</Button>
```

`FormField` menerima tepat satu child input/select/textarea. ID, label, helper, dan error dihubungkan otomatis. Untuk `QuantityInput`, gunakan `label` dan `hint` bawaannya tanpa membungkus dengan `FormField`.

## Props utama

| Komponen | Props |
| --- | --- |
| `Button` | `variant`: primary/secondary/ghost/destructive/brand; `loading`, `disabled`, props button native. Default `type="button"`. |
| `Input`, `Textarea` | Props input/textarea native, termasuk `ref`, `name`, `value`, `onChange`. |
| `Select` | Props select native; `options: {value, label, disabled?}[]`, `placeholder`. |
| `FormField` | `label`, `hint`, `error`, `required`, satu child kontrol. |
| `Checkbox` | `label`, props checkbox native termasuk `checked`, `onChange`. |
| `QuantityInput` | `value: number \| ''`, `onChange(number \| '')`, `min`, `max`, `step`, `unit`, `label`, `hint`. Input manual memakai validasi range HTML; tombol stepper membatasi min/max. |
| `Badge` | `status`, override `tone`, `children` untuk label. Tone: neutral/success/info/warning/danger. |
| `Alert` | `title`, `children`, `tone`: info/warning/danger/success. |
| `Toast` | `children`, `tone`, `onDismiss`, `duration` (ms; default 0, tanpa auto-dismiss). Unmount toast setelah dismiss. |
| `EmptyState` | `title`, `children`, `action`, `variant`: default/dashboard. |
| `ErrorState` | `title`, `children`, `onRetry`, `loading`. |
| `Skeleton` | `label`, `className`. |
| `ConfirmDialog` | `open`, `title`, `children`, `onCancel`, `onConfirm`, `confirmLabel`, `destructive`, `loading`. Parent menutup dialog setelah sukses; tampilkan error dari parent jika gagal. |
| `Tabs` | `items: {value, label, content, disabled?}[]`, `value`, `onChange`, `label`. Berikan value awal yang valid. |
| `Navbar` | `user: {name}?`, `links`, `accountLinks`: `{to, label}[]`, `onLogout`. Guest default; tidak melakukan request auth sendiri. |
| `Footer` | `groups: {title, links: {to, label}[]}[]`, `attribution`. Hanya berikan route yang tersedia. |
| `SupplyCard` | `title`, `resourceType`: packaged/organic; `mode`: DONATE/SELL; `quantity`, `unit`, `deadline`, `area`, `intendedUse`, `condition`, `photoUrl`, `photoAlt`, `to`, `action`. |
| `RequestCard` | `title`, `resourceType`, `remaining`, `total`, `allocated`, `fulfilled`, `unit`, `budgetHint`, `deadline`, `intendedUse`, `area`, `status`, `to`. Angka alokasi diberikan oleh caller. |
| `SearchBar` | `value`, `onChange(string)`, `onSearch(string)`, `label`, `placeholder`, `loading`. |
| `ResourceFilters` | `fields: {name, label, options, placeholder?}[]`, `value`, `onChange(nextValue)`, `onReset`. |
| `FilterSheet` | `open`, `onClose`, `onApply`, `title`, `children`. State draft/apply filter dikelola parent. |
| `LocationPicker` | `query`, `onQueryChange`, `onSearch`, `results: {id, label, latitude?, longitude?}[]`, `selectedId`, `onSelect(result)`, `loading`, `error`, `searched`, `attribution`. Tidak memanggil geocoding sendiri. |
| `AgreementSummary` | `reference`, `title`, `provider`, `receiver`, `quantity`, `unit`, `sharingLabel`, `deadlineLabel`, `deadline`, `location`, `condition`. |
| `TransactionFooter` | Tanpa props. |
| `ReservationCard` | `reference`, `title`, `status`, `quantity`, `unit`, `counterpart`, `pickupTime`, `to`, `actions`. |
| `PickupStatus` | `status`, `label`, `tone`, `scheduledAt`, `location`, `instructions`, `children`, `actions`. Label dan aksi mengikuti state dari caller. |

Komponen yang menggunakan `Link`/`NavLink` harus berada di dalam React Router. `Navbar`/`Footer` dipasang melalui `AppLayout`. `PageState` menggunakan `EmptyState`/`ErrorState` tanpa mengubah interface pemanggilnya.

## Katalog development

Jalankan `npm run dev`, lalu buka `/components`. Route ini hanya tersedia dalam mode development dan dimuat secara lazy. Data contoh di `src/pages/ComponentCatalogPage.tsx` tidak melakukan transaksi atau pencarian lokasi aktif. Halaman modul tetap terpisah dari katalog.

Katalog mencakup kontrol, feedback, kartu, filter sheet, keyboard tabs, konfirmasi modal, pemilihan hasil lokasi, navbar guest/login, dan ringkasan transaksi. Komponen menerima state dan callback; keberhasilan tampilan katalog bukan bukti integrasi backend.
