# DOKUMEN PEMBAGIAN DAN SPESIFIKASI SRS
## Sprint 2 — Data Dinamis dengan Firebase
**Project:** Labora  
**Platform:** React Native / Expo  
**Database:** Cloud Firestore  
**Authentication:** Firebase Authentication

---

# A. RAHMAT ARGYANDHA A
**NIM: 24060124130061**

## SRS 004 — Autentikasi Firebase dan Manajemen Peran

**User Story:**

Sebagai pengguna, saya dapat melakukan registrasi, login, dan logout menggunakan Firebase Authentication serta mengakses aplikasi sesuai dengan peran saya sebagai praktikan atau asisten.

**Deskripsi:**

Mengintegrasikan Firebase Authentication untuk mengelola akun pengguna. Setiap pengguna memiliki identitas unik dan informasi profil yang tersimpan di Firestore. Aplikasi harus dapat membedakan hak akses praktikan dan asisten.

**Ruang Lingkup:**
1. Mengintegrasikan Firebase Authentication dengan aplikasi Labora.
2. Membuat fitur registrasi menggunakan email dan password.
3. Membuat fitur login menggunakan email dan password.
4. Membuat fitur logout.
5. Menyimpan profil pengguna ke collection `users`.
6. Menggunakan Firebase UID sebagai identitas utama pengguna.
7. Mengelola peran pengguna, yaitu `praktikan` dan `asisten`.
8. Mendukung pengguna yang memiliki dua peran.
9. Menampilkan pilihan peran apabila pengguna mempunyai dua peran.
10. Mengarahkan pengguna ke halaman sesuai peran aktif.
11. Mempertahankan status login ketika aplikasi ditutup dan dibuka kembali.

**Ketentuan:**
- Setiap akun memiliki satu Firebase UID.
- Informasi role harus ditentukan atau diberikan oleh pihak yang berwenang, bukan bebas diubah oleh pengguna.
- Pengguna dengan dua peran dapat memilih peran setelah login.
- Jangan membuat sistem autentikasi baru di luar Firebase Authentication.

**Acceptance Criteria:**
- Pengguna berhasil melakukan registrasi.
- Pengguna berhasil login menggunakan akun terdaftar.
- Pengguna dapat logout.
- Pengguna yang belum login tidak dapat mengakses halaman utama.
- Pengguna hanya dapat mengakses fitur sesuai role.
- Pengguna dengan dua role dapat memilih peran.
- Status login tetap tersedia ketika aplikasi dibuka kembali.
- Kesalahan login dan registrasi memberikan pesan yang sesuai.

**Output:**
- Firebase Authentication berhasil terintegrasi.
- Data profil pengguna tersimpan di Firestore.
- Sistem pengelolaan role berfungsi.
- Alur login, registrasi, dan logout dapat didemonstrasikan.

**Dependensi:** Setup awal Firebase dari PM.

---

## SRS 005 — Pengelolaan Data Kelas dan Peserta

**User Story:**

Sebagai asisten, saya dapat menambah, melihat, mengubah, dan menghapus data kelas serta mengelola peserta praktikum melalui Cloud Firestore agar data kelas dan peserta dapat digunakan bersama oleh seluruh pengguna aplikasi.

**Deskripsi:**

Mengubah pengelolaan data kelas dan peserta yang sebelumnya menggunakan data lokal/dummy menjadi data dinamis yang tersimpan secara permanen di Firestore.

**Ruang Lingkup:**
1. Menambahkan data kelas praktikum.
2. Melihat daftar kelas praktikum.
3. Mengubah informasi kelas.
4. Menghapus kelas.
5. Menambahkan peserta ke dalam kelas.
6. Melihat daftar peserta setiap kelas.
7. Mengubah atau menghapus keanggotaan peserta.
8. Menghubungkan data peserta dengan akun Firebase UID.
9. Menampilkan kelas yang diikuti praktikan.
10. Menyimpan seluruh perubahan ke Firestore.

**Data kelas minimal:**
- ID kelas.
- Nama mata kuliah.
- Nama atau kode kelas, misalnya C1 atau C2.
- Daftar asisten yang bertanggung jawab.
- Informasi pembuat dan waktu pembuatan.

**Data peserta minimal:**
- UID pengguna.
- Nama peserta.
- Email atau identitas akun.
- ID kelas yang diikuti.

