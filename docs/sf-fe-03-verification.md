# SF-FE-03: landing, navigasi, dan akses bersama

Scope: landing publik dan shell navigasi bersama; font, tokens, dan ikon memakai library Figma yang sudah dibundel. Tidak ada pemisahan role akun provider/receiver. `is_admin` dan `display_name` berasal dari session backend. Logout memakai service CSRF/session yang sudah ada.

## Pemeriksaan otomatis

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Tes API client dan tes komponen jsdom mencakup guest/user/admin, loading, session 401/403/404/501, redirect beserta query/hash, route errors beserta recovery, not found, dan fokus/menu setelah navigasi.
- Mock pada tes komponen hanya memverifikasi perilaku UI; bukan bukti login atau izin backend.

## Verifikasi lokal 26 Oktober 2026

Browser memakai Vite pada `localhost:5173` dan Django checkout lokal melalui proxy `/api/v1`. Django dijalankan dengan database PostgreSQL test sementara, migrasi checkout diterapkan hanya di database test. Akun dan session test dibuat melalui Django; response session, pemeriksaan izin API, CSRF, dan logout memakai kode backend nyata. Handoff session hanya ada di harness lokal sementara, tidak disertakan dalam aplikasi atau PR. Database development dan file backend tidak diubah.

| Skenario | Hasil |
| --- | --- |
| Guest membuka `/` | Landing tampil; jalur Supply/Request dan login/register tersedia |
| Guest membuka deep link `/admin` | Redirect ke `/login` setelah pemeriksaan sesi |
| User biasa membuka `/admin` | Akses ditolak; link moderasi tidak ditampilkan |
| Admin membuka `/admin` | Guard mengizinkan; link moderasi tersedia |
| Admin keluar dari `/admin` | CSRF/logout/session berhasil; redirect ke `/login` |
| Refresh/deep link dan URL tidak dikenal | Shell/guard dan not found tersedia |
| Mobile 390px dan desktop | Landing terbaca, navigasi dapat dibuka; Escape menutup menu dan mengembalikan fokus |

## Batas verifikasi

Login/register, browse Supply/Request, profil, dan dashboard moderasi masih halaman placeholder dari issue lain. Pengujian ini membuktikan navigasi dan akses menuju route tersebut, bukan penyelesaian fitur bisnisnya. Session untuk pengujian browser disiapkan melalui fixture Django, bukan form login frontend. Status HTTP yang belum dapat dipicu secara alami diuji di tes komponen. Host production tetap harus menyediakan fallback SPA ke `build/client/index.html` dan proxy API; konfigurasi hosting tidak diubah oleh issue ini.
