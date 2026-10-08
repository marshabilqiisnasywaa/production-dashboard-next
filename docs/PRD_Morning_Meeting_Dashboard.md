# PRD: Production Morning Meeting Dashboard

**Versi:** 0.1 (draft) · **Tanggal:** 5 Oktober 2026 · **Pemilik produk:** Marsha
**Sumber:** `Konsep_BI_dashboard_morning_meeting_prod.xlsx` (Koh Alvin), arahan Bang Rey, repo `production-dashboard-next-main`

> Semua angka dan aturan yang bertanda **(usulan)** adalah rekomendasi, belum disepakati. Daftar keputusan yang harus dikonfirmasi ada di Bagian 13.

---

## 1. Ringkasan

Dashboard BI untuk morning meeting produksi yang menggantikan Shimo. Isinya review KPI SQCDIP, progres proyek strategis 2026, follow-up antar meeting, dan peringatan dini berbasis AI. Seluruh pencatatan manual (kertas dan grafik tulis) diganti input digital yang transparan.

**Masalah yang diselesaikan**
1. Review harian memakan waktu lama karena data tersebar dan tidak berwarna.
2. KPI yang meleset baru terlihat setelah merah. Contoh: E2E delivery sudah di atas target sejak Maret 2026 dan baru ketahuan saat Juli (104,6 vs target 60,45). Losses Material naik dari 0,24 (Jan) ke 0,55 (Jun) tanpa ada alarm.
3. Data harian sering kosong. Di template Excel hanya 1 Sep yang terisi.
4. Tiap pihak butuh tampilan berbeda. PIC butuh detail, HOD hanya butuh yang perlu keputusan.

## 2. Tujuan dan non-tujuan

**Tujuan**
- G1. Daily review selesai **≤ 20 menit**.
- G2. Early warning: KPI yang bergeser terdeteksi sebelum masuk zona merah.
- G3. Paperless dan transparan. Satu sumber kebenaran untuk KPI, proyek, dan follow-up.
- G4. HOD melihat **hanya** hal yang butuh perhatian atau keputusan.

**Non-tujuan (fase ini)**
- Integrasi otomatis ke MES/ERP (input tetap manual atau upload Excel).
- Real-time per jam (data yang ada harian dan bulanan).
- Pengganti sistem inspeksi atau Power BI area (menu per area tetap rujukan detail).

**Metrik keberhasilan (usulan)**

| Metrik | Target |
|---|---|
| Durasi morning meeting | ≤ 20 menit |
| Kepatuhan input harian oleh PIC (sebelum batas H-1) | ≥ 95% |
| KPI merah yang punya countermeasure + due date dalam 24 jam | ≥ 90% |
| Follow-up selesai tepat waktu | ≥ 85% |
| Jumlah kertas/catatan manual di meeting | 0 |

## 3. Role dan hak akses

### 3.1 Daftar role

| Role | Siapa | Tugas utama | Jangkauan data |
|---|---|---|---|
| **PIC Area** (satu role per area) | PIC tiap area: Assembly/Instalasi, Packing, Pre-assembly, Service, Material, QC, Cost, Lean, GA, Digitalisasi, dst | Input data harian, isi "not achieved", 5WHY, update follow-up | **Penuh** untuk area sendiri. Area lain: hanya status warna (read-only) |
| **KPI Admin** | YOGI / RAHMA | Upload Production KPI dan Project 2026, kelola target | Semua KPI dan proyek |
| **Host Meeting** | Pemimpin meeting harian | Jalankan meeting, catat poin follow-up baru, tutup meeting | Semua area, read + tulis follow-up |
| **Manajer / Reviewer** (TBC) | Koh Alvin dan manajer lain | Review lintas area, komentar, beri instruksi | Semua area, read + komentar |
| **HOD** | Kepala departemen | Pantau eksepsi, beri instruksi, eskalasi | **Hanya hasil saringan eksepsi** (Bagian 4), bisa buka detail |
| **Admin Sistem** | Tim IT/pengembang | Master data, user, audit log | Konfigurasi, tanpa mengedit nilai KPI |

### 3.2 Matriks izin

