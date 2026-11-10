from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.workbook.defined_name import DefinedName


DESTINATION = Path(__file__).with_name("Template_Import_Histori_DM_v1.xlsx")
CAPACITY = 3001
wb = Workbook()
wb.remove(wb.active)


def sheet(name, headers, descriptions):
    ws = wb.create_sheet(name)
    ws.append(headers)
    ws.freeze_panes = "D2"
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = "1:1"
    ws.sheet_properties.tabColor = "087F5B"
    ws.row_dimensions[1].height = 42
    for cell, description in zip(ws[1], descriptions):
        cell.font = Font(name="Calibri", size=11, color="FFFFFF", bold=True)
        cell.fill = PatternFill("solid", fgColor="087F5B")
        cell.alignment = Alignment(wrap_text=True, vertical="center")
        cell.comment = Comment(description, "DM Digital")
        ws.column_dimensions[cell.column_letter].width = min(38, max(20, len(str(cell.value)) + 3))
    return ws


guide = sheet("PETUNJUK", ["Bagian", "Petunjuk"], ["Topik pengisian.", "Baca sebelum mengisi sheet data."])
instructions = [
    ("Versi", "Template histori DM v1. Format baru; importer aplikasi saat ini masih memakai workbook lama. Jangan unggah sebelum dukungan format ini ditambahkan."),
    ("Tujuan", "Mencatat riwayat yang benar berdasarkan sumber. Template ini tidak membuat transaksi live dan tidak mengganti master atau penempatan aktif."),
    ("Urutan", "1. Isi PENEMPATAN. 2. Isi ATTENDANCE, PAPERCARD, dan STANDUP sesuai data yang tersedia. 3. REKAP_KPI hanya jika ada poin harian resmi."),
    ("Sheet kosong", "Sheet data sengaja kosong. CONTOH berisi data fiktif untuk panduan dan tidak boleh diimpor. Tidak semua sheet wajib diisi jika sumbernya tidak ada."),
    ("Tanggal", "Gunakan tanggal Excel, tampil yyyy-mm-dd. Data harus historis. Satu file boleh memuat beberapa bulan; tidak perlu satu file per bulan."),
    ("Tanpa rumus", "Isi nilai langsung. Jangan gunakan formula, merge cell, subtotal, atau baris judul tambahan. Nama sheet dan header jangan diganti."),
    ("Kosong dan nol", "Kosong = data tidak tersedia. Angka 0 = sudah dipastikan nol. TIDAK_DIKETAHUI = status tidak tercatat. Jangan mengubah ketiganya menjadi arti yang sama."),
    ("Kunci penempatan", "Buat kode_penempatan sendiri, misalnya PLN-001. Setiap baris detail mengacu ke kode ini; DM/leader tidak diketik ulang di semua sheet."),
    ("Pindah DM/leader", "Tambah penempatan baru dengan tanggal berlaku sebenarnya. Periode inklusif dan tidak boleh bertumpuk pada line + shift yang sama. Jika pindah 16 Agustus, periode lama berakhir 15 Agustus."),
    ("Penempatan belum jelas", "Jangan menebak tanggal perpindahan atau memakai DM saat ini untuk semua riwayat. Tandai untuk dikonfirmasi sebelum impor."),
    ("Identitas", "Gunakan kode_line dan nomor pegawai/NIK sesuai master; simpan NIK sebagai teks agar angka nol di depan tidak hilang. Jika NIK lama tidak diketahui, kosongkan dan isi nama sumber untuk verifikasi."),
    ("ATTENDANCE", "Satu baris per tanggal + penempatan + sesi + role. Sesi 1/2 mengikuti jadwal shift, bukan jam tetap. wajib_hadir menentukan apakah role termasuk peserta wajib pada tanggal itu."),
    ("Hadir dan tepat waktu", "HADIR tidak otomatis berarti tepat waktu. Jam hadir/jadwal hanya diisi bila benar-benar tercatat. Kehadiran perwakilan perlu identitas perwakilan yang sah, bukan dianggap otomatis hadir."),
    ("PAPERCARD", "Satu baris per tanggal + penempatan + role. Leader = PROD, ME = ME, PE = PE, IPQC = QC. Ketepatan waktu terpisah dari jumlah temuan NG dan persetujuan close loop."),
    ("NG ketepatan waktu", "TERLAMBAT dan TIDAK_MENGISI sama-sama gagal ketepatan waktu. Temuan NG pada checklist adalah hal berbeda dan dicatat pada jumlah_temuan_ng."),
    ("Close papercard", "close_disetujui_hari_yang_sama = YA hanya jika papercard memiliki temuan dan penutupannya sudah disetujui pada tanggal papercard itu. Selesai tanpa approval bukan otomatis YA."),
    ("STANDUP", "Satu baris per tanggal + penempatan. Catat status kedua sesi. Poin content sistem memerlukan peserta wajib lengkap dan sesi SELESAI; tidak cukup menganggap ada daftar hadir."),
    ("Masalah standup", "jumlah_masalah adalah masalah unik yang dicatat pada meeting tanggal tersebut, gabungan dua sesi tanpa dihitung ganda. jumlah_closed_hari_yang_sama hanya yang resolved pada tanggal yang sama; tidak boleh melebihi jumlah_masalah."),
    ("Close standup", "Jika dipastikan tidak ada masalah, isi dua jumlah dengan 0. Jika catatan masalah tidak tersedia, kosongkan; jangan menganggap nol atau semua closed."),
    ("REKAP_KPI opsional", "Isi hanya poin harian resmi yang telah diverifikasi, satu baris per tanggal + penempatan + jenis_kpi. Bukan jumlah temuan/masalah dan bukan rata-rata bulanan."),
    ("Prioritas sumber", "Jika detail dan rekap resmi berbeda, keduanya perlu ditinjau sebelum impor. Jangan memakai poin rekap untuk mengarang status detail, atau sebaliknya."),
    ("Bobot papercard", "Sistem saat ini: tepat waktu 8, temuan terdaftar 14, close loop 8. Masing-masing komponen all-or-nothing pada role yang diwajibkan template. Rekap lama dengan bobot berbeda wajib mencantumkan skema_bobot dan diverifikasi."),
    ("Bobot standup", "Sistem saat ini: attendance 5 per sesi lengkap (maks. 10), content 10 per sesi lengkap dan selesai (maks. 20), close loop 10 jika ada masalah dan semuanya resolved pada hari yang sama."),
    ("Bukti", "Isi sumber_bukti misalnya nama file lama + sheet/baris, nomor laporan, atau lokasi arsip. Jangan menaruh password atau data rahasia yang tidak diperlukan."),
    ("Dropdown", "Pilih nilai dari dropdown. Validasi tersedia sampai baris 3001; jika menambah baris setelah itu, salin validasinya. Kolom catatan bebas untuk penjelasan, bukan pengganti status."),
    ("Sebelum impor", "Periksa periode penempatan, identitas leader, duplikasi, status tidak diketahui, serta nilai 0. Data hasil impor lama perlu ditinjau terpisah; pembuatan template ini tidak menghapusnya."),
]
for row in instructions:
    guide.append(row)
