# DOKUMEN PEMBAGIAN DAN SPESIFIKASI SRS
## Sprint 4 — Manajemen Laboratorium, Keterlambatan, Denda, dan Payment Gateway
**Project:** Labora  
**Platform:** React Native / Expo  
**Database:** Cloud Firestore  
**Authentication:** Firebase Authentication  
**Payment Gateway:** Midtrans Sandbox

---

## Referensi Wajib untuk Programmer

Sebelum mulai mengerjakan SRS, setiap programmer wajib membaca referensi berikut (terutama untuk fitur pembayaran):

1. **Panduan Payment Gateway Praktikum PPK (Pertemuan 4 — Midtrans Sandbox, alur aplikasi–backend–webhook, dan aturan keamanan secret key):**  
   https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%204/Payment%20Gateway.md
2. **Dokumentasi Resmi Midtrans Snap:**  
   https://docs.midtrans.com/docs/snap-docs
3. **Midtrans Simulator Pembayaran Sandbox (untuk simulasi bayar saat testing):**  
   https://simulator.sandbox.midtrans.com/

---

## Ringkasan Status Revisi Sebelum Sprint 4

| No | Poin Revisi | Status | Penanggung Jawab |
| :--- | :--- | :--- | :--- |
| 1 | Tombol lihat/sembunyikan password di halaman Login dan Register | Selesai | Farhan (PM) |
| 2 | Peta laboratorium blank / watermark API Key | Selesai | Farhan (PM) |
| 3 | Placeholder kode presensi pakai `"XXXXXXX"` samar (bukan contoh kode asli) | Selesai | Farhan (PM) |
| 4 | Pilihan laboratorium di form sesi memakai dropdown saja | Selesai | Farhan (PM) |
| 5 | Pop-up diubah menjadi bottom sheet (tidak melayang di tengah) | Selesai | Farhan (PM) |
| 6 | Sesi hanya boleh dibuka sesuai jam jadwal | **Belum — Masuk SRS 019** | **Arga (Programmer 1)** |
| 7 | Jadwal dengan tanggal dan jam sama tidak boleh berada di lab yang sama | **Belum — Masuk SRS 019** | **Arga (Programmer 1)** |

---

# A. FARHAN DWIYAN AKBAR (Project Manager)
**NIM: 24060124140137**

Project Manager tidak mengambil modul fitur baru dari dokumen Sprint 4, melainkan bertanggung jawab atas kesiapan Firebase manual, tampilan UI/UX, peta lokasi, dan penggabungan kode tim:

1. **Setup Manual Firebase Console:**
   - Menambahkan role `"aslab"` secara manual pada dokumen `users/{uid}` di Firebase Console (karena role Aslab tidak bisa didaftarkan sendiri lewat halaman Register).
   - Menambahkan field awal `gracePeriodMinutes: 15` dan `fineAmount: 10000` pada data kelas uji di collection `classes` (opsional, agar programmer bisa langsung mengetes fitur denda).
   - Mempublikasikan (*Publish*) pembaruan `firestore.rules` ke Firebase Console setelah dikerjakan oleh Programmer 1.
   - Me-review dan menggabungkan (*merge*) Pull Request dari setiap programmer.
2. **Perbaikan UI/UX Modern, Peta Interaktif, dan 5 Revisi UI (Sudah Selesai):**
   - Redesain tampilan Praktikan & Asisten, penyeragaman judul *Title Case*, komponen bottom sheet, dropdown laboratorium, tombol aksi cepat, perbaikan peta bebas API Key + rute jalan kaki, serta perbaikan AI sentimen alasan izin dan sinkronisasi angka kehadiran/total praktikan.

---

# B. RAHMAT ARGYANDHA A (Programmer 1 — Tahap 1)
**NIM: 24060124130061**

Arga mengerjakan **2 revisi yang belum selesai terlebih dahulu**, lalu membuka fondasi role `aslab` vs `asprak`, pengelolaan sesi oleh Asprak, perhitungan keterlambatan (*grace period*), pembuatan tagihan denda, dan pembaruan keamanan Firestore.

## SRS 019 — Penyelesaian Revisi Jadwal/Sesi, Pemisahan Role Aslab & Asprak, dan Pengelolaan Sesi oleh Asprak

**User Story:**

Sebagai asisten praktikum (Asprak), saya dapat mengelola jadwal yang tidak bentrok, membuka sesi sesuai jam praktikum, memantau presensi secara real-time, dan menutup sesi pada kelas yang menjadi tanggung jawab saya, sementara pengguna dengan role Aslab dapat masuk ke halaman khusus Aslab.

**Deskripsi:**

Menyelesaikan dua revisi logika jadwal dan pembukaan sesi dari sprint sebelumnya, menambahkan dukungan role baru `aslab` pada sistem login dan pilih peran, serta memastikan Asprak (`asisten`) fokus mengelola jalannya sesi praktikum di kelas tanggung jawabnya tanpa akses ke pengaturan seluruh laboratorium.

**Ruang Lingkup:**
1. *(Revisi wajib dikerjakan pertama)* Menolak pembuatan atau pengeditan jadwal di `schedules` jika ada jadwal lain pada laboratorium, tanggal, dan jam yang sama atau beririsan.
2. *(Revisi wajib dikerjakan pertama)* Membatasi pembukaan sesi (`status: "open"`) agar Asprak hanya bisa membuka sesi pada tanggal dan rentang jam jadwal yang berlaku.
3. Menambahkan role `"aslab"` pada sistem autentikasi, tipe `Role`, halaman pilih peran, dan arah navigasi ke halaman `/aslab`.
4. Membuat kerangka layout rute `/aslab/_layout.tsx` agar bisa dilanjutkan oleh Programmer 2.
5. Menampilkan daftar kelas, jadwal, dan sesi yang menjadi tanggung jawab Asprak.
6. Menyalin nilai `gracePeriodMinutes` dan `fineAmount` dari collection `classes` (kelas terkait) ke dokumen `sessions` ketika Asprak membuka sesi.
7. Memantau daftar presensi praktikan secara real-time saat sesi berjalan (termasuk penanda tepat waktu, terlambat, atau izin).
8. Menutup sesi praktikum (`status: "closed"`) saat kegiatan selesai dan langsung tersinkronisasi ke perangkat praktikan.
9. Membatasi kewenangan Asprak agar tidak bisa mengelola distribusi/perpindahan praktikan antar-kelas praktikum maupun mengubah pengaturan seluruh ruangan laboratorium (kewenangan tersebut dipindahkan ke role `aslab`).

