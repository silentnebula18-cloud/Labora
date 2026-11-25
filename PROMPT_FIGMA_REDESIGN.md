# Panduan & Prompt Desain Ulang UI Figma — Aplikasi Labora (SRS-001 s.d. SRS-018)

Dokumen ini berisi **kumpulan prompt siap *copy-paste*** untuk digunakan di **Figma Make / Figma AI** (atau desainer UI) guna merancang ulang antarmuka aplikasi mobile **Labora** dengan mengambil inspirasi visual dari **2 gambar referensi** Anda (*Finora* & *Hospital App UI*).

---

## 1. Bedah Gaya Visual dari 2 Gambar Referensi Anda

Sebelum masuk ke prompt, berikut prinsip desain yang diambil dari kedua referensi agar hasilnya **clean, simpel, profesional, tidak penuh sesak, dan minim gradasi**:

| Aspek Desain | Inspirasi dari Referensi 1 (*Finora*) | Inspirasi dari Referensi 2 (*Hospital App UI*) | Penerapan pada **Labora** |
| :--- | :--- | :--- | :--- |
| **Latar & Permukaan** | Dominasi putih bersih (`#FFFFFF`) & abu-abu sangat tipis (`#F8FAFC`). | Kartu putih ber-border tipis (`1px #E2E8F0`) tanpa bayangan berat. | Menghilangkan blok header gelap yang berat; ganti dengan **header terang yang lega**. |
| **Warna Aksen** | 1 warna solid profesional: **Deep Emerald / Teal** (`#0F766E`), tanpa gradasi mencolok. | Aksen **Clean Teal** (`#0D9488`) + tint lembut (`#F0FDFA`) untuk ikon dan *chip* aktif. | 100% **flat solid color** (tanpa gradasi ramai), warna status hanya dipakai untuk badge kecil. |
| **Anti-Menumpuk** | 1 Hero Card ringkas + 4 *Quick Action* kecil + 1 daftar pendek dengan tombol *"Lihat Semua →"*. | Pemisahan ruang napas (*whitespace*) lebar antar seksi; tiap halaman punya 1 tugas utama. | Memecah Beranda agar tidak menumpuk semua fitur & daftar panjang dalam 1 layar. |
| **Komponen Khas** | Segmented tab pill bersih, halaman Profil ala menu list rapi, Bottom Nav ikon garis tipis. | **Kalender + Grid Slot Jam** (*Book Appointment*) & **Kartu Peta + Jarak Live** (*Tracking*). | Dipakai langsung untuk **Form Jadwal Praktikum (durasi 2 jam)** & **Peta Lab / Validasi GPS**. |

---

## 2. Cara Menggunakan Prompt Ini di Figma

1. **Lampirkan kedua gambar referensi** (*Finora* & *Hospital App UI*) ke prompt Figma Make / Figma AI Anda.
2. **Disarankan menggunakan pendekatan bertahap (*per Batch*)** agar Figma menghasilkan detail yang rapi dan tidak memotong layar:
   - Mulai dengan menyalin **Master Prompt (Bagian 3)** terlebih dahulu.
   - Lanjutkan dengan **Batch 1 → Batch 2 → Batch 3 → Batch 4 (Bagian 4)** secara berurutan pada percakapan Figma yang sama.
3. Jika Anda ingin langsung membuat prototipe keseluruhan dalam **1 kali kirim**, gunakan **One-Shot Mega Prompt (Bagian 5)**.
4. Seluruh prompt ditulis dalam **bahasa Inggris terstruktur** (karena Figma AI paling akurat memahaminya), sementara **seluruh teks UI di dalam layar tetap berbahasa Indonesia** sesuai aplikasi Labora.

---

## 3. Master Prompt (Design System & Aturan Global)

Salin dan kirim prompt ini pertama kali ke Figma bersama **2 gambar referensi**:

