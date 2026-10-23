# Food Rescue — Frontend

Frontend React + TypeScript + React Router Framework Mode (SPA) di atas Vite untuk redistribusi surplus pangan dan bahan organik. Satu akun dapat bertindak sebagai provider maupun receiver.

## Setup lokal

Prasyarat: Git, Node.js **24.x**, dan npm (disertakan bersama Node.js). Versi Node disimpan di `.nvmrc` dan digunakan oleh CI.

1. Clone repository dan masuk ke folder frontend. Jika repository sudah tersedia, langsung masuk ke folder tersebut.

   ```sh
   git clone https://github.com/pbp-kelompok-b7/Food-Rescue-Fe.git
   cd Food-Rescue-Fe
   ```

2. Pastikan versi Node.js adalah 24.x dan npm tersedia.

   ```sh
   node --version
   npm --version
   ```

   Di Windows PowerShell, gunakan `npm.cmd --version`. Jika menggunakan nvm di macOS/Linux, jalankan `nvm install` lalu `nvm use` untuk mengikuti `.nvmrc`.

3. Salin konfigurasi environment, install dependency sesuai lockfile, lalu jalankan development server.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run dev
```

macOS/Linux:

```sh
cp .env.example .env
npm ci
npm run dev
```

Jika `.env` sudah ada, gunakan konfigurasi yang ada tanpa menimpanya. Nilai default untuk backend lokal:

```dotenv
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:8000
```

Buka http://localhost:5173. Port dikunci agar sesuai konfigurasi CORS/CSRF Django; jika port 5173 sedang dipakai, hentikan proses yang memakainya sebelum menjalankan server lagi. Hentikan development server dengan `Ctrl+C`.

Frontend dapat dibuka tanpa backend untuk melihat halaman placeholder. Untuk request API, jalankan backend Django di terminal terpisah pada port 8000 sesuai [README backend](https://github.com/pbp-kelompok-b7/Food-Rescue-Be#readme). Endpoint yang belum diimplementasikan tetap belum dapat digunakan.

## Konfigurasi API

| Variable | Default | Penggunaan |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Prefix API yang dipakai browser. |
| `API_PROXY_TARGET` | `http://127.0.0.1:8000` | Target proxy Django untuk development saja. |

Jalankan backend Django terpisah sesuai README backend, pada port 8000. Request `/api/v1/...` dari frontend diteruskan Vite ke backend tanpa mengubah prefix. Buka frontend melalui `localhost`, bukan `127.0.0.1`, agar origin konsisten. Restart Vite setelah mengubah environment.

Semua variable `VITE_*` masuk ke bundle publik. Jangan isi password, secret key, atau token di sana. `.env` dan variasinya diabaikan Git; hanya `.env.example` yang disimpan.

Proxy Vite berlaku pada server development dan preview lokal. Hosting production harus menyediakan SPA fallback ke `index.html` dan meneruskan `/api` ke Django, atau memakai URL API terpisah dengan CORS, CSRF, dan cookie yang dikonfigurasi sesuai domain deployment.

## Status implementasi

- Tersedia: route eksplisit untuk landing, akun, supply/request browse-detail-create-edit, claim/offer, reservation, pickup, dan moderasi admin; lihat `src/routes.ts`. Semua halaman bisnis masih placeholder.
- Halaman modul masih placeholder dengan keterangan fitur belum tersedia. Belum ada data mock atau autentikasi palsu.
- Backend lokal menyediakan endpoint scaffold. Login, register, listing, reservation, dan pickup belum terintegrasi dengan halaman frontend.
- Library 27 komponen mengikuti Figma, termasuk kontrol form, feedback, navigasi, kartu resource, filter, lokasi, dan transaksi. Font Nunito dan Unbounded serta ikon Figma dibundel secara lokal.
- Katalog interaktif tersedia di `/components` saat development. Dokumentasi struktur dan props ada di [panduan komponen](src/components/README.md). Komponen belum berarti seluruh halaman dan integrasi backend selesai.

## Struktur

```text
src/
  components/    # Komponen bersama, termasuk status halaman
  layouts/       # Navigasi dan layout bersama
  pages/         # Halaman sesuai route
  services/      # Client /api/v1, auth, resource, transaction, admin, reference dan tests
  auth/          # Auth provider, hook, protected/admin guard
  routes/        # Route modules, dimuat otomatis per halaman
  routes.ts      # Konfigurasi React Router Framework Mode
  root.tsx       # Dokumen HTML, AuthProvider, fallback dan error boundary
  index.css      # Token warna dan styling global
```

## Menggunakan API client

