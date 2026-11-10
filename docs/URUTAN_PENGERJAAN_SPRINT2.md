## Urutan Pengerjaan dan Dependensi Sprint 2

Bagian ini menjelaskan urutan pelaksanaan pekerjaan agar setiap programmer memahami prasyarat, tanggung jawab, dan hasil yang harus diserahkan kepada programmer berikutnya. Setiap SRS memiliki satu penanggung jawab utama. Pengerjaan UI atau persiapan kode dapat dilakukan lebih awal, tetapi integrasi data dilakukan setelah dependensi yang dibutuhkan tersedia.

### 1. Persiapan oleh Project Manager

Sebelum pengembangan fitur dimulai, Project Manager menyiapkan fondasi proyek dengan:

- Membuat satu Firebase Project untuk aplikasi Labora.
- Mendaftarkan aplikasi React Native/Expo ke Firebase.
- Mengaktifkan Firebase Authentication dan Cloud Firestore.
- Menyepakati struktur collection, dokumen, field, tipe data, dan relasi antardata.
- Membagikan konfigurasi Firebase client yang diperlukan kepada seluruh programmer melalui repository.
- Memastikan dokumentasi API AI dari pengajar tersedia untuk programmer yang mengerjakan integrasi AI.

**Hasil yang diserahkan:** satu Firebase Project yang digunakan bersama, konfigurasi aplikasi, serta kontrak struktur data Firestore yang disepakati.

### 2. Rahmat Argyandha A — SRS 004 dan SRS 005

**SRS 004 — Autentikasi Firebase dan Manajemen Peran**

Rahmat mengimplementasikan registrasi, login, logout, penyimpanan profil pengguna, serta pengelolaan peran praktikan dan asisten menggunakan Firebase Authentication dan Firestore.

**SRS 005 — Pengelolaan Data Kelas dan Peserta**

Setelah identitas dan peran pengguna tersedia, Rahmat mengimplementasikan operasi tambah, lihat, ubah, dan hapus data kelas serta pengelolaan keanggotaan peserta kelas di Firestore.

**Hasil yang diserahkan kepada Farhan:** identitas pengguna, informasi role, data kelas, daftar peserta, dan ID kelas yang dapat digunakan untuk pengelolaan jadwal serta sesi.

### 3. Farhan Dwiyan Akbar — SRS 006

**SRS 006 — Pengelolaan Jadwal dan Sesi Praktikum**

Dengan menggunakan data kelas yang telah tersedia, Farhan mengimplementasikan pengelolaan jadwal praktikum dan sesi. Fitur mencakup CRUD jadwal, detail sesi, serta tindakan membuka dan menutup sesi. Status sesi dan waktu perubahan status disimpan di Firestore.

**Hasil yang diserahkan kepada Christianna:** ID jadwal, ID sesi, ID kelas, detail sesi, dan status sesi yang menjadi acuan untuk proses presensi serta pengajuan izin.

### 4. Christianna Olivia Juniarti M — SRS 007, SRS 009, dan SRS 010

**SRS 007 — Integrasi Presensi dengan Firestore**

Christianna menghubungkan proses presensi dengan UID praktikan dan ID sesi. Presensi hanya dapat dilakukan saat sesi berstatus terbuka, waktu kehadiran dicatat, dan presensi ganda dicegah.

**SRS 009 — Pengajuan Izin Praktikan**

Christianna mengimplementasikan form pengajuan izin. Pengajuan harus terhubung dengan UID praktikan dan ID sesi, disimpan di Firestore, serta memiliki status awal menunggu pemeriksaan.

**SRS 010 — Integrasi AI untuk Klasifikasi Alasan Izin**

Setelah pengajuan izin dapat disimpan, Christianna mengintegrasikan API AI yang disediakan pengajar untuk mengklasifikasikan alasan izin. Hasil klasifikasi disimpan bersama pengajuan sebagai informasi pendukung. AI tidak menentukan keputusan diterima atau ditolaknya izin.

**Hasil yang diserahkan kepada Farhan:** struktur dokumen pengajuan izin, alasan izin, status pengajuan, hasil klasifikasi AI jika tersedia, dan ID dokumen pengajuan yang akan digunakan pada halaman pemeriksaan asisten.

### 5. Farhan Dwiyan Akbar — SRS 011 dan SRS 008

**SRS 011 — Pemeriksaan dan Keputusan Pengajuan Izin**

Setelah struktur pengajuan dan hasil klasifikasi tersedia, Farhan mengimplementasikan halaman pemeriksaan izin untuk asisten. Asisten dapat melihat informasi pengajuan, alasan, hasil klasifikasi AI, kemudian menerima atau menolak pengajuan. Keputusan dan identitas asisten yang memutuskan disimpan di Firestore.

**SRS 008 — Sinkronisasi Data Real-Time**

