#!/usr/bin/env python3
"""Source, installer and bookmarklet consistency checks (no external Python packages)."""
from pathlib import Path
from urllib.parse import unquote
from html import unescape
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parts = sorted((ROOT / "src/parts").glob("*.js"))
assert len(parts) == 8, "Eight ordered source modules required"
source = "".join(p.read_text(encoding="utf-8") for p in parts)
for marker, file in [("@STYLE_INLINE@", "calendar-management.css"), ("@HTML_INLINE@", "calendar-management.html")]:
    token = "/* " + marker + " */"
    assert source.count(token) == 1, marker
    body = (ROOT / "src/assets" / file).read_text(encoding="utf-8")
    source = source.replace(token, "`" + body + "`")

bundle = (ROOT / "src/calendar-management-generic.js").read_text(encoding="utf-8")
assert source == bundle, "Built JS differs from modular sources"
version_match = re.search(r"const VERSION = '(\d+\.\d+\.\d+)'", source)
assert version_match, "Missing semantic version in source"
assert version_match.group(1) == re.search(r"const VERSION = '(\d+\.\d+\.\d+)'", parts[0].read_text(encoding="utf-8")).group(1)
assert "<h2>Kalenderprofile</h2>" in source
assert "Kalenderverwaltung für Nextcloud · V${VERSION}" in source
assert "Nextcloud Calendar Management · V${VERSION}" not in source
assert "id=\"saved-manager-new\"" in source
assert "id=\"saved-manager-duplicate\"" in source
assert "id=\"saved-manager-discard\"" in source
assert "function managerSave()" in source
assert "function managerMoveSort(" in source
assert "(Generic) ·" not in source
# Every literal el('id') binding must have a corresponding HTML element.
# Missing bindings can abort initialization before the close button is wired.
markup = (ROOT / "src/assets/calendar-management.html").read_text(encoding="utf-8")
dom_ids = re.findall(r'\bid="([^"]+)"', markup)
assert len(dom_ids) == len(set(dom_ids)), "Duplicate HTML element IDs"
literal_refs = set(re.findall(r"""\bel\(['"]([^'"]+)['"]\)""", source))
missing = sorted(literal_refs - set(dom_ids))
assert not missing, f"JavaScript references missing HTML IDs: {missing}"
subprocess.run(["node", "--check", str(ROOT / "src/calendar-management-generic.js")], check=True)

url = (ROOT / "install/bookmarklet-url.txt").read_text(encoding="utf-8").strip()
assert url.startswith("javascript:")
assert unquote(url[len("javascript:"):]) == source, "Bookmarklet URL differs from JS"

html = (ROOT / "install/installation.html").read_text(encoding="utf-8")
m = re.search(r'<a class="bookmark" href="([^"]+)"', html)
assert m, "Bookmarklet drag link missing"
assert "<title>Kalenderprofile – Installation</title>" in html
assert ">Kalenderprofile</a>" in html
assert unescape(m.group(1)) == url, "Installer link differs from bookmarklet URL"

print("PASS: source modules, CSS/HTML assets, JS syntax, bookmarklet and installer")