```js
import { apiRequest, ApiError } from './services/api.ts'

// Contoh pemakaian ketika endpoint sudah diimplementasikan:
const listings = await apiRequest('listings/?page=1')
```

`apiRequest` menerima path relatif API, `method`, `body`, `headers`, dan `signal`. Body object dikirim sebagai JSON; `FormData` didukung tanpa memaksa Content-Type. Session cookie ikut dikirim. Request selain GET/HEAD/OPTIONS memakai header `X-CSRFToken` jika cookie `csrftoken` tersedia. Respons 204 menghasilkan `null`; kegagalan HTTP menghasilkan `ApiError` dengan `status` dan `data`, termasuk error validasi field.

Backend wajib menyediakan cara memperoleh cookie CSRF sebelum login atau request mutasi. Client ini tidak membuat endpoint auth atau mengambil token secara otomatis. Gunakan pola same-origin melalui proxy untuk development; API lintas domain memerlukan strategi cookie/CSRF yang disepakati dengan backend. Auth provider memeriksa `/api/v1/auth/session/`. Route guard membatasi halaman akun/transaksi/admin; backend tetap menjadi sumber otorisasi. Selama session endpoint merespons 501, halaman terlindungi menampilkan layanan akun belum tersedia.

## Pemeriksaan

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Preview menyajikan `build/client` pada port default 4173 dan mewarisi proxy API lokal dari konfigurasi Vite. Static hosting production tetap harus menyediakan proxy API sendiri.

GitHub Actions menjalankan install dari lockfile, lint, typecheck, build, dan tes API client pada push, pull request, atau pemicu manual. Nama required status check: **Lint and build**.

## Kontribusi

Kerjakan perubahan di branch fitur, buat pull request ke `main`, dan minta minimal satu approval anggota lain. Sertakan perubahan `package-lock.json` jika dependency berubah. Jalankan typecheck, lint, test, dan build sebelum membuat PR.

Ruleset `main` seharusnya mewajibkan PR, satu approval, dan status check `Lint and build`; blokir penghapusan dan force push. Jangan aktifkan `Restrict updates` tanpa bypass yang sesuai karena dapat menghalangi merge PR. Required status check dapat dipilih setelah workflow tersedia dan pernah berjalan di GitHub.


## Integrasi API Revisi 2

Backend menyediakan 62 operasi HTTP sesuai Technical Design Revisi 2, ditulis eksplisit di views.py dan urls.py setiap app. Service per modul tersedia di `src/services/`; service hanya mengirim request, belum membentuk form atau business logic.

`apiRequest` mengembalikan `data` dari envelope `{success, message, data}`. Kegagalan menghasilkan `ApiError` dengan `status`, `message`, `data` mentah, dan `errors` per field. Bootstrap CSRF mengambil `data.csrf_token` sebelum login/register, dan token diambil ulang setelah login.

Backend scaffold mengembalikan 501 pada seluruh operasi bisnis. Auth provider menampilkan error layanan pada route terlindungi; tidak menganggap user sudah login. Register/login UI, submit form, action approval, data fetching halaman, dan moderasi belum diimplementasikan.

Setelah memperbarui checkout, sesuaikan `.env` lokal yang sudah ada ke `VITE_API_BASE_URL=/api/v1`, lalu restart Vite. Jangan menimpa file `.env` dengan `.env.example` jika memiliki konfigurasi lain.

Service admin menggunakan method eksplisit seperti `adminApi.listUsers()`, `updateUser(id, body)`, dan `schedulePickup(reservationId, body)`. URL dan HTTP method ditentukan service, bukan caller. Tidak ada salinan manifest endpoint frontend; acuan integrasi adalah API contract dan endpoint backend.

## TypeScript dan Framework Mode

Source aplikasi menggunakan `.ts` / `.tsx` dengan strict TypeScript. `npm run typecheck` menjalankan React Router typegen lalu `tsc`; tipe hasil generate di `.react-router/` tidak masuk Git. Tes API berjalan langsung di Node.js 24 dari file TypeScript.

`react-router.config.ts` memakai `appDirectory: 'src'` dan `ssr: false`. React Router mengelola entry point, route modules, metadata, dan pemecahan bundle. Routing diatur di `src/routes.ts`; setiap halaman punya module di `src/routes/`. Layout auth dan admin melindungi kelompok route. Katalog `/components` hanya didaftarkan saat development. Tidak ada lagi `BrowserRouter`, `App.jsx`, `main.jsx`, atau `index.html` manual.

Untuk deployment SPA, publish direktori **build/client**. Host harus meneruskan URL halaman ke `index.html` dan menangani proxy `/api` ke Django secara terpisah. SSR runtime tidak diaktifkan; backend bisnis tetap Django.
