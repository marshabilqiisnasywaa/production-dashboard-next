import re
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import AfterValidator, Field, StringConstraints, field_validator, model_validator

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


AnalysisStatus = Literal["draft", "in_analysis", "done"]
WhyVerification = Literal["unverified", "verified", "not_root", "root"]
BranchVerification = Literal["unverified", "verified", "not_root"]
SumberAbnormal = Literal["pre", "onProgress", "post", "lainnya"]
TingkatPengaruh = Literal["sering", "siklusPanjang", "lainnya"]
SolutionType = Literal["short", "long"]
SolutionStatus = Literal["rencana", "dikerjakan", "dipantau", "standar"]
Recurrence = Literal["ya", "tidak", "belum"]

Short = Annotated[str, StringConstraints(max_length=200)]
Long = Annotated[str, StringConstraints(max_length=2000)]
Identifier = Annotated[str, StringConstraints(min_length=1, max_length=100)]
PhotoId = Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")]
DateText = Annotated[str, StringConstraints(max_length=40)]
MAX_ROOT_CAUSES = 1
TIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")


class SummaryIn(CamelModel):
    when: DateText = ""
    where: Short = ""
    what: Long = ""
    who: Short = ""
    how: Long = ""
    how_much: Short = ""
    downtime: Annotated[str, StringConstraints(max_length=10)] = ""
    short_term_solution: Long = ""


Factor = Annotated[str, StringConstraints(max_length=500)]


class FactorsIn(CamelModel):
    man: Factor = ""
    machine: Factor = ""
    material: Factor = ""
    method: Factor = ""
    measurement: Factor = ""
    environment: Factor = ""


class AbnormalIn(CamelModel):
    label: Short = ""
    line: Short = ""
    pengusul: Short = ""
    jenis: Short = ""
    category_codes: list[Annotated[str, StringConstraints(max_length=24)]] = Field(default_factory=list, max_length=3)
    category_labels: list[Short] = Field(default_factory=list, max_length=3)
    responded_at: DateText = ""
    factors: FactorsIn = Field(default_factory=FactorsIn)
    sumber_abnormal: list[SumberAbnormal] = Field(default_factory=list, max_length=4)
    sumber_lainnya: Short = ""
    tingkat_pengaruh: list[TingkatPengaruh] = Field(default_factory=list, max_length=3)
    pengaruh_lainnya: Short = ""
    summary: SummaryIn = Field(default_factory=SummaryIn)

    @model_validator(mode="after")
    def check_response_time(self) -> "AbnormalIn":
        occurred, responded = self.summary.when.strip(), self.responded_at.strip()
        if occurred and responded and TIME_RE.match(occurred) and TIME_RE.match(responded) and responded[:16] < occurred[:16]:
            raise ValueError("Waktu respon tidak boleh lebih awal dari waktu kejadian.")
        return self


class EvidenceIn(CamelModel):
    id: Identifier
    label: Annotated[str, StringConstraints(max_length=40)] = ""
    text: Long = ""
    photos: list[PhotoId] = Field(default_factory=list, max_length=20)


class BranchIn(CamelModel):
    id: Identifier
    statement: Long = ""
    verification: BranchVerification = "not_root"
    evidence: list[EvidenceIn] = Field(default_factory=list, max_length=20)


class WhyIn(CamelModel):
    id: Identifier
    level: int = Field(ge=1, le=5)
    statement: Long = ""
    verification: WhyVerification = "unverified"
    evidence: list[EvidenceIn] = Field(default_factory=list, max_length=20)
    branches: list[BranchIn] = Field(default_factory=list, max_length=20)


class SolutionIn(CamelModel):
    id: Identifier
    text: Long = ""
    type: SolutionType = "short"
    pic: Short = ""
    dept: Short = ""
    deadline: Annotated[str, StringConstraints(pattern=r"^(\d{4}-\d{2}-\d{2})?$")] = ""
    status: SolutionStatus = "rencana"
    recurred: Recurrence = "belum"
    remark: Long = ""
    photos_before: list[PhotoId] = Field(default_factory=list, max_length=20)
    photos_after: list[PhotoId] = Field(default_factory=list, max_length=20)

class StandardFlagIn(CamelModel):
    flagged: bool
    department: Short = ""
    note: Long = ""


class StandardAppliedIn(CamelModel):
    applied: bool

class AnalysisCreateIn(CamelModel):
    line_id: int = Field(gt=0)


class AnalysisIn(CamelModel):
    revision: int = Field(ge=1)
    status: AnalysisStatus
    abnormal: AbnormalIn
    whys: list[WhyIn] = Field(max_length=5)
    solutions: list[SolutionIn] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def check_tree(self) -> "AnalysisIn":
        levels = [why.level for why in self.whys]
        if len(set(levels)) != len(levels):
            raise ValueError("Level Why tidak boleh dobel.")
        if sum(why.verification == "root" for why in self.whys) > MAX_ROOT_CAUSES:
            raise ValueError("Hanya satu Why yang boleh ditandai Root Cause.")
        return self

    def photo_ids(self) -> set[str]:
        found: set[str] = set()
        for why in self.whys:
            for entry in why.evidence:
                found.update(entry.photos)
            for branch in why.branches:
                for entry in branch.evidence:
                    found.update(entry.photos)
        for solution in self.solutions:
            found.update(solution.photos_before)
            found.update(solution.photos_after)
        return found
