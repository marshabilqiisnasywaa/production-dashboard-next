# Impor histori Papercard dan Standup Meeting

## Aktivasi

Jalankan migrasi dari direktori `backend` menggunakan environment Python backend:

```powershell
python -m alembic upgrade head
```

Migrasi `0037` menambahkan `history_import_batches` dan `historical_entries`.
Restart backend setelah migrasi. Implementasi ini tidak menjalankan migrasi atau
mengimpor workbook ke database secara otomatis.

## Penggunaan

1. Masuk sebagai admin, buka **Impor Histori Excel** pada bagian History.
2. Pilih workbook `.xlsx` maksimal 20 MB.
3. Pilih jenis data, tanggal, dan shift sumber. Default periode adalah tiga bulan
   kalender yang berakhir pada tanggal terakhir dalam workbook; periksa cakupan
   setiap jenis data karena setiap sheet dapat berisi periode yang berbeda.
4. Cocokkan kode line dengan master line. Master line harus sudah tersedia.
   Nama leader dan DM sumber disimpan sebagai label historis, tanpa membuat akun
   atau mengubah penugasan leader aktif.
5. Periksa baris bermasalah. Status yang tidak dikenal harus diperbaiki di Excel,
   atau secara eksplisit dilewati melalui pilihan **impor hanya baris valid**.
6. Klik **Validasi pemetaan**. Konflik antar-sheet dan duplikat dengan isi berbeda
   harus diperbaiki sebelum penyimpanan.
7. Klik **Simpan histori**. Secara default, histori yang sudah tersimpan dilewati.
   Pilihan pembaruan hanya mengganti histori Excel, bukan transaksi operasional.

## Sheet yang dibaca

| Sheet | Data |
| --- | --- |
| Papercard system | Tiga komponen poin per line dan tanggal |
| Standup Meeting | Attendance, isi rapat, dan close loop per line dan tanggal |
| Detail Papercard system | Ketepatan waktu Leader, ME, PE, dan IPQC |
| Attendance Standup Meeting | Status lima role untuk sesi pagi dan sore |

Parser menggunakan nilai formula yang terakhir disimpan oleh Excel. Formula
tidak dieksekusi saat upload. Jika cache nilai tidak lengkap, buka, hitung ulang,
dan simpan workbook di Excel sebelum mengunggah kembali.

Blok rekap dengan kode line `0` atau tanda strip adalah blok template tanpa line
valid. Blok tersebut tidak diimpor dan ditampilkan dalam catatan pembacaan file.
Perbedaan leader atau DM pada line dan tanggal yang sama tetap memblokir impor;
pesan validasi mencantumkan kedua nilai, sheet, dan baris pembandingnya.

Impor SQDIP tetap melalui halaman SQDIP yang sudah ada. Detail masalah standup
dan jawaban checklist papercard tidak direkonstruksi dari nilai rekap.

## Aturan data

- Papercard `OK`: tepat waktu. `NG`: terlambat atau tidak mengisi. Kedua keadaan
  NG tidak dapat dibedakan dari sumber ini dan bukan temuan checklist.
- Attendance mempertahankan `OK`, `NG`, dan `IZIN` per role. Status kosong tetap
  tidak diketahui; jam hadir dan nama peserta tidak dibuat otomatis.
- Poin rekap Excel dipertahankan, termasuk bobot historis yang berbeda. Preview
  menampilkan catatan bila poin temuan melampaui bobot sistem saat ini.
- Kunci histori adalah jenis data, master line, tanggal, dan shift. Duplikat
  identik dalam satu unggahan dilewati; duplikat berbeda memblokir impor.
- Leader dan DM harus konsisten antar-sheet untuk line, tanggal, dan shift yang
  sama pada mode ketat. Pilihan **simpan identitas asli per sheet** menyimpan
  perbedaan sebagai `mappingReview`, tanpa mengubah master atau mengarang tanggal
  perpindahan. Scorecard menandai kelompok DM yang bertentangan sebagai **Perlu
  verifikasi DM** sampai penempatan dikonfirmasi.
- Nilai numerik yang melampaui bobot komponen diarsipkan dengan `scoreReview` dan
  tidak ikut perhitungan scorecard sebelum diverifikasi. Nilai asli tidak dipotong.
- Setiap penyimpanan dilakukan dalam satu transaksi dan mencatat file, admin,
  waktu proses, serta jumlah baris ditambah, diperbarui, atau dilewati.

## Pembacaan dashboard

Scorecard menggabungkan rekap KPI historis dengan data operasional. Pada tanggal
dan shift yang sama, data operasional yang sudah mempunyai submission atau
aktivitas meeting diprioritaskan; skor tidak dijumlahkan dua kali. Leader harian
mengikuti label histori. Ringkasan lintas penugasan menampilkan nama historis
yang tercakup dalam periode tersebut.

Dalam cakupan periode impor, hari tanpa rekap historis dan tanpa aktivitas
operasional tidak dibuat menjadi nilai nol atau status tidak mengisi. Cakupan
periode dicatat pada setiap baris impor sebagai `importPeriod`.

Status papercard dan persentase tepat waktu ditampilkan hanya bila data detail
mendukungnya. Status Meeting 1/2 standup dibaca dari attendance pada line, tanggal,
dan shift yang sama; jumlah role OK dan status tiap role dapat dilihat dengan
membuka status sesi. Sesi yang memang tidak memiliki attendance sumber diberi
label **Attendance Excel tidak tersedia**.

Hari yang hanya memiliki attendance tetap ditampilkan dengan poin `null`/`—`
dan alasan **Rekap poin tidak tersedia**. Poin yang ditahan karena melampaui bobot
juga tetap memiliki baris detail, alasan verifikasi, dan nilai sumbernya. Kedua
keadaan tersebut tidak ikut rata-rata KPI dan tidak dijadikan nol pada tren.

Attendance Summary menampilkan panel **Attendance historis Excel**, mengikuti
filter periode/level/sesi atas dengan filter tanggal lokal untuk panel tersebut.
Histori role ini terpisah dari KPI tepat waktu/telat presensi aktual agar jam
kedatangan yang tidak tersedia tidak dianggap sebagai hadir tepat waktu.

Riwayat proses dan data hasil impor juga dapat diperiksa dari halaman impor admin.

## Verifikasi

Build, pemeriksaan tipe, dan tes otomatis belum dijalankan. Pada 9 November 2026,
migrasi `0037` sudah terpasang pada database lokal, dan workbook Agustus berhasil
diimpor untuk periode Juni–Agustus sebagai batch `1`: 888 baris baru, 4 duplikat
identik dilewati. Pembacaan melalui layanan KPI dan API scorecard sudah dilakukan.
Rinciannya ada di [laporan impor](import-history-juni-agustus-2026.md).
Sebelum penggunaan produksi, verifikasi preview workbook, impor ulang dengan mode
lewati, konflik pemetaan, pembaruan histori, serta pembacaan scorecard dan
Attendance Summary setelah migrasi di lingkungan pengembangan.