guide.column_dimensions["A"].width = 28
guide.column_dimensions["B"].width = 115
for row in guide.iter_rows(min_row=2):
    row[1].alignment = Alignment(wrap_text=True, vertical="top")
    guide.row_dimensions[row[0].row].height = 48

common = ["tanggal", "kode_penempatan"]
common_help = ["Tanggal data historis; harus berada dalam periode penempatan.", "Harus sama persis dengan kode pada PENEMPATAN."]
specs = {
    "PENEMPATAN": (
        ["kode_penempatan", "mulai_berlaku", "selesai_berlaku", "kode_line", "dm_historis", "shift", "nik_leader", "nama_leader", "sumber_bukti", "catatan"],
        ["Wajib, unik. Contoh PLN-001. Digunakan untuk menghubungkan sheet detail.", "Tanggal awal periode, inklusif.", "Tanggal akhir periode, inklusif. Wajib untuk riwayat yang diimpor.", "Kode persis sesuai master line, bukan nama atau nomor urut.", "DM yang berlaku saat itu, misalnya DM 3. Jangan gunakan penempatan sekarang jika dahulu berbeda.", "Shift 1, Shift 2, atau Shift 3.", "Nomor pegawai sebagai teks; kosong jika belum diketahui, perlu verifikasi.", "Nama leader historis sesuai sumber, wajib.", "Dokumen yang membuktikan periode/penempatan.", "Penjelasan tambahan atau hal yang perlu diverifikasi."],
    ),
    "ATTENDANCE": (
        common + ["sesi", "role", "wajib_hadir", "nik_peserta", "nama_peserta", "status_hadir", "nik_perwakilan", "nama_perwakilan", "jadwal_hadir", "waktu_hadir", "sumber_bukti", "catatan"],
        common_help + ["1 atau 2, sesuai sesi pada shift.", "Leader, ME, PE Structure, PE Electric, atau QA.", "YA/TIDAK/TIDAK_DIKETAHUI; berdasarkan roster saat itu.", "Opsional jika tidak tersedia; isi nomor pegawai sebagai teks.", "Nama peserta asli, jika tersedia.", "HADIR/TIDAK_HADIR/IZIN/DIWAKILKAN/TIDAK_DIKETAHUI. Jangan menerjemahkan OK/NG lama tanpa memastikan artinya.", "Isi jika DIWAKILKAN dan identitas diketahui.", "Nama perwakilan, jika DIWAKILKAN.", "Tanggal dan jam jadwal lokal pabrik (WIB), hanya jika tercatat.", "Tanggal dan jam hadir lokal pabrik (WIB), hanya jika tercatat.", "Lokasi arsip attendance.", "Misalnya alasan izin atau identitas yang belum diketahui."],
    ),
    "PAPERCARD": (
        common + ["role", "wajib_papercard", "ketepatan_waktu", "jumlah_temuan_ng", "close_disetujui_hari_yang_sama", "sumber_bukti", "catatan"],
        common_help + ["Leader, ME, PE, atau IPQC.", "YA/TIDAK/TIDAK_DIKETAHUI. Mengikuti kewajiban template historis.", "TEPAT_WAKTU/TERLAMBAT/TIDAK_MENGISI/TIDAK_DIKETAHUI. Ini bukan status temuan checklist.", "Bilangan bulat >= 0. Kosong jika tidak tercatat; 0 jika dipastikan tidak ada temuan NG.", "YA/TIDAK/TIDAK_DIKETAHUI. YA perlu temuan NG dan approval close pada tanggal yang sama.", "Lokasi arsip papercard.", "Jelaskan bila detail temuan atau approval tidak tersedia."],
    ),
    "STANDUP": (
        common + ["status_sesi_1", "status_sesi_2", "jumlah_masalah", "jumlah_closed_hari_yang_sama", "sumber_bukti", "catatan"],
        common_help + ["SELESAI/BERJALAN/TIDAK_DILAKSANAKAN/TIDAK_DIKETAHUI.", "SELESAI/BERJALAN/TIDAK_DILAKSANAKAN/TIDAK_DIKETAHUI.", "Masalah unik yang dicatat pada dua sesi hari itu. Kosong bila tidak diketahui.", "Masalah dari kolom sebelumnya yang resolved pada tanggal yang sama. Tidak lebih dari jumlah_masalah.", "Lokasi berita acara / catatan masalah dan penutupannya.", "Keterangan content meeting atau catatan masalah yang belum tersedia."],
    ),
    "REKAP_KPI": (
        common + ["jenis_kpi", "poin_ketepatan_waktu", "poin_temuan_terdaftar", "poin_attendance", "poin_meeting_content", "poin_close_loop", "skema_bobot", "sumber_bukti", "catatan"],
        common_help + ["PAPERCARD atau STANDUP; satu baris per jenis, tanggal, dan penempatan.", "Khusus PAPERCARD. Poin resmi, bukan jumlah role. Kosong untuk STANDUP.", "Khusus PAPERCARD. Poin resmi, bukan jumlah temuan. Kosong untuk STANDUP.", "Khusus STANDUP. Kosong untuk PAPERCARD.", "Khusus STANDUP. Kosong untuk PAPERCARD. Nol hanya jika terverifikasi.", "Poin close loop resmi sesuai jenis KPI. Jangan tebak dari status hadir.", "Contoh SISTEM_8_14_8 atau SISTEM_10_20_10; untuk bobot lama isi kode/nama skema yang disetujui.", "Wajib untuk rekap resmi. Sebutkan dokumen yang menetapkan poin.", "Jangan isi total/rata-rata bulanan pada baris harian. Komponen tidak tersedia tetap kosong untuk ditinjau."],
    ),
}
data_sheets = {name: sheet(name, *spec) for name, spec in specs.items()}

