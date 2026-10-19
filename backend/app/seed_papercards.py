# pyrefly: ignore[missing-import]
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models import Board, Line, PapercardTemplate, Workshop

FACTORY_PRESETS = {
    "PROD": {
        "name": "Papercard Departemen Produksi",
        "version": "v1.0",
        "window_start": "07:30",
        "window_end": "08:15",
        "ok_rule": "OK jika seluruh pos kerja, mesin, material, dan personel siap tanpa ada kendala.",
        "ng_rule": "NG jika ada abnormalitas kesiapan. Wajib isi penyebab dan eskalasi ke Supervisor.",
        "categories": [
            {
                "id": "prod-cat-1",
                "name": "Manusia & POS Kerja",
                "items": [
                    {
                        "id": "prd-1",
                        "number": 1,
                        "title": "Ada penandaan pada pos pergerakan operator",
                        "answerType": "ok_ng",
                        "ruleInfo": "Lihat garis marking batas aman di lantai pos kerja",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "prd-2",
                        "number": 2,
                        "title": "Operator telah melalui training JI (Job Instruction)",
                        "answerType": "ok_ng",
                        "ruleInfo": "Cek matriks skill operator pada pos kritis",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "prd-3",
                        "number": 3,
                        "title": "Catat jumlah operator pengganti / absen hari ini",
                        "answerType": "text",
                        "ruleInfo": "Ketik jumlah orang dan nomor pos jika ada yang berganti",
                        "requireNoteIfNg": False,
                    },
                    {
                        "id": "prd-4",
                        "number": 4,
                        "title": "Kipas ion dan gelang statis ESD terpasang sesuai aturan",
                        "answerType": "ok_ng",
                        "ruleInfo": "Lampu hijau continuous monitor harus menyala",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "prd-5",
                        "number": 5,
                        "title": "Operator bekerja sesuai SOP dan memahami instruksi pos kritis",
                        "answerType": "ok_ng",
                        "ruleInfo": "Sampling 3 operator di pos kritis perakitan",
                        "requireNoteIfNg": True,
                    },
                ],
            },
            {
                "id": "prod-cat-2",
                "name": "Mesin & Peralatan Lini",
                "items": [
                    {
                        "id": "prd-6",
                        "number": 6,
                        "title": "Seluruh mesin utama menyala dan siap produksi",
                        "answerType": "ok_ng",
                        "ruleInfo": "Tidak ada alarm fault pada panel mesin",
                        "requireNoteIfNg": True,
                        "requirePhotoIfNg": True,
                    },
                    {
                        "id": "prd-7",
                        "number": 7,
                        "title": "Conveyor berjalan lancar tanpa getaran abnormal",
                        "answerType": "ok_ng",
                        "ruleInfo": "Kecepatan conveyor stabil sesuai takttime",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "prd-8",
                        "number": 8,
                        "title": "Sensor stopper dan interlock safety mesin berfungsi normal",
                        "answerType": "ok_ng",
                        "ruleInfo": "Uji fungsi tombol emergency stop di awal shift",
                        "requireNoteIfNg": True,
                    },
                ],
            },
            {
                "id": "prod-cat-3",
                "name": "Material & 5S",
                "items": [
                    {
                        "id": "prd-9",
                        "number": 9,
                        "title": "Material lot pertama lengkap di rak buffer pos kerja",
                        "answerType": "ok_ng",
                        "ruleInfo": "Cek ketersediaan part untuk target 1 jam pertama",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "prd-10",
                        "number": 10,
                        "title": "Label identitas lot & barcode part sesuai Work Order",
                        "answerType": "ok_ng",
                        "ruleInfo": "Periksa kecocokan nomor lot box dengan lembar WO",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "prd-11",
                        "number": 11,
                        "title": "Kebersihan 5S meja kerja dan lantai area perakitan",
                        "answerType": "ok_ng",
                        "ruleInfo": "Bebas dari debu, ceceran part, dan sampah boks",
                        "requireNoteIfNg": False,
                    },
                ],
            },
        ],
    },
    "ME": {
        "name": "Papercard Departemen ME (Maintenance)",
        "version": "v1.0",
        "window_start": "07:30",
        "window_end": "08:15",
        "ok_rule": "OK jika seluruh mesin, tekanan angin, dan temperatur sesuai batas SOP.",
        "ng_rule": "NG jika ada deviasi parameter suhu / tekanan. Wajib catat nilai ukur.",
        "categories": [
            {
                "id": "me-cat-1",
                "name": "Pemeriksaan Mesin & Temperatur",
                "items": [
                    {
                        "id": "me-1",
                        "number": 1,
                        "title": "Suhu solder station stabil pada 350±10°C",
                        "answerType": "ok_ng",
                        "ruleInfo": "Ukur suhu ujung mata solder dengan thermometer kontak",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "me-2",
                        "number": 2,
                        "title": "Catat nilai tekanan kompresor angin utama (MPa)",
                        "answerType": "text",
                        "ruleInfo": "Standar normal: 0.5 - 0.7 MPa",
                        "requireNoteIfNg": False,
                    },
                    {
                        "id": "me-3",
                        "number": 3,
                        "title": "Obeng elektrik (electric screwdriver) terkalibrasi torsinya",
                        "answerType": "ok_ng",
                        "ruleInfo": "Batas kalibrasi 30 hari stiker kalibrasi",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "me-4",
                        "number": 4,
                        "title": "Sensor stopper dan interlock safety mesin berfungsi normal",
                        "answerType": "ok_ng",
                        "ruleInfo": "Pastikan curtain safety sensor aktif dan memutus daya saat terhalang",
                        "requireNoteIfNg": True,
                        "requirePhotoIfNg": True,
                    },
                    {
                        "id": "me-5",
                        "number": 5,
                        "title": "Mesin press otomatis bekerja presisi tanpa deviasi langkah (stroke)",
                        "answerType": "ok_ng",
                        "ruleInfo": "Cek tekanan hidrolik/pneumatik pada gauge",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "me-6",
                        "number": 6,
                        "title": "Pemeriksaan kebocoran angin (air leak) pada seluruh sambungan selang",
                        "answerType": "ok_ng",
                        "ruleInfo": "Dengarkan suara desisan angin di sepanjang jalur lini",
                        "requireNoteIfNg": True,
                    },
                ],
            },
        ],
    },
    "PE": {
        "name": "Papercard Departemen PE (Process Engineering)",
        "version": "v1.0",
        "window_start": "07:30",
        "window_end": "08:15",
        "ok_rule": "OK jika jig, fixture, dan dokumen instruksi kerja valid.",
        "ng_rule": "NG jika jig aus, oblak, atau ada trial part tanpa SPK.",
        "categories": [
            {
                "id": "pe-cat-1",
                "name": "Jig, Fixture & Instruksi Kerja",
                "items": [
                    {
                        "id": "pe-1",
                        "number": 1,
                        "title": "Jig perakitan dalam kondisi presisi, baut tidak kendor",
                        "answerType": "ok_ng",
                        "ruleInfo": "Pin locator tidak boleh goyang / tergores parah",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "pe-2",
                        "number": 2,
                        "title": "Work Instruction (WI) revisi terbaru aktif di display pos",
                        "answerType": "ok_ng",
                        "ruleInfo": "Periksa nomor revisi drawing dengan dokumen engineering",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "pe-3",
                        "number": 3,
                        "title": "Catat nomor versi firmware / parameter proses",
                        "answerType": "text",
                        "ruleInfo": "Tuliskan kode versi parameter yang sedang di-flash",
                        "requireNoteIfNg": False,
                    },
                    {
                        "id": "pe-4",
                        "number": 4,
                        "title": "First-piece sample lolos uji dimensi dan trial proses",
                        "answerType": "ok_ng",
                        "ruleInfo": "Verifikasi 3 unit pertama bersama tim QC",
                        "requireNoteIfNg": True,
                        "requirePhotoIfNg": True,
                    },
                    {
                        "id": "pe-5",
                        "number": 5,
                        "title": "Keseimbangan takt-time dan pembagian beban kerja pos valid",
                        "answerType": "ok_ng",
                        "ruleInfo": "Tidak ada bottleneck berlebih pada pos manual",
                        "requireNoteIfNg": True,
                    },
                ],
            },
        ],
    },
    "QC": {
        "name": "Papercard Departemen QC (Quality Control)",
        "version": "v1.0",
        "window_start": "07:30",
        "window_end": "08:15",
        "ok_rule": "OK jika sampel batas dan alat ukur QC tervalidasi.",
        "ng_rule": "NG jika sampel limit kadaluarsa atau alat ukur belum kalibrasi.",
        "categories": [
            {
                "id": "qc-cat-1",
                "name": "Alat Ukur & Master Sample Limit",
                "items": [
                    {
                        "id": "qc-1",
                        "number": 1,
                        "title": "Master limit sample kosmetik dan gap tersedia di pos QC",
                        "answerType": "ok_ng",
                        "ruleInfo": "Sample harus berlabel tanggal verifikasi QC Dept Head",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "qc-2",
                        "number": 2,
                        "title": "Alat ukur (caliper, micrometer, ESD tester) berstiker kalibrasi valid",
                        "answerType": "ok_ng",
                        "ruleInfo": "Masa berlaku kalibrasi alat ukur masih aktif",
                        "requireNoteIfNg": True,
                    },
                    {
                        "id": "qc-3",
                        "number": 3,
                        "title": "Catat hasil uji ground monitor ESD (Ohm)",
                        "answerType": "text",
                        "ruleInfo": "Batas normal < 1.0 x 10^6 Ohm",
                        "requireNoteIfNg": False,
                    },
                    {
                        "id": "qc-4",
                        "number": 4,
                        "title": "Verifikasi 5 unit first piece perakitan lolos kriteria QA",
                        "answerType": "ok_ng",
                        "ruleInfo": "Uji fungsi layar, kamera, baterai, dan uji kosmetik luar",
                        "requireNoteIfNg": True,
                        "requirePhotoIfNg": True,
                    },
                    {
                        "id": "qc-5",
                        "number": 5,
                        "title": "Catat temuan cacat kritis (defective rate) shift sebelumnya",
                        "answerType": "text",
                        "ruleInfo": "Ketik jenis cacat tertinggi dan pos asalnya",
                        "requireNoteIfNg": False,
                    },
                ],
            },
        ],
    },
}


