import logging
from typing import Any
from app.core.config import settings

logger = logging.getLogger("teamtalk")


async def send_teamtalk_message(content: str, job_nos: list[str] | None = None) -> bool:
    """
    Mengirim pesan teks ke Robot TeamTalk OPPO melalui Incoming Webhook.
    job_nos berisi nomor karyawan yang akan diberi notifikasi (notifyParams jobNos).
    Tidak akan menyebabkan aplikasi crash jika ada kegagalan jaringan.
    """
    if not settings.teamtalk_enabled:
        return False

    url = settings.teamtalk_webhook_url
    if not url:
        logger.debug("TeamTalk webhook URL belum dikonfigurasi di .env")
        return False

    payload: dict[str, Any] = {
        "content": content
    }
    unique_nos = list(dict.fromkeys(no for no in (job_nos or []) if no))
    if unique_nos:
        payload["notifyParams"] = [{"type": "jobNos", "values": unique_nos}]
    headers = {
        "Content-Type": "application/json;charset=utf-8"
    }

    try:
        import httpx

        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    logger.info("Pesan TeamTalk berhasil terkirim.")
                    return True
                else:
                    logger.warning("TeamTalk response error: %s", data)
                    return False
            else:
                logger.warning("Gagal mengirim ke TeamTalk: status %s - %s", response.status_code, response.text)
                return False
    except Exception as exc:
        logger.error("Exception saat mengirim pesan ke TeamTalk: %s", exc)
        return False


def format_due(due: str | None) -> str:
    if not due:
        return "-"
    # Ganti 'T' jika format ISO
    return due.replace("T", " ")


def employee_nos_by_id(pic_ids: list[int]) -> dict[int, str]:
    ids = {pid for pid in pic_ids if pid is not None}
    if not ids:
        return {}
    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models import Employee

    with SessionLocal() as db:
        rows = db.execute(select(Employee.id, Employee.employee_no).where(Employee.id.in_(ids))).all()
    return {row.id: row.employee_no for row in rows}


async def notify_new_problems(line_code: str, session_label: str, summaries: list[Any]) -> bool:
    """
    Notifikasi saat DM Meeting selesai dan terdapat masalah baru dengan PIC yang ditugaskan.
    """
    if not summaries:
        return False

    lines = [
        f"",
        f"",
        f"[PENUGASAN MASALAH DM MEETING]",
        f"Line: {line_code or '-'} | Sesi: {session_label or '-'}",
        f"Terdapat {len(summaries)} tindak lanjut masalah yang dicatat:",
        ""
    ]

    def field(sm: Any, key: str) -> Any:
        return sm.get(key) if isinstance(sm, dict) else getattr(sm, key, None)

    nos_by_id = employee_nos_by_id([field(sm, "pic_id") for sm in summaries] + [field(pic, "employee_id") for sm in summaries for pic in field(sm, "pics") or []])
    job_nos: list[str] = []

    for idx, sm in enumerate(summaries, 1):
        problem = field(sm, "problem") or "-"
        pics = field(sm, "pics") or []
        pic_name = ", ".join(field(pic, "name") for pic in pics) if pics else field(sm, "pic_name") or "-"
        due = format_due(field(sm, "due_date"))
        job_nos.append(field(sm, "pic_employee_no") or nos_by_id.get(field(sm, "pic_id")))
        job_nos.extend(field(pic, "employee_no") or nos_by_id.get(field(pic, "employee_id")) for pic in pics)
        lines.append(f"{idx}. {problem}")
        lines.append(f"   👤 PIC: {pic_name} | ⏱️ Due: {due}")

    lines.append("")
    lines.append("Mohon PIC segera menindaklanjuti. Terima kasih!")

    return await send_teamtalk_message("\n".join(lines), job_nos=job_nos)


async def notify_escalated_problems(escalations: list[dict]) -> bool:
    """
    Notifikasi pengingat eskalasi untuk masalah yang sudah melewati batas waktu (due date).
    """
    if not escalations:
        return False

    lines = [
        f"",
        f"",
        f"[REMINDER ESKALASI - MASALAH OVERDUE]",
        f"Perhatian Supervisor & PIC, terdapat {len(escalations)} masalah yang telah melewati batas waktu:",
        ""
    ]

    nos_by_id = employee_nos_by_id([item.get("pic_id") for item in escalations] + [pic.get("employee_id") for item in escalations for pic in item.get("pics", [])])
    job_nos = [nos_by_id.get(item.get("pic_id")) for item in escalations]
    job_nos.extend(nos_by_id.get(pic.get("employee_id")) for item in escalations for pic in item.get("pics", []))

    for idx, item in enumerate(escalations, 1):
        lines.append(f"{idx}. Line {item.get('line_code', '-')}: {item.get('problem', '-')}")
        lines.append(f"   👤 PIC: {item.get('pic_name', '-')} | ⏱️ Due: {format_due(item.get('due_date'))}")

    lines.append("")
    lines.append("Mohon segera berkoordinasi dan menyelesaikan masalah tersebut.")

    return await send_teamtalk_message("\n".join(lines), job_nos=job_nos)


