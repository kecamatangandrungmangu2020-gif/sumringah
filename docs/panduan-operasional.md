# Panduan Operasional Sistem Manajemen Kecamatan Gandrungmangu

Dokumen ini berisi petunjuk penggunaan rinci untuk seluruh fitur yang tersedia di portal Manajemen Kecamatan, Admin Absensi, dan Absensi Karyawan.

---

## 1. PORTAL ABSENSI (Untuk Karyawan Kecamatan)
Portal ini dirancang untuk penggunaan harian oleh Karyawan Kecamatan melalui smartphone di lokasi kantor.

### Cara Masuk
*   Akses halaman utama.
*   Pilih tombol **"Absensi Karyawan"**.
*   Gunakan **Username** (huruf kecil semua) dan **Kata Sandi** yang telah diberikan oleh Admin.

### Menu Utama (Dashboard)
*   **Status GPS:** Sistem otomatis mendeteksi lokasi Anda.
    *   **Warna Hijau (Dalam Radius):** Anda diizinkan melakukan absen.
    *   **Warna Merah (Luar Radius):** Tombol absen akan terkunci hingga Anda berada di area kantor.
*   **Absen Masuk:** Klik tombol besar berwarna biru saat tiba di kantor. Jika melewati jam masuk + toleransi, status otomatis tercatat "TELAT".
*   **Absen Pulang:** Klik tombol ini sebelum pulang. Data jam kerja harian akan terhitung otomatis dan muncul di panel monitoring admin.
*   **Riwayat Kehadiran:** Di bagian bawah dashboard, Anda dapat melihat daftar kehadiran Anda selama satu bulan terakhir lengkap dengan jam masuk/pulang.

---

## 2. PORTAL ADMIN ABSENSI (Untuk Petugas Kontrol)
Portal khusus untuk memonitoring kedisiplinan dan mengelola akun Karyawan.

### Menu Monitoring
*   **Grid Real-time:** Menampilkan tabel besar kehadiran seluruh Karyawan secara live.
    *   **Warna Hijau:** Sudah absen masuk & pulang (Hadir).
    *   **Warna Oranye:** Sudah absen masuk, belum absen pulang (Sedang Bekerja).
    *   **Warna Merah:** Tidak ada data absen (Alpha/Tanpa Keterangan).
    *   **Warna Biru:** Status khusus (Izin/Dinas Luar).
*   **Kalkulasi Otomatis:** Menampilkan total detik/jam keterlambatan dan total jam kerja efektif setiap personel.

### Menu Input Absensi
*   **Manual/Massal:** Digunakan untuk menginput absen jika ada Karyawan yang lupa membawa HP atau untuk menginput status "Izin", "Dinas Luar", dan "Sakit" secara kolektif.

### Menu Cetak Dokumen
*   **Laporan Bulanan:** Pilih Bulan dan Tahun, lalu klik **"Unduh Laporan PDF"** untuk mendapatkan rekap resmi dengan Kop Surat Pemerintah Kecamatan Gandrungmangu. Tersedia juga format **Excel** untuk pengolahan data internal.

### Menu Pengaturan (Konfigurasi)
*   **Waktu & Lokasi:** Mengatur jam masuk, jam pulang, toleransi keterlambatan, titik koordinat kantor (Latitude/Longitude), dan radius jangkauan absen (Meter).
*   **Manajemen Akun:** Menambah Karyawan baru, mengubah jabatan, atau mereset kata sandi jika Karyawan lupa.

---

## 3. PANEL MANAJEMEN Kecamatan (Untuk Admin Pusat)
Pusat kendali administrasi, keuangan, dan dokumentasi Kecamatan.
**Login Khusus:** `gandrungmangu@gmail.id` | **Password:** `gandrungmangu123`

### Menu Dashboard
*   Ringkasan visual jumlah laporan kegiatan, status pengajuan SPPD terbaru, dan widget **Agenda Hari Ini** yang sinkron dengan Google Calendar Kecamatan.