**Ketentuan:**
- Hanya asisten yang berwenang dapat mengelola data kelas.
- Praktikan hanya dapat melihat kelas yang menjadi keanggotaannya.
- Data peserta harus terhubung dengan UID Firebase Authentication.
- Penghapusan peserta dari kelas tidak boleh menghapus akun Firebase pengguna.

**Acceptance Criteria:**
- Asisten dapat melakukan CRUD data kelas.
- Asisten dapat menambahkan dan menghapus peserta dari kelas.
- Data kelas dan peserta tersimpan di Firestore.
- Praktikan dapat melihat kelas yang diikutinya.
- Data tidak hilang ketika aplikasi ditutup dan dibuka kembali.
- Input tidak valid ditangani dengan benar.

**Output:**
- CRUD kelas terintegrasi dengan Firestore.
- Pengelolaan peserta terintegrasi dengan Firestore.
- Data kelas dan keanggotaan peserta dapat digunakan oleh fitur jadwal dan sesi.

**Dependensi:** SRS 004 untuk identitas dan role pengguna.

---

## SRS 012 — Validasi dan Keamanan Data Firebase

**User Story:**

Sebagai pengguna, saya dapat menggunakan aplikasi dengan aman karena akses dan perubahan data dibatasi berdasarkan identitas serta peran saya melalui Firebase Security Rules.

**Deskripsi:**

Menerapkan aturan keamanan pada Firestore agar pengguna hanya dapat membaca dan mengubah data sesuai identitas serta kewenangannya.

**Ruang Lingkup:**
1. Membuat dan mengatur Firebase Security Rules.
2. Memastikan pengguna sudah login sebelum mengakses data yang dilindungi.
3. Membatasi akses data berdasarkan UID pengguna.
4. Membatasi akses berdasarkan role pengguna.
5. Melindungi informasi role agar tidak dapat diubah sembarangan.
6. Membatasi akses praktikan berdasarkan kelas dan sesi yang diikuti.
7. Membatasi akses asisten berdasarkan kelas atau sesi yang menjadi tanggung jawabnya.
8. Mencegah praktikan mengubah data presensi orang lain.
9. Mencegah pengguna mengubah keputusan izin yang dibuat asisten.
10. Memvalidasi field dan jenis data yang dikirim ke Firestore.

**Ketentuan:**
- Pengguna tidak boleh meningkatkan role miliknya sendiri.
- Praktikan tidak boleh membuka atau menutup sesi.
- Praktikan tidak boleh mengubah data pengguna lain.
- Asisten hanya dapat mengelola data yang menjadi kewenangannya.
- Aturan keamanan harus berlaku untuk seluruh collection yang digunakan aplikasi.

**Acceptance Criteria:**
- Pengguna yang belum login ditolak ketika mengakses data yang dilindungi.
- Praktikan tidak dapat mengubah role menjadi asisten.
- Praktikan tidak dapat mengubah presensi pengguna lain.
- Praktikan tidak dapat mengubah keputusan izin.
- Asisten tidak dapat mengakses atau mengubah data di luar kewenangannya.
- Operasi yang tidak sah ditolak oleh Firestore Security Rules.

**Output:**
- Firebase Security Rules tersedia dan aktif.
- Aturan akses untuk seluruh collection telah diterapkan.
- Pengujian akses berdasarkan role berhasil.

**Dependensi:** SRS 004, SRS 005, SRS 006, SRS 007, SRS 009, dan SRS 011. Aturan dasar dapat dibuat lebih awal, tetapi finalisasi dilakukan setelah struktur seluruh collection disepakati.

---

# B. FARHAN DWIYAN AKBAR
**NIM: 24060124140137**

## SRS 006 — Pengelolaan Jadwal dan Sesi Praktikum

**User Story:**

Sebagai asisten, saya dapat mengelola jadwal dan sesi praktikum, termasuk membuka dan menutup sesi, agar praktikan dapat melihat informasi jadwal serta status sesi terbaru.

**Deskripsi:**

Menghubungkan pengelolaan jadwal dan sesi praktikum dengan Firestore. Asisten dapat mengelola jadwal serta mengatur status sesi. Praktikan dapat melihat informasi sesi yang berkaitan dengan kelasnya.