reference = sheet("REFERENSI", ["shift", "ya_tidak", "role_attendance", "role_papercard", "status_hadir", "ketepatan_waktu", "status_meeting", "jenis_kpi", "sesi"], ["Pilihan tetap; jangan ubah."] * 9)
options = [
    ["Shift 1", "Shift 2", "Shift 3"],
    ["YA", "TIDAK", "TIDAK_DIKETAHUI"],
    ["Leader", "ME", "PE Structure", "PE Electric", "QA"],
    ["Leader", "ME", "PE", "IPQC"],
    ["HADIR", "TIDAK_HADIR", "IZIN", "DIWAKILKAN", "TIDAK_DIKETAHUI"],
    ["TEPAT_WAKTU", "TERLAMBAT", "TIDAK_MENGISI", "TIDAK_DIKETAHUI"],
    ["SELESAI", "BERJALAN", "TIDAK_DILAKSANAKAN", "TIDAK_DIKETAHUI"],
    ["PAPERCARD", "STANDUP"],
    ["1", "2"],
]
for column, values in enumerate(options, 1):
    for row, value in enumerate(values, 2):
        reference.cell(row, column, value)
    letter = reference.cell(1, column).column_letter
    wb.defined_names.add(DefinedName(f"Pilihan_{reference.cell(1, column).value}", attr_text=f"'REFERENSI'!${letter}$2:${letter}${len(values) + 1}"))


