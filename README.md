# Food Rescue — Frontend

Frontend React + Vite untuk redistribusi surplus pangan dan bahan organik. Satu akun dapat bertindak sebagai provider maupun receiver.

## Setup lokal

Prasyarat: Node.js **24.x** dan npm. Versi Node disimpan di `.nvmrc` dan digunakan oleh CI.

```powershell
git clone https://github.com/pbp-kelompok-b7/Food-Rescue-Fe.git
cd Food-Rescue-Fe
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run dev
```

Buka http://localhost:5173. Port dikunci agar sesuai konfigurasi CORS/CSRF Django. Di macOS/Linux gunakan `cp .env.example .env` dan `npm` tanpa `.cmd`.

## Konfigurasi API

| Variable | Default | Penggunaan |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Prefix API yang dipakai browser. |
| `API_PROXY_TARGET` | `http://127.0.0.1:8000` | Target proxy Django untuk development saja. |

Jalankan backend Django terpisah sesuai README backend, pada port 8000. Request `/api/...` dari frontend diteruskan Vite ke backend tanpa mengubah prefix. Buka frontend melalui `localhost`, bukan `127.0.0.1`, agar origin konsisten. Restart Vite setelah mengubah environment.

Semua variable `VITE_*` masuk ke bundle publik. Jangan isi password, secret key, atau token di sana. `.env` dan variasinya diabaikan Git; hanya `.env.example` yang disimpan.

Proxy Vite hanya berlaku saat development. Hosting production harus menyediakan SPA fallback ke `index.html` dan meneruskan `/api` ke Django, atau memakai URL API terpisah dengan CORS, CSRF, dan cookie yang dikonfigurasi sesuai domain deployment.

## Status implementasi

- Tersedia: routing `/supply`, `/requests`, `/login`, `/register`, halaman 404, layout responsif, dan warna dasar dari design kit Food Rescue.
- Halaman modul masih placeholder dengan keterangan fitur belum tersedia. Belum ada data mock atau autentikasi palsu.
- Backend lokal saat setup masih memiliki `urlpatterns` kosong untuk modul bisnis dan akun. Login, register, listing, reservation, dan pickup belum terintegrasi.
- Font Nunito menggunakan fallback sistem sampai font dibundel. Fondasi ini belum merupakan implementasi lengkap Figma.

## Struktur

```text
src/
  components/    # Komponen bersama, termasuk status halaman
  layouts/       # Navigasi dan layout bersama
  pages/         # Halaman sesuai route
  services/      # API client dan tesnya
  App.jsx        # Definisi routes
  main.jsx       # BrowserRouter dan entry point React
  index.css      # Token warna dan styling global
```

## Menggunakan API client

```js
import { apiRequest, ApiError } from './services/api.js'

// Contoh pemakaian ketika endpoint sudah diimplementasikan:
const listings = await apiRequest('listings/?page=1')
```

`apiRequest` menerima path relatif API, `method`, `body`, `headers`, dan `signal`. Body object dikirim sebagai JSON; `FormData` didukung tanpa memaksa Content-Type. Session cookie ikut dikirim. Request selain GET/HEAD/OPTIONS memakai header `X-CSRFToken` jika cookie `csrftoken` tersedia. Respons 204 menghasilkan `null`; kegagalan HTTP menghasilkan `ApiError` dengan `status` dan `data`, termasuk error validasi field.

Backend wajib menyediakan cara memperoleh cookie CSRF sebelum login atau request mutasi. Client ini tidak membuat endpoint auth atau mengambil token secara otomatis. Gunakan pola same-origin melalui proxy untuk development; API lintas domain memerlukan strategi cookie/CSRF yang disepakati dengan backend. Proteksi route menunggu endpoint identitas user; navigasi saat ini bukan kontrol otorisasi.

## Pemeriksaan

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Preview menyajikan build pada port default 4173; proxy API development tidak tersedia di sana.

GitHub Actions menjalankan install dari lockfile, lint, build, dan tes API client pada push, pull request, atau pemicu manual. Nama required status check: **Lint and build**.

## Kontribusi

Kerjakan perubahan di branch fitur, buat pull request ke `main`, dan minta minimal satu approval anggota lain. Sertakan perubahan `package-lock.json` jika dependency berubah. Jalankan lint, test, dan build sebelum membuat PR.

Ruleset `main` seharusnya mewajibkan PR, satu approval, dan status check `Lint and build`; blokir penghapusan dan force push. Jangan aktifkan `Restrict updates` tanpa bypass yang sesuai karena dapat menghalangi merge PR. Required status check dapat dipilih setelah workflow tersedia dan pernah berjalan di GitHub.