**Ruang Lingkup:**
1. Menambahkan jadwal praktikum.
2. Melihat daftar jadwal praktikum.
3. Mengubah jadwal praktikum.
4. Menghapus jadwal.
5. Menampilkan detail sesi praktikum.
6. Menghubungkan jadwal dengan data kelas.
7. Membuka sesi praktikum.
8. Menutup sesi praktikum.
9. Menyimpan status dan waktu pembukaan serta penutupan sesi.
10. Menampilkan jadwal dan status sesi kepada praktikan.

**Informasi jadwal minimal:**
- ID jadwal.
- Mata kuliah.
- Praktikum ke-berapa.
- Nama praktikum.
- Kelas.
- Ruang.
- Tanggal.
- Jam mulai dan selesai.

**Informasi sesi minimal:**
- ID sesi.
- ID jadwal.
- ID kelas.
- Status sesi.
- Waktu sesi dibuka.
- Waktu sesi ditutup.
- UID asisten yang melakukan tindakan.

**Status sesi:**
- `scheduled`: sesi dijadwalkan, belum dibuka.
- `open`: sesi sedang dibuka.
- `closed`: sesi telah ditutup.

**Ketentuan:**
- Hanya asisten yang berwenang dapat mengelola jadwal dan status sesi.
- Praktikan hanya dapat melihat jadwal dan sesi yang berkaitan dengan kelasnya.
- Status sesi harus tersimpan di Firestore.
- Sesi yang sudah ditutup tidak dapat digunakan untuk presensi.

**Acceptance Criteria:**
- Asisten dapat melakukan CRUD jadwal.
- Asisten dapat membuka sesi.
- Asisten dapat menutup sesi.
- Perubahan status sesi tersimpan di Firestore.
- Praktikan dapat melihat detail jadwal dan sesi.
- Status sesi sesuai dengan data terbaru.

**Output:**
- CRUD jadwal terintegrasi dengan Firestore.
- Pengelolaan status sesi berjalan.
- Informasi sesi dapat digunakan oleh fitur presensi.

**Dependensi:** SRS 005 untuk data kelas.

---

## SRS 008 — Sinkronisasi Data Real-Time

**User Story:**

Sebagai praktikan dan asisten, saya dapat melihat perubahan data praktikum secara real-time sehingga informasi yang ditampilkan selalu mengikuti perubahan terbaru di Firestore tanpa perlu menjalankan ulang aplikasi.

**Deskripsi:**

Mengimplementasikan mekanisme sinkronisasi real-time menggunakan Firestore listener agar perubahan data yang dilakukan pengguna dapat terlihat pada perangkat pengguna lain secara otomatis.

**Ruang Lingkup:**
1. Mengimplementasikan Firestore `onSnapshot`.
2. Membuat mekanisme listener atau service real-time yang dapat digunakan aplikasi.
3. Memantau perubahan data kelas dan peserta.
4. Memantau perubahan jadwal dan status sesi.
5. Memantau perubahan data presensi.
6. Memantau perubahan rekap kehadiran.
7. Memantau perubahan pengajuan dan keputusan izin.
8. Memastikan perubahan Firestore langsung tercermin pada UI.
9. Menangani kondisi loading, data kosong, dan error listener.
10. Menghentikan listener ketika komponen tidak lagi digunakan untuk menghindari listener yang menumpuk.

**Ketentuan:**
- Tidak menggunakan mekanisme refresh manual sebagai satu-satunya cara memperbarui data.
- Listener harus mengikuti identitas dan kewenangan pengguna.
- Tidak boleh menampilkan data yang bukan hak akses pengguna.
- Data tetap tersimpan secara permanen di Firestore.
- Implementasi harus menggunakan struktur collection yang telah disepakati.

**Acceptance Criteria:**
- Perubahan status sesi oleh asisten terlihat pada perangkat praktikan.
- Presensi yang dilakukan praktikan terlihat pada rekap asisten.
- Perubahan data kelas dan jadwal terlihat tanpa membuka ulang aplikasi.
- Perubahan status izin dapat dilihat praktikan tanpa refresh manual.
- Listener menangani loading, data kosong, dan kesalahan koneksi.
- Listener dihentikan ketika tidak lagi dibutuhkan.
- Data tetap tersedia setelah aplikasi ditutup dan dibuka kembali.

**Output:**
- Service atau hook real-time yang dapat digunakan aplikasi.
- Implementasi listener untuk data yang diperlukan dalam dua alur demonstrasi.
- Pengujian sinkronisasi antarperangkat.

**Dependensi:** Membutuhkan struktur collection dan field yang telah disepakati serta data dari SRS 005, 006, 007, 009, dan 011. Kerjakan setelah implementasi dasar baca/tulis modul tersedia agar tidak terjadi konflik file.