**Ketentuan:**
- Dua jadwal dianggap bentrok jika berada di laboratorium dan tanggal yang sama serta jamnya saling beririsan (`jamMulaiBaru < jamSelesaiLama` dan `jamSelesaiBaru > jamMulaiLama`).
- Sesi hanya boleh dibuka saat waktu sekarang berada pada tanggal dan rentang `jamMulai` sampai `jamSelesai` jadwal tersebut.
- Role `"aslab"` tidak boleh bisa didaftarkan dari halaman Register, hanya bisa diberikan manual lewat Firebase Console oleh PM.
- Role `"asisten"` yang sudah ada sebelumnya tetap dipakai untuk Asprak agar data lama tidak rusak.
- Perubahan status sesi (`scheduled`, `open`, `closed`) harus langsung terlihat di perangkat praktikan tanpa refresh manual.

**Acceptance Criteria:**
- Pembuatan atau pengeditan jadwal di lab, tanggal, dan jam yang bentrok ditolak dengan pesan error yang jelas.
- Asprak tidak dapat membuka sesi di luar tanggal atau jam jadwal yang ditentukan.
- Akun yang diberi role `"aslab"` oleh PM bisa masuk ke halaman `/aslab` dan bisa berpindah peran jika punya lebih dari satu role.
- Asprak dapat melihat kelas/jadwalnya, membuka sesi, memantau presensi secara real-time, dan menutup sesi.
- Asprak tidak memiliki akses ke fitur pengaturan seluruh ruangan laboratorium maupun pemindahan praktikan antar-kelas praktikum.

**Output:**
- Validasi anti-bentrok jadwal dan validasi jam buka sesi berjalan.
- Dukungan role `aslab` di login, pilih peran, dan kerangka route `/aslab`.
- Fitur pengelolaan sesi oleh Asprak berjalan real-time dan sesuai batas kewenangan.

**Dependensi:** Setup akun role `"aslab"` di Firestore oleh PM.

---

## SRS 020 — Perhitungan Keterlambatan (Grace Period), Tagihan Denda, Izin Bebas Denda, dan Keamanan Firestore

**User Story:**

Sebagai sistem dan praktikan, saya ingin presensi yang melewati batas toleransi waktu otomatis tercatat terlambat dan menerbitkan satu tagihan denda tetap, sementara izin yang disetujui Asprak tercatat sebagai tidak hadir dengan izin dan bebas denda, serta seluruh data diamankan oleh Firestore Security Rules.

**Deskripsi:**

Menerapkan aturan perhitungan keterlambatan menggunakan *grace period* saat praktikan melakukan presensi, menerbitkan tagihan denda ke collection `fines`, mencatat izin yang disetujui sebagai *excused absence* tanpa mengubahnya menjadi hadir, serta memperbarui `firestore.rules` untuk role `aslab` dan koleksi baru Sprint 4.

**Ruang Lingkup:**
1. Menghitung selisih waktu antara waktu presensi praktikan (`waktuHadir`) dengan waktu mulai sesi (`jamMulai`).
2. Membandingkan selisih tersebut dengan batas toleransi (*grace period*) dalam menit yang diambil dari sesi/kelas.
3. Mencatat presensi di dalam batas toleransi sebagai hadir tepat waktu (`attendanceStatus: "hadir"`, `latenessStatus: "on_time"`, tanpa denda).
4. Mencatat presensi yang melewati batas toleransi sebagai hadir terlambat (`attendanceStatus: "hadir"`, `latenessStatus: "late"`, beserta jumlah menit terlambat `lateMinutes`).
5. Membuat dokumen tagihan denda secara otomatis ke collection `fines` dengan nominal tetap (`fineAmount`) ketika praktikan terlambat melewati *grace period*.
6. Menggunakan ID dokumen `fines/{sessionId}_{studentId}` agar satu keterlambatan hanya bisa menghasilkan satu tagihan denda (tidak ganda).
7. Menghubungkan setiap tagihan denda dengan data praktikan, sesi praktikum, laboratorium, dan catatan presensi.
8. Memastikan ketika pengajuan izin di `permissionRequests` disetujui (`approved`) oleh Asprak, sistem mencatatnya ke `sessions/{sessionId}/attendance/{studentId}` sebagai `attendanceStatus: "izin"` dan `latenessStatus: "excused"`, bebas denda, dan tidak berubah menjadi `"hadir"`.
9. Memperbarui `firestore.rules` untuk menambahkan fungsi `isAslab()`, mengatur izin baca/tulis pada `laboratories`, `fines`, `paymentTransactions`, dan `attendance`, serta tetap melarang pengguna mengubah role-nya sendiri.

**Status tagihan denda (`fines`):**
- `unpaid`: tagihan baru terbit, belum dibayar.
- `pending`: transaksi pembayaran sudah dibuat, sedang menunggu pembayaran selesai.
- `paid`: tagihan sudah lunas terverifikasi.
- `failed`: transaksi pembayaran gagal/kedaluwarsa dan bisa dicoba bayar ulang.