| Fitur | PIC Area | KPI Admin | Host | Manajer | HOD | Admin |
|---|---|---|---|---|---|---|
| Lihat Important (home) | ✓ | ✓ | ✓ | ✓ | ✓ (versi eksepsi) | – |
| Input data harian area | Area sendiri | – | – | – | – | – |
| Upload KPI/Project | – | ✓ | – | – | – | – |
| Isi not achieved + 5WHY | Area sendiri | – | – | – | – | – |
| Lihat semua tren dan KPI hijau | Area sendiri | ✓ | ✓ | ✓ | Opsional (disembunyikan default) | ✓ |
| Tambah/ubah follow-up | Status tugas sendiri | – | ✓ | ✓ | ✓ (beri instruksi) | – |
| Komentar | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| Tanya P-AI Robot | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| Kelola master data, user, target | – | Target | – | – | – | ✓ |
| Audit log | – | – | – | – | – | ✓ |

Aturan umum: setiap perubahan nilai dicatat (siapa, kapan, nilai lama dan baru). HOD tidak punya form input data.

## 4. Desain tampilan HOD (tricky part)

**Prinsip: management by exception.** HOD tidak membuka dashboard untuk "melihat angka", tetapi untuk tahu apa yang harus ia putuskan.

### 4.1 Prinsip

| # | Prinsip |
|---|---|
| H1 | **Eksepsi dulu.** KPI hijau dan tren yang aman tidak ditampilkan di layar utama. |
| H2 | **Satu layar.** Halaman utama HOD muat di 1920×1080 tanpa scroll. |
| H3 | **Tiap item wajib punya alasan tampil** (satu baris): "Merah: lewat T1", "Tren memburuk 3 periode", "Overdue H+3", "Safety tidak nol". |
| H4 | **Zero tolerance selalu tampil.** Kategori Safety dan Big Problem tidak bisa disembunyikan. |
| H5 | **Aksi, bukan tabel.** Setiap kartu punya tombol: *Acknowledge*, *Beri instruksi* (otomatis jadi follow-up), *Eskalasi*, *Detail*. |
| H6 | **Detail maksimal 2 klik**, dan tidak perlu tahu kode KPI atau nama sheet. |
| H7 | **Bisa disesuaikan.** HOD bisa *Pin* (selalu tampil) atau *Mute* (sembunyikan sampai merah), kecuali kategori H4. |

### 4.2 Aturan relevansi: kapan KPI tampil di HOD

| Tampil jika | Contoh |
|---|---|
| Status **Merah** (lewat T1) | E2E Mar-Jul 2026, Losses Material Jun |
| **Kuning dengan tren memburuk** N periode berturut-turut (usulan N=3) | Losses Material Jan → Mar naik ke 0,48 |
| Kategori **Safety** atau **Big Problem** ≠ 0 | Safety Incident = 1 |
| Follow-up **overdue** atau butuh keputusan HOD | Countermeasure menunggu persetujuan |
| Proyek strategis **off-track** pada kuartal berjalan | Proyek dengan Q2 di bawah target |
| KPI di-**Pin** oleh HOD | Pilihan pribadi |

| Disembunyikan | Catatan |
|---|---|
| KPI hijau | Cukup tampil sebagai angka "N KPI aman" |
| Tren naik/turun yang tidak mengubah status | Tidak ada alasan tampil |
| Detail per shift, per line, per model | Hanya ada di drill-down |
| KPI yang di-Mute | Tampil lagi otomatis saat merah |

### 4.3 Layout halaman utama HOD

1. **Strip status** (atas): "Hari ini N item perlu perhatian" atau "Semua aman", plus 6 chip S Q C D I P berwarna. Chip bisa diklik.
2. **Perlu Perhatian** (kiri/tengah): maksimal 5-7 kartu, urut berdasarkan tingkat keparahan lalu bobot KPI. Isi kartu: nama KPI, area, PIC, selisih ke target, satu kalimat alasan AI, tombol aksi.
3. **Keputusan dan Eskalasi** (kanan): follow-up yang ditujukan ke HOD, countermeasure menunggu persetujuan, item overdue.
4. **Proyek strategis off-track** (bawah): hanya yang bermasalah.
5. Lipatan kecil: "Lihat semua (N KPI hijau disembunyikan)".

### 4.4 Yang sengaja tidak ada di HOD
Form input, tabel mentah 17 KPI, grafik tren semua KPI, riwayat 2024-2025 (hanya muncul di dalam detail), dan notifikasi untuk hal yang sudah ditangani PIC.

### 4.5 Notifikasi untuk HOD
HOD hanya menerima push bila: (a) Safety/Big Problem ≠ 0, (b) KPI masuk Merah dan belum ada countermeasure setelah H+3, (c) follow-up yang ditujukan kepadanya. Tidak ada notifikasi H-1 harian.