---

## SRS 011 — Pemeriksaan dan Keputusan Pengajuan Izin

**User Story:**

Sebagai asisten, saya dapat melihat daftar pengajuan izin praktikan beserta alasan dan hasil klasifikasi AI, kemudian menerima atau menolak pengajuan tersebut agar praktikan dapat mengetahui keputusan izin.

**Deskripsi:**

Membuat fitur pemeriksaan izin bagi asisten yang mengambil data pengajuan dari Firestore dan menyediakan tindakan untuk memberikan keputusan.

**Ruang Lingkup:**
1. Menampilkan daftar pengajuan izin.
2. Menampilkan identitas praktikan.
3. Menampilkan kelas dan sesi yang diajukan.
4. Menampilkan alasan ketidakhadiran.
5. Menampilkan hasil klasifikasi AI jika tersedia.
6. Menampilkan status pengajuan.
7. Menyediakan tindakan menerima pengajuan.
8. Menyediakan tindakan menolak pengajuan.
9. Menyimpan keputusan ke Firestore.
10. Menyimpan UID asisten yang memutuskan dan waktu keputusan.
11. Memastikan praktikan dapat melihat status keputusan.

**Status pengajuan:**
- `pending`: menunggu pemeriksaan asisten.
- `approved`: diterima.
- `rejected`: ditolak.

**Ketentuan:**
- Hanya asisten yang berwenang dapat memberikan keputusan.
- AI hanya menjadi informasi pendukung.
- Keputusan sepenuhnya ditentukan oleh asisten.
- Pengajuan yang telah diputuskan tidak dapat diubah sembarangan.
- Jika API AI gagal, asisten tetap dapat meninjau alasan izin secara manual.

**Acceptance Criteria:**
- Asisten dapat melihat daftar pengajuan izin.
- Asisten dapat melihat alasan dan hasil klasifikasi AI.
- Asisten dapat menerima atau menolak pengajuan.
- Keputusan tersimpan di Firestore.
- Data keputusan menyimpan UID asisten dan waktu keputusan.
- Praktikan dapat melihat hasil keputusan.
- Pengajuan tidak otomatis diterima atau ditolak oleh AI.

**Output:**
- Halaman daftar dan detail pengajuan izin untuk asisten.
- Fitur menerima dan menolak pengajuan.
- Data keputusan tersimpan di Firestore.

**Dependensi:** SRS 009 dan SRS 010 dari Christianna.

---

# C. CHRISTIANNA OLIVIA JUNIARTI M
**NIM: 24060124140168**

## SRS 007 — Integrasi Presensi dengan Firestore

**User Story:**

Sebagai praktikan, saya dapat melakukan presensi ketika sesi praktikum dibuka, menyimpan data kehadiran beserta waktu presensi ke Firestore, dan melihat riwayat kehadiran saya.

**Deskripsi:**

Mengubah proses presensi yang sebelumnya menggunakan data lokal/dummy menjadi proses yang menyimpan data kehadiran secara permanen di Firestore.

**Ruang Lingkup:**
1. Mengambil data sesi praktikum dari Firestore.
2. Memeriksa apakah sesi sedang dibuka.
3. Menghubungkan presensi dengan Firebase UID praktikan.
4. Menghubungkan presensi dengan ID sesi.
5. Mencatat waktu kehadiran.
6. Menyimpan data presensi ke Firestore.
7. Mencegah presensi lebih dari satu kali pada sesi yang sama.
8. Menampilkan umpan balik setelah presensi berhasil atau gagal.
9. Menampilkan riwayat kehadiran praktikan.
10. Menampilkan data kehadiran yang dapat dibaca asisten untuk rekap.

**Ketentuan:**
- Presensi hanya dapat dilakukan pada sesi dengan status `open`.
- Identitas praktikan diambil dari Firebase Authentication.
- Satu praktikan hanya mempunyai satu catatan presensi pada sesi yang sama.
- Jangan hanya mengandalkan validasi UI untuk mencegah presensi ganda.
- Gunakan struktur dokumen unik berdasarkan UID praktikan pada subcollection attendance di sesi.
- Waktu presensi menggunakan timestamp dari Firestore.