**Ketentuan:**
- Nominal denda bersifat tetap per kejadian keterlambatan (mengikuti pengaturan `fineAmount` kelas/sesi).
- Satu kejadian keterlambatan pada satu sesi hanya boleh membuat tepat 1 tagihan denda.
- Pembayaran denda hanya mengubah status tagihan (`fines.status` menjadi `"paid"`), **tidak boleh** mengubah status kehadiran atau menghapus status keterlambatan (`latenessStatus: "late"`).
- Izin yang disetujui Asprak dianggap tidak hadir dengan izin (*excused absence*), bebas denda, dan tidak mengubah kehadiran menjadi hadir.
- Firestore Security Rules wajib melindungi `users/{uid}` agar tidak ada pengguna yang bisa menambahkan role `"aslab"` sendiri dari aplikasi.

**Acceptance Criteria:**
- Praktikan yang presensi di dalam batas *grace period* tercatat tepat waktu dan tidak mendapat tagihan denda.
- Praktikan yang presensi melewati batas *grace period* tercatat terlambat dan otomatis mendapatkan tepat 1 dokumen tagihan di `fines/{sessionId}_{studentId}` dengan status `unpaid`.
- Praktikan yang izinnya disetujui Asprak tercatat sebagai izin (`excused`), bebas denda, dan tidak berubah menjadi hadir.
- Pelunasan denda tidak mengubah status `hadir` maupun `late` pada data presensi.
- File `firestore.rules` mendukung akses role `aslab`, `asisten`, dan `praktikan` serta koleksi `fines` dan `paymentTransactions` dengan aman.

**Output:**
- Service perhitungan *grace period* dan pembuatan tagihan denda (`src/services/fineService.ts`).
- Integrasi status keterlambatan pada presensi dan izin `approved` sebagai *excused absence*.
- Pembaruan file `firestore.rules` yang siap dipublikasikan oleh PM.

**Dependensi:** SRS 019 dan field `gracePeriodMinutes` serta `fineAmount` di collection `classes`.

---

# C. QUINTA AURABIANSYAH (Programmer 2 — Tahap 2)

Quinta bertanggung jawab atas seluruh fitur untuk **role baru Aslab (Asisten Laboratorium)**, yaitu manajemen kelas praktikum (`classes`) & lokasi laboratorium (`laboratories`), 3 fitur *Bulk/Single Insert* terpisah, perpindahan praktikan & asprak antar-kelas praktikum (misalnya dari `Dasar Sistem C1` ke `Dasar Sistem C2`), serta Dashboard Keberlangsungan Laboratorium.

> **Catatan Penting Istilah "Laboratorium" di Aplikasi Labora:**  
> Di dalam aplikasi Labora, istilah "laboratorium" pada panduan Sprint 4 terbagi menjadi dua data yang saling terhubung:
> 1. **Kelas / Rombel Praktikum (`classes/{classId}`)**: unit praktikum per mata kuliah, misalnya **Dasar Sistem C1**, **Dasar Sistem C2**, **PPK A1** (menampung daftar praktikan, asprak, serta pengaturan batas keterlambatan `gracePeriodMinutes` dan nominal denda `fineAmount`).
> 2. **Ruangan / Lokasi Laboratorium (`laboratories/{labId}`)**: ruangan fisik beserta alamat, koordinat GPS, dan radius presensi, misalnya **Laboratorium Komputer B**.

## SRS 021 — Manajemen Kelas Praktikum & Lokasi Laboratorium oleh Aslab, Single/Bulk Insert, dan Perpindahan Anggota Antar-Kelas

**User Story:**

Sebagai Aslab, saya dapat mengelola ruangan laboratorium beserta radius lokasi presensi, membuat dan mengelola kelas praktikum berdasarkan mata kuliah (misal Dasar Sistem C1, C2) lengkap dengan batas keterlambatan dan nominal denda per kelas, memasukkan praktikan dan asprak secara satuan maupun massal (bulk) lewat template yang bisa diedit di layar, serta memindahkan praktikan atau asprak/aslab dari satu kelas praktikum ke kelas lainnya (misal dari C1 ke C2).

**Deskripsi:**

Membuat modul manajemen khusus role Aslab yang menggabungkan pengelolaan ruangan fisik di collection `laboratories` (lokasi, koordinat, radius) dengan pengelolaan kelas praktikum di collection `classes` (pembuatan kelas per mata kuliah, pengaturan *grace period* & nominal denda per kelas, 3 fitur Single/Bulk Insert terpisah dengan editor `ScrollView`, serta pemindahan praktikan dan asprak/aslab antar-kelas praktikum seperti `C1` → `C2`).

**Ruang Lingkup:**
1. Mengelola data **ruangan/lokasi laboratorium** (CRUD) di collection `laboratories`, termasuk nama ruang, alamat, koordinat (`latitude`, `longitude`), dan cakupan lokasi presensi (`radius` dalam meter).
2. Mengelola data **kelas praktikum** (CRUD) di collection `classes` (misalnya `Dasar Sistem C1`, `Dasar Sistem C2`), menghubungkannya ke ruangan laboratorium terkait (`labId` / `ruang`), serta mengatur batas waktu keterlambatan (`gracePeriodMinutes`) dan nominal denda tetap (`fineAmount`) untuk masing-masing kelas.
3. Menyediakan fitur **Single Insert** (input satu per satu) dan **Bulk Insert** (unggah file) yang **dipisahkan menjadi 3 menu/tab berbeda**:
   - **Insert 1 — Membuat Kelas/Lab Praktikum sekaligus berdasarkan satu Mata Kuliah:** membuat banyak kelas praktikum sekaligus pada collection `classes` (misalnya satu mata kuliah *Dasar Sistem* langsung dibuatkan kelas `C1`, `C2`, `C3` beserta ruangan labnya).
   - **Insert 2 — Memasukkan Praktikan ke Kelas/Lab Praktikum tertentu:** menambahkan daftar praktikan (berdasarkan NIM di `users`) ke kelas praktikum tujuan di `classes/{classId}` (`memberIds` dan subcollection `members/{uid}`).
   - **Insert 3 — Memasukkan Asprak ke Kelas/Lab Praktikum tertentu:** menambahkan daftar asprak (berdasarkan NIM di `users`) ke kelas praktikum tujuan di `classes/{classId}` (`assistants`).