> **Validasi dengan HOD (15 menit):** tanyakan 5 hal di Bagian 13 (O6). Hasilnya mengisi daftar Pin dan Mute awal.

## 5. Alur morning meeting

1. **Sebelum meeting (H-1):** PIC input data harian dan isi "not achieved" bila ada. KPI Admin mengunggah KPI bulanan.
2. **Sistem merangkum:** status warna otomatis, Important terisi, daftar eksepsi tersusun.
3. **Meeting (≤ 20 menit):**
   - Important (Big Problem Q&S, masalah meeting pagi, KPI/proyek tidak achieve): ±3 menit.
   - Area dengan status merah/kuning saja: ±10 menit. Area hijau dilewati.
   - Review follow-up kemarin: ±4 menit.
   - Host catat follow-up baru: ±3 menit.
4. **Setelah meeting:** notifikasi ke PIC yang punya tugas baru. HOD menerima ringkasan eksepsi.

## 6. Kebutuhan fungsional

### A. Morning Meeting Review

| ID | Kebutuhan | Prioritas |
|---|---|---|
| A1 | **Important:** 3 cek (Big Problem Quality & Safety ada/tidak, masalah meeting pagi ada/tidak, KPI/proyek tidak achieve). Dua cek pertama diisi manual per PIC. Cek ketiga otomatis dengan link ke kategori yang gagal. | P0 |
| A2 | **Each Area:** review per area (instalasi, packing, pre-assembly, dll) dengan periode harian, mingguan, bulanan, tahunan. | P0 |
| A3 | **Summary not achieved:** tabel problem, reason, countermeasure, due date, PIC. Wajib terisi untuk KPI merah. | P0 |
| A4 | **Laporan manual tambahan** + upload foto/screenshot. Opsional. | P1 |
| A5 | **Followup Progress:** (a) review follow-up kemarin dari HOD/rekan: task, output, PIC, due date, status. (b) host mencatat poin follow-up akhir meeting. | P0 |

### B. Production KPI

| ID | Kebutuhan | Prioritas |
|---|---|---|
| B1 | 17 KPI (Lampiran A) dengan dimensi SQCDIP, bobot, T1/T2, arah (lebih kecil lebih baik atau sebaliknya), unit, PIC. | P0 |
| B2 | Tampilan harian, mingguan, bulanan, tahunan, plus pembanding 2024 dan 2025. | P0 |
| B3 | Status warna otomatis (Bagian 7). | P0 |
| B4 | Ringkasan **5WHY** untuk KPI bulanan yang tidak achieve (pola dari menu Repair → Abnormal: jalur teknis dan manajemen, foto per why, solusi jangka pendek). | P0 |
| B5 | Upload Excel oleh KPI Admin dengan validasi (Bagian 10). | P0 |

### C. Project 2026 (24 proyek)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| C1 | Daftar proyek dengan kategori (Delivery, Quality, Cost, Lean, Digitalisasi, Other), target, PIC, level (departemen / pabrik). | P0 |
| C2 | Progres per kuartal Q1-Q4 (Q3-Q4 saat ini kosong), status on-track / off-track. | P0 |
| C3 | Overview, achievement, dan 5WHY seperti Production KPI. | P1 |

### D. Notifikasi

| ID | Pemicu | Penerima | Prioritas |
|---|---|---|---|
| D1 | PIC tidak mengisi data harian pada H-1 | PIC terkait | P0 |
| D2 | KPI mingguan tidak achieve 2 hari berturut-turut | PIC + Host | P0 |
| D3 | KPI bulanan/5WHY belum diisi H+3 | PIC (lalu Manajer) | P0 |
| D4 | Follow-up mendekati/melewati due date | PIC tugas | P1 |
| D5 | Kriteria HOD (4.5) | HOD | P0 |

Kanal: "TT" di Excel (**perlu konfirmasi** platformnya). Fallback: notifikasi dalam aplikasi (ikon bell).

### E. Early Warning dan P-AI Robot

| ID | Kebutuhan | Prioritas |
|---|---|---|
| E1 | Deteksi tren: KPI kuning atau hijau yang memburuk N periode berturut-turut diberi status "Waspada" (usulan N=3). | P0 |
| E2 | Klik notifikasi membuka halaman achievement KPI itu, lalu AI memberi saran action plan. | P1 |
| E3 | **P-AI Robot "May Can I help you?"** (tanya-jawab): contoh "rata-rata output harian semua line instalasi 3 bulan terakhir", "cara mencegah baret logo Oppo di battery cover". Pertanyaan lain dikumpulkan dari pengguna. | P2 |
| E4 | AI hanya menyarankan. Keputusan dan countermeasure tetap diinput manusia. | P0 |

