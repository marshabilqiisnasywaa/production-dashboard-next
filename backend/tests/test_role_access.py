import unittest

from fastapi import HTTPException, Request
from fastapi.routing import APIRoute

from app.api.deps import enforce_capabilities
from app.core.roles import ROLES
from app.main import app

EXPECTED_ROUTES = {
    "hod": {
        ("GET", "/api/auth/me"),
        ("POST", "/api/auth/change-password"),
        ("GET", "/api/meetings/problems"),
    },
}



def api_routes():
    return [route for route in app.routes if isinstance(route, APIRoute)]


def reachable(role_key):
    found = set()
    for route in api_routes():
        request = Request({"type": "http", "route": route})
        try:
            enforce_capabilities(request, role_key)
        except HTTPException as exc:
            assert exc.status_code == 403
            continue
        for method in route.methods - {"HEAD", "OPTIONS"}:
            found.add((method, route.path))
    return found


class RoleAccessTests(unittest.TestCase):
    def test_strict_roles_reach_only_their_listed_routes(self):
        for key, role in ROLES.items():
            if not role.is_strict:
                continue
            with self.subTest(role=key):
                self.assertIn(key, EXPECTED_ROUTES)
                self.assertEqual(reachable(key), EXPECTED_ROUTES[key])

    def test_unknown_role_reaches_nothing(self):
        self.assertEqual(reachable("tidak-ada"), set())

    def test_legacy_roles_are_not_restricted_by_the_registry(self):
        total = sum(len(route.methods - {"HEAD", "OPTIONS"}) for route in api_routes())
        for key, role in ROLES.items():
            if role.is_strict:
                continue
            with self.subTest(role=key):
                self.assertEqual(len(reachable(key)), total)
