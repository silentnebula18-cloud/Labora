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

SRS-015 – Pengelolaan Lokasi Laboratorium [SELESAI]
- Menambahkan dan mengelola data laboratorium (CRUD oleh Asisten).
- Menyimpan koordinat latitude dan longitude (manual dan bantuan GPS perangkat).
- Mengatur radius validasi presensi (satuan meter: 5 - 10.000m).
- Mengintegrasikan data lokasi dengan Firestore (`laboratories/{labId}`) secara realtime.
- Implementasi:
  - Service: `src/services/laboratoryService.ts`
  - Form Modal: `src/components/LaboratoryFormModal.tsx`
  - Screen Asisten: `src/app/asisten/laboratorium/index.tsx`
  - Security Rules: `firestore.rules` (create/update/delete dibatasi khusus role asisten & skema divalidasi)

SRS-016 – Peta Interaktif dan Informasi Aktivitas Laboratorium [SELESAI]
- Mengintegrasikan Maps menggunakan `react-native-maps` dengan fallback elegan untuk web.
- Menampilkan marker seluruh laboratorium aktif dan marker posisi pengguna.
- Memvisualisasikan radius validasi presensi tiap laboratorium (`Circle`).
- Memperbarui posisi pengguna secara berkala (`watchPositionAsync`) dan menangani izin lokasi/GPS.
- Menampilkan detail laboratorium (alamat, deskripsi, radius, jarak real-time dari posisi pengguna).
- Menampilkan praktikum yang berlangsung (ongoing) dan berikutnya (upcoming) berdasarkan jadwal dan sesi aktual.
- Aksesibel oleh Asisten (`/asisten/peta`) dan Praktikan (`/praktikan/peta` - read-only).
- Implementasi:
  - Komponen Peta: `src/components/InteractiveLabMap.tsx`
  - Detail Bottom Sheet: `src/components/LabDetailCard.tsx`
  - Screen Asisten: `src/app/asisten/peta/index.tsx`
  - Screen Praktikan: `src/app/praktikan/peta/index.tsx`
  - Helper Aktivitas: `src/utils/laboratoryActivity.ts`
  - Normalisasi Nama: `src/utils/laboratory.ts`


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