```text
Act as a Senior Mobile Product Designer (UI/UX). Design a clean, minimal, professional mobile app UI for "Labora" — a University Laboratory Practicum & Attendance Management app (iOS & Android, frame size 390 x 844 px, Auto Layout).

VISUAL REFERENCE & STYLE DIRECTION:
Use the two attached reference images as visual inspiration for layout clarity, typography, spacing, and color restraint:
- Clean white & off-white canvas (#FFFFFF and #F8FAFC) with generous whitespace.
- Single primary accent color: Solid Deep Teal / Emerald (#0F766E) with a very soft mint surface tint (#F0FDFA / #ECFDF5) for icon containers and active chips.
- STRICT NO HEAVY GRADIENTS: Use flat solid colors only. Avoid glossy effects, neon colors, or heavy drop shadows. Use subtle 1px borders (#E2E8F0) and clean rounded corners (12px–16px for cards, 10px–12px for buttons/inputs, pill radius for badges).
- Typography: Clean modern geometric sans-serif (Inter / Plus Jakarta Sans). Strong visual hierarchy: Page Title (20–22px SemiBold #0F172A), Section Header (15–16px SemiBold #0F172A), Body (14px Regular #334155), Caption/Meta (12px Medium #64748B).
- Icons: Crisp thin-stroke minimalist outline icons (Lucide / Feather style). NO emojis anywhere in the UI.
- Semantic status badges (soft pastel pill background + high-contrast text, small & unobtrusive):
  * Open / Present / Approved / Inside Radius / Positive AI: bg #ECFDF5, text #047857
  * Pending / Waiting: bg #FFFBEB, text #B45309
  * Closed / Scheduled / Neutral AI: bg #F1F5F9, text #475569
  * Error / Rejected / Outside Radius / Negative AI: bg #FEF2F2, text #B91C1C

UX & ANTI-CLUTTER PRINCIPLES (CRITICAL):
1. Progressive Disclosure: Never cram too much information onto a single screen. Each screen must focus on ONE clear primary task.
2. Clean Light Top Header: Use a white/light greeting header ("Selamat datang, [Nama]" on the left + notification bell with subtle dot badge on the right) instead of bulky dark colored headers.
3. Concise Cards: Show at most 3–4 essential data points per list card (Status badge, Title, Subtitle, Time/Room). Move secondary metadata (timestamps, full details, audit logs) into detail screens or bottom sheets.
4. Consistent Required Field Indicator: Display a subtle red asterisk (*) next to required field labels on all feature forms (Class, Schedule, Attendance Code, Permission Request, Lab Form), EXCEPT on Login and Register screens.
5. Language: All visible UI copy, labels, buttons, tabs, and sample data MUST be in natural, concise Indonesian.

Acknowledge this design system and wait for the screen batches, OR begin with Batch 1 when provided.
```

---

## 4. Prompt Siap Copy-Paste per Batch Halaman

### Batch 1 — Autentikasi & Pilih Peran (SRS-001, SRS-002, SRS-003)

```text
Using the Labora Design System above, design Batch 1 (3 mobile screens, 390x844 px):

1. LOGIN SCREEN ("Masuk")
- Clean white background with generous top spacing.
- Minimal brand mark "Labora" (small teal icon + wordmark) and subtitle "Masuk untuk melanjutkan".
- Two clean outlined inputs (NO red asterisks):
  * "Email" (placeholder: "nama@mahasiswa.ac.id")
  * "Kata Sandi" with right-side eye/toggle icon ("Tampilkan")
- Inline subtle error banner variant (soft red #FEF2F2) shown optionally as a component state.
- Full-width solid teal primary button (#0F766E): "Masuk".
- Footer link: "Belum punya akun? Daftar".

2. REGISTER SCREEN ("Daftar Akun")
- Back arrow top-left, title "Buat Akun Baru", subtitle "Lengkapi data mahasiswa untuk mendaftar".
- Clean vertical form (NO red asterisks, airy spacing 14px between fields):
  * "Nama Lengkap"
  * "NIM" (helper note: "14 digit angka")
  * "Email"
  * "Kata Sandi" (placeholder: "Minimal 6 karakter")
  * "Konfirmasi Kata Sandi"
- Full-width solid teal primary button: "Daftar".
- Footer link: "Sudah punya akun? Masuk".

3. ROLE SELECTION SCREEN ("Pilih Peran")
- Appears for multi-role users.
- Clean greeting: "Halo, Farhan Dwiyan" and subtitle "Pilih peran untuk masuk ke aplikasi".
- Two spacious selectable white cards with 1px #E2E8F0 border, left soft-mint icon container, title, 1-line description, and right chevron:
  * Card 1: "Praktikan" — "Lihat jadwal, lakukan presensi, dan ajukan izin."
  * Card 2: "Asisten Praktikum" — "Kelola kelas, jadwal, sesi, lab, dan izin."
- Subtle text link at bottom: "Bukan akun Anda? Keluar".
```

