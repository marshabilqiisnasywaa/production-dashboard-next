from unittest import TestCase

from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.api import abnormal_categories as api
from app.api.deps import get_active_principal, get_current_admin
from app.models.abnormal_category import AbnormalCategory
from app.services import abnormal_categories as service

CODE1 = ["Code 1", "P-Planning Losses", "H-Human Losses (MP)", "Q-Quality Losses", "S-Safety"]
CODE2 = [
    "Code 2", "P01-Ramp Up Losses", "P02-Planning Losses", "P99-Other Losses",
    "H01-PE Document", "Q01-Incoming Material NG", "Q02-Abnormal Quality",
]
CODE3 = [
    "Code 3", "P01-01-New Operator", "P01-02-New Type", "P02-01-Changecode/Change Color",
    "P99-99-Other Losses", "H01-01-PE Document Internal", "Q01-03-Middle Frame", "Q02-01-Bump and Scratches",
]


class AbnormalCategoryTests(TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        AbnormalCategory.__table__.create(self.engine)
        self.db = Session(self.engine, expire_on_commit=False)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def columns(self, code1=CODE1, code2=CODE2, code3=CODE3):
        return {1: code1, 2: code2, 3: code3}

    def load(self):
        plan = service.build_plan(self.db, self.columns())
        service.apply_plan(self.db, plan, False)

    def code_map(self):
        return {row.code: row for row in self.db.scalars(select(AbnormalCategory))}

    def test_parses_three_levels_and_skips_header_row(self):
        plan = service.build_plan(self.db, self.columns())
        by_code = {item.code: item for item in plan.items}
        self.assertEqual(plan.count("error"), 0)
        self.assertEqual(len(plan.items), 4 + 6 + 7)
        self.assertEqual((by_code["P"].level, by_code["P"].name, by_code["P"].parent_code), (1, "Planning Losses", None))
        self.assertEqual((by_code["P01"].level, by_code["P01"].parent_code), (2, "P"))
        self.assertEqual((by_code["P01-02"].level, by_code["P01-02"].name, by_code["P01-02"].parent_code), (3, "New Type", "P01"))
        self.assertEqual(by_code["H"].name, "Human Losses (MP)")
        self.assertEqual(by_code["P99-99"].parent_code, "P99")

    def test_name_keeps_slashes_and_inner_hyphens(self):
        plan = service.build_plan(self.db, {1: ["P-Planning Losses"], 2: ["P02-Planning Losses"], 3: ["P02-01-Changecode/Change Color", "P02-02-Re-Run"]})
        names = {item.code: item.name for item in plan.items}
        self.assertEqual(names["P02-01"], "Changecode/Change Color")
        self.assertEqual(names["P02-02"], "Re-Run")

    def test_apply_builds_the_tree(self):
        self.load()
        rows = self.code_map()
        self.assertEqual(len(rows), 17)
        self.assertEqual(rows["P01-02"].parent_id, rows["P01"].id)
        self.assertEqual(rows["P01"].parent_id, rows["P"].id)
        self.assertIsNone(rows["P"].parent_id)
        self.assertTrue(all(row.is_active for row in rows.values()))

    def test_child_without_parent_is_an_error(self):
        plan = service.build_plan(self.db, {1: ["P-Planning Losses"], 2: [], 3: ["P07-01-Orphan"]})
        item = next(item for item in plan.items if item.code == "P07-01")
        self.assertEqual(item.action, "error")
        self.assertIn("P07", item.message)

    def test_parent_already_in_database_is_enough(self):
        self.load()
        plan = service.build_plan(self.db, {1: [], 2: [], 3: ["P01-03-Re-Run"]})
        self.assertEqual([item.action for item in plan.items], ["baru"])

    def test_duplicate_code_in_file_is_an_error_and_keeps_children_valid(self):
        plan = service.build_plan(self.db, {1: ["P-Planning Losses", "P-Planning Again"], 2: ["P01-Ramp Up Losses"], 3: []})
        actions = [(item.code, item.action) for item in plan.items]
        self.assertEqual(actions, [("P", "baru"), ("P", "error"), ("P01", "baru")])

    def test_unrecognised_cell_is_an_error_with_position(self):
        plan = service.build_plan(self.db, {1: ["P-Planning Losses", "tanpa kode"], 2: [], 3: []})
        bad = next(item for item in plan.items if item.action == "error")
        self.assertEqual((bad.level, bad.position, bad.name), (1, 2, "tanpa kode"))
        self.assertIn("P-Planning Losses", bad.message)

    def test_apply_refuses_when_file_has_errors(self):
        plan = service.build_plan(self.db, {1: ["bukan kode"], 2: [], 3: []})
        with self.assertRaises(HTTPException) as caught:
            service.apply_plan(self.db, plan, False)
        self.assertEqual(caught.exception.status_code, 422)
        self.assertEqual(self.code_map(), {})

    def test_reimport_is_unchanged_and_rename_is_update(self):
        self.load()
        plan = service.build_plan(self.db, self.columns())
        self.assertEqual((plan.count("baru"), plan.count("diperbarui"), plan.count("tetap")), (0, 0, 17))
        renamed = ["Code 1", "P-Planning Losses (revisi)"] + CODE1[2:]
        plan = service.build_plan(self.db, self.columns(code1=renamed))
        self.assertEqual((plan.count("diperbarui"), plan.count("tetap")), (1, 16))
        service.apply_plan(self.db, plan, False)
        self.assertEqual(self.code_map()["P"].name, "Planning Losses (revisi)")

    def test_missing_codes_stay_active_unless_asked(self):
        self.load()
        smaller = {1: CODE1, 2: CODE2[:3], 3: []}
        plan = service.build_plan(self.db, smaller)
        self.assertIn((2, "Q02"), plan.missing)
        service.apply_plan(self.db, plan, False)
        self.assertTrue(self.code_map()["Q02"].is_active)
        plan = service.build_plan(self.db, smaller)
        result = service.apply_plan(self.db, plan, True)
        self.assertFalse(self.code_map()["Q02"].is_active)
        self.assertEqual(result["deactivated"], len(plan.missing))

    def test_create_derives_level_and_enforces_prefix(self):
        self.load()
        parent = self.code_map()["P01"]
        row = service.create_category(self.db, "p01-09", "  Baru   sekali ", parent.id)
        self.assertEqual((row.level, row.code, row.name), (3, "P01-09", "Baru sekali"))
        with self.assertRaises(HTTPException) as prefix:
            service.create_category(self.db, "X01-01", "Salah awalan", parent.id)
        self.assertEqual(prefix.exception.status_code, 422)
        with self.assertRaises(HTTPException) as same:
            service.create_category(self.db, "P01", "Sama dengan induk", parent.id)
        self.assertEqual(same.exception.status_code, 422)
        with self.assertRaises(HTTPException) as dup:
            service.create_category(self.db, "P01-09", "Kembar", parent.id)
        self.assertEqual(dup.exception.status_code, 409)

    def test_cannot_go_deeper_than_code_3(self):
        self.load()
        leaf = self.code_map()["P01-01"]
        with self.assertRaises(HTTPException) as caught:
            service.create_category(self.db, "P01-01-1", "Terlalu dalam", leaf.id)
        self.assertEqual(caught.exception.status_code, 422)

    def test_renaming_a_parent_code_moves_its_children(self):
        self.load()
        row = self.code_map()["P01"]
        service.update_category(self.db, row, "P11", None, None)
        rows = self.code_map()
        self.assertNotIn("P01", rows)
        self.assertEqual(rows["P11-01"].name, "New Operator")
        self.assertEqual(rows["P11-02"].parent_id, rows["P11"].id)

    def test_renaming_into_an_existing_code_is_rejected(self):
        self.load()
        with self.assertRaises(HTTPException) as caught:
            service.update_category(self.db, self.code_map()["P01"], "P02", None, None)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertIn("P01", self.code_map())

    def test_deactivating_a_parent_deactivates_descendants_only_downward(self):
        self.load()
        rows = self.code_map()
        service.update_category(self.db, rows["P"], None, None, False)
        rows = self.code_map()
        self.assertFalse(rows["P"].is_active)
        self.assertFalse(rows["P01-01"].is_active)
        self.assertTrue(rows["Q"].is_active)

    def test_child_cannot_be_activated_under_inactive_parent(self):
        self.load()
        rows = self.code_map()
        service.update_category(self.db, rows["P"], None, None, False)
        with self.assertRaises(HTTPException) as caught:
            service.update_category(self.db, self.code_map()["P01"], None, None, True)
        self.assertEqual(caught.exception.status_code, 409)

    def test_delete_blocks_when_children_exist(self):
        self.load()
        with self.assertRaises(HTTPException) as caught:
            service.delete_category(self.db, self.code_map()["P01"])
        self.assertEqual(caught.exception.status_code, 409)
        service.delete_category(self.db, self.code_map()["P01-01"])
        self.assertNotIn("P01-01", self.code_map())

    def test_list_reports_direct_child_counts(self):
        self.load()
        out = {item.code: item for item in api.list_categories(self.db, None)}
        self.assertEqual((out["P"].child_count, out["P01"].child_count, out["P01-01"].child_count), (3, 2, 0))

    def test_every_route_requires_admin(self):
        for route in api.router.routes:
            dependencies = [dependency.call for dependency in route.dependant.dependencies]
            required = get_active_principal if route.path.endswith("/options") else get_current_admin
            self.assertIn(required, dependencies, route.path)


class OtherCategoryTests(TestCase):
    setUp = AbnormalCategoryTests.setUp
    tearDown = AbnormalCategoryTests.tearDown
    code_map = AbnormalCategoryTests.code_map

    def test_other_without_parent_appears_at_level_2_and_3(self):
        plan = service.build_plan(self.db, {1: ["P-Planning Losses"], 2: ["O01-Other"], 3: ["O01-Other"]})
        self.assertEqual(plan.count("error"), 0)
        service.apply_plan(self.db, plan, False)
        rows = list(self.db.scalars(select(AbnormalCategory).where(AbnormalCategory.code == "O01")))
        by_level = {row.level: row for row in rows}
        self.assertEqual(sorted(by_level), [2, 3])
        self.assertIsNone(by_level[2].parent_id)
        self.assertEqual(by_level[3].parent_id, by_level[2].id)
        again = service.build_plan(self.db, {1: [], 2: ["O01-Other"], 3: ["O01-Other"]})
        self.assertEqual(again.count("tetap"), 2)

    def test_orphan_parent_is_only_allowed_for_other(self):
        plan = service.build_plan(self.db, {1: [], 2: ["X01-Something"], 3: []})
        self.assertEqual(plan.items[0].action, "error")

    def test_same_code_on_two_levels_is_only_allowed_for_other(self):
        plan = service.build_plan(self.db, {1: ["P-Planning Losses"], 2: ["P01-Ramp Up Losses"], 3: ["P01-Ramp Up Losses"]})
        self.assertEqual([item.action for item in plan.items if item.level == 3], ["error"])

    def test_manual_create_of_other_under_same_code(self):
        top = service.create_category(self.db, "O", "Others", None)
        mid = service.create_category(self.db, "O01", "Other", top.id)
        leaf = service.create_category(self.db, "O01", "Other", mid.id)
        self.assertEqual((leaf.level, leaf.code, leaf.parent_id), (3, "O01", mid.id))
        with self.assertRaises(HTTPException):
            service.create_category(self.db, "O01", "Lainnya", mid.id)

    def test_other_losses_without_code_1_keeps_normal_children(self):
        plan = service.build_plan(self.db, {1: ["P-Planning Losses"], 2: ["O01-Other Losses"], 3: ["O01-01-Other Losses"]})
        self.assertEqual(plan.count("error"), 0)
        service.apply_plan(self.db, plan, False)
        rows = self.code_map()
        self.assertIsNone(rows["O01"].parent_id)
        self.assertEqual(rows["O01-01"].parent_id, rows["O01"].id)


class CategoryPathTests(TestCase):
    tearDown = AbnormalCategoryTests.tearDown

    def setUp(self):
        AbnormalCategoryTests.setUp(self)
        plan = service.build_plan(self.db, {
            1: ["P-Planning Losses", "M-Machine Losses"],
            2: ["P01-Ramp Up Losses", "M05-Setup", "O01-Other Losses"],
            3: ["P01-01-New Operator", "M05-02-Jig", "O01-01-Other Losses"],
        })
        service.apply_plan(self.db, plan, False)

    def test_code_1_is_required(self):
        for codes in (None, [], [""]):
            with self.assertRaises(HTTPException) as caught:
                service.resolve_category_path(self.db, codes)
            self.assertEqual(caught.exception.status_code, 422)

    def test_code_1_alone_and_full_path_are_accepted(self):
        self.assertEqual(service.resolve_category_path(self.db, ["p"]), (["P"], ["P-Planning Losses"]))
        codes, labels = service.resolve_category_path(self.db, ["P", "P01", "P01-01"])
        self.assertEqual(codes, ["P", "P01", "P01-01"])
        self.assertEqual(labels, ["P-Planning Losses", "P01-Ramp Up Losses", "P01-01-New Operator"])

    def test_child_must_belong_to_its_parent(self):
        with self.assertRaises(HTTPException):
            service.resolve_category_path(self.db, ["P", "M05"])
        with self.assertRaises(HTTPException):
            service.resolve_category_path(self.db, ["P", "P01", "M05-02"])

    def test_code_3_needs_code_2(self):
        with self.assertRaises(HTTPException):
            service.resolve_category_path(self.db, ["P", "", "P01-01"])

    def test_other_losses_can_be_picked_under_every_category(self):
        codes, _ = service.resolve_category_path(self.db, ["P", "O01"])
        self.assertEqual(codes, ["P", "O01"])
        codes, _ = service.resolve_category_path(self.db, ["M", "O01", "O01-01"])
        self.assertEqual(codes, ["M", "O01", "O01-01"])
        codes, _ = service.resolve_category_path(self.db, ["M", "M05", "O01-01"])
        self.assertEqual(codes, ["M", "M05", "O01-01"])

    def test_inactive_category_is_rejected(self):
        row = self.db.scalar(select(AbnormalCategory).where(AbnormalCategory.code == "P01"))
        row.is_active = False
        self.db.commit()
        with self.assertRaises(HTTPException):
            service.resolve_category_path(self.db, ["P", "P01"])
