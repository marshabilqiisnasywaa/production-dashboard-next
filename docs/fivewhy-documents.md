# Dokumen Excel / SIMO sementara

Menu 5Why / PDCA membuka bagian **Dokumen Excel / SIMO** secara default.
Bagian ini merupakan daftar dokumen mandiri, terpisah dari form analisis 5Why
yang belum siap. Tidak ada record analisis, Root Cause, solusi, atau PDCA web
yang harus dibuat sebelum mengunggah file atau menyimpan link.

## Alur

1. Klik **Tambah dokumen** di daftar dokumen untuk membuka modal, lalu pilih line,
   PIC, judul, dan kategori dokumen. PIC dipilih dari akun aktif yang terhubung
   ke line; leader dan supervisor tampil otomatis berdasarkan master akun.
2. Pilih upload Excel `.xlsx` maksimal 20 MB atau link HTTPS SIMO dari
   `mtp.myoas.com`.
3. Simpan dokumen. Dokumen langsung muncul pada daftar PIC, leader line/DM terkait,
   serta supervisor PIC.
4. Cari atau filter dokumen berdasarkan kategori, lalu unduh Excel atau buka SIMO.

Modal menutup setelah dokumen berhasil disimpan. Kesalahan simpan ditampilkan
di dalam modal agar isian tetap tersedia. Tutup/Batal atau Escape menutup modal
tanpa menghapus isian; tombol tutup dinonaktifkan saat proses simpan berlangsung.

Kategori: Analisis 5Why & PDCA, Bukti pendukung, SOP / WI, dan Lainnya.
File asli disimpan utuh termasuk gambar dan shapes; tidak ada import isinya
ke form. SIMO tetap memakai akses login SIMO, dan upload dashboard tidak
mengunggah file ke SIMO.

Bagian **Analisis 5Why** membuka daftar semua analisis yang dikelompokkan per
bulan kejadian. Tiap baris menampilkan intinya (tanggal kejadian, judul, status,
pengusul, masalah, Root Cause, tindakan sementara, dan beberapa solusi dengan PIC
dan tenggat); seluruh baris bisa diklik untuk membuka laporan. Filter: cari, status,
line, dan bulan kejadian (satu pilihan dengan tombol bulan sebelumnya dan berikutnya).
Detail terbuka lewat `?id=<id analisis>` sebagai tampilan laporan
baca-saja yang urutannya mengikuti Excel lama (header, pernyataan masalah, rantai
5Why dengan bukti dan foto, lalu tabel solusi PDCA). Pembuat dan leader line
menekan **Edit** untuk membuka form isian dan **Lihat hasil** untuk kembali;
tombol "Kembali ke daftar" menutup detail. Leader dan member membuat analisis baru dari daftar;
supervisor dan HOD (sub-tab 5Why & PDCA di admin) hanya membaca. Form menyimpan ke server (tabel `fivewhy_analyses`) dan
foto bukti ke `<upload_dir>/fivewhy/photos/<uuid>.<ext>`. Data dan alurnya tidak
terhubung ke daftar dokumen. Data prototype lama di `localStorage` browser
(`dm_fivewhy_records`) tidak dibaca dan tidak dimigrasikan.

## Penyimpanan dan akses

Dokumen memiliki ID, line, PIC, pembuat, judul, kategori, sumber, dan waktu pembuatan.
Metadata disimpan pada database; file berada di `<upload_dir>/fivewhy/<uuid>.xlsx`.
Sediakan volume persisten dan backup file bersama database.

- Semua akun yang login (member, leader, supervisor, HOD, admin) dapat melihat
  seluruh daftar dokumen dan mengunduh filenya. Tidak ada pembatasan lihat per PIC,
  line, atau supervisor.
- Member dapat mengunggah untuk dirinya sendiri pada line penugasan aktif.
- Leader dapat mengunggah untuk anggota line yang dipimpinnya. Penugasan leader
  line/DM aktif menjadi acuan; slot leader board dipakai untuk data lama yang belum
  mempunyai penugasan leader line.
