# Hasil impor histori Juni–Agustus 2026

Tanggal pengerjaan: 9 November 2026.

- File: `KPI Assesment Agustus 2026.xlsx`.
- Database: database lokal yang dikonfigurasi pada backend workspace ini.
- Migrasi terpasang: `0037`.
- Batch impor: `1`.
- Pelaksana audit: `Codex (permintaan pengguna)`.
- Periode pilihan: 1 Juni–31 Agustus 2026.
- Tanggal data tersimpan: 2 Juni–31 Agustus 2026.
- Shift arsip: `Shift 1`; sesi attendance pagi dan sore tersimpan terpisah.
- Mode: lewati data yang sudah ada, pertahankan identitas asli per sheet.

## Data tersimpan

| Jenis | Baris |
| --- | ---: |
| KPI Papercard | 95 |
| KPI Standup Meeting | 95 |
| Detail ketepatan waktu Papercard | 353 |
| Attendance Standup Meeting | 345 |
| Total | 888 |

Empat baris duplikat identik dilewati. Tidak ada data lama yang diperbarui.
Master line, master DM, akun, dan riwayat penugasan tidak diubah.

## Catatan sumber

- Ada 159 baris yang ditandai perlu verifikasi identitas antar-sheet: 143 terkait
  DM dan 16 terkait leader. Nilai sumber masing-masing sheet tetap disimpan.
- DM yang bertentangan tidak dipaksakan mengikuti master sekarang. Scorecard
  menandainya sebagai **Perlu verifikasi DM** pada periode terkait.
- TAC20607 pada 24 Agustus memiliki komponen attendance **16 poin**, melampaui
  batas 10. Nilai asli diarsipkan dengan `scoreReview` dan tidak dimasukkan ke
  perhitungan KPI sebelum diverifikasi.
- Detail attendance dan papercard mencakup Juni–Agustus. Rekap poin KPI kedua
  sheet utama hanya berisi Agustus: lima line, masing-masing 19 hari.
- Hari dalam periode arsip yang tidak mempunyai rekap KPI tidak dibuat sebagai
  nilai nol atau bukti tidak mengisi.
- Status attendance kosong tetap tidak diketahui. Jam hadir dan identitas
  peserta selain yang tersedia pada sumber tidak dibuat otomatis.

## Pembacaan setelah impor

Layanan scorecard membaca 95 hari-line KPI Papercard dan 94 hari-line KPI Standup
yang bisa dihitung, setelah satu rekap bernilai di luar batas ditahan. Endpoint
Papercard KPI lokal juga sudah mengembalikan 19 hari Excel untuk TAC20605 pada
Agustus 2026.

Pembacaan Standup juga sudah menghubungkan sepuluh status attendance ke dua sesi
per line dan tanggal. Contoh TAC20601 pada 3 Agustus mempunyai nilai attendance 9
dan lima role sumber pada masing-masing sesi. Hari yang hanya memiliki attendance
ditampilkan tanpa rekap poin (`null`/`—`); TAC20607 pada 24 Agustus tetap ditampilkan
dengan catatan verifikasi dan nilai sumber 16, tanpa dimasukkan ke rata-rata KPI.

Build, pemeriksaan tipe, tes otomatis, dan pemeriksaan visual browser tidak
dijalankan. Pembacaan workbook, validasi impor, penyimpanan, dan pembacaan data
hasil impor merupakan operasi pada data yang diminta pengguna.