def seed_workshops_and_lines(db):
    # Ensure Workshop 5 and Workshop 6 exist
    ws5 = db.scalar(select(Workshop).where(Workshop.name == "Workshop 5"))
    if not ws5:
        ws5 = Workshop(name="Workshop 5")
        db.add(ws5)
        db.flush()

    ws6 = db.scalar(select(Workshop).where(Workshop.name == "Workshop 6"))
    if not ws6:
        ws6 = Workshop(name="Workshop 6")
        db.add(ws6)
        db.flush()

    # 4 lines definition
    target_lines = [
        {"workshop_id": ws5.id, "code": "TAC20601", "name": "Line 1 (EXCELENCE)", "slug": "workshop-5-tac20601", "model": "CPH2581"},
        {"workshop_id": ws5.id, "code": "TAC20602", "name": "Line 2 (EXCELENCE 2)", "slug": "workshop-5-tac20602", "model": "CPH2581"},
        {"workshop_id": ws6.id, "code": "TBC20601", "name": "Line 1 (INNOVATION 1)", "slug": "workshop-6-tbc20601", "model": "CPH2607"},
        {"workshop_id": ws6.id, "code": "TBC20602", "name": "Line 2 (INNOVATION 2)", "slug": "workshop-6-tbc20602", "model": "CPH2607"},
    ]

    for item in target_lines:
        line = db.scalar(select(Line).where(Line.code == item["code"]))
        if not line:
            line = Line(
                workshop_id=item["workshop_id"],
                code=item["code"],
                name=item["name"],
                model=item["model"],
                status="running",
            )
            db.add(line)
            db.flush()
            print(f"Created line: {line.code} ({line.name})")

        board = db.scalar(select(Board).where(Board.line_id == line.id))
        if not board:
            board = Board(
                line_id=line.id,
                slug=item["slug"],
                slogan="Kualitas Tanpa Kompromi, Presisi Setiap Detik",
                line_label="DM TRIANGLE LINE",
                line_label_zh="DM三角线",
                values=["Kualitas adalah Nyawa", "Disiplin Standar Kerja", "Kerjasama Tim Tanpa Batas"],
            )
            db.add(board)
            db.flush()
            print(f"Created board: {board.slug}")

    db.commit()


