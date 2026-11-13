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

**Style**
Pastikan UI yang akan dibuat mudah untuk digunakan dan terdapat 2 halaman menu menggunakan buttom navbar untuk memisahkan antara halaman profil dan halaman utama. Tampilan atau fitur logout pindahkan pada menu profie bagian bawah. pasikan menu profil memuat identitas user seperti nim, nama, email. Foto bagian profile diubah menjadi bentuk icon user dan icon user berada di tengah atas sedangkan informasi user berada di bawah icon user. 

**Instruksi**
Buatkan saya sebuah planning dengan lengkap disertai alur pada masing-masing fitur yang akan dirubah serta file mana saja yang perlu diedit dan apakah terdapat perubahan pada firebase yang perlu saya lakukan secara manual untuk mengimplementasikan SRS 006 ini di project saya. Pastikan planning yang telah anda buat dapat dimengerti oleh seorang mahasiswa atau model AI yang lebih murah.

Buat dalam bentuk planning.md