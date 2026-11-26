# Buku aturan Root Cause 5Why

Buku ini dibaca AI setiap kali user menekan "Minta saran AI". Edit file ini untuk mengubah dasar pertimbangan. Perubahan berlaku pada permintaan berikutnya tanpa restart. Format tiap aturan: nomor `R<angka>`, judul, lalu penjelasan. Nomor aturan dipakai sebagai sumber di jawaban AI, jadi jangan dipakai ulang untuk aturan lain.

## Aturan perusahaan

Root Cause adalah Why terakhir yang terisi. Pertanyaan "kenapa lagi?" sudah tidak punya jawaban yang berguna di titik itu. Lima Why adalah batas maksimal, bukan kewajiban. Analisis boleh berhenti di Why 1 sampai 5.

## Aturan penilaian

### R1 Ada bukti
Setiap hubungan sebab-akibat didukung data atau bukti fisik: foto, log, hasil ukur, perbandingan OK/NG, atau Standar/Aktual. Penyebab tanpa bukti hanya dugaan.

### R2 Proses, bukan orang
"Human error", "operator ceroboh", "lalai", "kurang perhatian", dan sejenisnya bukan akar masalah. Tanyakan kenapa kesalahan itu bisa terjadi: tidak ada standar, pelatihan belum ada, tidak ada pengaman atau pengecekan. Akar dari sisi orang hanya sah kalau sebabnya sistemik, misalnya prosedur baru belum dilatihkan.

### R3 Uji kejadian
Kalau penyebab ini tidak ada, kejadian ini tidak akan terjadi. Kalau jawabannya tidak, itu bukan akar.

### R4 Uji pengulangan
Kalau penyebab ini diperbaiki, masalah tidak muncul lagi. Kalau jawabannya tidak, analisis belum cukup dalam.

### R5 Bisa ditindak
Penyebab berada dalam kendali tim atau perusahaan, dan ada countermeasure spesifik yang hasilnya bisa diukur. Penyebab di luar kendali, misalnya cuaca atau kebijakan pihak lain tanpa tindakan yang mungkin, belum cukup sebagai akar.

### R6 Gejala bukan akar
Akibat yang terlihat, seperti banyak NG, mesin berhenti, atau output turun, adalah gejala. Akar ada di balik gejala.

### R7 Bukan solusi yang dibalik
Kalimat sebab tidak boleh hanya berupa kebalikan dari tindakan perbaikan ("belum ada sensor"). Tanyakan sebab yang membuat tindakan itu dibutuhkan. Pengecualian: ketiadaan standar, SOP, atau pengaman yang terbukti menjadi pemicu langsung kejadian.

### R8 Hipotesis ditolak bukan akar
Dugaan di cabang "Hipotesis lain" sudah dicek dan ditolak. Jangan menyarankannya sebagai Root Cause.

### R9 Rantai nyambung
Rantai dibaca dari atas ke bawah: masalah, lalu setiap Why menjawab "kenapa" dari Why di atasnya. Dibaca dari bawah ke atas ("Karena ... maka ... sehingga terjadi ..."), sebabnya juga harus masuk akal. Lompatan logika atau Why yang tidak berhubungan menandakan rantai belum benar.
