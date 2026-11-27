import json
import unittest
from unittest.mock import patch

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.services import fivewhy_ai as ai

RULES = {f"R{number}" for number in range(1, 10)}


def why(level, statement="", evidence=None, branches=None, verification="unverified"):
    return {
        "id": f"w{level}", "level": level, "statement": statement, "verification": verification,
        "evidence": evidence or [], "branches": branches or [],
    }


def abnormal():
    return {
        "label": "PC Upgrade NG", "categoryLabels": ["M-Machine Losses"],
        "summary": {"when": "2026-11-20T08:00", "where": "FW0", "what": "NG PreCheck", "who": "Budi Santoso", "how": "COM tidak terdeteksi", "howMuch": "469/510", "downtime": "45", "shortTermSolution": "ganti PC"},
        "factors": {"man": "", "machine": "port COM penuh", "material": "", "method": "", "measurement": "", "environment": ""},
        "pengusul": "Siti Aminah",
    }


def answer(**changes):
    base = {
        "verdict": "final", "suggestedLevel": 3, "confidence": "high", "summary": "Why 3 sudah dasar.",
        "rules": [{"id": "R1", "status": "met", "note": "ada log"}],
        "missing": [], "nextQuestion": None, "otherWhys": [],
    }
    base.update(changes)
    return base