---

### Batch 2 — Alur Praktikan (SRS-008, SRS-009, SRS-010, SRS-013, SRS-014, SRS-016)

```text
Using the Labora Design System and both visual references (Finora home structure + Hospital App clean cards & map card), design Batch 2 — Student ("Praktikan") Flow (5 mobile screens, 390x844 px).
Bottom Navigation Bar for Praktikan (white bar, top 1px border #E2E8F0, 4 clean tabs): "Beranda", "Presensi", "Peta", "Profil".

1. BERANDA PRAKTIKAN (Home — Clean & Uncluttered)
- Light top header: Greeting "Selamat datang,", bold name "Farhan Dwiyan" + muted "NIM 24060122140001" on the left; subtle role chip "Praktikan" + Notification Bell icon button (with small red unread count dot) on the right.
- 1 Compact Solid Teal Summary Card (inspired by Finora's top balance card, flat solid #0F766E):
  * Label: "Kehadiran Praktikum"
  * Large clean figure: "85%" + subtitle "11 dari 13 sesi hadir"
  * Right-side small pill button: "Riwayat →"
- 3 Clean Quick Action Squircle Buttons in a horizontal row (soft mint #F0FDFA icon boxes + short label underneath, keeping the screen super clean):
  * "Presensi" (check-circle icon)
  * "Ajukan Izin" (file-text icon)
  * "Peta Lab" (map-pin icon)
- Clean Segmented Control Pill (2 options only so it never feels crowded): "Jadwal" | "Kelas Saya".
- Under "Jadwal", show only 2–3 spacious upcoming session cards (with "Lihat Semua →"):
  * Card layout: Top row (Status badge "Presensi Dibuka" green OR "Terjadwal" gray + "Kelas A1" tag), Course Title ("Pemrograman Perangkat Bergerak"), 1-line Topic ("Pertemuan 5 · Validasi Lokasi"), subtle divider, compact bottom metadata row (Calendar date, Clock "07:40–09:40", Lab Room "Lab Komputer B").
  * Include a small green "Hadir" chip if already attended.

2. PRESENSI PRAKTIKAN (Tab "Presensi" — SRS-013 & SRS-014)
- Clean header: Title "Presensi Praktikum", subtitle "Masukkan kode sesi dari asisten".
- Focused Code Input Card (white card, 1px border):
  * Label: "Kode Presensi Sesi *" (red asterisk).
  * Large centered monospace/wide-tracked code input box (e.g. "A154829") + small "Reset" text action.
- Matched Session Preview Card (compact, clean — appears when code matches):
  * Status badge "Presensi Dibuka", Course name, "Pertemuan 5 · Kelas A1", Room "Lab Komputer B", Time "07:40–09:40 WIB".
- Clean GPS Location Validation Card (inspired by Hospital App's tracking card, flat soft mint/red tint depending on state):
  * Header: Location pin icon + "Validasi Lokasi" + small text button "Perbarui".
  * Status line: "Di dalam radius Lab Komputer B"
  * Two neat metric columns: "Jarak Anda: 18 m" | "Batas Radius: 50 m".
  * (Also design a small compact variant for Error / Out of Radius state: "Lokasi di luar radius laboratorium" with red soft tint).
- Full-width solid teal CTA button at bottom: "Lakukan Presensi Sekarang".

3. DETAIL SESI PRAKTIKAN (Read-Only Session & Attendance History)
- Top bar: Back arrow + "Detail Sesi".
- Session Summary Card: Status badge, Course, Meeting & Topic, clean key-value rows (Kelas, Ruang, Tanggal, Waktu).
- Attendance Status Card (clean callout box):
  * Example state: Soft green box with check icon, "Tercatat Hadir", "Pukul 07:48 WIB · Jarak 18 m dari Lab".
- Subtle secondary action card at bottom: "Berhalangan hadir? Ajukan Izin →" (links to Permission screen).

4. PENGAJUAN & RIWAYAT IZIN PRAKTIKAN (SRS-009 & SRS-010)
- Top bar: Back arrow + "Pengajuan Izin".
- Clean 2-tab segmented pill: "Ajukan Izin" | "Riwayat (2)".
- Under "Ajukan Izin" (clean, step-by-step form):
  * Field 1: "Pilih Sesi Praktikum *" — clean dropdown selector card showing selected session summary.
  * Field 2: "Alasan Ketidakhadiran *" — clean multiline text area with character counter "120/500" + subtle outlined button "Cek Sentimen AI".
  * Compact AI Preview Pill Card (soft tint): "Analisis AI: Sentimen Positif · Keyakinan 89%".
  * Full-width primary button: "Kirim Pengajuan Izin".
- Show a second side-by-side frame for the "Riwayat" tab with clean list cards showing Status badge ("Menunggu" / "Disetujui" / "Ditolak"), Course + Meeting, 2-line reason preview, and small AI sentiment pill.

5. PETA INTERAKTIF LABORATORIUM — PRAKTIKAN (Tab "Peta" — SRS-016)
- Inspired by Hospital App's clean map tracking screen.
- Full-bleed clean map view with teal circular geofence overlays and crisp minimalist lab pins ("Lab B", "Lab C", "Lab D", "Lab AP") + blue user GPS dot.
- Floating white top bar: Search/filter lab chip row ("Semua Lab", "Lab Komputer B", "Lab Komputer C") + floating circular GPS Recenter button on right.
- Clean rounded Bottom Sheet Card (LabDetailCard) at bottom:
  * Drag handle, Lab Name "Laboratorium Komputer B", "Aktif" pill, address line.
  * Compact distance bar: "Jarak Anda: 18 m · Radius: 50 m · Di Dalam Radius".
  * Clean 1-item preview of "Praktikum Berlangsung" (Course, Class, Time) and "Berikutnya".
```

