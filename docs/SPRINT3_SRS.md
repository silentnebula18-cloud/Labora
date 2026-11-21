# Parhan
## 2 SRS

SRS-013 – Halaman Presensi Praktikan
- Membuat halaman presensi terpisah dari detail sesi.
- Menampilkan informasi dan status sesi.
- Menyediakan tombol untuk melakukan presensi.
- OPSIONAL: fitur qr code
SRS-014 – Validasi Lokasi dan Pencatatan Presensi
- Mengambil koordinat perangkat praktikan.
- Menghitung jarak ke laboratorium.
- Memvalidasi radius dan status sesi.
- Mencegah presensi ganda pada sesi yang sama.
- Menyimpan hasil presensi ke Firestore.


# Quin
## 2 SRS

SRS-015 – Pengelolaan Lokasi Laboratorium
- Menambahkan dan mengelola data laboratorium.
- Menyimpan koordinat latitude dan longitude.
- Mengatur radius validasi presensi.
- Mengintegrasikan data lokasi dengan Firestore.
SRS-016 – Peta Interaktif dan Informasi Aktivitas Laboratorium
- Mengintegrasikan Maps.
- Menampilkan marker laboratorium dan lokasi pengguna.
- Memperbarui posisi pengguna secara berkala.
- Menampilkan detail laboratorium.
- Menampilkan praktikum yang berlangsung dan berikutnya berdasarkan jadwal dan sesi.


# ana 
## 2 SRS

SRS-017 – Push Notification Kegiatan Praktikum
- Mengintegrasikan Firebase Cloud Messaging.
- Mengirim notifikasi ketika sesi dibuka.
- Mengirim notifikasi ketika jadwal berubah.
- Mengirim notifikasi ketika izin diterima atau ditolak.
- Menentukan penerima notifikasi berdasarkan pengguna terkait.
SRS-018 – Pengelolaan Izin Perangkat dan Penanganan Kesalahan
- Meminta izin akses lokasi.
- Meminta izin notifikasi.
- Menangani GPS yang tidak aktif.
- Menangani lokasi yang tidak berhasil diperoleh.
- Menampilkan pesan ketika koneksi atau layanan notifikasi bermasalah.