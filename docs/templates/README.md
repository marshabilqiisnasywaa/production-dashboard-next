# Template histori DM

Pakai versi sederhana: [Template_Histori_DM_Simpel.xlsx](Template_Histori_DM_Simpel.xlsx).

Isi tiga sheet saja: `Attendance`, `Papercard`, dan `Standup`. Satu baris untuk satu tanggal, line, dan shift. DM serta nama leader historis langsung ditulis di baris yang sama. Tidak perlu kode penempatan. Dropdown status tersedia; kolom poin hanya untuk poin harian resmi yang sudah diverifikasi. Data yang tidak tersedia tetap kosong. Petunjuk singkat ada pada sheet `BACA DULU`.

Generator versi sederhana: `create_simple_history_template.py` (Python dengan `openpyxl`). Generator menimpa file template; simpan hasil pengisian dengan nama lain.

Versi lengkap sebelumnya tetap tersedia sebagai referensi: [Template_Import_Histori_DM_v1.xlsx](Template_Import_Histori_DM_v1.xlsx). Panduan di bawah khusus versi lengkap tersebut.

Format ini merupakan format pengumpulan data baru. Importer aplikasi yang ada masih membaca workbook lama; dukungan template ini belum ditambahkan. Pembuatan template tidak mengubah data aplikasi atau impor sebelumnya.

Urutan pengisian:

1. Baca `PETUNJUK` dan contoh fiktif pada `CONTOH`.
2. Isi `PENEMPATAN`: satu kode untuk satu periode line, shift, DM, dan leader. Gunakan periode sebenarnya dan buat kode baru setiap penempatan berubah.
3. Isi `ATTENDANCE`: satu baris per tanggal, kode penempatan, sesi, dan role. Catat peserta wajib serta status hadir berdasarkan sumber.
4. Isi `PAPERCARD`: satu baris per tanggal, kode penempatan, dan role. Pisahkan ketepatan waktu, jumlah temuan NG, dan approval close pada hari yang sama.
5. Isi `STANDUP`: satu baris per tanggal dan kode penempatan, berisi status dua sesi serta jumlah masalah dan penyelesaian pada hari yang sama.
6. `REKAP_KPI` opsional untuk poin harian resmi yang sudah diverifikasi. Bukan tempat memasukkan jumlah temuan atau rata-rata bulanan. Cantumkan skema bobot dan sumber buktinya.

Sel kosong berarti data tidak tersedia. Angka 0 berarti dipastikan nol. Jangan mengisi nilai berdasarkan perkiraan. Gunakan `TIDAK_DIKETAHUI` untuk status yang tidak tercatat.

Tidak perlu menyalin contoh ke sheet data. Contoh sengaja fiktif, termasuk identitas dan perpindahan DM. `REFERENSI` berisi pilihan dropdown; `KAMUS_KOLOM` dan komentar header menjelaskan setiap kolom. Validasi dan format disiapkan hingga baris 3001; validasi Excel membantu pengisian tetapi pemeriksaan relasi, identitas, periode, dan konflik tetap perlu dilakukan importer nantinya.

Generator: `create_history_template.py`, membutuhkan Python dan `openpyxl`. Jalankan ulang untuk membuat template kosong; tindakan ini menimpa file template di direktori yang sama, jadi simpan workbook yang sudah diisi dengan nama lain.
