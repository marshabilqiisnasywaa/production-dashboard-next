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

Bagian **Form 5Why (belum siap)** tetap menampilkan prototype sebelumnya dengan
localStorage. Data dan alurnya tidak terhubung ke daftar dokumen. Tidak ada
pilihan acuan Dokumen/Web, migrasi localStorage, atau proses penyatuan otomatis.
Pengembangan form penuh dari web merupakan pekerjaan terpisah nantinya.

## Penyimpanan dan akses

Dokumen memiliki ID, line, PIC, pembuat, judul, kategori, sumber, dan waktu pembuatan.
Metadata disimpan pada database; file berada di `<upload_dir>/fivewhy/<uuid>.xlsx`.
Sediakan volume persisten dan backup file bersama database.

- Member dapat mengunggah untuk dirinya sendiri pada line penugasan aktif dan
  melihat dokumen dengan dirinya sebagai PIC. Anggota satu line tidak otomatis
  bisa melihat dokumen PIC lain.
- Leader dapat mengunggah untuk anggota line yang dipimpinnya dan melihat dokumen
  line tersebut. Penugasan leader line/DM aktif menjadi acuan; slot leader board
  dipakai untuk data lama yang belum mempunyai penugasan leader line.
- Supervisor membaca dokumen PIC yang merupakan bawahannya melalui `supervisor_id`.
  Nama supervisor lama hanya dipakai bila ID kosong dan nama tersebut cocok dengan
  tepat satu akun supervisor aktif. Penugasan workshop saja tidak membuka semua dokumen.
- HOD/admin membaca seluruh line.
- Download file memerlukan token login dan pemeriksaan akses PIC/leader/supervisor
  yang sama dengan daftar dokumen. Hak hapus tetap untuk member/leader yang berhak
  melihat dokumen.

Supervisor membuka daftar melalui menu **5Why & PDCA** di sidebar. Jika supervisor
PIC belum diatur, modal menampilkan **Belum diatur**; perbaiki master akun agar
dokumen tampil pada supervisor yang tepat.

API dokumen mandiri: `GET /api/fivewhy/documents`,
`GET /api/fivewhy/documents/options` untuk pilihan line dan PIC yang boleh diisi,
`POST /api/fivewhy/documents/file`, `POST /api/fivewhy/documents/simo`,
`GET /api/fivewhy/documents/{id}/download`, dan
`DELETE /api/fivewhy/documents/{id}`. API penyimpanan form analisis yang dibuat
sebelumnya telah dilepas dari router.

## Migrasi

Migrasi `0040_fivewhy_document_pic` menambahkan PIC. Upload baru, termasuk link SIMO,
wajib menyertakan PIC yang valid. Dokumen sebelum migrasi tidak ditebak PIC-nya:
kolom PIC tetap kosong dan daftar menampilkan **PIC belum ditentukan**. Untuk
menjaga akses data lama, routing dokumen tersebut sementara memakai pembuatnya
sebagai dasar akses personal dan supervisor, selain leader line terkait.

Migrasi `0039_standalone_fivewhy_documents` mengikuti `0038`. Migrasi ini mengubah
hubungan dokumen dari analisis menjadi line dan pembuat secara langsung.
Jika `0038` sudah pernah dipakai, metadata line dan pembuat dokumen disalin dari
analisis sebelum hubungan lama dilepas. File fisik tetap berada di tempatnya.
Tabel analisis lama tidak dihapus untuk mempertahankan data yang mungkin sudah ada.

Jalankan `alembic upgrade head` dari backend memakai environment deployment
yang sesuai sebelum menggunakan fitur. Migrasi tidak dijalankan otomatis.
Downgrade `0039` ditolak bila masih ada dokumen agar metadata dokumen mandiri
tidak hilang. Server/proxy perlu mengizinkan multipart sedikit di atas 20 MB.

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