class FiveWhyAiTests(unittest.TestCase):
    def setUp(self):
        ai._calls.clear()
        self.addCleanup(ai._calls.clear)
        for name, value in (("deepseek_api_key", "test-key"), ("fivewhy_ai_hourly_limit", 3)):
            patcher = patch.object(settings, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.whys = [why(1, "NG banyak"), why(2, "COM tidak terdeteksi"), why(3, "frekuensi bersih cache kurang", evidence=[{"label": "Aktual", "text": "COM 300", "photos": ["x"]}]), why(4), why(5)]

    def run_suggestion(self, reply, whys=None, key="u1"):
        content = reply if isinstance(reply, str) else json.dumps(reply)
        with patch.object(ai, "call_model", return_value=content) as model:
            result = ai.suggest_root_cause(abnormal(), whys or self.whys, key)
        return result, model

    def test_rulebook_exposes_every_rule_number(self):
        text, titles = ai.load_rulebook()
        self.assertEqual(set(titles), RULES)
        self.assertEqual(titles["R3"], "Uji kejadian")
        self.assertIn("Root Cause adalah Why terakhir", text)

    def test_prompt_carries_rulebook_and_leaves_out_people_and_photos(self):
        _, model = self.run_suggestion(answer())
        system, user = model.call_args.args
        self.assertIn("### R3 Uji kejadian", system)
        self.assertIn("PC Upgrade NG", user)
        self.assertIn("frekuensi bersih cache kurang", user)
        self.assertNotIn("Budi Santoso", user)
        self.assertNotIn("Siti Aminah", user)
        self.assertNotIn('"photos"', user)
        self.assertIn('"photoCount": 1', user)

    def test_only_filled_whys_are_sent_and_last_level_is_reported(self):
        result, model = self.run_suggestion(answer(suggestedLevel=3))
        sent = json.loads(model.call_args.args[1].split("\n", 1)[1])
        self.assertEqual([item["level"] for item in sent["why"]], [1, 2, 3])
        self.assertEqual(result["lastFilledLevel"], 3)

    def test_rejected_hypotheses_travel_with_their_why(self):
        self.whys[1]["branches"] = [{"id": "b1", "statement": "port USB rusak", "verification": "not_root", "evidence": []}]
        _, model = self.run_suggestion(answer())
        sent = json.loads(model.call_args.args[1].split("\n", 1)[1])
        self.assertEqual(sent["why"][1]["hipotesisDitolak"][0]["pernyataan"], "port USB rusak")

    def test_normalize_drops_unknown_rules_bad_levels_and_clips_lists(self):
        reply = answer(
            rules=[{"id": "R1", "status": "met", "note": "a"}, {"id": "R1", "status": "met", "note": "dobel"}, {"id": "R99", "status": "met", "note": "x"}, {"id": "R2", "status": "aneh", "note": "b"}],
            missing=["a", "", "b", "c", "d", "e"],
            otherWhys=[{"level": 2, "reason": "gejala"}, {"level": 3, "reason": "dipilih"}, {"level": 9, "reason": "tidak ada"}],
            nextQuestion="tidak dipakai saat final",
        )
        result, _ = self.run_suggestion(reply)
        self.assertEqual([(rule["id"], rule["status"]) for rule in result["rules"]], [("R1", "met"), ("R2", "unknown")])
        self.assertEqual([rule["title"] for rule in result["rules"]], ["Ada bukti", "Proses, bukan orang"])
        self.assertEqual(result["missing"], ["a", "b", "c", "d"])
        self.assertEqual(result["otherWhys"], [{"level": 2, "reason": "gejala"}])
        self.assertIsNone(result["nextQuestion"])

    def test_dig_deeper_keeps_the_next_question(self):
        result, _ = self.run_suggestion(answer(verdict="dig_deeper", suggestedLevel=3, nextQuestion="Kenapa frekuensi kurang?"))
        self.assertEqual((result["verdict"], result["nextQuestion"]), ("dig_deeper", "Kenapa frekuensi kurang?"))

    def test_candidates_are_kept_only_for_dig_deeper_and_capped_at_three(self):
        items = [{"text": f"dugaan {number}", "check": f"cek {number}"} for number in range(1, 6)] + [{"text": "  ", "check": "x"}, "bukan dict"]
        deeper, _ = self.run_suggestion(answer(verdict="dig_deeper", candidates=items), key="a")
        self.assertEqual([item["text"] for item in deeper["candidates"]], ["dugaan 1", "dugaan 2", "dugaan 3"])
        self.assertEqual(deeper["candidates"][0]["check"], "cek 1")
        final, _ = self.run_suggestion(answer(verdict="final", candidates=items), key="b")
        self.assertEqual(final["candidates"], [])

    def test_root_reason_is_kept_only_for_final_and_fits_the_saved_note(self):
        final, _ = self.run_suggestion(answer(verdict="final", rootReason="alasan " * 80), key="a")
        self.assertEqual(len(final["rootReason"]), 200)
        deeper, _ = self.run_suggestion(answer(verdict="dig_deeper", rootReason="tidak dipakai"), key="b")
        self.assertEqual(deeper["rootReason"], "")

    def test_marked_assessment_needs_a_marked_why_and_a_known_stance(self):
        mark = {"stance": "agree", "level": None, "reason": "sudah akar"}
        unmarked, _ = self.run_suggestion(answer(markedAssessment=mark), key="a")
        self.assertIsNone(unmarked["markedAssessment"])
        self.whys[2]["verification"] = "root"
        agreed, _ = self.run_suggestion(answer(markedAssessment=mark), key="b")
        self.assertEqual(agreed["markedAssessment"], {"markedLevel": 3, "stance": "agree", "level": None, "reason": "sudah akar"})
        other, _ = self.run_suggestion(answer(markedAssessment={"stance": "other", "level": 2, "reason": "lebih tepat"}), key="c")
        self.assertEqual((other["markedAssessment"]["stance"], other["markedAssessment"]["level"]), ("other", 2))
        for bad in ({"stance": "mungkin"}, {"stance": "other", "level": 9}, {"stance": "other", "level": 3}, "teks", None):
            with self.subTest(bad=bad):
                result, _ = self.run_suggestion(answer(markedAssessment=bad), key=f"bad-{bad!r}")
                self.assertIsNone(result["markedAssessment"])

    def test_insufficient_never_suggests_a_why(self):
        result, _ = self.run_suggestion(answer(verdict="insufficient", suggestedLevel=3, missing=["bukti"]))
        self.assertIsNone(result["suggestedLevel"])

    def test_a_level_that_is_not_filled_falls_back_to_the_last_filled_why(self):
        for level in (4, 6, 9, None, True, "kosong", 2.5):
            with self.subTest(level=level):
                result, _ = self.run_suggestion(answer(verdict="dig_deeper", suggestedLevel=level, nextQuestion="Kenapa lagi?"), key=f"fallback-{level!r}")
                self.assertEqual((result["suggestedLevel"], result["lastFilledLevel"]), (3, 3))

    def test_level_written_as_text_is_understood(self):
        for level, expected in (("2", 2), ("Why 1", 1), (2.0, 2)):
            with self.subTest(level=level):
                result, _ = self.run_suggestion(answer(suggestedLevel=level), key=f"text-{level!r}")
                self.assertEqual(result["suggestedLevel"], expected)

    def test_case_data_lists_the_levels_the_model_may_pick(self):
        _, model = self.run_suggestion(answer())
        sent = json.loads(model.call_args.args[1].split("\n", 1)[1])
        self.assertEqual(sent["levelTerisi"], [1, 2, 3])
        self.assertIn("levelTerisi", model.call_args.args[0])

    def test_unreadable_answers_are_rejected(self):
        for reply in ("bukan json", "[1, 2]", json.dumps(answer(verdict="mungkin"))):
            with self.subTest(reply=reply[:20]), self.assertRaises(HTTPException) as caught:
                self.run_suggestion(reply)
            self.assertEqual(caught.exception.status_code, 502)

    def gateway_reply(self, content, finish_reason="stop", status=200):
        body = {"choices": [{"finish_reason": finish_reason, "message": {"content": content, "reasoning_content": "berpikir"}}]}
        return httpx.Response(status, json=body, request=httpx.Request("POST", "https://gateway.test/chat/completions"))

    def test_gateway_reply_is_returned_and_uses_the_configured_token_budget(self):
        with patch.object(settings, "deepseek_max_tokens", 7777), patch.object(ai.httpx, "post", return_value=self.gateway_reply('{"ok": true}')) as post:
            self.assertEqual(ai.call_model("s", "u"), '{"ok": true}')
        self.assertEqual(post.call_args.kwargs["json"]["max_tokens"], 7777)

    def test_reply_cut_off_by_the_token_limit_is_reported_as_too_long(self):
        for content in ("", '{"verdict": "fin'):
            with self.subTest(content=content), patch.object(ai.httpx, "post", return_value=self.gateway_reply(content, finish_reason="length")), self.assertRaises(HTTPException) as caught:
                ai.call_model("s", "u")
            self.assertEqual((caught.exception.status_code, caught.exception.detail), (502, "Jawaban AI terpotong karena terlalu panjang. Coba lagi."))

    def test_empty_reply_is_reported_as_empty(self):
        with patch.object(ai.httpx, "post", return_value=self.gateway_reply("  ")), self.assertRaises(HTTPException) as caught:
            ai.call_model("s", "u")
        self.assertEqual(caught.exception.detail, "Jawaban AI kosong. Coba lagi.")

    def test_fenced_json_is_accepted(self):
        result, _ = self.run_suggestion("```json\n" + json.dumps(answer()) + "\n```")
        self.assertEqual(result["suggestedLevel"], 3)

    def test_no_filled_why_still_gets_ideas_for_why_one_from_the_problem_summary(self):
        empty = [why(level) for level in range(1, 6)]
        reply = answer(verdict="final", suggestedLevel=2, rootReason="tidak boleh", nextQuestion="Kenapa PC Upgrade NG?", candidates=[{"text": "COM penuh", "check": "cek log"}])
        result, model = self.run_suggestion(reply, whys=empty)
        sent = json.loads(model.call_args.args[1].split("\n", 1)[1])
        self.assertEqual((sent["levelTerisi"], sent["why"]), ([], []))
        self.assertEqual((result["verdict"], result["suggestedLevel"], result["lastFilledLevel"], result["rootReason"]), ("dig_deeper", None, 0, ""))
        self.assertEqual(result["candidates"], [{"text": "COM penuh", "check": "cek log"}])
        self.assertEqual(result["nextQuestion"], "Kenapa PC Upgrade NG?")

    def test_nothing_to_go_on_is_refused_before_calling_the_model(self):
        blank = {"label": "", "categoryLabels": [], "summary": {}, "factors": {}}
        with patch.object(ai, "call_model") as model, self.assertRaises(HTTPException) as caught:
            ai.suggest_root_cause(blank, [why(level) for level in range(1, 6)], "u1")
        self.assertEqual(caught.exception.status_code, 422)
        model.assert_not_called()

    def test_missing_api_key_gives_a_clear_error(self):
        with patch.object(settings, "deepseek_api_key", None), self.assertRaises(HTTPException) as caught:
            ai.suggest_root_cause(abnormal(), self.whys, "u1")
        self.assertEqual(caught.exception.status_code, 503)

    def test_hourly_limit_counts_successes_only(self):
        for _ in range(3):
            self.run_suggestion(answer())
        with self.assertRaises(HTTPException) as caught:
            self.run_suggestion(answer())
        self.assertEqual(caught.exception.status_code, 429)
        self.run_suggestion(answer(), key="u2")

    def test_failed_calls_do_not_use_up_the_limit(self):
        for _ in range(5):
            with self.assertRaises(HTTPException):
                self.run_suggestion("bukan json")
        self.run_suggestion(answer())


if __name__ == "__main__":
    unittest.main()
