from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation


destination = Path(__file__).with_name("Template_Histori_DM_Simpel.xlsx")
wb = Workbook()
guide = wb.active
guide.title = "BACA DULU"
guide.append(["Yang diisi", "Caranya"])
for row in [
    ("Mulai", "Isi 3 sheet: Attendance, Papercard, Standup. Satu baris = satu tanggal + line + shift. Tidak perlu membuat kode penempatan."),
    ("Identitas", "Isi tanggal, kode line sesuai sistem, DM saat itu, nama leader saat itu, dan shift. Kalau pindah DM atau leader, isi sesuai kondisi pada tanggal tersebut."),
    ("Tanggal", "Gunakan tanggal Excel dengan tampilan yyyy-mm-dd, misalnya 2026-08-03. Satu file boleh berisi riwayat 3 bulan."),
    ("Attendance", "Pilih OK / NG / IZIN untuk setiap role pada sesi 1 dan 2, sesuai arti status pada sumber yang sudah dipastikan. Jika arti OK/NG belum jelas, jangan menebak; beri catatan. Sesi mengikuti jadwal shift."),
    ("Papercard", "Kolom Leader / ME / PE / IPQC hanya untuk ketepatan waktu: OK = tepat waktu; NG = terlambat atau tidak mengisi. Temuan NG checklist berbeda dari NG ketepatan waktu."),
    ("Poin papercard", "Tiga kolom poin diisi dari rekap harian resmi: tepat waktu, temuan terdaftar, close loop. Ini POIN, bukan jumlah temuan. Kalau tidak punya rekap resmi, biarkan kosong."),
    ("Standup", "Isi tiga poin harian resmi: attendance, meeting content, close loop. Jangan menyimpulkan content/close dari status hadir saja. Kalau tidak diketahui, kosongkan."),
    ("Kosong atau nol", "Kosong = tidak tersedia. Angka 0 = memang nol dan sudah dipastikan. Jangan isi semua kolom kosong dengan 0 atau NG."),
    ("Bobot poin", "Jika memakai bobot sistem sekarang: papercard 8 / 14 / 8; standup 10 / 20 / 10. Jika rekap lama berbeda, tulis bobot aslinya di Catatan untuk diverifikasi. Jangan mengonversi sendiri."),
    ("Catatan", "Opsional: nama file/sheet sumber, penjelasan pindah DM, bobot lama, atau data yang belum lengkap. Jangan menebak nilai agar baris terlihat lengkap."),
    ("Contoh identitas", "2026-08-03 | TAC20601 | DM 3 | NAMA LEADER | Shift 1. Contoh ini hanya menjelaskan susunan, bukan memastikan penempatan historis line tersebut."),
    ("Cukup salin nilai", "Tanpa rumus dan tanpa merge. Salin-tempel nilai dari sumber yang benar. Tidak perlu mengisi data yang memang tidak tersedia."),
    ("Simpan", "Simpan hasil pengisian dengan nama lain, misalnya Histori_Juni_Agustus_2026.xlsx. Jangan ubah nama sheet atau judul kolom."),
    ("Status format", "Ini template pengumpulan histori yang baru. Importer saat ini masih membaca format lama; dukungan format simpel ini perlu ditambahkan sebelum diunggah. Data aplikasi tidak diubah oleh template ini."),
]:
    guide.append(row)
guide.column_dimensions["A"].width = 24
guide.column_dimensions["B"].width = 115
guide.freeze_panes = "B2"
for row in guide.iter_rows(min_row=2):
    row[1].alignment = Alignment(wrap_text=True, vertical="top")
    guide.row_dimensions[row[0].row].height = 48

