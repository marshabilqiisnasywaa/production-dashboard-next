import logging
import httpx
from typing import Any
from app.core.config import settings

logger = logging.getLogger("teamtalk")


async def send_teamtalk_message(content: str) -> bool:
    """
    Mengirim pesan teks ke Robot TeamTalk OPPO melalui Incoming Webhook.
    Tidak akan menyebabkan aplikasi crash jika ada kegagalan jaringan.
    """
    url = settings.teamtalk_webhook_url
    if not url:
        logger.debug("TeamTalk webhook URL belum dikonfigurasi di .env")
        return False

    payload = {
        "content": content
    }
    headers = {
        "Content-Type": "application/json;charset=utf-8"
    }

    try:
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


async def notify_new_problems(line_code: str, session_label: str, summaries: list[Any]) -> bool:
    """
    Notifikasi saat DM Meeting selesai dan terdapat masalah baru dengan PIC yang ditugaskan.
    """
    if not summaries:
        return False

    lines = [
        f"[PENUGASAN MASALAH DM MEETING]",
        f"Line: {line_code or '-'} | Sesi: {session_label or '-'}",
        f"Terdapat {len(summaries)} tindak lanjut masalah yang dicatat:",
        ""
    ]

    for idx, sm in enumerate(summaries, 1):
        if isinstance(sm, dict):
            problem = sm.get("problem") or "-"
            pic_name = sm.get("pic_name") or "-"
            due = format_due(sm.get("due_date"))
        else:
            problem = getattr(sm, "problem", None) or "-"
            pic_name = getattr(sm, "pic_name", None) or "-"
            due = format_due(getattr(sm, "due_date", None))
        lines.append(f"{idx}. {problem}")
        lines.append(f"   👤 PIC: {pic_name} | ⏱️ Due: {due}")

    lines.append("")
    lines.append("Mohon PIC segera menindaklanjuti. Terima kasih!")

    return await send_teamtalk_message("\n".join(lines))


async def notify_escalated_problems(escalations: list[dict]) -> bool:
    """
    Notifikasi pengingat eskalasi untuk masalah yang sudah melewati batas waktu (due date).
    """
    if not escalations:
        return False

    lines = [
        f"[REMINDER ESKALASI - MASALAH OVERDUE]",
        f"Perhatian Supervisor & PIC, terdapat {len(escalations)} masalah yang telah melewati batas waktu:",
        ""
    ]

    for idx, item in enumerate(escalations, 1):
        lines.append(f"{idx}. Line {item.get('line_code', '-')}: {item.get('problem', '-')}")
        lines.append(f"   👤 PIC: {item.get('pic_name', '-')} | ⏱️ Due: {format_due(item.get('due_date'))}")

    lines.append("")
    lines.append("Mohon segera berkoordinasi dan menyelesaikan masalah tersebut. @ALL")

    return await send_teamtalk_message("\n".join(lines))


async def notify_meeting_reminder(line_code: str, session_label: str, scheduled_time: str, minutes_left: int = 15) -> bool:
    """
    Notifikasi pengingat jadwal DM Meeting yang akan segera dimulai.
    """
    content = (
        f"[PENGINGAT DM MEETING - LINE {line_code or '-'}]\n"
        f"Meeting {session_label or 'Sesi'} dijadwalkan pukul {scheduled_time}.\n"
        f"Waktu tersisa kurang lebih {minutes_left} menit lagi.\n\n"
        f"Harap Leader dan seluruh anggota bersiap di papan DM meeting."
    )
    return await send_teamtalk_message(content)


async def notify_papercard_reminder(line_code: str, shift: str, pending_count: int, minutes_left: int = 30) -> bool:
    """
    Notifikasi pengingat pengisian papercard sebelum shift berakhir.
    """
    content = (
        f"[PENGINGAT PAPERCARD - LINE {line_code or '-'}]\n"
        f"Waktu kerja {shift} tersisa sekitar {minutes_left} menit lagi.\n"
        f"Masih terdapat {pending_count} personil yang belum melengkapi/submit papercard hari ini.\n\n"
        f"Mohon personil terkait segera melengkapi pengisian papercard sebelum jam kerja berakhir."
    )
    return await send_teamtalk_message(content)