### F. Input data dan administrasi

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F1 | Form input harian per area (kolom mengikuti template "Morning meeting review"). | P0 |
| F2 | Import Excel KPI dan Project dengan pratinjau dan laporan error per sel. | P0 |
| F3 | Master data: user, role, area, PIC, KPI, target T1/T2. Satu nama PIC baku (hindari variasi seperti ALVIN / ALVIN CHANDRA). | P0 |
| F4 | Audit log perubahan nilai. | P1 |
| F5 | Ekspor tampilan ke PDF/Excel. | P2 |

## 7. Aturan status warna (usulan)

KPI punya dua target. **T1 = batas minimum**, **T2 = target tantangan**.

| Arah KPI | Hijau | Kuning | Merah |
|---|---|---|---|
| Lebih kecil lebih baik (OQC, SLC, E2E, Resign, SMED, Losses, NGP) | ≤ T2 | > T2 dan ≤ T1 | > T1 |
| Lebih besar lebih baik (WO Close, UPPH, Lean) | ≥ T2 | ≥ T1 dan < T2 | < T1 |

**Bila T1 = T2** (NGP, Losses, UPPH, Lean): kuning = nilai dalam **10% terakhir sebelum target** (usulan, perlu persetujuan). Contoh Losses Material, target 0,51: kuning mulai 0,459.
**Kategori deduction (Safety, Big Problem, target 0):** tidak ada kuning. Nilai > 0 langsung merah.

**Waspada (E1):** KPI hijau atau kuning yang memburuk tiga periode berturut-turut. Tampil di HOD hanya bila akan melewati T1 dalam periode berikutnya (proyeksi linear sederhana).

Contoh dengan data 2026: OQC (T1 2%, T2 1%) kuning semua bulan Jan-Jul (1,05-1,55%). E2E hijau Jan-Feb, merah sejak Maret.

## 8. Arsitektur informasi (menu)

| Menu | PIC Area | KPI Admin | Host | Manajer | HOD |
|---|---|---|---|---|---|
| **Beranda** (Important + eksepsi) | ✓ | ✓ | ✓ | ✓ | Versi eksepsi (4.3) |
| **Morning Meeting** (Each Area, Not Achieved) | Area sendiri | ✓ | ✓ | ✓ | Dari kartu eksepsi |
| **Followup** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Production KPI** | Area sendiri | ✓ | ✓ | ✓ | Dari kartu eksepsi |
| **Project 2026** | Proyeknya | ✓ | ✓ | ✓ | Off-track saja |
| **SQCDIP, area (Assembly, Packing, Material, QC, Service, Repair, Cost)** | Area sendiri | ✓ | ✓ | ✓ | Drill-down |
| **P-AI Robot** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Pengaturan** | – | Target | – | – | Pin/Mute | 

## 9. Model data

| Entitas | Atribut utama |
|---|---|
| User | id, nama, role, area, status |
| Area | id, nama |
| KPI | id, nama, dimensi SQCDIP, arah, unit, bobot, frekuensi, PIC utama |
| KPITarget | kpi_id, tahun, T1, T2 |
| KPIActual | kpi_id, tipe periode (harian/mingguan/bulanan), tanggal, nilai, sumber (manual/upload), submitted_by |
| DailyCheck | tanggal, area, big_problem (bool), masalah_meeting (bool), catatan |
| NotAchieved | kpi_id/proyek_id, tanggal, problem, reason, countermeasure, due_date, pic, status, lampiran |
| FiveWhy | notachieved_id, jalur (teknis/manajemen), why 1-5 + foto, solusi jangka pendek, kesimpulan |
| Project | id, kategori, nama, target, level, PIC |
| ProjectProgress | project_id, kuartal, nilai, status |
| FollowUp | id, task, output, pic, due_date, status, asal meeting, ditugaskan oleh |
| Notification | tipe, penerima, pemicu, waktu, dibaca |
| HODPreference | user_id, kpi_id, pin/mute |
| AuditLog | user, entitas, nilai lama/baru, waktu |

Data harian disimpan dalam format panjang (satu baris per tanggal, metrik, dan PIC), bukan satu kolom per tanggal seperti di Excel.

