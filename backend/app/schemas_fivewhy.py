from typing import Annotated
from urllib.parse import urlsplit

from pydantic import AfterValidator, Field, field_validator

from app.schemas import CamelModel

BUILT_IN_CATEGORIES = ("analysis", "evidence", "standard", "other")


def clean_category(value: str) -> str:
    value = " ".join(value.split())
    if not 2 <= len(value) <= 40:
        raise ValueError("Kategori harus 2-40 karakter.")
    return value


DocumentCategory = Annotated[str, AfterValidator(clean_category)]



class SimoDocumentIn(CamelModel):
    line_id: int = Field(gt=0)
    pic_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=200)
    category: DocumentCategory
    url: str = Field(min_length=1, max_length=2000)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Judul dokumen wajib diisi.")
        return value.strip()

    @field_validator("url")
    @classmethod
    def simo_url(cls, value: str) -> str:
        value = value.strip()
        try:
            parsed = urlsplit(value)
            valid = parsed.scheme == "https" and parsed.hostname == "mtp.myoas.com" and parsed.port in (None, 443) and not parsed.username and not parsed.password
        except ValueError:
            valid = False
        if not valid:
            raise ValueError("Gunakan link HTTPS SIMO dari mtp.myoas.com.")
        return value
