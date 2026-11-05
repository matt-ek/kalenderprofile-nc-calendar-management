#!/usr/bin/env python3
"""Source, installer and bookmarklet consistency checks (no external Python packages)."""
from pathlib import Path
from urllib.parse import unquote
from html import unescape, escape
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
template = (ROOT / "install/installer-template.html").read_text(encoding="utf-8")
assert template.count("@@KP_VERSION@@") == 2
assert template.count("@@KP_BOOKMARKLET_HREF@@") == 1
expected_installer = template.replace("@@KP_VERSION@@", version_match.group(1)).replace(
    "@@KP_BOOKMARKLET_HREF@@", escape(url, quote=True)
)
assert html == expected_installer, "Installer is stale or differs from the maintained template"
m = re.search(r'<a class="bookmark" href="([^"]+)"', html)
assert m, "Bookmarklet drag link missing"
assert "<title>Kalenderprofile – Installation</title>" in html
assert ">Kalenderprofile</a>" in html
assert unescape(m.group(1)) == url, "Installer drag link differs from bookmarklet URL"
assert f'Version {version_match.group(1)}' in html, "Version is missing from installer header"
assert html.count(f'Version {version_match.group(1)}') == 2, "Installer version header/footer mismatch"
assert 'id="bookmarklet-code"' in html and 'id="copy-bookmarklet"' in html
assert 'link.getAttribute(' in html and 'field.value = code' in html
# The installer UI must not expose outdated Beta release descriptions.
visible_document = re.sub(r'(<a class="bookmark" href=")[^"]*(")', r'\1[BOOKMARKLET]\2', html, count=1)
assert "Technik-Release Beta 15" not in visible_document
assert "V2.0.1</strong>" not in visible_document
assert "@@KP_" not in html, "Unresolved build marker"

print("PASS: source modules, CSS/HTML assets, JS syntax, bookmarklet and installer")