---

### Batch 3 — Alur Asisten Praktikum (SRS-004, SRS-005, SRS-006, SRS-007, SRS-011, SRS-015, SRS-016)

```text
Using the exact same Labora Design System (clean white surfaces, flat solid teal #0F766E, zero heavy gradients, high whitespace, anti-clutter layout), design Batch 3 — Assistant ("Asisten Praktikum") Flow (6 mobile screens, 390x844 px).
Bottom Navigation Bar for Asisten (white bar, 4 clean tabs so home is NEVER overcrowded): "Beranda", "Kelas", "Izin", "Profil".

1. BERANDA ASISTEN (Home — Super Clean & Actionable)
- Light top header: Greeting "Selamat datang,", bold name "Farhan Dwiyan" + subtle "Asisten" badge on left; Notification Bell with unread dot on right.
- 1 Compact Solid Teal Summary Card (#0F766E):
  * Two clean side-by-side metrics: "3 Kelas Aktif" | "2 Izin Menunggu"
  * Right subtle action: "Periksa Izin →"
- 4 Clean Quick Action Squircle Tiles in a single horizontal row (identical rhythm to Finora reference, soft mint #F0FDFA background):
  * "+ Jadwal" (opens Schedule Form Modal)
  * "Kelola Lab" (opens Lab Management SRS-015)
  * "Peta Lab" (opens Interactive Map SRS-016)
  * "Kelas" (opens Class List)
- Segmented filter pill: "Aktif & Mendatang" | "Selesai".
- Clean list of Session Cards (max 3 visible without clutter): Status badge ("Sesi Dibuka" / "Terjadwal"), "Kelas A1", Course Name, "Pertemuan 5 · Validasi Lokasi", Date · Time · Room.

2. KELOLA KELAS & DETAIL PESERTA (2 screens — SRS-004 & SRS-005)
- Screen 2A — Daftar Kelas (Tab "Kelas"):
  * Header "Kelola Kelas" + top-right solid teal button "+ Kelas".
  * Clean list of class cards: Pill "Kelas A1", Course Name, subtle meta "28 Peserta · Dibuat 12 Okt 2026", right chevron.
- Screen 2B — Detail Kelas & Peserta:
  * Top bar: Back arrow + "Detail Kelas" + subtle top-right Edit/Delete icon buttons (keeps actions neat instead of bulky buttons).
  * Compact Class Header Card: "Kelas A1", Course Name, "2 Asisten Pengampu".
  * Section header: "Peserta Kelas (28)" + small teal text button "+ Tambah NIM".
  * Clean flat list of students: Soft circular initials avatar, Student Name, "NIM 24060122140001", subtle trash/remove icon on right.

3. DETAIL SESI & REKAP PRESENSI ASISTEN (SRS-007 & SRS-013)
- Top bar: Back arrow + "Detail Sesi" + right overflow/edit icon button (for Ubah Jadwal / Hapus Jadwal, keeping the card clean!).
- Session Header Card:
  * Status badge ("Sedang Dibuka"), Course Name, "Pertemuan 5 · Kelas A1", Date, Time, Room.
  * Highlighted Clean Attendance Code Box (soft mint #F0FDFA, dashed or 1px teal border): Label "KODE PRESENSI SESI" + large bold monospace code "A154829" + subtle copy icon.
  * Compact inline link: "Periksa Izin Sesi Ini →".
- Single Primary Session Action Button (context-dependent):
  * Green/Teal "Buka Sesi Praktikum" (when scheduled) OR Soft Red Outlined/Solid "Tutup Sesi Praktikum" (when open).
- Real-Time Attendance List Section:
  * Section header: "Daftar Kehadiran" + clean pill "24 / 28 Hadir".
  * Compact numbered rows: Index "1", Student Name + NIM, right-aligned check-in time "07:45:12".

4. PEMERIKSAAN IZIN — DAFTAR & DETAIL KEPUTUSAN (2 screens — SRS-010 & SRS-011)
- Screen 4A — Daftar Pengajuan Izin (Tab "Izin"):
  * Header "Pemeriksaan Izin".
  * Clean search bar (inspired by Hospital App): "Cari nama atau NIM praktikan…".
  * 3 clean filter pill tabs with counts: "Menunggu (2)" | "Disetujui (5)" | "Ditolak (1)".
  * Spacious permission cards: Top row (Status badge + relative time), Student Name & NIM, "Kelas A1 · Pertemuan 5", 2-line reason excerpt, bottom row (small AI sentiment pill "AI: Positif 89%" + "Detail →").
- Screen 4B — Detail & Keputusan Izin:
  * Top bar: Back arrow + "Detail Pengajuan Izin".
  * Student & Session Compact Info Card (combined neatly into 1 structured card with divider so info isn't fragmented into 5 separate boxes).
  * Reason Card: Full student explanation text.
  * AI Sentiment Card (clean soft-tinted callout): Badge "Sentimen Positif", clean horizontal confidence bar "89%", short note "Rekomendasi pendukung keputusan".
  * Sticky bottom decision bar (only for pending requests): Two equal buttons side-by-side — Outlined Red "Tolak" and Solid Teal "Setujui".

5. KELOLA LOKASI LABORATORIUM — ASISTEN (SRS-015)
- Top bar: Back arrow + "Lokasi Laboratorium" + top-right "+ Tambah".
- Clean search input: "Cari nama atau alamat lab…".
- Clean list of Laboratory Cards:
  * Lab Name ("Laboratorium Komputer B"), Status toggle/badge ("Aktif"), 1-line address.
  * Clean metadata pills: "Radius 50 m" · "-7.0512, 110.4401".
  * Compact action row: "Ubah" | "Nonaktifkan" | "Hapus".
```