4. Menyediakan tombol untuk **mengunduh file template insert** (format CSV/JSON) untuk masing-masing dari 3 jenis bulk insert di atas agar Aslab mudah mengisi data.
5. Menampilkan seluruh baris data hasil upload di dalam komponen `ScrollView` sebelum disimpan ke Firestore.
6. Menyediakan aksi pada setiap baris di dalam `ScrollView` agar Aslab bisa:
   - **Accept / Deny**: menyetujui baris yang akan disimpan atau menolak/melewati baris yang tidak diinginkan.
   - **Update**: mengubah isi data pada baris tertentu.
   - **Mengisi data kosong**: melengkapi kolom yang masih kosong langsung di layar pratinjau sebelum disimpan.
7. Menyediakan fitur **perpindahan (transfer) praktikan antar-kelas praktikum** (misalnya memindahkan praktikan dari **Dasar Sistem C1** ke **Dasar Sistem C2** dengan memindahkan data dari `memberIds` & `members/{uid}` kelas asal ke kelas tujuan).
8. Menyediakan fitur **perpindahan (transfer) asprak/aslab antar-kelas praktikum** (misalnya memindahkan asprak dari **Dasar Sistem C1** ke **Dasar Sistem C2** pada array `assistants` di `classes` dan `schedules` terkait).

**Ketentuan:**
- Fitur ini hanya boleh diakses oleh pengguna dengan role `aslab`.
- Ketiga fitur bulk insert (Kelas per Mata Kuliah, Praktikan ke Kelas, Asprak ke Kelas) wajib dibuat terpisah, bukan digabung jadi satu file bulk.
- Sebelum data hasil bulk upload benar-benar disimpan ke Firestore, Aslab wajib bisa memeriksa, memilih accept/deny, mengedit, dan mengisi data yang kosong di dalam `ScrollView`.
- Fitur perpindahan **hanya berlaku untuk memindahkan praktikan dan asprak/aslab antar-kelas praktikum** (seperti `C1` → `C2`), **tidak perlu ada perpindahan jadwal praktikum (`schedules`)**. Setelah dipindahkan, praktikan otomatis mengikuti jadwal kelas barunya.
- Data kelas praktikum tetap menggunakan collection `classes` dan data ruangan fisik tetap menggunakan collection `laboratories`.

**Acceptance Criteria:**
- Aslab dapat membuat, mengubah, dan menghapus ruangan laboratorium di `laboratories` beserta koordinat dan radius presensi, serta mengatur *grace period* dan nominal denda pada tiap kelas di `classes`.
- Tersedia 3 fitur Single/Bulk Insert yang terpisah (Kelas per Mata Kuliah, Praktikan ke Kelas, Asprak ke Kelas) dan masing-masing memiliki tombol unduh file template.
- Data hasil unggahan tampil di dalam `ScrollView` dan setiap barisnya bisa di-accept/deny, di-update, serta dilengkapi kolomnya yang kosong sebelum disimpan ke Firestore.
- Aslab dapat memindahkan praktikan maupun asprak/aslab dari satu kelas ke kelas lain (misal `Dasar Sistem C1` → `Dasar Sistem C2`) tanpa memindahkan jadwal, dan perubahan langsung terlihat di aplikasi praktikan/asprak.

**Output:**
- Halaman manajemen ruangan lab & kelas praktikum, halaman 3 Single/Bulk Insert + unduh template + pratinjau `ScrollView`, dan halaman perpindahan praktikan/asprak antar-kelas di folder `src/app/aslab/laboratorium/`.
- Service `src/services/bulkInsertService.ts` dan pembaruan `src/services/laboratoryService.ts` serta `src/services/classService.ts`.

**Dependensi:** SRS 019 (routing `/aslab` & role `aslab`) dan SRS 020 (`firestore.rules` untuk `aslab`) dari Arga.

---

## SRS 022 — Dashboard Keberlangsungan Laboratorium Aslab

**User Story:**

Sebagai Aslab, saya dapat memantau seluruh kelas praktikum dan ruangan laboratorium, jumlah praktikan, status kegiatan praktikum, jadwal berlangsung dan akan datang, riwayat kegiatan, serta riwayat keuangan denda praktikum dalam satu dashboard yang bisa difilter berdasarkan hari, minggu, dan bulan.

**Deskripsi:**

Membangun halaman utama Dashboard Aslab (`/aslab`) yang menampilkan ringkasan operasional seluruh kelas/laboratorium praktikum dan keuangan denda secara real-time dari Firestore, lengkap dengan filter rentang waktu harian, mingguan, dan bulanan.

**Ruang Lingkup:**
1. Menampilkan ringkasan total jumlah kelas/laboratorium praktikum dan jumlah praktikan (keseluruhan serta rincian per kelas/lab).
2. Menampilkan status kegiatan praktikum pada setiap kelas/laboratorium (sedang berlangsung, terjadwal, atau sedang tidak ada kegiatan).
3. Menampilkan lokasi ruangan laboratorium dan waktu pelaksanaan praktikum.
4. Menampilkan daftar jadwal kegiatan yang sedang berlangsung dan jadwal kegiatan yang akan datang dari `schedules` & `sessions`.
5. Menampilkan riwayat kegiatan praktikum/laboratorium (sesi praktikum yang sudah selesai beserta ringkasan kehadirannya).
6. Menampilkan riwayat keuangan hasil denda praktikum dari collection `fines` dan `paymentTransactions` (total denda sudah dibayar, belum dibayar, dan daftar transaksi/pembayaran denda).
7. Menyediakan filter rentang waktu berdasarkan **Hari**, **Minggu**, dan **Bulan**.
8. Menghubungkan filter **Hari**, **Minggu**, dan **Bulan** langsung ke data Firestore sehingga daftar jadwal, riwayat kegiatan, dan riwayat keuangan denda otomatis berubah sesuai rentang waktu yang dipilih.
9. Menyediakan halaman profil Aslab (`src/app/aslab/profil.tsx`) agar Aslab dapat berpindah peran atau logout.