async def notify_meeting_reminder(slots: list[dict], started: bool = False) -> bool:
    """
    Satu notifikasi DM Meeting untuk semua line, dikelompokkan per jam dan sesi.
    started=False untuk pengingat sebelum meeting, started=True untuk pengingat tepat saat jam meeting.
    """
    if not slots:
        return False

    groups: dict[tuple[str, str], dict] = {}
    for slot in slots:
        key = (slot["scheduled_time"], slot["session_label"] or "Sesi")
        group = groups.setdefault(key, {"lines": [], "minutes_left": slot["minutes_left"]})
        group["lines"].append(slot["line_code"] or "-")
        group["minutes_left"] = min(group["minutes_left"], slot["minutes_left"])

    lines = ["[DM MEETING DIMULAI]" if started else "[PENGINGAT DM MEETING]"]
    for (scheduled_time, label), group in sorted(groups.items()):
        if started:
            lines.append(f"{scheduled_time} - {label}")
        else:
            lines.append(f"{scheduled_time} - {label} (sekitar {group['minutes_left']} menit lagi)")
        lines.append(f"   Line: {', '.join(group['lines'])}")
    lines.append("")
    if started:
        lines.append("Waktunya DM meeting. Harap Leader dan seluruh anggota segera berkumpul di papan DM meeting. @ALL")
    else:
        lines.append("Harap Leader dan seluruh anggota bersiap di papan DM meeting. @ALL")
    return await send_teamtalk_message("\n".join(lines))


async def notify_workshop_meeting_reminder(workshop_name: str, scheduled_time: str, minutes_left: int = 15) -> bool:
    """
    Notifikasi pengingat Workshop Meeting yang akan segera dimulai.
    """
    content = (
        f"[PENGINGAT WORKSHOP MEETING - {workshop_name or '-'}]\n"
        f"Workshop Meeting dijadwalkan pukul {scheduled_time}.\n"
        f"Waktu tersisa kurang lebih {minutes_left} menit lagi.\n\n"
        f"Harap seluruh DM workshop bersiap. @ALL"
    )
    return await send_teamtalk_message(content)


async def notify_papercard_reminder(entries: list[dict]) -> bool:
    """
    Satu notifikasi pengingat papercard sebelum jam mulai pengisian, untuk semua line dan departemen,
    dikelompokkan per jam mulai.
    """
    if not entries:
        return False

    groups: dict[tuple[str, str], dict] = {}
    for entry in entries:
        key = (entry["window_start"], entry["window_end"])
        group = groups.setdefault(key, {"lines": {}, "minutes_left": entry["minutes_left"]})
        group["lines"].setdefault(entry["line_code"] or "-", []).append(entry["department"])
        group["minutes_left"] = min(group["minutes_left"], entry["minutes_left"])

    lines = ["[PENGINGAT PAPERCARD]"]
    for (window_start, window_end), group in sorted(groups.items()):
        lines.append(f"Pengisian dibuka {window_start} - {window_end} (sekitar {group['minutes_left']} menit lagi)")
        for line_code, departments in group["lines"].items():
            lines.append(f"   {line_code}: {', '.join(departments)}")
    lines.append("")
    lines.append("Mohon personil terkait bersiap mengisi papercard sesuai jam di atas.")
    return await send_teamtalk_message("\n".join(lines))


async def notify_papercard_deadline(entries: list[dict]) -> bool:
    """
    Satu notifikasi saat batas pengisian papercard terlewat, berisi line dan departemen yang belum submit.
    """
    if not entries:
        return False

    groups: dict[str, dict[str, list[str]]] = {}
    for entry in entries:
        group = groups.setdefault(entry["window_end"], {})
        group.setdefault(entry["line_code"] or "-", []).append(entry["department"])

    lines = ["[PAPERCARD BELUM DISUBMIT]"]
    for window_end, by_line in sorted(groups.items()):
        lines.append(f"Batas pengisian {window_end} telah lewat")
        for line_code, departments in by_line.items():
            lines.append(f"   {line_code}: {', '.join(departments)}")
    lines.append("")
    lines.append("Papercard di atas belum disubmit. Mohon segera dilengkapi.")
    return await send_teamtalk_message("\n".join(lines))