**Acceptance Criteria:**
- Praktikan dapat melakukan presensi ketika sesi terbuka.
- Praktikan tidak dapat melakukan presensi ketika sesi belum dibuka atau telah ditutup.
- Praktikan tidak dapat melakukan presensi ganda.
- Data kehadiran tersimpan di Firestore.
- Waktu presensi tercatat.
- Asisten dapat membaca rekap kehadiran.
- Praktikan dapat membaca riwayat kehadirannya sendiri.
- Kesalahan presensi memberikan umpan balik yang sesuai.

**Output:**
- Presensi berhasil terintegrasi dengan Firestore.
- Pencegahan presensi ganda berfungsi.
- Riwayat dan rekap kehadiran menggunakan data Firestore.

**Dependensi:** SRS 004 untuk UID pengguna dan SRS 006 untuk data serta status sesi.

---

## SRS 009 — Pengajuan Izin Praktikan

**User Story:**

Sebagai praktikan, saya dapat mengajukan izin ketidakhadiran untuk sesi praktikum tertentu dengan mengisi alasan izin agar pengajuan dapat diperiksa oleh asisten.

**Deskripsi:**

Membuat fitur pengajuan izin yang menyimpan data ke Firestore sehingga pengajuan dapat dilihat praktikan dan diperiksa oleh asisten.

**Ruang Lingkup:**
1. Membuat form pengajuan izin.
2. Menampilkan daftar sesi praktikum yang dapat dipilih.
3. Memilih sesi yang ingin diajukan izinnya.
4. Mengisi alasan ketidakhadiran.
5. Melakukan validasi input.
6. Mengirimkan pengajuan ke Firestore.
7. Menyimpan UID praktikan.
8. Menyimpan ID sesi dan ID kelas.
9. Menampilkan riwayat pengajuan izin.
10. Menampilkan status pengajuan.
11. Menangani kegagalan penyimpanan data.

**Informasi pengajuan minimal:**
- ID pengajuan.
- UID praktikan.
- ID kelas.
- ID sesi.
- Alasan izin.
- Waktu pengajuan.
- Status pengajuan.
- Status proses AI.

**Ketentuan:**
- Alasan izin tidak boleh kosong.
- Pengajuan harus terkait dengan satu sesi tertentu.
- Identitas pengaju berasal dari Firebase Authentication.
- Pengajuan awal memiliki status `pending`.
- Pengajuan harus tetap tersimpan meskipun proses AI mengalami kegagalan.
- Praktikan tidak dapat mengubah keputusan yang diberikan asisten.

**Acceptance Criteria:**
- Praktikan dapat memilih sesi praktikum.
- Praktikan dapat mengisi alasan izin.
- Input kosong ditolak.
- Pengajuan tersimpan di Firestore.
- Praktikan dapat melihat riwayat pengajuan.
- Praktikan dapat melihat status pengajuan.
- Kegagalan komunikasi dengan Firestore ditangani.

**Output:**
- Form pengajuan izin.
- Penyimpanan pengajuan di Firestore.
- Halaman riwayat dan status pengajuan.

**Dependensi:** SRS 004 untuk identitas pengguna dan SRS 006 untuk data sesi.

---

## SRS 010 — Integrasi AI untuk Klasifikasi Alasan Izin

**User Story:**

Sebagai pengguna, saya dapat memperoleh hasil klasifikasi kategori alasan izin menggunakan model AI yang disediakan pengajar agar hasil tersebut dapat menjadi informasi pendukung bagi asisten dalam memeriksa pengajuan izin.

**Deskripsi:**

Mengintegrasikan API model AI dari pengajar untuk mengklasifikasikan alasan ketidakhadiran praktikan.

**Ruang Lingkup:**
1. Mempelajari dokumentasi API AI yang diberikan pengajar.
2. Membuat service untuk mengirim alasan izin ke API.
3. Mengirimkan alasan izin sebagai input model AI.
4. Menerima hasil klasifikasi dari API.
5. Menampilkan kategori hasil klasifikasi.
6. Menyimpan hasil klasifikasi bersama pengajuan izin di Firestore.
7. Menangani respons API yang tidak valid.
8. Menangani kegagalan koneksi atau API tidak merespons.
9. Menampilkan status proses AI kepada pengguna.
10. Memastikan hasil klasifikasi tidak menentukan keputusan izin.

**Informasi AI yang disimpan:**
- Status proses AI, misalnya `pending`, `success`, atau `failed`.
- Kategori hasil klasifikasi jika berhasil.
- Confidence atau penjelasan jika memang disediakan API.
- Waktu hasil klasifikasi diperoleh.