### Menu Informasi APBDes
*   Visualisasi grafik komposisi anggaran (Dana Kecamatan, ADD, PBK).
*   **Fitur Impor:** Anda bisa mengimpor rincian kegiatan APBDes dari file Excel agar nama-nama kegiatan tersebut muncul otomatis di menu "Dokumentasi Kegiatan" dan "SPPD".

### Menu Agenda Kegiatan
*   **Input Baru:** Masukkan acara/undangan ke kalender Kecamatan. Anda bisa mengunggah file Undangan PDF untuk dipindai atau disimpan.
*   **Rincian & Notulensi:** Klik pada agenda yang sudah ada, lalu tulis hasil rapat di kolom **Notulensi**. Klik "Simpan" untuk memperbarui deskripsi di Google Calendar secara otomatis.

### Menu Arsip Digital
*   **SPJ Kecamatan:** Kelola file PDF SPJ berdasarkan bidang pembangunan.
*   **Produk Hukum:** Database penyimpanan Peraturan Kecamatan (Perdes), Perkades, dan SK. File tersimpan aman di Google Drive Kecamatan.

### Menu Register Surat (Buku Agenda)
*   Mencatat secara digital setiap nomor surat keluar, surat masuk, SK, dan SPPD agar penomoran tertib dan tidak ganda.

### Menu Naskah Dinas (Generator)
*   **Buat Naskah:** Pilih jenis (Undangan, SK, Berita Acara, Surat Tugas).
*   **Tarik Nomor:** Klik tombol "Tarik" untuk mengambil nomor urut terbaru dari Buku Agenda secara otomatis.
*   **Cetak PDF:** Naskah yang dibuat akan berformat PDF profesional dengan Kop Surat rapi.

### Menu Manajemen SPPD
*   **Pengajuan:** Input rincian biaya perjalanan dinas.
*   **Cetak Otomatis:** Sistem akan men-generate **Surat Tugas** dan **Lembar SPPD** (halaman 1 & 2) secara otomatis berdasarkan data yang diinput.

### Menu Dokumentasi Kegiatan
*   **Input Laporan:** Dokumentasikan setiap kegiatan fisik maupun sosial.
*   **Bantuan AI:** Klik "Tanya AI" untuk membantu menyusun draf notulen yang formal hanya dengan memasukkan judul kegiatan.
*   **Otomatisasi Drive:** Saat tombol "Simpan" diklik, sistem akan membuat folder khusus di Google Drive, mengunggah foto, dan membuat file PDF Notulen serta BAST secara otomatis.

### Menu Inventaris Dokumen Fisik
*   Fitur khusus untuk proyek pembangunan infrastruktur.
*   Mengelola dokumen dari tahap Proposal, RPD, Berkas PBJ (Lelang), hingga Berita Acara Serah Terima 100%.

### Menu Data Kesehatan
*   Database Posyandu untuk memantau data Balita, Stunting, Lansia, dan Disabilitas. Data bisa diekspor ke Excel untuk laporan ke Kecamatan.

### Menu Pengaturan (Settings)
*   **Logo Karyawan Kecamatan:** Unggah logo PNG transparan untuk digunakan di seluruh dokumen PDF sistem.
*   **Foto Halaman Utama:** Ubah latar belakang foto Kecamatan pada halaman depan aplikasi.
*   **Integrasi Google:** Konfigurasi ID Folder Google Drive dan ID Kalender agar fitur penyimpanan otomatis berfungsi dengan benar.

---

**Catatan Teknis:** 
Seluruh dokumen PDF yang dihasilkan telah disesuaikan dengan standar tata naskah dinas Pemerintah Kabupaten Cilacap. Pastikan koneksi internet stabil saat melakukan proses "Simpan ke Drive" karena sistem sedang melakukan sinkronisasi file ke server Google.