def seed_papercard_templates(db):
    lines = list(db.scalars(select(Line)).all())
    count = 0

    for line in lines:
        for dept_key, preset in FACTORY_PRESETS.items():
            stmt = select(PapercardTemplate).where(
                PapercardTemplate.line_id == line.id,
                PapercardTemplate.department == dept_key,
            )
            existing = db.scalar(stmt)

            template_data = {
                "categories": preset["categories"],
                "okRule": preset["ok_rule"],
                "ngRule": preset["ng_rule"],
            }

            if existing:
                existing.name = preset["name"]
                existing.version = preset["version"]
                existing.window_start = preset["window_start"]
                existing.window_end = preset["window_end"]
                existing.template_data = template_data
                existing.workshop_id = line.workshop_id
                count += 1
                print(f"Updated template for {line.code} - {dept_key}")
            else:
                tpl = PapercardTemplate(
                    workshop_id=line.workshop_id,
                    line_id=line.id,
                    department=dept_key,
                    name=preset["name"],
                    version=preset["version"],
                    window_start=preset["window_start"],
                    window_end=preset["window_end"],
                    template_data=template_data,
                )
                db.add(tpl)
                count += 1
                print(f"Created template for {line.code} - {dept_key}")

    db.commit()
    print(f"\n✓ SEED COMPLETED: Successfully seeded {count} papercard templates across all {len(lines)} lines!")


def main():
    with SessionLocal() as db:
        print("1. Seeding workshops and 4 lines...")
        seed_workshops_and_lines(db)
        print("2. Seeding Papercard Templates into PostgreSQL...")
        seed_papercard_templates(db)


if __name__ == "__main__":
    main()