**Ketentuan:**
- Dashboard hanya bisa diakses oleh pengguna dengan role `aslab`.
- Seluruh data pada dashboard (jumlah lab/kelas, jumlah praktikan, jadwal, riwayat kegiatan, dan keuangan denda) wajib diambil dari Firestore, bukan data dummy.
- Filter **Hari**, **Minggu**, dan **Bulan** harus memengaruhi data kegiatan dan riwayat keuangan denda secara konsisten.

**Acceptance Criteria:**
- Dashboard Aslab menampilkan jumlah lab/kelas, jumlah praktikan, status kegiatan tiap kelas/lab, lokasi dan waktu pelaksanaan, jadwal berlangsung, jadwal akan datang, riwayat kegiatan, serta riwayat keuangan denda.
- Ketika Aslab mengganti filter antara **Hari**, **Minggu**, dan **Bulan**, data yang tampil berubah sesuai data aktual di Firestore.
- Aslab bisa logout atau berpindah peran melalui halaman profil.

**Output:**
- Halaman Dashboard Aslab (`src/app/aslab/index.tsx`) dan halaman profil Aslab (`src/app/aslab/profil.tsx`).
- Filter periode Hari, Minggu, dan Bulan yang berfungsi dengan data Firebase.

**Dependensi:** SRS 019 (routing `/aslab`), SRS 020 (collection `fines` & `firestore.rules`), dan SRS 021 (data `classes` & `laboratories`).

---

# D. CHRISTIANNA OLIVIA JUNIARTI M (Programmer 3 — Tahap 3)
**NIM: 24060124140168**

Anna bertanggung jawab penuh atas fitur pembayaran denda menggunakan **Payment Gateway Midtrans Sandbox** (sisi backend dan aplikasi mobile), integrasi **notifikasi tagihan & pembayaran denda**, serta halaman **riwayat pembayaran praktikan**.

## SRS 023 — Integrasi Payment Gateway (Midtrans Sandbox) untuk Pembayaran Denda

**User Story:**

Sebagai praktikan, saya dapat melihat daftar tagihan denda keterlambatan beserta nominalnya, membayarnya melalui halaman pembayaran Midtrans Sandbox, dan melihat status pembayaran terbaru secara otomatis setelah diverifikasi oleh backend.

**Deskripsi:**

Mengintegrasikan layanan **Midtrans Sandbox** untuk pembayaran denda keterlambatan menggunakan arsitektur tiga pihak (**Aplikasi Mobile ↔ Backend Server ↔ Midtrans Webhook**) sesuai panduan praktikum Pertemuan 4 agar kunci rahasia (*Server Key*) tetap aman di sisi server.

**Ruang Lingkup:**
1. Membuat layanan backend ringan (misalnya Node.js/Express di folder `backend/payment-server/` atau serverless function) yang menyimpan `MIDTRANS_SERVER_KEY` secara aman di server.
2. Membuat endpoint backend untuk membuat transaksi ke Midtrans Snap Sandbox (`POST /api/payments/create-transaction`), menghasilkan `orderId`, `snapToken`, dan `redirectUrl`, lalu menyimpannya ke collection `paymentTransactions`.
3. Membuat endpoint webhook backend (`POST /api/payments/webhook`) untuk menerima notifikasi status dari Midtrans, memverifikasi keaslian `signature_key`, lalu memperbarui status di `paymentTransactions` dan `fines`.
4. Membuat halaman daftar tagihan denda pada aplikasi praktikan (`/praktikan/denda`) yang menampilkan daftar tagihan dari collection `fines` beserta rincian sesi, keterlambatan, dan nominal pembayaran.
5. Menambahkan tombol **"Bayar Denda"** yang memanggil backend untuk membuat transaksi lalu membuka halaman pembayaran Midtrans Snap (`redirectUrl`) menggunakan `WebView` atau browser.
6. Menangani respons setelah praktikan selesai/menutup halaman pembayaran Midtrans.
7. Menampilkan status transaksi secara jelas di aplikasi: **`pending`**, **`success`**, atau **`failed`**.
8. Memperbarui status tagihan (`fines`) menjadi `paid` berdasarkan verifikasi backend/webhook tanpa mengubah status kehadiran (`hadir` / `late`) di data presensi.

**Pemetaan status Midtrans ke status aplikasi:**
- `capture` atau `settlement` → `transactionStatus: "success"` dan `fines.status: "paid"`.
- `pending` → `transactionStatus: "pending"` dan `fines.status: "pending"`.
- `deny`, `cancel`, `expire`, atau `failure` → `transactionStatus: "failed"` dan `fines.status: "failed"` (praktikan boleh mencoba bayar ulang).

**Ketentuan:**
- **Dilarang keras** menaruh `MIDTRANS_SERVER_KEY` atau secret key Midtrans di dalam kode aplikasi React Native ataupun file `.env` yang memakai awalan `EXPO_PUBLIC_`.
- Status lunas (`paid` / `success`) wajib diverifikasi dari backend atau webhook Midtrans, bukan hanya mengandalkan penutupan halaman di sisi aplikasi HP.
- Mengikuti alur panduan di referensi praktikum Pertemuan 4 (`Payment Gateway.md`).
- Pembayaran denda tidak boleh mengubah status kehadiran praktikan di `sessions/{sessionId}/attendance/{studentId}`.