**Ketentuan:**
- Gunakan endpoint dan format request/response yang diberikan pengajar.
- Jangan membuat kategori klasifikasi sendiri jika kategori sudah ditentukan API.
- Jangan menanam secret API key langsung ke aplikasi mobile.
- Jika dibutuhkan secret key, gunakan perantara backend yang aman sesuai fasilitas yang disediakan pengajar.
- Kegagalan AI tidak boleh menghapus atau membatalkan pengajuan izin.
- AI tidak memiliki kewenangan menerima atau menolak izin.

**Acceptance Criteria:**
- Alasan izin dapat dikirimkan ke API AI.
- API memberikan hasil klasifikasi yang dapat dibaca aplikasi.
- Hasil klasifikasi ditampilkan.
- Hasil klasifikasi disimpan bersama pengajuan.
- Kegagalan API tidak menyebabkan pengajuan hilang.
- Pengajuan tetap dapat diperiksa asisten meskipun AI gagal.
- AI tidak memberikan keputusan penerimaan atau penolakan izin.

**Output:**
- Service integrasi API AI.
- Tampilan hasil klasifikasi.
- Penyimpanan hasil klasifikasi di Firestore.
- Penanganan kondisi API gagal.

**Dependensi:** SRS 009 dan dokumentasi API AI dari pengajar.

---

# D. Ketentuan teknis untuk seluruh programmer

Ketentuan berikut harus diikuti agar pekerjaan dapat digabungkan tanpa konflik.

1. Semua anggota menggunakan satu Firebase Project yang sama.
2. Firebase Authentication menjadi sumber identitas pengguna.
3. Cloud Firestore menjadi penyimpanan utama aplikasi.
4. Jangan membuat project Firebase baru untuk masing-masing programmer.
5. Pertahankan UI dan fitur Sprint 1 yang sudah ada selama tidak perlu diubah.
6. Jangan membuat ulang halaman yang sudah berfungsi.
7. Gunakan Firebase UID sebagai identitas pengguna.
8. Gunakan satu struktur collection dan field yang telah disepakati.
9. Pisahkan kode koneksi Firebase, service, dan UI sesuai arsitektur project.
10. Jangan mengubah file milik programmer lain tanpa koordinasi.
11. Gunakan branch Git masing-masing.
12. Setiap programmer harus menguji fitur sebelum membuat pull request.

# E. Struktur data Firestore yang menjadi acuan

Semua anggota harus menggunakan struktur database yang sama.

**1. users/**
- UID pengguna.
- Nama.
- Email.
- Roles.
- Role aktif.
- Waktu pembuatan akun.

**2. classes/**
- ID kelas.
- Nama mata kuliah.
- Kode kelas.
- Daftar atau relasi asisten.
- Waktu pembuatan.

Subcollection: `members/{uid}` untuk keanggotaan peserta.

**3. schedules/**
- ID jadwal.
- ID kelas.
- Mata kuliah.
- Praktikum ke-berapa.
- Nama praktikum.
- Tanggal.
- Waktu mulai.
- Waktu selesai.
- Ruang.

**4. sessions/**
- ID sesi.
- ID jadwal.
- ID kelas.
- Status sesi.
- Waktu dibuka.
- Waktu ditutup.
- UID asisten yang membuka atau menutup.

Subcollection: `attendance/{uid}` untuk catatan presensi setiap praktikan.

**5. permissionRequests/**
- ID pengajuan.
- UID praktikan.
- ID kelas.
- ID sesi.
- Alasan izin.
- Status pengajuan.
- Kategori AI.
- Status AI.
- UID asisten yang memutuskan.
- Waktu pengajuan.
- Waktu keputusan.

Nama collection dan field harus disepakati sebelum implementasi dimulai. Perubahan struktur harus diinformasikan kepada PM dan anggota yang menggunakan data tersebut.

# F. Ketentuan laporan setiap programmer

Setelah menyelesaikan pekerjaan, setiap programmer wajib melaporkan:

1. SRS yang telah diselesaikan.
2. File yang dibuat atau diubah.
3. Collection Firestore yang digunakan.
4. Fitur yang berhasil diuji.
5. Hasil pengujian yang sebenarnya.
6. Error atau kendala yang masih ditemukan.
7. Cara menjalankan dan menguji fitur.
8. Nama branch dan commit yang digunakan.