- Supervisor dan HOD hanya membaca. Supervisor tetap tampil sebagai informasi di
  modal berdasarkan `supervisor_id`; nama supervisor lama hanya dipakai bila ID
  kosong dan nama tersebut cocok dengan tepat satu akun supervisor aktif.
- Download file memerlukan token login. Hapus dokumen tersedia untuk leader dan
  member, dan pemeriksaannya memakai aturan lihat yang sama (semua dokumen).

Supervisor membuka daftar melalui menu **5Why & PDCA** di sidebar. Jika supervisor
PIC belum diatur, modal menampilkan **Belum diatur**; perbaiki master akun agar
nama supervisor yang tampil benar.

API dokumen mandiri: `GET /api/fivewhy/documents`,
`GET /api/fivewhy/documents/options` untuk pilihan line dan PIC yang boleh diisi,
`POST /api/fivewhy/documents/file`, `POST /api/fivewhy/documents/simo`,
`GET /api/fivewhy/documents/{id}/download`, dan
`DELETE /api/fivewhy/documents/{id}`.

API analisis: `GET /api/fivewhy/analyses` (daftar ringan),
`GET|PUT|DELETE /api/fivewhy/analyses/{id}`, `POST /api/fivewhy/analyses` (membuat
draf kosong dengan nomor `5W-YYMMDD-NN` dari server),
`POST /api/fivewhy/analyses/{id}/photos`, `DELETE
/api/fivewhy/analyses/{id}/photos/{photo_id}`, dan `GET /api/fivewhy/photos/{photo_id}`.
Semua akun yang login dapat melihat. Mengubah dan menghapus hanya untuk pembuat
atau leader line tersebut. `PUT` memerlukan `revision` terbaru dan menolak simpanan
yang basi dengan 409. Satu analisis hanya boleh punya satu Root Cause. Foto JPEG,
PNG, atau WebP maksimal 5 MB, 60 foto per analisis; browser mengecilkan foto besar
sebelum unggah.

## Migrasi

Migrasi `0040_fivewhy_document_pic` menambahkan PIC. Upload baru, termasuk link SIMO,
wajib menyertakan PIC yang valid. Dokumen sebelum migrasi tidak ditebak PIC-nya:
kolom PIC tetap kosong dan daftar menampilkan **PIC belum ditentukan**.

Migrasi `0039_standalone_fivewhy_documents` mengikuti `0038`. Migrasi ini mengubah
hubungan dokumen dari analisis menjadi line dan pembuat secara langsung.
Jika `0038` sudah pernah dipakai, metadata line dan pembuat dokumen disalin dari
analisis sebelum hubungan lama dilepas. File fisik tetap berada di tempatnya.
Tabel analisis lama tidak dihapus untuk mempertahankan data yang mungkin sudah ada.

Jalankan `alembic upgrade head` dari backend memakai environment deployment
yang sesuai sebelum menggunakan fitur. Migrasi tidak dijalankan otomatis.
Downgrade `0039` ditolak bila masih ada dokumen agar metadata dokumen mandiri
tidak hilang. Server/proxy perlu mengizinkan multipart sedikit di atas 20 MB.

Migrasi `0051_fivewhy_analysis_storage` menambah `nomor` (unik), `title`, dan
`status` pada `fivewhy_analyses`, mengisi baris lama dari kolom `data`, dan membuat
tabel `fivewhy_photos`. Downgrade ditolak bila masih ada foto.

## Review sumber

Tampilan mengikuti halaman yang ada: Inter, aksen hijau, kontrol native, dan
baris dokumen. ENERGY 1 / RHYTHM 1 / MOTION 1; tanpa aset visual atau animasi baru.

- R-26 PASS (sumber): kontrol dokumen terhubung ke API, download, filter, atau link SIMO.
- R-27 PASS (sumber): state memuat, kosong, error, dan retry tersedia.
- R-32 PASS (sumber): input berlabel dan mewarisi focus-visible halaman.
- Layout memakai auto-fit, flex-wrap, overflow-wrap, dan tombol minimum 44 px;
  hasil layout belum diperiksa di browser.
- Build, typecheck, test, dan migrasi belum dijalankan sesuai instruksi pengguna;
  tidak ada klaim kelulusan runtime.