**Acceptance Criteria:**
- Tidak ada secret key Midtrans di kode aplikasi mobile.
- Praktikan dapat melihat daftar tagihan denda dan rincian nominalnya.
- Praktikan dapat menekan bayar, diarahkan ke halaman pembayaran Midtrans Sandbox, dan menyelesaikan pembayaran menggunakan Midtrans Simulator.
- Webhook/verifikasi backend berhasil memperbarui status di `paymentTransactions` (`pending`, `success`, `failed`) dan `fines` (`paid` saat berhasil) secara real-time di aplikasi.

**Output:**
- Backend server Midtrans Sandbox (`backend/payment-server/`) dengan endpoint buat transaksi dan webhook.
- Service `src/services/paymentService.ts` dan halaman daftar tagihan/pembayaran denda praktikan (`src/app/praktikan/denda/`).

**Dependensi:** SRS 020 (collection `fines` & `firestore.rules`) dari Arga dan referensi Payment Gateway Pertemuan 4.

---

## SRS 024 — Notifikasi Tagihan & Pembayaran Denda serta Riwayat Pembayaran

**User Story:**

Sebagai praktikan, saya dapat menerima notifikasi ketika tagihan denda baru dibuat, ketika pembayaran berhasil, atau ketika pembayaran gagal/belum selesai, serta dapat melihat seluruh riwayat pembayaran denda saya kapan saja.

**Deskripsi:**

Menghubungkan proses pembuatan tagihan denda dan pembayaran Midtrans dengan sistem notifikasi yang sudah dibangun di Sprint 3 (`notifications`), serta menyediakan halaman riwayat pembayaran yang tersimpan permanen di Firestore.

**Ruang Lingkup:**
1. Menambahkan 3 tipe notifikasi baru pada sistem notifikasi Sprint 3 (`src/services/notificationService.ts` dan collection `notifications`):
   - `fine_created`: saat tagihan denda baru dibuat karena terlambat melewati *grace period*.
   - `payment_success`: saat pembayaran denda berhasil diverifikasi.
   - `payment_failed`: saat pembayaran gagal, kedaluwarsa, atau masih butuh penyelesaian lebih lanjut.
2. Memastikan notifikasi tersebut tampil di daftar notifikasi aplikasi (`NotificationModal`) dan toast in-app.
3. Membuat halaman atau tab **Riwayat Pembayaran** pada menu Denda praktikan yang membaca data transaksi dari Firestore (`paymentTransactions` dan `fines`).
4. Menampilkan informasi lengkap pada setiap item riwayat pembayaran.

**Informasi riwayat pembayaran minimal:**
- Informasi sesi praktikum (mata kuliah, pertemuan, nama praktikum, dan laboratorium).
- Tanggal tagihan dibuat.
- Nominal denda (format Rupiah).
- Waktu transaksi pembayaran.
- Status pembayaran (`pending`, `success`, atau `failed`).

**Ketentuan:**
- Gunakan kembali sistem notifikasi yang sudah berjalan di Sprint 3 (collection `notifications`), jangan membuat sistem notifikasi terpisah dari nol.
- Riwayat pembayaran harus tersimpan permanen di Firestore sehingga tetap ada meskipun aplikasi ditutup dan dibuka kembali.

**Acceptance Criteria:**
- Praktikan menerima notifikasi saat tagihan denda baru terbit.
- Praktikan menerima notifikasi saat pembayaran denda berhasil.
- Praktikan menerima notifikasi saat pembayaran gagal atau masih membutuhkan penyelesaian lebih lanjut.
- Halaman Riwayat Pembayaran menampilkan informasi sesi, tanggal tagihan, nominal, waktu transaksi, dan status pembayaran secara lengkap dan persisten.

**Output:**
- Integrasi 3 notifikasi denda/pembayaran ke sistem notifikasi Sprint 3.
- Halaman Riwayat Pembayaran Praktikan yang terhubung dengan Firestore.

**Dependensi:** SRS 020 (`fines`) dari Arga dan SRS 023 (`paymentTransactions`).

---

# E. Ketentuan teknis untuk seluruh programmer

Ketentuan berikut wajib diikuti agar penggabungan kode berjalan lancar tanpa konflik:

1. Semua anggota tetap menggunakan **satu Firebase Project yang sama**.
2. Jangan mengganti nama collection yang sudah ada di Firebase (`users`, `laboratories`, `classes`, `schedules`, `sessions`, `permissionRequests`, `notifications`).
3. Pertahankan tampilan UI baru dan fitur Sprint 1–3 yang sudah berjalan baik.
4. Untuk membaca data lama di Firestore yang belum memiliki field baru Sprint 4, selalu berikan nilai default (contoh: `data.gracePeriodMinutes ?? 15`) agar aplikasi tidak error.
5. Dilarang menyimpan secret key Midtrans atau kunci rahasia lainnya di aplikasi mobile React Native.
6. Pastikan `npx tsc --noEmit` dan `npx expo lint` lulus tanpa error sebelum membuat Pull Request.

---

# F. Struktur data Firestore yang menjadi acuan (Perubahan Sprint 4)

Semua anggota wajib memakai nama collection dan field yang sama agar cocok dengan struktur database saat ini (`docs/struktur-firebase.md`).

### Bagian 1 — Collection yang Sudah Ada (Dipertahankan & Ditambah Field Baru)

**1. `users/{uid}`**
- **Field lama (tetap dipertahankan):** `uid`, `nama`, `nim`, `email`, `roles`, `activeRole`, `fcmToken`, `fcmTokenUpdatedAt`, `createdAt`.
- **Perubahan nilai:** `roles` dan `activeRole` kini bisa berisi **`"aslab"`** (ditambahkan manual di Firebase Console oleh PM).
- **Alasan:** Memisahkan hak akses Aslab dari Asprak (`"asisten"`) tanpa mengubah data akun lama.