Farhan mengimplementasikan sinkronisasi real-time menggunakan Firestore listener (`onSnapshot`) untuk kebutuhan aplikasi. Implementasi mencakup perubahan jadwal dan status sesi, data presensi dan rekap kehadiran, serta pengajuan dan keputusan izin. Listener harus dikelola agar berhenti ketika tidak lagi digunakan, serta menangani kondisi loading, data kosong, dan error.

**Hasil yang diserahkan:** pemeriksaan dan keputusan izin tersimpan di Firestore, serta perubahan data yang relevan dapat ditampilkan kepada pengguna tanpa perlu memuat ulang aplikasi secara manual.

### 6. Rahmat Argyandha A — Finalisasi SRS 012

**SRS 012 — Validasi dan Keamanan Data Firebase**

Setelah struktur data seluruh modul ditetapkan, Rahmat menyelesaikan Firebase Security Rules untuk seluruh collection. Aturan harus memeriksa status autentikasi, UID, peran, serta kewenangan pengguna terhadap data yang diakses atau diubah.

Pembuatan aturan dasar dapat dimulai lebih awal, tetapi finalisasi dilakukan setelah struktur data dan kebutuhan akses semua modul diketahui. Setiap programmer wajib memberikan informasi mengenai operasi baca dan tulis yang diperlukan oleh modulnya kepada Rahmat.

**Hasil yang diserahkan:** Firebase Security Rules untuk seluruh collection dan hasil pengujian bahwa akses yang tidak sah ditolak.

### 7. Pengujian Integrasi oleh Seluruh Anggota

Setelah seluruh SRS selesai diimplementasikan, seluruh anggota melakukan pengujian integrasi terhadap dua alur utama:

**Alur 1 — Presensi Praktikum**

1. Asisten login dan membuka sesi praktikum.
2. Praktikan login dan melihat sesi yang terbuka.
3. Praktikan melakukan presensi.
4. Data presensi tersimpan di Firestore.
5. Asisten melihat rekap kehadiran yang diperbarui secara real-time.
6. Asisten menutup sesi dan perubahan status terlihat oleh praktikan.

**Alur 2 — Pengajuan Izin**

1. Praktikan login dan memilih sesi praktikum.
2. Praktikan mengisi serta mengirim alasan izin.
3. Pengajuan tersimpan di Firestore.
4. Alasan izin dikirim ke API AI untuk klasifikasi.
5. Asisten melihat pengajuan beserta hasil klasifikasi jika tersedia.
6. Asisten menerima atau menolak pengajuan.
7. Keputusan tersimpan di Firestore dan statusnya dapat dilihat praktikan.

Pengujian juga harus mencakup presensi ganda, sesi tertutup, pengguna dengan role berbeda, kegagalan API AI, gangguan koneksi, data kosong, dan akses yang ditolak oleh Security Rules.

### Ringkasan Urutan Pengerjaan

| Tahap | Penanggung jawab | SRS / pekerjaan | Hasil utama |
|---|---|---|---|
| 0 | Project Manager | Persiapan Firebase dan kontrak data | Firebase Project dan struktur Firestore disepakati |
| 1 | Rahmat | SRS 004 dan SRS 005 | Authentication, role, kelas, dan peserta tersedia |
| 2 | Farhan | SRS 006 | Jadwal dan sesi tersedia |
| 3 | Christianna | SRS 007, SRS 009, dan SRS 010 | Presensi, pengajuan izin, dan hasil klasifikasi AI tersedia |
| 4 | Farhan | SRS 011 dan SRS 008 | Pemeriksaan izin dan sinkronisasi real-time tersedia |
| 5 | Rahmat | Finalisasi SRS 012 | Security Rules diterapkan untuk seluruh collection |
| 6 | Seluruh anggota | Pengujian integrasi | Kedua alur demonstrasi berhasil diuji |

### Ketentuan Koordinasi dan Penyerahan Pekerjaan

- Setiap SRS memiliki satu programmer sebagai penanggung jawab utama.
- Programmer menyerahkan hasil sesuai keluaran yang tercantum pada setiap tahap.
- Semua anggota menggunakan Firebase Project dan struktur Firestore yang sama.
- Perubahan pada nama collection, field, atau format data harus dikoordinasikan sebelum diterapkan.
- Setiap programmer menggunakan branch Git masing-masing dan mengajukan Pull Request sebelum perubahan digabungkan ke `main`.
- Programmer yang menerima hasil pekerjaan anggota lain wajib memeriksa kesesuaian ID, nama field, dan tipe data sebelum melakukan integrasi.
- Persiapan UI dan kode dasar dapat dilakukan secara paralel. Integrasi yang membutuhkan data dari modul lain dilakukan setelah hasil dependensinya tersedia.
- Project Manager memantau penyerahan hasil, melakukan review integrasi, dan memastikan pengujian akhir selesai.
