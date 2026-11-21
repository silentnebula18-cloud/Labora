# Struktur Cloud Firestore — Aplikasi Labora

Berikut adalah struktur *collection*, *subcollection*, dan *field* **Cloud Firestore** yang digunakan pada aplikasi **Labora**:

---

### 1. Collection `users/{uid}`
- **Document ID:** `uid` (Firebase Authentication UID)
- **Fields:**
  - `uid`: `string` *(sama dengan Document ID)*
  - `nama`: `string`
  - `nim`: `string` *(14 digit angka)*
  - `email`: `string` *(huruf kecil)*
  - `roles`: `string[]` *(contoh: `["praktikan"]` atau `["praktikan", "asisten"]`)*
  - `activeRole`: `"praktikan" | "asisten" | null`
  - `createdAt`: `Timestamp`

---

### 2. Collection `classes/{classId}`
- **Document ID:** Auto-generated ID
- **Fields:**
  - `mataKuliah`: `string`
  - `kodeKelas`: `string` *(kode kelas `"A1"`–`"E2"`)*
  - `assistants`: `string[]` *(array UID asisten pengampu)*
  - `createdBy`: `string` *(UID asisten pembuat)*
  - `memberIds`: `string[]` *(array UID praktikan yang ditambahkan oleh asisten)*
  - `createdAt`: `Timestamp`
- **Subcollection `classes/{classId}/members/{uid}`:**
  - **Document ID:** `uid` praktikan
  - **Fields:**
    - `uid`: `string`
    - `nama`: `string`
    - `nim`: `string`
    - `email`: `string`
    - `joinedAt`: `Timestamp`

---

### 3. Collection `schedules/{scheduleId}`
- **Document ID:** Auto-generated ID
- **Fields:**
  - `classId`: `string` *(referensi ke `classes/{classId}`)*
  - `mataKuliah`: `string`
  - `kodeKelas`: `string` *(kode kelas `"A1"`–`"E2"`)*
  - `nomorPraktikum`: `number`
  - `namaPraktikum`: `string`
  - `tanggal`: `Timestamp` *(tanggal pelaksanaan praktikum)*
  - `jamMulai`: `Timestamp` *(waktu mulai praktikum, rentang `07:40` – `18:10` WIB)*
  - `jamSelesai`: `Timestamp` *(waktu selesai praktikum, wajib berdurasi tepat 2 jam / 120 menit dari `jamMulai`, rentang `09:40` – `20:10` WIB)*
  - `ruang`: `string`
  - `assistants`: `string[]` *(array UID asisten dari kelas)*
  - `createdBy`: `string` *(UID asisten pembuat)*
  - `createdAt`: `Timestamp`
  - `updatedAt`: `Timestamp`

---

### 4. Collection `sessions/{sessionId}`
- **Document ID:** Sama dengan `scheduleId`
- **Fields:**
  - `scheduleId`: `string` *(referensi ke `schedules/{scheduleId}`)*
  - `classId`: `string` *(referensi ke `classes/{classId}`)*
  - `kodeKelas`: `string` *(kode kelas `"A1"`–`"E2"`)*
  - `kodePresensi`: `string` *(kode unik beridentitas kelas & pertemuan, format `<KodeKelas><Pertemuan><4DigitAcak>`, contoh `"A114829"`)*
  - `status`: `"scheduled" | "open" | "closed"`
  - `openedAt`: `Timestamp | null`
  - `closedAt`: `Timestamp | null`
  - `openedBy`: `string | null` *(UID asisten yang membuka sesi)*
  - `closedBy`: `string | null` *(UID asisten yang menutup sesi atau `"system"`)*
  - `updatedBy`: `string | null` *(UID asisten terakhir yang memperbarui sesi)*
  - `updatedAt`: `Timestamp`
- **Subcollection `sessions/{sessionId}/attendance/{studentId}`:**
  - **Document ID:** `studentId` (`uid` praktikan)
  - **Fields:**
    - `studentId`: `string` *(UID praktikan)*
    - `nama`: `string`
    - `nim`: `string`
    - `sessionId`: `string`
    - `waktuHadir`: `Timestamp`
    - `latitude`: `number` *(koordinat latitude perangkat praktikan saat presensi — SRS-014)*
    - `longitude`: `number` *(koordinat longitude perangkat praktikan saat presensi — SRS-014)*
    - `jarakMeter`: `number` *(jarak praktikan ke laboratorium dalam meter saat presensi — SRS-014)*
    - `radiusMeter`: `number` *(batas radius laboratorium dalam meter — SRS-014)*

---

### 5. Collection `permissionRequests/{permissionId}`
- **Document ID:** Auto-generated ID
- **Fields:**
  - `uid`: `string` *(UID praktikan yang mengajukan izin)*
  - `nama`: `string` *(nama praktikan)*
  - `nim`: `string` *(14 digit NIM praktikan)*
  - `classId`: `string` *(referensi ke `classes/{classId}`)*
  - `sessionId`: `string` *(referensi ke `sessions/{sessionId}`, nilainya sama dengan `scheduleId`)*
  - `mataKuliah`: `string`
  - `namaPraktikum`: `string`
  - `nomorPraktikum`: `number`
  - `alasan`: `string`
  - `status`: `"pending" | "approved" | "rejected"`
  - `aiStatus`: `"success" | "failed"`
  - `aiCategory`: `"positif" | "netral" | "negatif" | null`
  - `aiConfidence`: `number | null` *(double/float 0–1 atau null)*
  - `aiProcessedAt`: `Timestamp | null`
  - `decidedBy`: `string | null` *(UID asisten yang memutuskan, null saat pending)*
  - `decidedAt`: `Timestamp | null` *(waktu keputusan asisten, null saat pending)*
  - `createdAt`: `Timestamp`

---

### 6. Collection `laboratories/{labId}` *(SRS-014 & SRS-015)*
- **Document ID:** Auto-generated ID atau slug ruangan
- **Fields:**
  - `nama`: `string` *(nama laboratorium, contoh `"Laboratorium Komputer B"`, `"Laboratorium Komputer C"`, `"Laboratorium Komputer D"`, `"Laboratorium Komputer AP"` — cocok dengan field `ruang` pada `schedules` & `sessions`)*
  - `latitude`: `number` *(koordinat titik pusat laboratorium)*
  - `longitude`: `number` *(koordinat titik pusat laboratorium)*
  - `radius`: `number` *(batas jarak presensi dalam satuan meter, contoh `50`)*
  - `updatedAt`: `Timestamp` *(opsional)*
  - `updatedBy`: `string` *(opsional, UID asisten)*