**2. `laboratories/{labId}`** *(Ruangan / Lokasi Fisik Laboratorium)*
- **Field lama (tetap dipertahankan — tidak perlu penambahan field baru):** `nama`, `deskripsi`, `alamat`, `latitude`, `longitude`, `radius`, `aktif`, `createdAt`, `updatedAt`, `updatedBy`.
- **Alasan:** Tetap berfokus murni pada data ruangan fisik, titik koordinat GPS, dan cakupan radius presensi yang dikelola oleh Aslab.

**3. `classes/{classId}`** *(Kelas / Rombel Praktikum seperti `Dasar Sistem C1`, `Dasar Sistem C2` — beserta subcollection `members/{uid}`)*
- **Field lama (tetap dipertahankan):** `mataKuliah`, `kodeKelas`, `assistants`, `createdBy`, `memberIds`, `createdAt` (dan subcollection `members/{uid}`: `uid`, `nama`, `nim`, `email`, `joinedAt`).
- **Field baru yang ditambahkan:**
  - `labId` (`string | null`) dan `ruang` (`string | null`): referensi ruangan laboratorium default di `laboratories/{labId}`.
  - `gracePeriodMinutes` (`number`, default `15`): batas toleransi keterlambatan dalam menit per kelas praktikum.
  - `fineAmount` (`number`, default `10000`): nominal denda tetap dalam Rupiah per kelas praktikum.
- **Alasan:** Menjadi tempat utama hasil **3 fitur Single/Bulk Insert** (membuat banyak kelas per mata kuliah seperti `C1`, `C2`, memasukkan praktikan ke `memberIds`/`members`, dan memasukkan asprak ke `assistants`), tempat **perpindahan praktikan & asprak antar-kelas** (misal dari `Dasar Sistem C1` ke `Dasar Sistem C2`), serta tempat menyimpan kebijakan *grace period* dan nominal denda yang bisa berbeda di tiap kelas/mata kuliah.

**4. `schedules/{scheduleId}`**
- **Field lama (tetap dipertahankan):** `classId`, `mataKuliah`, `kodeKelas`, `nomorPraktikum`, `namaPraktikum`, `tanggal`, `jamMulai`, `jamSelesai`, `ruang`, `assistants`, `createdBy`, `createdAt`, `updatedAt`.
- **Field baru yang ditambahkan:** `labId` (`string | null`).
- **Alasan:** Memudahkan pengecekan jadwal bentrok di lab yang sama dan filter jadwal per lab di Dashboard Aslab.

**5. `sessions/{sessionId}` & Subcollection `sessions/{sessionId}/attendance/{studentId}`**
- **Field lama `sessions` (tetap dipertahankan):** `scheduleId`, `classId`, `kodeKelas`, `kodePresensi`, `status` (`scheduled` / `open` / `closed`), `openedAt`, `closedAt`, `openedBy`, `closedBy`, `updatedBy`, `updatedAt`.
- **Field baru `sessions`:** `gracePeriodMinutes` (`number`) dan `fineAmount` (`number`).
- **Alasan:** Mengunci aturan toleransi keterlambatan dan besaran denda dari `classes/{classId}` saat sesi dibuka agar tidak berubah bila pengaturan kelas diedit di kemudian hari.
- **Field lama subcollection `attendance/{studentId}` (tetap dipertahankan):** `studentId`, `nama`, `nim`, `sessionId`, `waktuHadir`, `latitude`, `longitude`, `jarakMeter`, `radiusMeter`.
- **Field baru subcollection `attendance/{studentId}`:**
  - `attendanceStatus`: `"hadir" | "izin"`
  - `latenessStatus`: `"on_time" | "late" | "excused"`
  - `lateMinutes`: `number` (`0` jika tepat waktu atau izin)
  - `fineId`: `string | null` (merujuk ke `fines/{sessionId}_{studentId}` jika terlambat)
- **Alasan:** Membedakan praktikan hadir tepat waktu, hadir terlambat, dan izin disetujui (*excused absence*) bebas denda.

**6. `permissionRequests/{permissionId}`**
- **Field lama (tetap dipertahankan):** `uid`, `nama`, `nim`, `classId`, `sessionId`, `mataKuliah`, `namaPraktikum`, `nomorPraktikum`, `alasan`, `status`, `aiStatus`, `aiCategory`, `aiConfidence`, `aiProcessedAt`, `decidedBy`, `decidedAt`, `createdAt`.
- **Field baru yang ditambahkan:** `excusedRecorded` (`boolean`).
- **Alasan:** Penanda bahwa izin yang disetujui Asprak sudah otomatis dicatat sebagai tidak hadir dengan izin (*excused absence*) bebas denda.

**7. `notifications/{notificationId}`**
- **Field lama (tetap dipertahankan):** `recipientUid`, `recipientRole`, `title`, `body`, `type`, `data`, `isRead`, `createdAt`.
- **Perubahan nilai:** `recipientRole` ditambah `"aslab"`, dan `type` ditambah `"fine_created"`, `"payment_success"`, `"payment_failed"`.
- **Alasan:** Mengirim notifikasi denda dan pembayaran menggunakan sistem notifikasi Sprint 3.

---

### Bagian 2 — Collection Baru untuk Sprint 4 (Otomatis Terbuat Saat Kode Dijalankan)

