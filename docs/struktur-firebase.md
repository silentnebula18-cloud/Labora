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
  - `tanggal`: `string` *(format `"YYYY-MM-DD"`)*
  - `jamMulai`: `string` *(format `"HH:mm"`)*
  - `jamSelesai`: `string` *(format `"HH:mm"`)*
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

