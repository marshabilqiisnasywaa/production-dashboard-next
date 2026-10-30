from dataclasses import dataclass
from typing import Literal

Scope = Literal["own", "all", "dept", "none"]

@dataclass(frozen=True)
class Role:
    label: str
    scope: Scope
    home: str
    capabilities: frozenset[str] | None = None

    @property
    def is_strict(self) -> bool:
        return self.capabilities is not None
    
ROLES: dict[str, Role] = {
    "member": Role(label="Member", scope="own", home="/dm-dashboard/member"),
    "leader": Role(label="Leader", scope="own", home="/dm-dashboard/leader"),
    "supervisor": Role(label="Supervisor", scope="none", home="/dm-dashboard/supervisor"),
    "hod": Role(label="HOD", scope="all", home="/dm-dashboard/hod", capabilities=frozenset({"account.self", "problems.read"}),
    ),
}

ROLE_KEYS: tuple[str, ...] = tuple(ROLES)

def access_of(role_key: str) -> dict:
    role = ROLES.get(role_key)
    if role is None:
        return {"home": None, "scope": None, "capabilities": []}
    return {
        "home": role.home,
        "scope": role.scope,
        "capabilities": sorted(role.capabilities) if role.capabilities is not None else None,
    }