---

### Batch 4 — Profil, Notifikasi & Modal/Bottom Sheet (SRS-004, SRS-006, SRS-007, SRS-015, SRS-017, SRS-018)

```text
Using the Labora Design System and both references (Finora profile screen & Hospital App Book Appointment calendar/time-slot picker), design Batch 4 — Shared Profile, Notification Drawer, and Key Modals (5 clean screens/overlays, 390x844 px):

1. PROFIL PENGGUNA (Tab "Profil" — inspired by Finora's Profile Screen)
- Clean top section: Circular avatar with initials/icon, User Name "Farhan Dwiyan", Email, and subtle role pill "Praktikan".
- Clean structured Identity List Card (white card, hairline dividers):
  * "Nama Lengkap"
  * "NIM"
  * "Email"
  * "Peran Terdaftar"
- Action list items (clean rows with icon + label + chevron):
  * "Ganti Peran Aktif" (shown for multi-role accounts)
  * "Status Izin Lokasi & Notifikasi" (links to device settings if disabled — SRS-018)
- Soft red tinted full-width button at bottom: "Keluar dari Akun".

2. MODAL TAMBAH / UBAH JADWAL PRAKTIKUM (Inspired by Hospital App "Book Appointment" Screen — SRS-006)
- Clean bottom sheet / modal with drag handle, title "Tambah Jadwal Praktikum", close button (X).
- Structured, breathable form (red asterisk * on required labels):
  * "Kelas Praktikum *" — horizontal scrollable class chips ("A1 · PBO", "B2 · Basis Data").
  * Inline row: "Pertemuan *" (compact number input) + "Topik Praktikum *" (text input).
  * "Tanggal Pelaksanaan *" — clean date selector field + quick pill chips ("Hari Ini", "Besok").
  * "Slot Waktu (Durasi 2 Jam) *" — clean selectable grid of time-slot pills (just like Hospital App's Select Time!):
    "07:40–09:40", "09:40–11:40", "13:00–15:00", "15:30–17:30", "18:10–20:10" + manual start/end time trigger.
  * "Ruang Laboratorium *" — selectable lab chips ("Lab Komputer B", "Lab Komputer C", "Lab Komputer D", "Lab Komputer AP").
- Sticky bottom bar: "Batal" + solid teal "Simpan Jadwal".

3. MODAL TAMBAH / UBAH LABORATORIUM (SRS-015)
- Clean modal/sheet: "Tambah Laboratorium".
- Required fields with red asterisk (*): "Nama Laboratorium *", "Alamat *", "Latitude *", "Longitude *", "Radius Validasi (meter) *".
- Clean soft-mint helper button next to coordinates: "Ambil Lokasi GPS Saat Ini".
- Optional field: "Deskripsi Singkat".
- Bottom buttons: "Batal" + "Simpan Lab".

4. BOTTOM SHEET KONFIRMASI BUKA / TUTUP SESI (SRS-007)
- Clean rounded bottom sheet with drag handle.
- Small centered icon circle (teal play icon for Open / soft red stop icon for Close), concise Title ("Tutup Sesi Praktikum"), 1-line subtitle.
- Compact Attendance Summary Row (3 clean soft metric tiles: "24 Hadir" | "4 Belum" | "28 Total") + thin teal progress bar ("86% Kehadiran").
- Two side-by-side buttons: Outlined "Batal" + Primary action button ("Ya, Tutup Sesi").

5. NOTIFICATION DRAWER & IN-APP TOAST + PERMISSION BANNER (SRS-017 & SRS-018)
- Notification Drawer Modal:
  * Header "Notifikasi" + text button "Tandai Semua Dibaca" + close (X).
  * Compact Device Permission Banner (appears only if OS notification permission is off — soft amber #FFFBEB): "Notifikasi HP nonaktif · Aktifkan →".
  * Clean flat notification rows (unread items have subtle #F0FDFA tint + tiny teal dot):
    - Icon circle (Session Opened / Schedule Updated / Permission Decided), Title, 2-line body, relative timestamp ("5 mnt lalu").
- Separate compact Floating In-App Toast Banner component (top overlay, white card, subtle shadow, left teal accent icon, title, 1-line message).
```