identity = ["Tanggal", "Kode Line", "DM Saat Itu", "Leader Saat Itu", "Shift"]
roles = ["Leader", "ME", "PE Structure", "PE Electric", "QA"]
columns = {
    "Attendance": identity + [f"{role} - Sesi {session}" for session in (1, 2) for role in roles] + ["Catatan"],
    "Papercard": identity + [f"{role} - Tepat Waktu" for role in ("Leader", "ME", "PE", "IPQC")] + ["Poin Tepat Waktu", "Poin Temuan Terdaftar", "Poin Close Loop", "Catatan"],
    "Standup": identity + ["Poin Attendance", "Poin Meeting Content", "Poin Close Loop", "Catatan"],
}


def dropdown(ws, column, values):
    rule = DataValidation(type="list", formula1=f'"{values}"', allow_blank=True)
    rule.showErrorMessage = True
    rule.errorTitle = "Pilih dari dropdown"
    rule.error = "Pakai salah satu pilihan yang tersedia atau kosongkan jika tidak diketahui."
    rule.errorStyle = "stop"
    ws.add_data_validation(rule)
    rule.add(f"{column}2:{column}3001")


for name, headers in columns.items():
    ws = wb.create_sheet(name)
    ws.append(headers)
    ws.freeze_panes = "F2"
    ws.auto_filter.ref = f"A1:{ws.cell(1, len(headers)).column_letter}3001"
    dropdown(ws, "E", "Shift 1,Shift 2,Shift 3")
    for index, title in enumerate(headers, 1):
        letter = ws.cell(1, index).column_letter
        ws.column_dimensions[letter].width = 22
        if title == "Catatan":
            ws.column_dimensions[letter].width = 48
        if title == "Leader Saat Itu":
            ws.column_dimensions[letter].width = 28
        if " - Sesi " in title:
            dropdown(ws, letter, "OK,NG,IZIN")
            ws.cell(1, index).comment = Comment("Status asli per role dan sesi. Kosong jika tidak tersedia. Tidak digunakan untuk mengarang nama peserta atau waktu hadir.", "DM Digital")
        if " - Tepat Waktu" in title:
            dropdown(ws, letter, "OK,NG")
            ws.cell(1, index).comment = Comment("OK = tepat waktu. NG = terlambat atau tidak mengisi. Ini bukan status temuan checklist.", "DM Digital")
        if title.startswith("Poin "):
            ws.cell(1, index).comment = Comment("Poin harian resmi yang telah diverifikasi, bukan jumlah temuan/masalah. Kosong jika tidak diketahui. Bobot lama yang berbeda wajib dijelaskan di Catatan.", "DM Digital")
            rule = DataValidation(type="decimal", operator="between", formula1="0", formula2="1000", allow_blank=True)
            rule.showErrorMessage = True
            rule.error = "Isi poin berupa angka tidak negatif, atau kosongkan jika tidak tersedia."
            ws.add_data_validation(rule)
            rule.add(f"{letter}2:{letter}3001")
    for row in range(2, 3002):
        ws.cell(row, 1).number_format = "yyyy-mm-dd"
        for column in (2, 3, 4, 5):
            ws.cell(row, column).number_format = "@"

for ws in wb:
    ws.sheet_view.showGridLines = True
    ws.sheet_properties.tabColor = "087F5B"
    ws.row_dimensions[1].height = 40
    for cell in ws[1]:
        cell.fill = PatternFill("solid", fgColor="087F5B")
        cell.font = Font(name="Calibri", size=11, color="FFFFFF", bold=True)
        cell.alignment = Alignment(wrap_text=True, vertical="center")
wb.properties.title = "Template Histori DM Simpel"
wb.properties.creator = "DM Digital"
wb.save(destination)
saved = load_workbook(destination)
assert saved.sheetnames == ["BACA DULU", *columns]
assert not any(cell.data_type == "f" for ws in saved for row in ws for cell in row)
assert not any(ws.merged_cells.ranges for ws in saved)
for name in columns:
    assert not any(cell.value is not None for row in saved[name].iter_rows(min_row=2) for cell in row)
print(f"Created: {destination}")