def validation(ws, column_name, rule):
    column = next(cell.column_letter for cell in ws[1] if cell.value == column_name)
    rule.allow_blank = True
    rule.showErrorMessage = True
    rule.errorTitle = "Nilai belum sesuai"
    rule.error = "Gunakan pilihan atau format yang dijelaskan pada komentar header."
    rule.errorStyle = "stop"
    ws.add_data_validation(rule)
    rule.add(f"{column}2:{column}{CAPACITY}")


list_fields = {
    "shift": "shift", "wajib_hadir": "ya_tidak", "wajib_papercard": "ya_tidak",
    "close_disetujui_hari_yang_sama": "ya_tidak", "status_hadir": "status_hadir",
    "ketepatan_waktu": "ketepatan_waktu", "status_sesi_1": "status_meeting",
    "status_sesi_2": "status_meeting", "jenis_kpi": "jenis_kpi", "sesi": "sesi",
}
for name, ws in data_sheets.items():
    for cell in ws[1]:
        field = cell.value
        if field in list_fields or field == "role":
            key = list_fields.get(field, "role_attendance" if name == "ATTENDANCE" else "role_papercard")
            validation(ws, field, DataValidation(type="list", formula1=f"=Pilihan_{key}"))
        if field in ("tanggal", "mulai_berlaku", "selesai_berlaku", "jadwal_hadir", "waktu_hadir"):
            validation(ws, field, DataValidation(type="decimal", operator="between", formula1="1", formula2="2958465"))
        if field.startswith("jumlah_"):
            validation(ws, field, DataValidation(type="whole", operator="between", formula1="0", formula2="1000000"))
        if field.startswith("poin_"):
            validation(ws, field, DataValidation(type="decimal", operator="between", formula1="0", formula2="1000"))
        for row in range(2, CAPACITY + 1):
            target = ws.cell(row, cell.column)
            if field in ("tanggal", "mulai_berlaku", "selesai_berlaku"):
                target.number_format = "yyyy-mm-dd"
            elif field in ("jadwal_hadir", "waktu_hadir"):
                target.number_format = "yyyy-mm-dd hh:mm"
            elif field.startswith("jumlah_"):
                target.number_format = "0"
            elif field.startswith("poin_"):
                target.number_format = "0.##"
            else:
                target.number_format = "@"
    end = ws.cell(1, ws.max_column).column_letter
    table = Table(displayName=f"Data{name.replace('_', '')}", ref=f"A1:{end}2")
    table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium4", showRowStripes=True)
    ws.add_table(table)

