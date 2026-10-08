# Progress Morning Meeting Dashboard

## Status fase

- Fase 1 selesai dan sudah commit: `af29e73 fase 1: data dan halaman KPI`.
- Fase 2 selesai dan sudah commit: `eb50cf7 fase 2: AI followup dan notifikasi`.
- Fase 3 selesai dan sudah commit: `f315ee6 fase 3: not achieved dan 5why`.
- Tidak ada fase yang dibatalkan. `BLOCKERS.md` tidak dibuat karena tidak ada blocker final.

## Hasil final checks

- `npx next build`: lolos.
- `npx tsc --noEmit`: lolos setelah build selesai. Saat dijalankan paralel dengan build, `tsc` sempat membaca `.next/types` yang sedang diregenerasi dan gagal dengan file `.next/types` missing; rerun setelah build selesai lolos.

## File baru utama

- `data-source/kpi-actuals-2026.json`
- `data-source/projects-2026.json`
- `src/types/morningMeeting.ts`
- `src/data/morningMeetingMasterData.ts`
- `src/data/morningMeetingActualData.ts`
- `src/data/morningMeetingProjectData.ts`
- `src/components/providers/RoleProvider.tsx`
- `src/components/providers/DisplayModeProvider.tsx`
- `src/app/(dashboard)/morning-meeting/page.tsx`
- `src/app/(dashboard)/morning-meeting/production-kpi/page.tsx`
- `src/app/(dashboard)/morning-meeting/project-2026/page.tsx`
- `src/app/(dashboard)/morning-meeting/followup/page.tsx`
- `src/features/morning-meeting/*`
- `src/styles/morning-meeting.css`
- `src/utils/kpiStatus.ts`
- `src/utils/kpiStatus.test.ts`

## File berubah utama

- `src/config/navigation.ts`
- `src/components/AppShell.tsx`
- `src/components/ClientAppShell.tsx`
- `src/components/shell/ShellContent.tsx`
- `src/components/shell/ShellTopbar.tsx`
- `src/components/shell/SidebarNav.tsx`
- `src/components/shell/commands.ts`
- `src/components/shell/shellPage.ts`
- `src/app/globals.css`
- `src/styles/shell.css`
- `package.json`

## Asumsi yang diambil

- `SMED` memakai target numerik `6` untuk perhitungan warna karena `hitungStatusKpi` membutuhkan angka, sementara target teks `A/B 6H, C 10H` tetap ditampilkan sebagai konteks master.
- Status proyek `off-track` dipetakan dari item yang jelas bermasalah pada Q2 atau target teksnya menunjukkan belum sesuai: `Flexible Delivery (SMED)`, `SLC/UPPH`, `Losses Material`, dan `Personnel Stability`.
- Due date follow-up dibuat relatif terhadap hari ini agar item `Overdue` selalu terlihat untuk prototype pitching.
- Konten AI, action plan, P-AI Robot, dan 5WHY adalah simulasi; semua UI AI diberi badge `Simulasi`.
- Not Achieved dan 5WHY memakai contoh yang berasal dari KPI bermasalah di data: E2E Juli, Losses Material Juni/Juli, SLC Maret, NGP Maret.
- Role default tetap `Manajer` dan mode default tetap `klasik` agar tampilan lama tidak berubah saat reload.

## Tes manual

1. Buka app dan pastikan mode default `Klasik` dengan role `Manajer` tidak menampilkan grup `Morning Meeting`, tombol P-AI, atau bell notifikasi morning meeting.
2. Ubah mode ke `Morning Meeting`.
3. Role `HOD`: hanya melihat `Beranda Meeting` dan `Followup`; cek kartu eksepsi, strip SQCDIP, Peringatan AI, Keputusan/Eskalasi, Not Achieved ringkas, proyek off-track, bell notifikasi HOD, dan P-AI Robot.
4. Role `Manajer`: melihat `Beranda Meeting`, `Production KPI`, `Project 2026`, dan `Followup`; cek tabel KPI, grafik detail, Saran Action Plan, Not Achieved, 5WHY, komentar reviewer, tambah follow-up, notifikasi, dan robot.
5. Role `Host`: sama seperti Manajer untuk menu morning meeting; cek form tambah follow-up dan komentar 5WHY.
6. Role `KPI Admin`: melihat menu data KPI/proyek dan beranda; cek Production KPI dan Project 2026 tetap terbuka.
7. Role `PIC Area`: pilih area di topbar; cek Beranda Meeting hanya memuat KPI/not achieved area terpilih, Followup hanya tugas area itu, dan status tugas bisa diubah.
8. Klik chip P-AI Robot: cek 5 pertanyaan cepat dan jawaban hitung dari data untuk KPI merah serta rata-rata Losses Material 3 bulan terakhir.
