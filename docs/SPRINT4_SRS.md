# Spesifikasi Kebutuhan Perangkat Lunak (SRS) Sprint 4 — Labora

## Referensi Teknis Wajib untuk Programmer

Seluruh programmer **wajib** mempelajari referensi berikut sebelum mengimplementasikan SRS masing-masing:

1. **Referensi Utama Payment Gateway (Modul Praktikum PPK Pertemuan 4 — Midtrans Sandbox, Alur Client–Server–Webhook, dan Keamanan Secret Key):**
   - [Payment Gateway.md — ppk-rn-expo-58 (Pertemuan 4)](https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%204/Payment%20Gateway.md)
   - Dokumentasi Resmi Midtrans Snap: [https://docs.midtrans.com/docs/snap-docs](https://docs.midtrans.com/docs/snap-docs)
   - Midtrans Simulator Pembayaran Sandbox: [https://simulator.sandbox.midtrans.com/](https://simulator.sandbox.midtrans.com/)

---

## Evaluasi Status Revisi (`revisi`)

Berdasarkan audit kode terhadap seluruh poin pada revisi berikut adalah status penyelesaiannya:

| No | Poin Revisi | Status Saat Ini | Penanggung Jawab |
| :--- | :--- | :--- | :--- |
| 1 | **Tampilan PW pada saat login bisa dilihat (toggle show/hide password)** | **Selesai (oleh PM)** di `[src/app/login.tsx]` dan `[src/app/register.tsx]` menggunakan ikon mata (`eye-outline` / `eye-off-outline`). | Farhan Dwiyan Akbar (PM) |
| 2 | **Map masih ngebug / blank / watermark API Key** | **Selesai (oleh PM)** di `[src/components/InteractiveLabMap.tsx]` (tile OpenStreetMap bebas API key + fallback otomatis, `invalidateSize`, animasi marker pengguna, dan garis rute `Polyline` jalan kaki di `[src/services/routeService.ts]`). | Farhan Dwiyan Akbar (PM) |
| 3 | **Input kode presensi jangan kasih tau kode sebagai contoh, pakai `"XXXXXXX"` dan dibuat samar** | **Selesai (oleh PM)** di `[src/components/PraktikanPresensiView.tsx]` (`placeholder="XXXXXXX"` dengan warna samar dan tanpa teks contoh kode). | Farhan Dwiyan Akbar (PM) |
| 4 | **Laboratorium pada kelola sesi jadikan dropdown saja** | **Selesai (oleh PM)** di `[src/components/ScheduleFormModal.tsx]` (pemilih laboratorium sudah berbentuk dropdown dari koleksi `laboratories` yang aktif). | Farhan Dwiyan Akbar (PM) |
| 5 | **Pop up dibuat jadi bottom sheet saja tidak melayang di tengah** | **Selesai (oleh PM)** melalui komponen `[src/components/BottomSheetModal.tsx]` yang dapat di-*swipe* ke bawah dan sudah diterapkan pada konfirmasi, notifikasi, aksi sesi, presensi, dan form laboratorium. | Farhan Dwiyan Akbar (PM) |
| 6 | **Sesi harusnya dibuka sesuai jam** | **Belum Lengkap — Masuk Sprint 4 Tahap 1A (SRS 019):** Saat ini Asprak masih bisa membuat/membuka sesi kapan saja tanpa memvalidasi apakah waktu sekarang berada dalam rentang `tanggal` dan `jamMulai`–`jamSelesai` jadwal. | **Programmer 1:** Rahmat Argyandha A (Arga) |
| 7 | **Jadwal yang memiliki tanggal dan waktu yang sama tidak boleh berada pada lab yang sama** | **Belum Lengkap — Masuk Sprint 4 Tahap 1A (SRS 019):** Saat ini penyimpanan jadwal di `[src/app/asisten/kelas/[id].tsx]` belum memeriksa bentrok (*overlap*) ruangan laboratorium (`ruang` / `labId` pada `laboratories`) pada tanggal dan rentang jam yang beririsan. | **Programmer 1:** Rahmat Argyandha A (Arga) |

---

## Kontrak Data Bersama & Perubahan Database Cloud Firestore Sprint 4 (Ditetapkan & Disiapkan oleh PM)

Agar **tidak merusak fitur Sprint 1–3 yang sudah berjalan**, seluruh nama *collection* dan *subcollection* tetap mengacu pada struktur resmi di `[docs/struktur-firebase.md]` dan `[firestore.rules]`.

Berikut adalah rincian **field lama yang dipertahankan**, **field baru yang ditambahkan beserta alasannya**, serta **collection baru** untuk Sprint 4:

### A. Perubahan pada Collection yang Sudah Ada (7 Collection)

#### 1. Collection `users/{uid}`
- **Field lama (tetap dipertahankan):**
  - `uid`, `nama`, `nim`, `email`, `roles`, `activeRole`, `fcmToken`, `fcmTokenUpdatedAt`, `createdAt`
- **Perubahan nilai field untuk Sprint 4:**
  - `roles`: `string[]` -> kini mendukung nilai baru **`"aslab"`** selain `"praktikan"` dan `"asisten"` (Asprak). Contoh: `["praktikan", "asisten", "aslab"]` atau `["aslab"]`.
  - `activeRole`: `"praktikan" | "asisten" | "aslab" | null`.
- **Alasan perubahan:**
  - Memisahkan kewenangan **Aslab (Asisten Laboratorium)** dari **Asprak (`"asisten"`)**. Role `"aslab"` tidak dapat didaftarkan lewat halaman Register, melainkan ditambahkan **secara manual di Firebase Console oleh PM (Farhan Dwiyan Akbar)**.

#### 2. Collection `laboratories/{labId}`
- **Field lama (tetap dipertahankan):**
  - `nama`, `deskripsi`, `alamat`, `latitude`, `longitude`, `radius`, `aktif`, `createdAt`, `updatedAt`, `updatedBy`
- **Field baru yang ditambahkan:**
  - `gracePeriodMinutes`: `number` *(default `15`)*
  - `fineAmount`: `number` *(default `10000`)*
  - `mataKuliahList`: `string[]` *(default `[]`)*
  - `assistantIds`: `string[]` *(default `[]`)*
  - `studentIds`: `string[]` *(default `[]`)*
- **Alasan penambahan:**
  - `gracePeriodMinutes` & `fineAmount` dibutuhkan oleh fitur **Konfigurasi Batasan Keterlambatan Waktu (Grace Period) & Denda** oleh Aslab.
  - `mataKuliahList`, `assistantIds`, dan `studentIds` dibutuhkan untuk menyimpan hasil **3 fitur Bulk/Single Insert terpisah** (Lab tiap Mata Kuliah, Praktikan ke Lab, Asprak ke Lab) serta fitur **Perpindahan Praktikan dan Asprak/Aslab Antar-Laboratorium**.

#### 3. Collection `classes/{classId}` & Subcollection `classes/{classId}/members/{uid}`
- **Field lama (tetap dipertahankan):**
  - `mataKuliah`, `kodeKelas`, `assistants`, `createdBy`, `memberIds`, `createdAt` (beserta subcollection `members/{uid}`: `uid`, `nama`, `nim`, `email`, `joinedAt`)
- **Field baru yang ditambahkan:**
  - `labId`: `string | null` *(referensi ke `laboratories/{labId}`)*
  - `ruang`: `string | null` *(nama laboratorium dari `laboratories.nama`)*
- **Alasan penambahan:**
  - Menghubungkan kelas mata kuliah secara eksplisit dengan dokumen laboratorium pada `laboratories/{labId}` saat Aslab melakukan *Bulk/Single Insert Laboratorium untuk tiap Mata Kuliah* dan saat memfilter kegiatan per laboratorium di Dashboard Aslab.

#### 4. Collection `schedules/{scheduleId}`
- **Field lama (tetap dipertahankan):**
  - `classId`, `mataKuliah`, `kodeKelas`, `nomorPraktikum`, `namaPraktikum`, `tanggal`, `jamMulai`, `jamSelesai`, `ruang`, `assistants`, `createdBy`, `createdAt`, `updatedAt`
- **Field baru yang ditambahkan:**
  - `labId`: `string | null` *(referensi ke `laboratories/{labId}` yang dipilih pada dropdown laboratorium)*
- **Alasan penambahan:**
  - Memudahkan validasi **anti-bentrok jadwal pada laboratorium, tanggal, dan jam yang sama (Revisi #7)** serta mempercepat *query* jadwal sedang berlangsung/akan datang per laboratorium pada **Dashboard Keberlangsungan Laboratorium Aslab**.

#### 5. Collection `sessions/{sessionId}` & Subcollection `sessions/{sessionId}/attendance/{studentId}`
- **Field lama pada `sessions/{sessionId}` (tetap dipertahankan):**
  - `scheduleId`, `classId`, `kodeKelas`, `kodePresensi`, `status` (`"scheduled" | "open" | "closed"`), `openedAt`, `closedAt`, `openedBy`, `closedBy`, `updatedBy`, `updatedAt`
- **Field baru yang ditambahkan pada `sessions/{sessionId}`:**
  - `gracePeriodMinutes`: `number` *(disalin dari `laboratories/{labId}` saat sesi dibuka, default `15`)*
  - `fineAmount`: `number` *(disalin dari `laboratories/{labId}` saat sesi dibuka, default `10000`)*
- **Alasan penambahan pada `sessions/{sessionId}`:**
  - Mengunci nilai batas toleransi keterlambatan dan nominal denda yang berlaku saat sesi tersebut dibuka, sehingga perubahan konfigurasi lab di masa depan tidak mengubah aturan sesi yang sudah berlalu.
- **Field lama pada Subcollection `sessions/{sessionId}/attendance/{studentId}` (tetap dipertahankan):**
  - `studentId`, `nama`, `nim`, `sessionId`, `waktuHadir`, `latitude`, `longitude`, `jarakMeter`, `radiusMeter`
- **Field baru yang ditambahkan pada Subcollection `sessions/{sessionId}/attendance/{studentId}`:**
  - `attendanceStatus`: `"hadir" | "izin"`
  - `latenessStatus`: `"on_time" | "late" | "excused"`
  - `lateMinutes`: `number` *(selisih menit keterlambatan, `0` jika `on_time` atau `excused`)*
  - `fineId`: `string | null` *(referensi ke `fines/{sessionId}_{studentId}` jika terlambat, `null` jika tepat waktu/izin)*
- **Alasan penambahan pada `sessions/{sessionId}/attendance/{studentId}`:**
  - Membedakan praktikan yang **hadir tepat waktu (`"on_time"`)**, **hadir terlambat melewati *grace period* (`"late"`)**, dan **tidak hadir karena izin yang disetujui Asprak (`attendanceStatus: "izin"`, `latenessStatus: "excused"`)** tanpa mengubah status izin menjadi hadir dan tanpa mengubah status keterlambatan saat denda lunas.

#### 6. Collection `permissionRequests/{permissionId}`
- **Field lama (tetap dipertahankan seluruhnya):**
  - `uid`, `nama`, `nim`, `classId`, `sessionId`, `mataKuliah`, `namaPraktikum`, `nomorPraktikum`, `alasan`, `status` (`"pending" | "approved" | "rejected"`), `aiStatus`, `aiCategory`, `aiConfidence`, `aiProcessedAt`, `decidedBy`, `decidedAt`, `createdAt`
- **Field baru yang ditambahkan:**
  - `excusedRecorded`: `boolean` *(penanda bahwa izin `approved` telah dicatat sebagai excused absence bebas denda pada `sessions/{sessionId}/attendance/{uid}`)*
- **Alasan penambahan:**
  - Memastikan setiap pengajuan izin yang disetujui Asprak otomatis tercatat sebagai **tidak hadir dengan izin (*excused absence*)** dan bebas dari tagihan denda keterlambatan.

#### 7. Collection `notifications/{notificationId}`
- **Field lama (tetap dipertahankan):**
  - `recipientUid`, `recipientRole`, `title`, `body`, `type`, `data`, `isRead`, `createdAt`
- **Perubahan nilai enum pada field `recipientRole` & `type`:**
  - `recipientRole`: diperluas menjadi `"praktikan" | "asisten" | "aslab"`
  - `type`: ditambah 3 tipe baru: `"fine_created" | "payment_success" | "payment_failed"`
- **Alasan perubahan:**
  - Mengintegrasikan pemberitahuan tagihan denda baru, pembayaran berhasil, dan pembayaran gagal/pending ke dalam sistem notifikasi Sprint 3 yang sudah ada.

---

### B. Penambahan Collection Baru untuk Sprint 4 (2 Collection Baru)

#### 8. Collection Baru: `fines/{fineId}` *(Tagihan Denda Keterlambatan)*
- **Document ID:** Wajib menggunakan format deterministik **`{sessionId}_{studentId}`**
- **Alasan pembuatan collection:**
  - Menyimpan data tagihan denda praktikan yang terlambat melewati *grace period*, menjamin **1 kejadian keterlambatan hanya menghasilkan tepat 1 tagihan denda**, memisahkan status pembayaran denda dari status kehadiran di `sessions/{sessionId}/attendance/{studentId}`, serta menjadi sumber data **Riwayat Keuangan Hasil Denda Praktikum** di Dashboard Aslab.
- **Fields:**
  - `fineId`: `string` *(sama dengan Document ID `{sessionId}_{studentId}`)*
  - `studentId`: `string` *(UID praktikan — referensi ke `users/{uid}`)*
  - `nama`: `string` *(nama praktikan)*
  - `nim`: `string` *(14 digit NIM praktikan)*
  - `sessionId`: `string` *(referensi ke `sessions/{sessionId}`)*
  - `classId`: `string` *(referensi ke `classes/{classId}`)*
  - `kodeKelas`: `string`
  - `mataKuliah`: `string`
  - `nomorPraktikum`: `number`
  - `namaPraktikum`: `string`
  - `ruang`: `string` *(nama laboratorium sesuai `laboratories.nama`)*
  - `labId`: `string | null` *(referensi ke `laboratories/{labId}`)*
  - `waktuHadir`: `Timestamp` *(waktu presensi praktikan)*
  - `lateMinutes`: `number` *(jumlah menit keterlambatan)*
  - `gracePeriodMinutes`: `number` *(batas toleransi menit saat sesi berlangsung)*
  - `nominal`: `number` *(nominal denda tetap dalam Rupiah, misal `10000`)*
  - `status`: `"unpaid" | "pending" | "paid" | "failed"`
  - `latestOrderId`: `string | null` *(referensi ke `paymentTransactions/{orderId}` terakhir)*
  - `paidAt`: `Timestamp | null` *(waktu pelunasan denda — digunakan untuk filter Hari, Minggu, dan Bulan di Dashboard Aslab)*
  - `createdAt`: `Timestamp` *(tanggal tagihan denda dibuat)*
  - `updatedAt`: `Timestamp`

#### 9. Collection Baru: `paymentTransactions/{orderId}` *(Transaksi & Riwayat Pembayaran Midtrans Sandbox)*
- **Document ID:** `orderId` unik Midtrans (contoh: `LABORA-FINE-{timestamp}-{shortUid}`)
- **Alasan pembuatan collection:**
  - Mencatat setiap percobaan dan hasil transaksi pembayaran Midtrans Snap Sandbox (karena 1 tagihan `fines` yang sempat `failed`/`expire` dapat dicoba bayar ulang dengan `orderId` baru), menyimpan status verifikasi webhook backend, serta menjadi sumber data halaman **Riwayat Pembayaran Praktikan**.
- **Fields:**
  - `orderId`: `string` *(sama dengan Document ID)*
  - `fineId`: `string` *(referensi ke `fines/{sessionId}_{studentId}`)*
  - `studentId`: `string` *(UID praktikan)*
  - `nama`: `string`
  - `nim`: `string`
  - `sessionId`: `string`
  - `classId`: `string`
  - `mataKuliah`: `string`
  - `nomorPraktikum`: `number`
  - `namaPraktikum`: `string`
  - `ruang`: `string` *(nama laboratorium)*
  - `nominal`: `number` *(nominal pembayaran dalam Rupiah)*
  - `snapToken`: `string` *(token transaksi dari Midtrans Snap Sandbox)*
  - `redirectUrl`: `string` *(URL halaman pembayaran Midtrans Snap Sandbox)*
  - `paymentType`: `string | null` *(metode pembayaran dari webhook Midtrans, misal `"qris"`, `"bank_transfer"`, `"gopay"`)*
  - `transactionStatus`: `"pending" | "success" | "failed"` *(status standar yang ditampilkan pada UI aplikasi)*
  - `rawGatewayStatus`: `string` *(status asli Midtrans: `"pending"`, `"settlement"`, `"capture"`, `"deny"`, `"cancel"`, `"expire"`)*
  - `webhookVerified`: `boolean` *(bernilai `true` setelah diverifikasi oleh signature webhook backend)*
  - `paidAt`: `Timestamp | null` *(waktu pembayaran selesai)*
  - `createdAt`: `Timestamp` *(waktu transaksi dibuat)*
  - `updatedAt`: `Timestamp`

---

## Ringkasan Pembagian Peran Tim Sprint 4

Seluruh **6 kebutuhan fitur utama dari dokumen PDF Sprint 4** dibagi rata kepada **3 Programmer** (masing-masing tepat **2 SRS / 2 modul PDF**), ditambah **2 poin revisi yang belum selesai** ditempatkan pada **Programmer 1** agar diselesaikan paling awal sebelum fitur baru dimulai. Sementara itu, **Project Manager (PM)** hanya menangani **Setup Manual Firebase & Kontrak Proyek** serta **Penyempurnaan UI/UX & Peta Interaktif** yang telah diselesaikan.

| Peran dalam Tim | Nama Anggota & NIM | Tanggung Jawab Utama di Sprint 4 |
| :--- | :--- | :--- |
| **Project Manager (PM)** | **Farhan Dwiyan Akbar** (`24060124140137`) | 1. **Setup Manual Firebase & Kontrak Proyek**: Menambahkan role `'aslab'` secara manual di Firebase Console (`users/{uid}`), menyiapkan akun uji Aslab/Asprak/Praktikan, menyiapkan field baru pada koleksi `laboratories`, serta me-*review* dan menggabungkan (*merge*) Pull Request.<br>2. **Finalisasi UI/UX Modern, Peta Interaktif, & 5 Revisi UI (`revisi.md`)**: Desain ulang UI bertema *Deep Teal*, perbaikan peta `[src/components/InteractiveLabMap.tsx]` + rute `[src/services/routeService.ts]`, toggle lihat password, input kode presensi `"XXXXXXX"`, dropdown laboratorium, dan komponen `[src/components/BottomSheetModal.tsx]` *(Sudah Selesai)*. |
| **Programmer 1 (Tahap 1)** | **Rahmat Argyandha A / Arga** (`24060124130061`) | 1. **SRS 019 (Revisi #6 & #7 + Kebutuhan PDF #3)**: Menyelesaikan 2 revisi yang belum lengkap (*validasi sesi dibuka sesuai jam* & *anti-bentrok jadwal pada lab/tanggal/waktu yang sama*), integrasi role `aslab` vs `asprak` di autentikasi/routing, serta modul **Pengelolaan Sesi oleh Asprak**.<br>2. **SRS 020 (Kebutuhan PDF #4 + Security Rules)**: Modul **Perhitungan Keterlambatan (*Grace Period*) & Pengelolaan Tagihan Denda**, pencatatan izin `approved` sebagai *excused absence* bebas denda pada `sessions/{sessionId}/attendance/{studentId}`, serta pembaruan `firestore.rules`. |
| **Programmer 2 (Tahap 2)** | **Quinta Aurabiansyah** | 1. **SRS 021 (Kebutuhan PDF #1)**: Modul **Manajemen Laboratorium oleh Aslab** pada koleksi `laboratories`, konfigurasi radius & *grace period*, perpindahan praktikan/asprak antar-lab, serta **3 fitur Bulk/Single Insert terpisah** beserta unduhan file template & editor baris dalam `ScrollView` (*accept/deny, update, isi data kosong*).<br>2. **SRS 022 (Kebutuhan PDF #2)**: Modul **Dashboard Keberlangsungan Laboratorium Aslab** (statistik lab/praktikan, status kegiatan, jadwal berlangsung & akan datang, riwayat kegiatan, riwayat keuangan denda, serta filter **Hari, Minggu, dan Bulan**). |
| **Programmer 3 (Tahap 3)** | **Christianna Olivia Juniarti M / Anna** (`24060124140168`) | 1. **SRS 023 (Kebutuhan PDF #5)**: Modul **Integrasi Payment Gateway Midtrans Sandbox** dengan arsitektur *Client–Server–Webhook* sesuai referensi praktikum.<br>2. **SRS 024 (Kebutuhan PDF #6)**: Modul **Notifikasi Tagihan & Pembayaran Denda** (integrasi dengan sistem notifikasi Sprint 3 pada koleksi `notifications`) serta halaman **Riwayat Pembayaran Praktikan**. |

---

## Tanggung Jawab Project Manager (PM) — FARHAN DWIYAN AKBAR

Project Manager bertanggung jawab penuh atas kesiapan infrastruktur manual Firebase, standar UI/UX, peta lokasi, dan *quality gate* integrasi tim:

### 1. Setup Manual Firebase Console & Kontrak Data Proyek
- **Injeksi Manual Role `aslab` di Firestore**: PM bertugas menambahkan nilai `'aslab'` pada array `roles` (dan menyetel `activeRole: 'aslab'`) pada dokumen `users/{uid}` akun penguji dan asisten laboratorium langsung di Firebase Console.
- **Penyediaan Data Awal (*Seed Data*) pada Koleksi `laboratories` & Akun Uji**: Menyiapkan dokumen laboratorium awal di koleksi `laboratories` lengkap dengan atribut `radius`, `gracePeriodMinutes`, `fineAmount`, `mataKuliahList`, `assistantIds`, dan `studentIds`, serta akun uji untuk masing-masing role (`praktikan`, `asisten` / Asprak, dan `aslab`) agar ketiga programmer dapat langsung menguji fitur mereka.
- **Supervisi Integrasi & Pull Request**: Memastikan tidak ada konflik antar-cabang (*branch*), memverifikasi `npx tsc --noEmit` serta `npx expo lint`, dan mengatur urutan *merge* dari Programmer 1 -> Programmer 2 -> Programmer 3.

### 2. Finalisasi UI/UX Modern, Peta Interaktif & Rute, serta 5 Revisi UI — *STATUS: SELESAI*
- **Perbaikan Peta Interaktif & Pelacakan Rute (`[src/components/InteractiveLabMap.tsx]` & `[src/services/routeService.ts]`)**: Menambahkan animasi perpindahan posisi GPS pengguna, serta menggambar garis rute jalan kaki (`Polyline`) dari lokasi pengguna ke laboratorium terpilih.
- **Penyelesaian 5 Revisi UI**:
  1. Tombol mata (*show/hide password*) pada `[src/app/login.tsx]` dan `[src/app/register.tsx]`.
  2. Placeholder kode presensi `"XXXXXXX"` berwarna samar tanpa bocoran contoh kode di `[src/components/PraktikanPresensiView.tsx]`.
  3. Komponen `[src/components/BottomSheetModal.tsx]` dengan gestur *swipe-down* untuk seluruh *pop-up* aplikasi.
  4. Pemilih laboratorium berbentuk *dropdown* dari koleksi `laboratories` pada `[src/components/ScheduleFormModal.tsx]`.
  5. Standarisasi desain beranda, tombol *Aksi Cepat*, salin kode presensi, serta halaman riwayat kehadiran per kelas (`[src/app/praktikan/kelas/[id].tsx]`).

---

## Programmer 1 (Tahap 1) — RAHMAT ARGYANDHA A / ARGA

Arga wajib **menyelesaikan 2 poin revisi terlebih dahulu**, kemudian membuka fondasi role `aslab` vs `asprak`, pengelolaan sesi oleh Asprak, serta perhitungan keterlambatan (*grace period*) dan pengelolaan tagihan denda.

### SRS 019 — Penyelesaian Revisi Jadwal/Sesi, Pemisahan Role `aslab` vs `asprak`, dan Pengelolaan Sesi oleh Asprak

#### Tujuan
Menuntaskan 2 revisi logika jadwal dan pembukaan sesi yang belum lengkap, mengintegrasikan role baru `aslab` pada autentikasi/pemilihan peran, serta membatasi dan menyempurnakan fitur **Pengelolaan Sesi oleh Asprak** sesuai spesifikasi PDF Sprint 4 Bagian 3.

#### Ruang Lingkup
- `src/types/index.ts`
- `src/context/AuthContext.tsx`
- `src/app/index.tsx`
- `src/app/pilih-peran.tsx`
- `src/app/aslab/_layout.tsx` *(kerangka route grup `/aslab` untuk dilanjutkan dashboard-nya oleh Programmer 2)*
- `src/app/asisten/_layout.tsx`
- `src/app/asisten/index.tsx`
- `src/app/asisten/kelas/[id].tsx`
- `src/app/asisten/session/[id].tsx`
- `src/components/ScheduleFormModal.tsx`
- `src/services/sessionService.ts`

#### Kebutuhan Fungsional

**A. Penyelesaian 2 Revisi Wajib (Dikerjakan Paling Awal):**
1. **Revisi — Anti-Bentrok Jadwal pada Laboratorium, Tanggal, dan Waktu yang Sama**:
   - Saat pembuatan maupun pengeditan jadwal di koleksi `schedules`, sistem wajib memeriksa seluruh jadwal yang memiliki laboratorium (`ruang` / `labId` dari `laboratories`) dan hari/tanggal (`tanggal`) yang sama.
   - Dua jadwal dinyatakan bentrok apabila rentang waktunya beririsan: `(jamMulaiBaru < jamSelesaiLama) && (jamSelesaiBaru > jamMulaiLama)`.
   - Jika ditemukan bentrok (kecuali dokumen jadwal itu sendiri saat mode edit), sistem wajib membatalkan penyimpanan dan menampilkan pesan kesalahan yang jelas (nama mata kuliah, ruangan laboratorium, dan rentang jam yang bentrok).
2. **Revisi — Sesi Hanya Dapat Dibuka Sesuai Jam Jadwal**:
   - Asprak hanya dapat membuka sesi praktikum (`status: 'open'`) pada koleksi `sessions/{sessionId}` apabila tanggal hari ini sama dengan tanggal jadwal (`schedule.tanggal`) dan waktu saat ini berada dalam rentang jam pelaksanaan jadwal (`jamMulai <= waktuSekarang <= jamSelesai`).
   - Jika Asprak mencoba membuka sesi di luar tanggal atau rentang jam jadwal tersebut, tombol buka sesi dinonaktifkan atau sistem menolak aksi dengan pesan peringatan waktu jadwal yang seharusnya.

**B. Pemisahan Role `aslab` vs `asprak` dan Pengelolaan Sesi oleh Asprak (Kebutuhan PDF #3):**
3. Memperluas tipe `Role` pada `[src/types/index.ts]` dan `[src/context/AuthContext.tsx]` menjadi `'praktikan' | 'asisten' | 'aslab'`, serta memperbarui `[src/app/index.tsx]` dan `[src/app/pilih-peran.tsx]` agar pengguna dengan role `'aslab'` diarahkan ke `/aslab`, pengguna dengan role `'asisten'` (Asprak) ke `/asisten`, dan pengguna dengan multi-role dapat berpindah peran.
4. **Pengelolaan Sesi oleh Asprak**:
   - Asprak dapat melihat daftar kelas (`classes`), jadwal (`schedules`), dan sesi praktikum (`sessions`) yang menjadi tanggung jawabnya (`assistants` memuat UID Asprak).
   - Asprak dapat membuka sesi praktikum ketika sesi dimulai (`status: 'open'`, menyalin `gracePeriodMinutes` dan `fineAmount` dari dokumen `laboratories/{labId}` serta mencatat `openedAt` dan `openedBy`).
   - Asprak dapat memantau dan mengelola presensi praktikan (`sessions/{sessionId}/attendance/{studentId}`) selama sesi berlangsung secara *real-time* (termasuk melihat indikator praktikan hadir tepat waktu `on_time`, terlambat `late`, atau izin `excused`).
   - Asprak dapat menutup sesi ketika kegiatan praktikum selesai (`status: 'closed'`, mencatat `closedAt` dan `closedBy`).
   - Setiap perubahan status sesi (`scheduled` / `open` / `closed`) langsung tersinkronisasi secara *real-time* dengan tampilan aplikasi pada sisi praktikan.
   - **Pembatasan Kewenangan Asprak**: Asprak **tidak** memiliki kewenangan untuk mengelola distribusi praktikan antar-lab maupun melakukan konfigurasi seluruh laboratorium pada koleksi `laboratories` (menu CRUD lab global, bulk insert, dan transfer anggota antar-lab hanya tersedia pada role `aslab`).

#### Kriteria Penerimaan
- **Revisi #6 & #7 Tuntas**: Pembuatan/pengeditan jadwal di laboratorium (`ruang`/`labId`), tanggal, dan jam yang beririsan pasti ditolak; pembukaan sesi di luar tanggal/jam jadwal pasti ditolak.
- Akun yang telah diberikan role `'aslab'` di Firestore oleh PM dapat memilih peran **Asisten Laboratorium (Aslab)** dan masuk ke route `/aslab`.
- Asprak hanya dapat mengelola sesi, jadwal, dan memantau presensi pada kelas/lab yang menjadi tanggung jawabnya secara *real-time*, tanpa akses ke manajemen distribusi praktikan atau konfigurasi seluruh laboratorium.

---

### SRS 020 — Perhitungan Keterlambatan (`Grace Period`), Pengelolaan Tagihan Denda, dan Pembaruan Firestore Security Rules (Kebutuhan PDF #4 + Security Rules)

#### Tujuan
Mengimplementasikan logika penentuan keterlambatan presensi menggunakan mekanisme *grace period*, pembuatan tagihan denda nominal tetap secara otomatis (1 keterlambatan = 1 tagihan pada koleksi `fines`), pencatatan izin `approved` dari `permissionRequests` sebagai *excused absence* bebas denda pada `sessions/{sessionId}/attendance/{studentId}`, serta pengamanan akses data melalui `firestore.rules`.

#### Ruang Lingkup
- `src/components/PraktikanPresensiView.tsx`
- `src/services/sessionService.ts`
- `src/services/permissionService.ts`
- `src/app/asisten/izin/[id].tsx`
- `src/app/asisten/session/[id].tsx`
- `src/services/fineService.ts` *(file baru)*
- `firestore.rules`

#### Kebutuhan Fungsional
1. **Perhitungan Keterlambatan dengan Mekanisme *Grace Period***:
   - Penentuan keterlambatan didasarkan pada selisih antara waktu presensi praktikan (`waktuHadir`) dan waktu mulai sesi (`jamMulai` pada jadwal/sesi).
   - Durasi toleransi waktu (*grace period*, `gracePeriodMinutes` dari `sessions/{sessionId}` / `laboratories/{labId}`) dapat dikonfigurasi oleh Aslab pada tiap laboratorium.
   - Jika praktikan melakukan presensi sebelum atau masih di dalam batas `jamMulai + gracePeriodMinutes`, maka dokumen `sessions/{sessionId}/attendance/{studentId}` dicatat dengan `attendanceStatus: 'hadir'` dan `latenessStatus: 'on_time'` tanpa menimbulkan tagihan denda (`lateMinutes: 0`, `fineId: null`).
   - Jika praktikan melakukan presensi melewati batas `jamMulai + gracePeriodMinutes`, maka dokumen `sessions/{sessionId}/attendance/{studentId}` tetap dicatat dengan `attendanceStatus: 'hadir'`, namun diberi penanda `latenessStatus: 'late'` beserta `lateMinutes` (selisih menit keterlambatan) dan secara otomatis menerbitkan tagihan denda di `fines/{sessionId}_{studentId}`.
2. **Aturan Pengelolaan Tagihan Denda (`fines/{sessionId}_{studentId}`)**:
   - Besaran denda menggunakan **nominal tetap** (`fineAmount` dari `sessions/{sessionId}` / `laboratories/{labId}`, misal `Rp 10.000`) untuk setiap keterlambatan yang melewati *grace period*.
   - **Satu kejadian keterlambatan hanya menghasilkan satu tagihan denda**: gunakan ID dokumen deterministik `fines/{sessionId}_{studentId}` agar tidak pernah terjadi duplikasi tagihan untuk praktikan pada sesi yang sama.
   - Setiap tagihan denda wajib terhubung secara eksplisit dengan data praktikan (`studentId`, `nama`, `nim`), sesi praktikum (`sessionId`, `classId`, `kodeKelas`, `mataKuliah`, `nomorPraktikum`, `namaPraktikum`, `ruang`, `labId`), serta waktu catatan presensi terkait (`waktuHadir`).
   - **Pembayaran denda hanya memperbarui status tagihan (`fines.status: 'paid'`) dan tidak mengubah `attendanceStatus` maupun `latenessStatus: 'late'` praktikan pada `sessions/{sessionId}/attendance/{studentId}`**.
3. **Aturan Persetujuan Izin oleh Asprak (*Excused Absence*)**:
   - Ketika pengajuan izin praktikan pada `permissionRequests/{permissionId}` disetujui (`status: 'approved'`) oleh Asprak di `[src/services/permissionService.ts]` / `[src/app/asisten/izin/[id].tsx]`, sistem otomatis mencatat dokumen `sessions/{sessionId}/attendance/{uid}` dengan `attendanceStatus: 'izin'`, `latenessStatus: 'excused'`, `lateMinutes: 0`, dan `fineId: null`, serta menandai `excusedRecorded: true` pada `permissionRequests/{permissionId}`.
   - Praktikan yang izinnya disetujui tercatat sebagai **tidak hadir dengan izin (*excused absence*)**, **tidak dikenakan denda keterlambatan**, dan persetujuan izin tersebut **tidak mengubah status kehadiran menjadi `'hadir'`**.
4. **Pembaruan `firestore.rules`**:
   - Menambahkan helper `isAslab()` (`'aslab' in rolesOf(currentUid())`), memperbarui hak tulis koleksi `laboratories` khusus `isAslab()` (serta mengizinkan Aslab melakukan distribusi `classes` / `laboratories`), mengatur hak baca/tulis pada koleksi `fines`, `paymentTransactions`, dan subcollection `sessions/{sessionId}/attendance/{studentId}`, serta mempertahankan proteksi agar klien tidak dapat menyuntikkan role `'aslab'` sendiri ke `users/{uid}`.

#### Kriteria Penerimaan
- Presensi di dalam batas *grace period* tercatat `on_time` pada `sessions/{sessionId}/attendance/{studentId}` tanpa membuat dokumen `fines`.
- Presensi melewati batas *grace period* tercatat `hadir` (`latenessStatus: 'late'`) dan menghasilkan tepat 1 dokumen `fines/{sessionId}_{studentId}` dengan nominal tetap dan status `'unpaid'`.
- Izin pada `permissionRequests` yang disetujui Asprak tercatat sebagai `attendanceStatus: 'izin'` (`latenessStatus: 'excused'`), bebas denda, dan tidak berubah menjadi `'hadir'`.
- Pelunasan denda pada `fines` tidak mengubah status kehadiran/keterlambatan pada subcollection `sessions/{sessionId}/attendance/{studentId}`.

---

## Programmer 2 (Tahap 2) — QUINTA AURABIANSYAH

Quinta bertanggung jawab penuh atas seluruh fitur **Role Baru Aslab (Asisten Laboratorium)** pada dokumen Sprint 4 Bagian 1 dan Bagian 2, yaitu **Manajemen Laboratorium & 3 Fitur Bulk/Single Insert** serta **Dashboard Keberlangsungan Laboratorium**.

### SRS 021 — Manajemen Laboratorium oleh Aslab, Single/Bulk Insert (3 Bulk Terpisah + Template Unduhan + Editor `ScrollView`), dan Konfigurasi Lab

#### Tujuan
Menyediakan modul manajemen laboratorium lengkap bagi role **Aslab** pada koleksi `laboratories`, mencakup CRUD laboratorium, pengaturan radius lokasi presensi & batas *grace period*, perpindahan praktikan/asprak antar-laboratorium, serta 3 fitur *Bulk/Single Insert* terpisah yang dilengkapi unduhan file template dan tabel pratinjau interaktif di dalam `ScrollView`.

#### Ruang Lingkup
- `src/services/laboratoryService.ts`
- `src/app/aslab/laboratorium/index.tsx` *(file baru)*
- `src/app/aslab/laboratorium/bulk-insert.tsx` *(file baru)*
- `src/app/aslab/laboratorium/transfer.tsx` *(file baru)*
- `src/services/bulkInsertService.ts` *(file baru)*

#### Kebutuhan Fungsional
1. **CRUD Laboratorium & Konfigurasi Parameter Presensi oleh Aslab**:
   - Aslab dapat melakukan **Create, Read, Update, dan Delete (CRUD)** data laboratorium pada koleksi `laboratories`.
   - Aslab dapat mengatur **cakupan lokasi presensi** (`latitude`, `longitude`, dan `radius` dalam meter) serta **batasan keterlambatan waktu / *grace period*** (`gracePeriodMinutes` dalam menit dan `fineAmount` dalam Rupiah) pada setiap dokumen `laboratories/{labId}`.
2. **Tiga (3) Fitur Bulk Insert & Single Insert Terpisah**:
   - Aslab dapat melakukan input data secara **Single Insert** (form satuan) maupun **Bulk Insert** (unggah/impor file template CSV/JSON) yang **dipisahkan menjadi 3 kategori independen**:
     1. **Bulk/Single Insert Laboratorium untuk tiap Mata Kuliah**: memetakan daftar laboratorium (`laboratories`) ke mata kuliah/kelas terkait (`mataKuliahList` pada `laboratories` & `labId`/`ruang` pada `classes`).
     2. **Bulk/Single Insert Praktikan ke Laboratorium**: memasukkan daftar praktikan (berdasarkan NIM/email di `users`) ke laboratorium tujuan (`studentIds` pada `laboratories` & `memberIds`/`members` pada `classes` lab tersebut).
     3. **Bulk/Single Insert Asprak ke Laboratorium**: memasukkan daftar asisten praktikum (berdasarkan NIM/email di `users`) ke laboratorium tujuan (`assistantIds` pada `laboratories` & `assistants` pada `classes` lab tersebut).
3. **File Template Insert yang Dapat Diunduh (*Downloadable Template*)**:
   - Aplikasi wajib menyediakan fitur untuk **mengunduh / membagikan file template insert** untuk masing-masing dari 3 kategori bulk insert di atas agar Aslab dapat mengisi data sesuai format kolom standar sebelum mengunggahnya ke aplikasi.
4. **Pratinjau & Manipulasi Baris Data Hasil Upload di Dalam `ScrollView`**:
   - Sebelum data hasil *bulk upload* disimpan ke Firestore, daftar baris ditampilkan di dalam komponen `ScrollView`.
   - Di dalam `ScrollView` tersebut, Aslab wajib dapat melakukan manipulasi per baris data:
     - **Accept / Deny** (menyetujui atau menolak baris tertentu agar ikut disimpan atau dilewati).
     - **Update** (mengubah nilai kolom pada baris yang dipilih).
     - **Mengisi data yang kosong** (melengkapi *field* yang belum terisi dari file template langsung di layar pratinjau, dengan penanda visual pada kolom yang masih kosong).
5. **Perpindahan (*Transfer*) Praktikan dan Asprak/Aslab Antar-Laboratorium**:
   - Aslab dapat memindahkan praktikan (`studentIds`) dari satu dokumen `laboratories/{sourceLabId}` ke `laboratories/{targetLabId}` lain.
   - Aslab dapat memindahkan Asprak/Aslab (`assistantIds`) dari satu dokumen `laboratories/{sourceLabId}` ke `laboratories/{targetLabId}` lain.
   - **Catatan Penting Sesuai PDF**: Fitur perpindahan ini hanya berlaku untuk perpindahan anggota (praktikan dan asprak/aslab) antar-laboratorium, **tidak berlaku untuk perpindahan jadwal (`schedules`)**.

#### Kriteria Penerimaan
- Aslab dapat membuat, mengubah, menghapus laboratorium pada koleksi `laboratories`, serta menyetel `radius` presensi, `gracePeriodMinutes`, dan `fineAmount`.
- Tersedia 3 tab/mode *Single & Bulk Insert* yang terpisah (Lab per Mata Kuliah, Praktikan ke Lab, Asprak ke Lab) lengkap dengan tombol unduh file template.
- Data hasil unggahan tampil di dalam `ScrollView` dan setiap barisnya dapat di-*accept/deny*, di-*update*, serta dilengkapi kolomnya yang kosong sebelum disimpan ke Firestore.
- Aslab dapat memindahkan praktikan maupun asprak/aslab antar-laboratorium pada koleksi `laboratories` tanpa memindahkan jadwal pada koleksi `schedules`.

---

### SRS 022 — Dashboard Keberlangsungan Laboratorium Aslab dengan Filter Hari, Minggu, dan Bulan (Kebutuhan #2)

#### Tujuan
Membangun halaman Dashboard utama untuk role **Aslab** (`/aslab`) yang menyajikan pemantauan menyeluruh terhadap keberlangsungan kegiatan dan keuangan denda seluruh laboratorium secara *real-time* dari Firebase (`laboratories`, `schedules`, `sessions`, `fines`, dan `paymentTransactions`) dengan filter rentang waktu **Hari, Minggu, dan Bulan**.

#### Ruang Lingkup
- `src/app/aslab/index.tsx` *(file baru)*
- `src/app/aslab/profil.tsx` *(file baru — membungkus `ProfileView` untuk role Aslab)*
- `src/components/AslabDashboardFilter.tsx` *(opsional/komponen pendukung)*

#### Kebutuhan Fungsional
1. **Informasi Keberlangsungan Laboratorium**:
   - Menampilkan ringkasan **jumlah laboratorium** (dari koleksi `laboratories`) dan **jumlah praktikan** secara keseluruhan maupun per laboratorium.
   - Menampilkan **status kegiatan praktikum** pada setiap laboratorium (sedang berlangsung / `status: 'open'`, terjadwal / `status: 'scheduled'`, atau tidak ada kegiatan) beserta **informasi lokasi (`alamat`) dan waktu pelaksanaan praktikum (`tanggal`, `jamMulai`–`jamSelesai`)**.
   - Menampilkan daftar **jadwal kegiatan yang sedang berlangsung** dan **jadwal kegiatan yang akan datang** dari koleksi `schedules` dan `sessions`.
   - Menampilkan **riwayat kegiatan laboratorium** (sesi praktikum dengan `status: 'closed'` yang telah selesai dilaksanakan beserta ringkasan jumlah kehadiran/keterlambatan dari `sessions/{sessionId}/attendance`).
2. **Riwayat Keuangan Hasil Denda Praktikum**:
   - Menampilkan ringkasan dan daftar **riwayat keuangan hasil denda praktikum** yang bersumber dari koleksi `fines` dan `paymentTransactions` (total denda terbayar/`paid`, total denda belum dibayar/`unpaid`, serta rincian pembayaran denda per laboratorium/sesi).
3. **Filter Rentang Waktu (Hari, Minggu, dan Bulan) Berbasis Data Firebase**:
   - Menyediakan kontrol filter periode waktu: **Hari Ini (Hari)**, **Minggu Ini (Minggu)**, dan **Bulan Ini (Bulan)**.
   - Seluruh data jadwal kegiatan, riwayat kegiatan laboratorium, dan riwayat keuangan denda praktikum pada dashboard wajib terfilter secara akurat berdasarkan timestamp yang tersimpan di Firebase (`tanggal`, `createdAt`, `paidAt`) sesuai periode yang dipilih Aslab.

#### Kriteria Penerimaan
- Dashboard Aslab menampilkan jumlah laboratorium, jumlah praktikan, status kegiatan tiap lab, lokasi & waktu pelaksanaan, jadwal sedang berlangsung & akan datang, riwayat kegiatan lab, serta riwayat keuangan denda praktikum.
- Penggantian filter **Hari**, **Minggu**, dan **Bulan** memperbarui tampilan kegiatan dan rekap keuangan denda secara konsisten sesuai data Firestore.

---

## Programmer 3 (Tahap 3) — CHRISTIANNA OLIVIA JUNIARTI M / ANNA

Anna bertanggung jawab penuh atas penyelesaian siklus pembayaran denda pada sisi praktikan dan backend, yaitu **Integrasi Payment Gateway Midtrans Sandbox** serta **Notifikasi & Halaman Riwayat Pembayaran**.

### SRS 023 — Integrasi Payment Gateway Midtrans Sandbox dengan Alur Client–Server–Webhook (Kebutuhan PDF #5)

#### Tujuan
Mengintegrasikan layanan **Midtrans Sandbox** untuk memproses pembayaran denda keterlambatan praktikan menggunakan arsitektur tiga pihak (*Aplikasi Mobile React Native – Backend Server – Payment Gateway Webhook*) sesuai referensi [Payment Gateway.md (Pertemuan 4)](https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%204/Payment%20Gateway.md).

#### Ruang Lingkup
- `backend/payment-server/` *(layanan backend ringan Node.js/Express atau Serverless Function untuk pembuatan transaksi Midtrans Snap & endpoint webhook)*
- `src/services/paymentService.ts` *(file baru)*
- `src/app/praktikan/denda/index.tsx` *(file baru — halaman daftar tagihan denda & pembayaran)*
- `src/app/praktikan/denda/checkout.tsx` *(file baru — modal/halaman WebView Midtrans Snap)*
- `src/app/praktikan/_layout.tsx` & `src/app/praktikan/index.tsx` *(penambahan akses menu Denda)*

#### Kebutuhan Fungsional
1. **Arsitektur Keamanan & Kepatuhan Referensi Praktikum**:
   - Mengikuti referensi wajib [Payment Gateway.md](https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%204/Payment%20Gateway.md), **`MIDTRANS_SERVER_KEY` (secret key) DILARANG KERAS disimpan di kode aplikasi React Native / `.env` `EXPO_PUBLIC_*`**.
   - Aplikasi React Native hanya berkomunikasi dengan **Backend Server** (`POST /api/payments/create-transaction` dan `GET /api/payments/status/:orderId`), sedangkan Backend Server yang menghubungi Midtrans Snap Sandbox API (`https://app.sandbox.midtrans.com/snap/v1/transactions`) dan menerima **Webhook Notification** (`POST /api/payments/webhook`).
2. **Alur Pembayaran Denda di Aplikasi Praktikan**:
   - Menampilkan **daftar tagihan denda** milik praktikan yang sedang login (`fines` dengan `studentId == user.id`) beserta **rincian nominal pembayaran (`nominal`)**, nama praktikum (`namaPraktikum`), pertemuan (`nomorPraktikum`), mata kuliah (`mataKuliah`), laboratorium (`ruang`), waktu hadir (`waktuHadir`), dan jumlah menit keterlambatan (`lateMinutes`).
   - Ketika praktikan menekan tombol **"Bayar Denda"**, aplikasi meminta pembuatan transaksi pembayaran ke Backend Server.
   - Backend Server membuat `orderId` unik, meminta `snapToken` dan `redirectUrl` ke Midtrans Snap Sandbox, menyimpan dokumen `paymentTransactions/{orderId}` dengan `transactionStatus: 'pending'`, serta memperbarui `fines/{fineId}` menjadi `status: 'pending'` dan `latestOrderId: orderId`.
   - Aplikasi mengarahkan pengguna ke halaman/metode pembayaran Midtrans (`redirectUrl` di dalam `react-native-webview`) untuk memilih metode pembayaran Sandbox (QRIS, Virtual Account, GoPay, dll.).
3. **Penanganan Respons, Callback/Webhook, dan Sinkronisasi Status**:
   - Backend Server menangani *callback / webhook notification* dari Midtrans, memverifikasi keaslian `signature_key` (`SHA512(order_id + status_code + gross_amount + server_key)`), lalu memetakan status Midtrans:
     - `capture` / `settlement` -> `transactionStatus: 'success'`, dan memperbarui `fines/{fineId}` menjadi `status: 'paid'` beserta `paidAt`.
     - `pending` -> `transactionStatus: 'pending'`, `fines/{fineId}` tetap `status: 'pending'`.
     - `deny` / `cancel` / `expire` / `failure` -> `transactionStatus: 'failed'`, dan mengembalikan `fines/{fineId}` ke `status: 'failed'` agar praktikan dapat mencoba pembayaran ulang.
   - Aplikasi menangani respons penutupan halaman pembayaran dan mendengarkan perubahan dokumen Firestore (`fines` dan `paymentTransactions`) secara *real-time* untuk menampilkan status pembayaran: **`pending`**, **`success`**, atau **`failed`**.
   - Status pembayaran pada halaman riwayat/kehadiran diperbarui berdasarkan hasil verifikasi dari backend atau *webhook* (serta tidak mengubah `attendanceStatus: 'hadir'` maupun `latenessStatus: 'late'` pada subcollection `sessions/{sessionId}/attendance/{studentId}`).

#### Kriteria Penerimaan
- Tidak ada `MIDTRANS_SERVER_KEY` di dalam kode frontend React Native.
- Praktikan dapat melihat daftar tagihan denda beserta rincian nominalnya, membuka halaman pembayaran Midtrans Snap Sandbox, dan menyelesaikan simulasi pembayaran.
- Perubahan status dari webhook/verifikasi backend (`pending`, `success`, `failed`) otomatis memperbarui `paymentTransactions` dan `fines` secara *real-time*.

---

### SRS 024 — Notifikasi Tagihan & Pembayaran Denda serta Halaman Riwayat Pembayaran Praktikan (Kebutuhan PDF #6)

#### Tujuan
Mengintegrasikan fitur pengelolaan denda dan pembayaran dengan sistem notifikasi yang telah dibangun pada Sprint 3 (`[src/services/notificationService.ts]` dan `[src/components/NotificationModal.tsx]`) pada koleksi `notifications` serta menyediakan halaman riwayat pembayaran yang tersimpan secara persisten di Firestore.

#### Ruang Lingkup
- `src/types/index.ts`
- `src/services/notificationService.ts`
- `src/components/NotificationModal.tsx`
- `src/app/praktikan/denda/riwayat.tsx` *(atau tab Riwayat Pembayaran terintegrasi di `src/app/praktikan/denda/index.tsx`)*

#### Kebutuhan Fungsional
1. **Integrasi dengan Sistem Notifikasi Sprint 3 (`notifications/{notificationId}`)**:
   - Sistem wajib membuat dokumen notifikasi di koleksi `notifications` dan menampilkan notifikasi kepada pengguna pada 3 kondisi berikut:
     1. **Ketika tagihan denda baru dibuat (`type: 'fine_created'`)** akibat keterlambatan presensi yang melewati *grace period* (memberitahukan nama praktikum/mata kuliah, menit keterlambatan, dan nominal tagihan denda).
     2. **Ketika pembayaran denda berhasil diproses (`type: 'payment_success'`)** (`transactionStatus: 'success'` / `fines.status: 'paid'`).
     3. **Ketika pembayaran gagal atau membutuhkan penyelesaian lebih lanjut (`type: 'payment_failed'`)** (`transactionStatus: 'failed'` atau masih `'pending'` menunggu penyelesaian pembayaran).
   - Notifikasi ditampilkan pada daftar notifikasi aplikasi (`[src/components/NotificationModal.tsx]`) danbanner toast in-app (`[src/components/InAppNotificationToast.tsx]`) ketika status tagihan/transaksi berubah.
2. **Halaman Riwayat Pembayaran Persisten**:
   - Menyediakan halaman/tab **Riwayat Pembayaran** yang menampilkan seluruh histori transaksi dan pembayaran denda praktikan yang tersimpan di basis data Firestore (`paymentTransactions` & `fines`).
   - Setiap item riwayat pembayaran wajib memuat:
     - **Informasi sesi praktikum** (`mataKuliah`, `nomorPraktikum`, `namaPraktikum`, dan laboratorium `ruang`).
     - **Tanggal tagihan** (`createdAt` pada dokumen `fines`).
     - **Nominal denda** (`nominal` dalam format Rupiah).
     - **Waktu transaksi** (`createdAt` / `paidAt` pada dokumen `paymentTransactions`).
     - **Status pembayaran** (`pending`, `success` / lunas, atau `failed` / gagal).

#### Kriteria Penerimaan
- Praktikan menerima notifikasi pada sistem notifikasi Sprint 3 (`notifications`) saat tagihan denda baru terbit, saat pembayaran berhasil, dan saat pembayaran gagal atau masih membutuhkan penyelesaian.
- Halaman Riwayat Pembayaran menampilkan informasi sesi, tanggal tagihan, nominal denda, waktu transaksi, dan status pembayaran secara lengkap dan tetap tersimpan walaupun aplikasi ditutup dan dibuka kembali.

---

## Urutan Pengerjaan dan Dependensi Sprint 4

Bagian ini menjelaskan urutan pengerjaan teknis dari fitur-fitur pada Sprint 4 agar proses pengembangan berjalan terstruktur, **revisi dari sprint sebelumnya tuntas lebih dulu**, dan setiap programmer tidak saling terblokir (*non-blocking*).

### Gambaran Umum Alur Eksekusi

Karena **2 poin revisi dari `revisi.md`** berkaitan langsung dengan jadwal dan pembukaan sesi praktikum, maka **Programmer 1 (Arga)** memulai pengerjaan paling awal dengan menuntaskan kedua revisi tersebut terlebih dahulu, dilanjutkan dengan membuka fondasi role `aslab` vs `asprak` serta pembuatan tagihan denda dari mekanisme *grace period*. Setelah fondasi role dan skema denda tersedia, **Programmer 2 (Quinta)** membangun modul manajemen laboratorium Aslab (3 Bulk Insert & Dashboard Aslab pada koleksi `laboratories`), sementara **Programmer 3 (Anna)** mengintegrasikan Payment Gateway Midtrans Sandbox, notifikasi denda, dan riwayat pembayaran.

### Ringkasan Urutan Eksekusi

| Urutan | Tahap | Penanggung Jawab | SRS / Tugas | Fokus Utama |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Pra-Tahap** | **Farhan Dwiyan Akbar (PM)** | Setup Manual & UI/Maps | Setup manual role `'aslab'` di Firestore `users/{uid}`, penambahan field baru pada koleksi `laboratories`, serta finalisasi UI & Peta *(UI & Peta sudah selesai)*. |
| **1** | **Tahap 1A** | **Rahmat Argyandha A / Arga (Programmer 1)** | **SRS 019 (Bagian Revisi)** | **Wajib dikerjakan pertama:** Menyelesaikan 2 revisi (anti-bentrok jadwal di lab/tanggal/jam yang sama & validasi buka sesi sesuai jam jadwal). |
| **2** | **Tahap 1B** | **Rahmat Argyandha A / Arga (Programmer 1)** | **SRS 019 & SRS 020** | Pemisahan role `aslab` vs `asprak`, pengelolaan sesi oleh Asprak, perhitungan keterlambatan (*grace period*) pada `sessions/{sessionId}/attendance/{studentId}`, pembuatan dokumen `fines`, izin *excused absence*, dan `firestore.rules`. |
| **3** | **Tahap 2** | **Quinta Aurabiansyah (Programmer 2)** | **SRS 021 & SRS 022** | Manajemen Lab oleh Aslab pada koleksi `laboratories` (CRUD, radius, *grace period*, transfer praktikan/asprak, 3 Bulk Insert + template + editor `ScrollView`) & Dashboard Aslab dengan filter Hari/Minggu/Bulan. |
| **4** | **Tahap 3** | **Christianna Olivia J. M. / Anna (Programmer 3)** | **SRS 023 & SRS 024** | Integrasi Payment Gateway Midtrans Sandbox (*Client–Server–Webhook*), notifikasi tagihan/pembayaran denda pada koleksi `notifications`, dan halaman Riwayat Pembayaran. |
| **5** | **Tahap 4** | **Seluruh Tim (Dipimpin PM)** | Integrasi Akhir | Pengujian alur penuh dari konfigurasi Aslab -> pembukaan sesi Asprak -> presensi terlambat -> tagihan denda -> pembayaran Midtrans Sandbox -> notifikasi -> laporan keuangan di Dashboard Aslab. |

---

### Detail Urutan Pengerjaan per Tahap

#### Pra-Tahap — Setup Manual Firebase & Finalisasi Fondasi UI/Peta (Oleh Project Manager: Farhan Dwiyan Akbar)
Sebelum programmer menjalankan pengujian fitur Sprint 4:
1. **PM telah menyelesaikan** pembaruan UI/UX, perbaikan komponen peta `[src/components/InteractiveLabMap.tsx]` beserta rute jalan kaki `[src/services/routeService.ts]`, serta 5 poin revisi UI.
2. **PM melakukan setup manual di Firebase Console**:
   - Menambahkan string `'aslab'` ke dalam array `roles` pada dokumen `users/{uid}` milik akun uji Aslab.
   - Menambahkan atribut `gracePeriodMinutes: 15`, `fineAmount: 10000`, `mataKuliahList: []`, `assistantIds: []`, dan `studentIds: []` pada dokumen laboratorium di koleksi `laboratories`.

#### Tahap 1A — Penyelesaian 2 Revisi Wajib (Oleh Programmer 1: Rahmat Argyandha A / Arga)
Arga mengerjakan revisi yang belum lengkap terlebih dahulu agar alur jadwal dan sesi bersih dari *bug* sprint sebelumnya:
1. Menambahkan validasi anti-bentrok jadwal pada `[src/app/asisten/kelas/[id].tsx]`, `[src/services/sessionService.ts]`, dan `[src/components/ScheduleFormModal.tsx]` sehingga dua jadwal dengan laboratorium (`ruang`/`labId`), `tanggal`, dan rentang jam yang beririsan tidak bisa disimpan ke koleksi `schedules`.
2. Menambahkan validasi waktu pembukaan sesi pada `[src/app/asisten/kelas/[id].tsx]`, `[src/app/asisten/session/[id].tsx]`, dan `[src/services/sessionService.ts]` sehingga sesi pada koleksi `sessions` hanya dapat dibuka (`status: 'open'`) sesuai tanggal dan rentang jam jadwal (`jamMulai <= now <= jamSelesai`).
3. *Checkpoint 1A*: PM memverifikasi kedua revisi ini sudah berjalan lancar sebelum Arga lanjut ke Tahap 1B.

#### Tahap 1B — Fondasi Role `aslab`/`asprak`, Pengelolaan Sesi Asprak, & Logika Denda *Grace Period* (Oleh Programmer 1: Rahmat Argyandha A / Arga)
Setelah revisi selesai, Arga menyiapkan fondasi Sprint 4 yang dibutuhkan oleh Programmer 2 dan Programmer 3:
1. **SRS 019**: Memperbarui `src/types/index.ts`, `AuthContext.tsx`, `pilih-peran.tsx`, dan `index.tsx` untuk mendukung role `'aslab'` (redirect ke `/aslab`) serta membatasi kewenangan `'asisten'` (Asprak) hanya pada pengelolaan pelaksanaan sesi di kelas/lab tanggung jawabnya.
2. **SRS 020**: Mengimplementasikan perhitungan keterlambatan dengan *grace period* di `[src/components/PraktikanPresensiView.tsx]`, `[src/services/sessionService.ts]`, dan `src/services/fineService.ts` (menyimpan `latenessStatus: 'on_time' | 'late'` pada `sessions/{sessionId}/attendance/{studentId}` dan membuat dokumen `fines/{sessionId}_{studentId}` dengan status `'unpaid'` saat praktikan terlambat melewati `gracePeriodMinutes`), memastikan izin `approved` pada `permissionRequests` tercatat sebagai `attendanceStatus: 'izin'` (`latenessStatus: 'excused'`) tanpa denda, serta memperbarui `firestore.rules`.
3. *Checkpoint 1B*: Setelah Tahap 1B di-*merge*, route `/aslab` dan koleksi `fines` sudah aktif sehingga Programmer 2 dan Programmer 3 dapat bekerja secara paralel tanpa hambatan.

#### Tahap 2 — Manajemen Laboratorium, 3 Bulk Insert, & Dashboard Aslab (Oleh Programmer 2: Quinta Aurabiansyah)
Dapat dikerjakan paralel begitu kerangka route `/aslab` dari Tahap 1B tersedia:
1. **SRS 021**: Membangun halaman Manajemen Laboratorium Aslab (`/aslab/laboratorium`) pada koleksi `laboratories`, mencakup CRUD lab, konfigurasi `radius` presensi, `gracePeriodMinutes`, & `fineAmount`, perpindahan praktikan (`studentIds`) & asprak/aslab (`assistantIds`) antar-lab (tanpa memindahkan jadwal `schedules`), serta **3 fitur Single/Bulk Insert terpisah** (Lab per Mata Kuliah, Praktikan ke Lab, Asprak ke Lab) lengkap dengan tombol unduh file template dan editor baris interaktif di dalam `ScrollView` (*accept/deny, update, isi data kosong*).
2. **SRS 022**: Membangun Dashboard Keberlangsungan Laboratorium Aslab (`/aslab/index.tsx`) yang menampilkan jumlah lab & praktikan, status kegiatan tiap lab, lokasi & waktu pelaksanaan, jadwal berlangsung & akan datang, riwayat kegiatan lab, serta riwayat keuangan hasil denda praktikum dari koleksi `fines` dan `paymentTransactions` dengan filter **Hari, Minggu, dan Bulan**.

#### Tahap 3 — Integrasi Payment Gateway Midtrans Sandbox, Notifikasi, & Riwayat Pembayaran (Oleh Programmer 3: Christianna Olivia Juniarti M / Anna)
Dapat dikerjakan paralel begitu kontrak koleksi `fines` dari Tahap 1B tersedia:
1. **SRS 023**: Membangun layanan backend pembayaran Midtrans Snap Sandbox (`POST /api/payments/create-transaction` dan `POST /api/payments/webhook` dengan verifikasi `signature_key` sesuai referensi [Payment Gateway.md](https://github.com/Doctor3131/ppk-rn-expo-58/blob/main/docs/Pertemuan%204/Payment%20Gateway.md)) serta halaman daftar tagihan & pembayaran denda praktikan (`/praktikan/denda`) yang memperbarui koleksi `paymentTransactions` dan `fines` dengan status `pending`, `success`, dan `failed` secara *real-time*.
2. **SRS 024**: Mengintegrasikan pemicu notifikasi ke sistem notifikasi Sprint 3 (`[src/services/notificationService.ts]` pada koleksi `notifications`) untuk 3 kondisi (tagihan denda baru dibuat `fine_created`, pembayaran berhasil `payment_success`, pembayaran gagal/butuh penyelesaian `payment_failed`) serta membangun halaman **Riwayat Pembayaran** persisten.

#### Tahap 4 — Uji Integrasi End-to-End (Dipimpin oleh PM bersama Seluruh Programmer)
Tahap ini dinyatakan **selesai (Done)** apabila skenario ujung-ke-ujung berikut berhasil dijalankan tanpa error (`npx tsc --noEmit` dan `npx expo lint` lulus 100%):
1. **PM** menyiapkan akun dengan role `'aslab'` di Firestore (`users/{uid}`), lalu **Aslab (fitur Quinta)** login, mengunduh template bulk insert, mengunggah data praktikan/asprak ke laboratorium (`laboratories`), mengedit baris kosong di `ScrollView`, serta mengatur radius presensi dan *grace period* laboratorium (misal 10 menit, denda Rp 10.000).
2. **Asprak (fitur Arga)** mencoba membuat jadwal bentrok di lab, tanggal, dan jam yang sama -> sistem menolak. Asprak membuat jadwal yang valid pada `schedules`, lalu membuka sesi praktikum (`sessions`) tepat pada jam jadwalnya (`status: 'open'`).
3. **Praktikan A** presensi di dalam rentang *grace period* -> tercatat `attendanceStatus: 'hadir'` (`latenessStatus: 'on_time'`) pada `sessions/{sessionId}/attendance/{studentId}` dan tidak ada tagihan denda.
4. **Praktikan B** mengajukan izin pada `permissionRequests` dan disetujui Asprak -> tercatat `attendanceStatus: 'izin'` (`latenessStatus: 'excused'`) pada `sessions/{sessionId}/attendance/{studentId}`, bebas denda, dan statusnya tidak berubah menjadi `hadir`.
5. **Praktikan C** presensi melewati batas *grace period* -> tercatat `attendanceStatus: 'hadir'` (`latenessStatus: 'late'`) pada `sessions/{sessionId}/attendance/{studentId}`, otomatis terbit tepat 1 tagihan denda di `fines/{sessionId}_{studentId}`, dan **notifikasi tagihan denda baru (fitur Anna)** langsung muncul di koleksi `notifications`.
6. **Praktikan C (fitur Anna)** membuka menu Denda, menekan **Bayar Denda**, menyelesaikan pembayaran di halaman Midtrans Snap Sandbox -> webhook backend memverifikasi pembayaran -> status pada `paymentTransactions` menjadi `success` dan pada `fines` menjadi `paid`, muncul **notifikasi pembayaran berhasil**, tercatat di **Riwayat Pembayaran** (tanpa mengubah status kehadiran `late`), dan langsung terefleksi pada **Riwayat Keuangan Denda di Dashboard Aslab (fitur Quinta)** sesuai filter Hari/Minggu/Bulan.
