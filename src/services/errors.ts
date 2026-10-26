export function errorCopy(status?: number) {
  switch (status) {
    case 401: return { title: 'Sesi berakhir', message: 'Masuk kembali untuk melanjutkan.' }
    case 403: return { title: 'Akses ditolak', message: 'Akun ini tidak memiliki izin untuk membuka halaman ini.' }
    case 404: return { title: 'Halaman tidak ditemukan', message: 'Alamat atau resource yang kamu buka tidak tersedia.' }
    case 501: return { title: 'Layanan belum tersedia', message: 'Fitur ini belum tersedia di server. Silakan coba lagi nanti.' }
    default: return { title: 'Halaman gagal dimuat', message: 'Periksa koneksi dan coba lagi.' }
  }
}