## 10. Kualitas data dari Excel yang harus dibereskan sebelum import

| Masalah | Tindakan |
|---|---|
| Target berbeda antar sheet (OQC 0,6% harian vs 2%/1% KPI; SLC 3,41 vs 3,7/3,67; NGP 0,5% vs 0,3) | Tetapkan **satu sumber target** (KPI Admin) |
| `#NULL!` dan `#DIV/0!` di sheet harian | Hitung rasio ulang dari plan dan actual, kosong ≠ error |
| Label baris plan/actual salah (semua "保修计划产出") | Ganti sesuai metrik |
| SMED Maret = 0 | Perlakukan sebagai **kosong**, bukan nol |
| Kolom "Aktual 2026" tidak cocok dengan rata-rata bulanan (SLC, NGP, E2E, Resign, SMED) | Hitung dari data bulanan atau definisikan rumus resmi |
| Target berupa teks (WO Close "98%", SMED "A/B 6H, C 10H") | Parsing ke angka, SMED dipisah per seri |
| Unit tidak tertulis (SLC, E2E) | Lengkapi di master KPI |
| Nama PIC tidak seragam (ALVIN/ALVIN CHANDRA, SOLI/Soli, REYNARD/Rey) | Tabel master PIC |
| Proyek dengan target persen tetapi realisasi angka absolut (SLC/UPPH "T≤3%") | Konfirmasi target |
| 8 proyek tanpa angka Q1 dan Q2 | Tandai "belum dilaporkan" |
| Riwayat 2024-2025 tidak ada | Minta dari Koh Alvin atau tampilkan kosong |

## 11. Kebutuhan non-fungsional

- **Bahasa:** ID dan EN (sudah ada `LanguageProvider`).
- **Tampilan:** 1920px untuk layar meeting, responsif untuk laptop dan mobile (PIC input dari lantai produksi), light dan dark mode.
- **Performa:** halaman beranda < 3 detik.
- **Keamanan:** login (SSO internal TBC), akses per role, PIC hanya bisa menulis di area sendiri.
- **Audit:** semua perubahan nilai tercatat.
- **Ketersediaan:** aktif pada jam meeting pagi.

## 12. Status repo saat ini dan jalur rilis

**Sudah ada:** SQCDIP (matriks SQCDIP × Area, 5M1E, Abnormal Tracker dengan upload lampiran), Dashboard (KPI off target), menu area (Assembly, Packing, Material, QC, Service, Repair, Cost), 5 Why di Repair → Abnormal. Semua masih mock data dan belum ada backend selain `/api/health`.

| Fase | Isi | Hasil |
|---|---|---|
| **1. Fondasi** | Master data (KPI, T1/T2, PIC, role), import Excel KPI + Project, aturan status warna | KPI dan proyek nyata tampil berwarna |
| **2. Morning meeting** | Important, Each Area, Not Achieved, Followup, tampilan HOD eksepsi | Meeting ≤ 20 menit dengan data riil |
| **3. Disiplin data** | Notifikasi D1-D5, input harian, audit log | Data harian terisi |
| **4. Cerdas** | Early warning (E1), saran AI (E2), P-AI Robot (E3) | Preventif, bukan reaktif |

## 13. Pertanyaan terbuka

| # | Pertanyaan | Ke siapa |
|---|---|---|
| O1 | SQDIP (Bang Rey) atau SQCDIP (Excel, repo)? Rekomendasi: SQCDIP, karena Cost berbobot 50 dari 100 | Bang Rey |
| O2 | Aturan kuning: T1/T2 atau buffer 10%? Dan N=3 untuk tren? | Koh Alvin |
| O3 | Target resmi mana yang dipakai (OQC, SLC, NGP)? | Koh Alvin |
| O4 | "TT" itu platform notifikasi apa? Ada API-nya? | Koh Alvin |
| O5 | Sumber login (SSO OPPO?) dan siapa admin sistem | IT |
| O6 | **Untuk HOD (15 menit):** (1) 3 hal pertama yang ingin ia tahu tiap pagi; (2) KPI apa yang tidak mau ia lihat kecuali merah; (3) apakah ia mau dapat notifikasi, dan kapan; (4) ambang "perlu tahu" (merah saja atau juga kuning memburuk); (5) apakah ia ingin memberi instruksi lewat dashboard | HOD |
| O7 | Apakah PIC boleh melihat detail area lain, atau hanya status warna? | Koh Alvin |
| O8 | Siapa "Manajer/Reviewer"? Apakah Koh Alvin berperan di sini? | Koh Alvin |
| O9 | Riwayat 2024 dan 2025: apakah ada datanya? | Koh Alvin |
| O10 | Timeline: target "Agustus" dari Bang Rey masih berlaku atau digeser? | Bang Rey |