---

## 5. One-Shot Mega Prompt (Alternatif 1 Kali Kirim untuk Figma Make)

Jika Anda ingin langsung mem-generate prototipe utuh dalam **1 kali prompt** di Figma Make (lalu menyempurnakan layar tertentu saja sesudahnya), salin prompt ringkas di bawah ini dan lampirkan kedua gambar referensi Anda:

```text
Design a clean, minimal, professional mobile app prototype named "Labora" (University Laboratory Practicum & Attendance App, 390x844 px, Indonesian UI copy) inspired by the two attached references (Finora + Hospital App UI).

VISUAL STYLE RULES:
- Pure white (#FFFFFF) and ultra-light neutral (#F8FAFC) backgrounds with generous whitespace.
- Single solid primary brand color: Deep Teal / Emerald (#0F766E) with soft mint tint (#F0FDFA) for icon badges and active chips.
- STRICTLY NO HEAVY GRADIENTS, NO EMOJIS, NO VISUAL CLUTTER. Use flat cards with 1px #E2E8F0 borders, thin outline vector icons, and clean geometric sans-serif typography (Plus Jakarta Sans / Inter).
- Anti-clutter rule: Each screen focuses on ONE primary task. Use a clean light greeting header (never a bulky dark header) and organize features via a clean 4-tab white bottom navigation bar instead of stacking everything on the Home screen.
- Red asterisk (*) on required labels for feature forms only (NOT on Login/Register).

INCLUDE THESE CORE SCREENS:
1. Auth: Login, Register (Nama, NIM 14 digit, Email, Password), Role Picker (Praktikan / Asisten).
2. Praktikan Flow (4 Bottom Tabs: Beranda, Presensi, Peta, Profil):
   - Beranda: Light greeting + notification bell, 1 compact teal Attendance Summary Card (85%), 3 quick squircle actions (Presensi, Izin, Peta Lab), segmented tab (Jadwal | Kelas Saya), concise session cards.
   - Presensi (SRS-013 & SRS-014): 7-char Session Code input ("A154829"), matched session preview card, clean GPS Proximity Card ("Jarak Anda: 18 m · Radius: 50 m · Di Dalam Radius"), solid teal "Lakukan Presensi Sekarang" button.
   - Peta Lab (SRS-016): Interactive map with lab geofence circles, floating lab filter chips, and bottom detail sheet showing distance & ongoing/upcoming practicum.
   - Pengajuan Izin (SRS-009 & SRS-010): 2 tabs (Ajukan Izin | Riwayat) with session picker, reason textarea, AI Sentiment preview pill, and status history.
3. Asisten Flow (4 Bottom Tabs: Beranda, Kelas, Izin, Profil):
   - Beranda: Light greeting + notification bell, 1 compact teal Summary Card (Kelas Aktif & Izin Menunggu), 4 quick squircle actions (+ Jadwal, Kelola Lab, Peta Lab, Kelas), clean session list (Aktif & Mendatang | Selesai).
   - Kelola Kelas & Peserta (SRS-004 & SRS-005): Class list and class detail with NIM student roster.
   - Detail Sesi Asisten (SRS-007): Session info, highlighted Attendance Code box ("A154829"), Open/Close Session CTA, and real-time attendance list.
   - Pemeriksaan Izin (SRS-011): Search Nama/NIM, status tabs (Menunggu | Disetujui | Ditolak), detail view with AI Sentiment confidence bar and Approve/Reject actions.
   - Kelola Lokasi Lab (SRS-015) & Form Tambah Jadwal (SRS-006): Calendar + 2-hour time-slot chip picker inspired by the Hospital App booking UI.
4. Shared Overlays: Clean Profile screen (with role switcher & logout), Notification Drawer with unread states & permission warning banner (SRS-017 & SRS-018), and Session Confirmation Bottom Sheet.
```

---

## 6. Checklist Sebelum Menyerahkan Desain Figma ke Saya untuk Diimplementasikan

Saat desain di Figma sudah selesai dan ingin Anda berikan ke saya untuk diubah menjadi kode React Native (Expo), pastikan hal-hal berikut sudah sesuai:
- [ ] **Palet warna seragam** di seluruh layar (tidak ada sisa warna ungu/biru lama yang bertabrakan).
- [ ] **Navigasi 4 tab bawah** jelas untuk Praktikan (`Beranda`, `Presensi`, `Peta`, `Profil`) dan Asisten (`Beranda`, `Kelas`, `Izin`, `Profil`).
- [ ] **Seluruh elemen fungsional wajib masih ada:** Kode presensi 7 karakter, status jarak GPS vs radius, sentimen AI pada izin, slot waktu 2 jam (`07:40`–`20:10`), tombol lonceng notifikasi, dan banner izin lokasi/notifikasi.
- [ ] Anda dapat menyerahkan hasilnya ke saya dalam bentuk **screenshot per layar / per batch** (atau melalui link Figma jika plugin Figma dihubungkan), lalu kita terapkan langsung di branch `feat/improve-ui` agar branch `main` tetap aman.