examples = sheet("CONTOH", ["Sheet tujuan", "Contoh nilai per kolom", "Penjelasan"], ["Panduan saja, tidak untuk impor."] * 3)
example_rows = [
    ("PENEMPATAN", "PLN-001 | 2026-08-01 | 2026-08-15 | TAC20601 | DM 3 | Shift 1 | CONTOH001 | LEADER CONTOH A | SK penempatan contoh |", "FIKTIF. Jangan dianggap penempatan asli TAC20601."),
    ("PENEMPATAN", "PLN-002 | 2026-08-16 | 2026-08-31 | TAC20601 | DM 4 | Shift 1 | CONTOH002 | LEADER CONTOH B | SK mutasi contoh |", "FIKTIF. Pergantian leader/DM: kode baru, periode tidak bertumpuk."),
    ("ATTENDANCE", "2026-08-03 | PLN-001 | 1 | Leader | YA | CONTOH001 | LEADER CONTOH A | HADIR | [kosong] | [kosong] | [kosong] | [kosong] | Arsip contoh | Jam tidak tercatat", "Tambah baris terpisah untuk role lain dan sesi 2. Tulisan [kosong] berarti sel benar-benar kosong, jangan diketik."),
    ("PAPERCARD", "2026-08-03 | PLN-001 | Leader | YA | TEPAT_WAKTU | 2 | YA | Papercard contoh | Approval close pada hari yang sama", "Isi tepat waktu, punya 2 temuan NG, dan close disetujui hari yang sama: ketiganya fakta terpisah."),
    ("PAPERCARD", "2026-08-03 | PLN-001 | ME | YA | TERLAMBAT | 1 | TIDAK | Papercard contoh |", "Ada temuan NG tetapi terlambat. Jangan otomatis memberikan poin temuan terdaftar."),
    ("PAPERCARD", "2026-08-03 | PLN-001 | PE | YA | TIDAK_MENGISI | [kosong] | TIDAK_DIKETAHUI | Arsip contoh |", "Tidak mengisi gagal ketepatan waktu. Temuan yang tidak tercatat tidak dikarang jadi 0."),
    ("STANDUP", "2026-08-03 | PLN-001 | SELESAI | SELESAI | 2 | 1 | Notulen contoh | Satu masalah baru closed besok", "Close hari yang sama belum lengkap. Attendance tiap sesi tetap berasal dari sheet ATTENDANCE."),
    ("STANDUP", "2026-08-04 | PLN-001 | TIDAK_DIKETAHUI | TIDAK_DIKETAHUI | [kosong] | [kosong] | Arsip tidak lengkap |", "Kekurangan data tidak sama dengan tidak ada meeting atau nilai nol."),
    ("REKAP_KPI", "2026-08-05 | PLN-001 | PAPERCARD | 8 | 14 | [kosong] | [kosong] | 8 | SISTEM_8_14_8 | Rekap resmi contoh |", "FIKTIF, opsional. Isi hanya bila ada bukti poin harian resmi; bukan hasil menebak."),
    ("REKAP_KPI", "2026-08-05 | PLN-001 | STANDUP | [kosong] | [kosong] | 10 | 20 | 10 | SISTEM_10_20_10 | Rekap resmi contoh |", "FIKTIF. Kolom yang tidak berlaku untuk jenis KPI dibiarkan kosong."),
]
for row in example_rows:
    examples.append(row)
examples.column_dimensions["A"].width = 22
examples.column_dimensions["B"].width = 110
examples.column_dimensions["C"].width = 85
for row in examples.iter_rows(min_row=2):
    examples.row_dimensions[row[0].row].height = 66
    for cell in row:
        cell.alignment = Alignment(wrap_text=True, vertical="top")

dictionary = sheet("KAMUS_KOLOM", ["Sheet", "Kolom", "Arti dan aturan"], ["Sheet data.", "Nama header persis.", "Penjelasan pengisian."])
for name, (headers, descriptions) in specs.items():
    for header, description in zip(headers, descriptions):
        dictionary.append([name, header, description])
dictionary.column_dimensions["A"].width = 22
dictionary.column_dimensions["B"].width = 40
dictionary.column_dimensions["C"].width = 105
for row in dictionary.iter_rows(min_row=2):
    row[2].alignment = Alignment(wrap_text=True, vertical="top")
    dictionary.row_dimensions[row[0].row].height = 32
dictionary.auto_filter.ref = dictionary.dimensions
wb.properties.title = "Template Impor Histori DM v1"
wb.properties.subject = "Penempatan, attendance, papercard, dan standup historis"
wb.properties.creator = "DM Digital"
wb.save(DESTINATION)

saved = load_workbook(DESTINATION)
assert saved.sheetnames == ["PETUNJUK", *specs, "REFERENSI", "CONTOH", "KAMUS_KOLOM"]
assert not any(cell.data_type == "f" for ws in saved for row in ws for cell in row)
assert not any(ws.merged_cells.ranges for ws in saved)
for name, (headers, _) in specs.items():
    assert [cell.value for cell in saved[name][1]] == headers
    assert not any(cell.value is not None for row in saved[name].iter_rows(min_row=2) for cell in row)
print(f"Created: {DESTINATION}")
print(f"Sheets: {len(saved.sheetnames)}; blank data sheets: {len(specs)}; no formulas or merged cells.")
