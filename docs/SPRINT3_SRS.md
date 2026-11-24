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

SRS-017 – Push Notification Kegiatan Praktikum [SELESAI]
- Mengintegrasikan Firebase Cloud Messaging via `@react-native-firebase/messaging` & FCM v1 API (`https://fcm.googleapis.com/v1/projects/labora-fda34/messages:send`).
- Mengirim notifikasi otomatis saat sesi praktikum dibuka oleh asisten ke seluruh mahasiswa kelas terkait.
- Mengirim notifikasi otomatis saat jadwal praktikum mengalami perubahan ke seluruh mahasiswa kelas terkait.
- Mengirim notifikasi otomatis saat permohonan izin praktikan diterima atau ditolak oleh asisten.
- Penentuan penerima notifikasi otomatis berbasis relasi data kelas (`memberIds`) dan dokumen izin di Firestore.
- Implementasi:
  - Service: `src/services/notificationService.ts` & `src/services/fcmSenderService.ts`
  - Context & Provider: `src/context/NotificationContext.tsx`
  - In-App Toast & Drawer: `src/components/InAppNotificationToast.tsx` & `src/components/NotificationModal.tsx`
  - Bell Badge: `src/app/praktikan/index.tsx` & `src/app/asisten/index.tsx`

SRS-018 – Pengelolaan Izin Perangkat dan Penanganan Kesalahan [SELESAI]
- Meminta izin akses lokasi perangkat dengan dialog informatif dan tautan langsung ke Pengaturan Aplikasi (`Linking.openSettings()`).
- Meminta izin notifikasi sistem perangkat (`hasPermission`, `requestPermission`) serta pemantauan otomatis saat status berubah di AppState.
- Menangani GPS/layanan lokasi yang tidak aktif dengan deteksi `Location.hasServicesEnabledAsync()` dan dialog aktifkan GPS instan (`Location.enableNetworkProviderAsync()`).
- Menangani kegagalan perolehan koordinat (sinyal GPS lemah, timeout, mode hemat daya ekstrem) dengan kode `LOKASI_GAGAL` dan tombol coba lagi.
- Menangani kegagalan koneksi jaringan atau layanan notifikasi (Google Play Services / offline) melalui fallback riwayat database Firestore dan banner notifikasi ramah pengguna.
- Terintegrasi di:
  - Layanan Lokasi: `src/services/locationService.ts` (`getLocationErrorDetail`, `openLocationSettings`, `promptEnableLocationServices`)
  - Presensi Praktikan: `src/components/PraktikanPresensiView.tsx`
  - Peta Interaktif: `src/app/praktikan/peta/index.tsx` & `src/app/asisten/peta/index.tsx`
  - Form Laboratorium: `src/components/LaboratoryFormModal.tsx`
  - Pengelolaan Notifikasi: `src/context/NotificationContext.tsx` & `src/components/NotificationModal.tsx`
