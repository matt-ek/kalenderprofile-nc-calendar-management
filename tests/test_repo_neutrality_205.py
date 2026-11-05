#!/usr/bin/env python3
"""Fail closed on organization-specific examples or personal calendar exports.

This checks only currently tracked files, including generated bookmarklet URLs
and installers. It cannot and does not rewrite or certify historical Git tags.
"""
from __future__ import annotations

from html import unescape
from pathlib import Path
from urllib.parse import unquote
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]

# Deliberately explicit, high-confidence patterns, not a blanket ban on the
# generic words "calendar", "community", "association" or "Nextcloud".
RULES = {
    "specific_domain": re.compile(
        r"(?i)(?:michaelsengel|(?:kalender\.)?evlks\.de)"
    ),
    "locality_or_unit": re.compile(
        r"(?i)\b(?:buehlau|bühlau|loschwitz|hosterwitz|schönfeld|weißig|weissig|dresden|"
        r"bwh|büh|bue|sfw|maw)\b"
    ),
    "organization_specific_ui": re.compile(
        r"(?i)(?:\bpfarramt\b|\bgottesdienst(?:planung)?\b|\bkirchenvorstand\b|"
        r"\bschwesternkirchverbund\b|\bbibelentdeckertage\b|\bkantor(?:in)?\b|"
        r"\bkirchgemeinde\b|\bgemeinde[\s-]*(?:json|spezifisch)\b|"
        r"\bst[\s.\-]*michael\b)"
    ),
    "legacy_person_example": re.compile(r"(?i)\bbeate\b"),
    "private_key_or_token": re.compile(
        r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"
        r"\bghp_[A-Za-z0-9]{25,}|\bgithub_pat_[A-Za-z0-9_]{30,}|"
        r"\bAKIA[A-Z0-9]{16}\b"
    ),
    "email": re.compile(
        r"(?i)\b[A-Z0-9._%+-]+@(?!example\.(?:com|org|test)\b)"
        r"[A-Z0-9.-]+\.[A-Z]{2,}\b"
    ),
}
# The implementation of the detection rules necessarily contains those rule
# strings; it must not scan itself. All distributable files are scanned.
SELF = "tests/test_repo_neutrality_205.py"
UNEXPECTED_ASSETS = {
    ".ics", ".ical", ".csv", ".tsv", ".xlsx", ".xls", ".sqlite", ".db",
    ".pem", ".p12", ".pfx", ".key", ".zip", ".7z", ".tar", ".gz",
}


def inspect_text(value: str) -> set[str]:
    hits: set[str] = set()
    normalized = value
    for _ in range(3):
        # The installer contains an entity-escaped, URL-encoded full script.
        normalized = unquote(unescape(normalized))
        for name, expression in RULES.items():
            if expression.search(normalized):
                hits.add(name)
    return hits


def verify_self_test() -> None:
    # Assemble patterns so this test does not look like a real leaked example.
    example = "(" + "BW" + "H)"
    assert "locality_or_unit" in inspect_text(example)
    assert "locality_or_unit" in inspect_text("%28B%57H%29")
    assert "organization_specific_ui" in inspect_text("Pfarr" + "amt")
    assert "legacy_person_example" in inspect_text("Be" + "ate")
    assert not inspect_text("Projektkalender (SALES) – Teambesprechung")
    assert not inspect_text("https://example.test/apps/calendar")
    assert not inspect_text("mail@example.com")


def tracked_paths() -> list[Path]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    names = [s.decode("utf-8") for s in raw.split(b"\0") if s]
    return [Path(name) for name in names]


def audit() -> list[tuple[str, str, str]]:
    findings: list[tuple[str, str, str]] = []
    for relative in tracked_paths():
        name = relative.as_posix()
        if name == SELF:
            continue
        if name == ".env" or name.startswith(".env.") or relative.suffix.lower() in UNEXPECTED_ASSETS:
            findings.append((name, "file", "unexpected_export_or_binary"))
            continue
        data = (ROOT / relative).read_bytes()
        try:
            contents = data.decode("utf-8")
        except UnicodeDecodeError:
            findings.append((name, "file", "non_utf8_content"))
            continue
        # Normalize full file: URLs and HTML can hide encoded keywords.
        # Report only file paths and rule names (never sensitive line contents).
        matches = inspect_text(contents)
        if relative.suffix.lower() == ".json":
            try:
                payload = json.loads(contents)
            except json.JSONDecodeError:
                findings.append((name, "file", "invalid_json"))
            else:
                if isinstance(payload, dict) and (
                    "schemaVersion" in payload and
                    any(key in payload for key in ("settings", "calendars", "profiles", "sortSets"))
                ):
                    findings.append((name, "file", "personal_configuration_export"))
        for match in sorted(matches):
            findings.append((name, "content", match))
    return findings


if __name__ == "__main__":
    verify_self_test()
    problems = audit()
    if problems:
        for path, location, rule in problems:
            print(f"PRIVACY GATE FAIL: {path} ({location}; rule={rule})")
        raise SystemExit(f"FAIL: {len(problems)} repository privacy finding(s)")
    print(f"PASS: organization neutrality, no personal exports or credentials in {len(tracked_paths()) - 1} tracked files")