---

## Lampiran A: 17 KPI

Dimensi SQCDIP adalah usulan pemetaan. T1 = minimum, T2 = tantangan. "↓" = lebih kecil lebih baik, "↑" = lebih besar lebih baik.

| # | KPI | Dimensi | Arah | Bobot | T1 | T2 | PIC |
|---|---|---|---|---|---|---|---|
| 1 | OQC defect rate | Q | ↓ | 20 | 2% | 1% | SOLI |
| 2 | Single Labor Cost | C | ↓ | 20 | 3,7 | 3,67 | ALVIN CHANDRA / REYNARD |
| 3 | NGP | C | ↓ | 10 | 0,3 | 0,3 | SOLI |
| 4 | Losses Material | C | ↓ | 20 | 0,51 | 0,51 | RICKHY LADIANSYAH |
| 5 | End-to-end delivery time | D | ↓ | 20 | 60,45 | 58,41 | ALVIN CHANDRA |
| 6 | WO Close (3D on-time) | D | ↑ | 10 | 98% | 99% | IRFAN NURCHOLIS |
| 7 | Big Problem | S (deduction) | ↓ | – | 0 | 0 | AS'AD |
| 8 | Battery Safety | S (deduction) | ↓ | – | 0 | 0 | IKHWAN HANDOKO |
| 9 | Safety Incident | S (deduction) | ↓ | – | 0 | 0 | ALVIN CHANDRA |
| 10 | Safety Information | S (deduction) | ↓ | – | 0 | 0 | ALVIN CHANDRA |
| 11 | Safety Material | S (deduction) | ↓ | – | 0 | 0 | ALVIN CHANDRA |
| 12 | UPPH | P | ↑ | – | 5,26 | 5,26 | SUBAGYO |
| 13 | Material management impact (kali) | I | ↓ | – | 3 | 1 | IRFAN NURCHOLIS |
| 14 | SMED | D / Lean | ↓ | – | A/B 6H, C 10H | sama | FAJRUL AL HUDA |
| 15 | Lean Maturity 5S | Lean | ↑ | – | 3 | 3 | REYNARD |
| 16 | Lean Maturity DM | Lean | ↑ | – | 2 | 2 | REYNARD |
| 17 | Resign rate | Lainnya (people) | ↓ | – | 1,5% | 1% | YOGI SASTRA DINATA |

Bobot enam KPI utama berjumlah 100 (Quality 20, Cost 50, Delivery 30).

## Lampiran B: 24 proyek strategis 2026

| Kategori | Proyek | PIC | Level |
|---|---|---|---|
| Delivery | WO Close | IRFAN NURCHOLIS | Dept |
| Delivery | OTD achievement | BASTIAR | Dept |
| Delivery | Clearance model | IRFAN NURCHOLIS | Pabrik |
| Delivery | Flexible delivery (SMED) | ALVIN | Pabrik |
| Quality | FQC/OQC defect | SOLI | Dept |
| Quality | Battery safety | IKHWAN | Pabrik |
| Quality | Major quality incident | AS AD | Pabrik |
| Quality | Packing aesthetic | IRFAN RIZKI | Pabrik |
| Quality | Pre Assembly quality | YUSRIADI | Pabrik |
| Quality | Scratch, white spot, fuzzy hair | Wildan | Dept |
| Quality | AI import | IKHWAN | Dept |
| Quality | ODM new project quality | RAMDANI | Pabrik |
| Quality | Screenguard | GALUH | Dept |
| Cost | SLC/UPPH | REYNARD | Pabrik |
| Cost | NGP | Soli | Pabrik |
| Cost | Losses material | RICKHY | Pabrik |
| Cost | QEP standardization | GALUH | Dept |
| Cost | Asset-light | ALVIN | Pabrik |
| Lean | Reliable workshop site | REYNARD | Pabrik |
| Lean | DM/5S/TPM | REYNARD | Pabrik |
| Digitalisasi | Cost improve | Soli | Dept |
| Digitalisasi | Quality foolproof | IKHWAN | Dept |
| Digitalisasi | Lean digitalisasi | REYNARD | Pabrik |
| Other | Personnel stability | Yogi | Dept |