**8. `fines/{sessionId}_{studentId}`** *(Tagihan Denda Keterlambatan)*
- **Alasan dibuat:** Menyimpan tagihan denda keterlambatan secara terpisah dari status presensi, menjamin 1 keterlambatan hanya menghasilkan 1 tagihan (lewat Document ID `{sessionId}_{studentId}`), serta menjadi sumber data keuangan denda di Dashboard Aslab.
- **Fields:** `fineId`, `studentId`, `nama`, `nim`, `sessionId`, `classId`, `kodeKelas`, `mataKuliah`, `nomorPraktikum`, `namaPraktikum`, `ruang`, `labId`, `waktuHadir`, `lateMinutes`, `gracePeriodMinutes`, `nominal`, `status` (`unpaid` / `pending` / `paid` / `failed`), `latestOrderId`, `paidAt`, `createdAt`, `updatedAt`.

**9. `paymentTransactions/{orderId}`** *(Transaksi & Riwayat Pembayaran Midtrans)*
- **Alasan dibuat:** Mencatat setiap percobaan dan hasil transaksi pembayaran di Midtrans Sandbox (jika gagal bisa bayar ulang dengan `orderId` baru) serta menjadi sumber data halaman Riwayat Pembayaran Praktikan.
- **Fields:** `orderId`, `fineId`, `studentId`, `nama`, `nim`, `sessionId`, `classId`, `mataKuliah`, `nomorPraktikum`, `namaPraktikum`, `ruang`, `nominal`, `snapToken`, `redirectUrl`, `paymentType`, `transactionStatus` (`pending` / `success` / `failed`), `rawGatewayStatus`, `webhookVerified`, `paidAt`, `createdAt`, `updatedAt`.

---

# G. Urutan pengerjaan dan dependensi Sprint 4

Agar pekerjaan tidak saling bertabrakan dan revisi lama tuntas terlebih dahulu, ikuti urutan pengerjaan berikut:

| Urutan | Tahap | Penanggung Jawab | Pekerjaan Utama |
| :---: | :--- | :--- | :--- |
| **0** | **Pra-Tahap** | **Farhan (PM)** | Tambah role `"aslab"` di akun uji Firestore & (opsional) tambah field awal `gracePeriodMinutes` / `fineAmount` di `classes` *(UI & Peta sudah selesai)*. |
| **1** | **Tahap 1A** | **Arga (Programmer 1)** | **Kerjakan revisi dulu:** Anti-bentrok jadwal lab/tanggal/jam & sesi hanya dibuka sesuai jam jadwal (**SRS 019**). |
| **2** | **Tahap 1B** | **Arga (Programmer 1)** | Role `aslab` vs `asprak`, pengelolaan sesi Asprak, perhitungan *grace period*, tagihan denda (`fines`), izin bebas denda, dan `firestore.rules` (**SRS 019 & SRS 020**) -> **Merge ke `main` paling pertama**. |
| **3** | **Tahap 2** *(Paralel)* | **Quinta (Programmer 2)** | Tarik `main` terbaru -> Manajemen Ruangan Lab (`laboratories`) & Kelas Praktikum (`classes`), 3 Single/Bulk Insert + template + editor `ScrollView`, transfer praktikan/asprak antar-kelas (misal `C1` → `C2`), & Dashboard Aslab filter Hari/Minggu/Bulan (**SRS 021 & SRS 022**). |
| **3** | **Tahap 3** *(Paralel)* | **Anna (Programmer 3)** | Tarik `main` terbaru *(akun & backend Midtrans Sandbox boleh mulai disiapkan lebih awal)* -> Integrasi Midtrans Sandbox + Webhook, 3 notifikasi denda/pembayaran, & Riwayat Pembayaran (**SRS 023 & SRS 024**). |
| **4** | **Tahap 4** | **PM + Seluruh Tim** | Merge PR Quinta & Anna ke `main`, lalu uji coba alur lengkap dari awal sampai akhir (*End-to-End Testing*). |

### Skenario Uji Integrasi Akhir (Tahap 4)
Sprint 4 dinyatakan selesai apabila alur lengkap berikut berjalan lancar tanpa error:
1. **Aslab (Quinta)** login -> unduh template, unggah data kelas per mata kuliah (misal `Dasar Sistem C1`, `C2`) serta praktikan/asprak ke kelas tujuan, edit/accept data di `ScrollView`, uji pindah praktikan/asprak dari `C1` ke `C2`, lalu atur radius ruangan lab dan *grace period* / nominal denda kelas (misal 10 menit, denda Rp 10.000).
2. **Asprak (Arga)** mencoba membuat jadwal bentrok di lab & jam sama -> ditolak. Membuat jadwal valid lalu membuka sesi tepat pada jam praktikum.
3. **Praktikan A** presensi tepat waktu (dalam *grace period*) -> tercatat hadir tepat waktu, tidak kena denda.
4. **Praktikan B** mengajukan izin dan disetujui Asprak -> tercatat tidak hadir dengan izin (*excused*), bebas denda, tidak berubah menjadi hadir.
5. **Praktikan C** presensi terlambat (lewat *grace period*) -> tercatat hadir terlambat, otomatis muncul 1 tagihan denda di `fines`, dan notifikasi tagihan baru (**Anna**) langsung tampil.
6. **Praktikan C (Anna)** membayar denda lewat Midtrans Sandbox Simulator -> webhook backend memverifikasi -> status jadi `success` / `paid`, notifikasi pembayaran berhasil muncul, tercatat di **Riwayat Pembayaran** (status kehadiran tetap terlambat), dan uang denda langsung masuk ke laporan **Riwayat Keuangan Dashboard Aslab (Quinta)** sesuai filter Hari/Minggu/Bulan.

---

# H. Ketentuan laporan setiap programmer

Setelah menyelesaikan pekerjaan, setiap programmer wajib melaporkan:

1. SRS yang telah diselesaikan.
2. File yang dibuat atau diubah.
3. Collection Firestore yang digunakan.
4. Fitur yang berhasil diuji.
5. Hasil pengujian yang sebenarnya.
6. Error atau kendala yang masih ditemukan.
7. Cara menjalankan dan menguji fitur.
8. Nama branch dan commit yang digunakan.
