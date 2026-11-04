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
assert "const VERSION = '2.0.0'" in source
assert "(Generic) ·" not in source
subprocess.run(["node", "--check", str(ROOT / "src/calendar-management-generic.js")], check=True)

url = (ROOT / "install/bookmarklet-url.txt").read_text(encoding="utf-8").strip()
assert url.startswith("javascript:")
assert unquote(url[len("javascript:"):]) == source, "Bookmarklet URL differs from JS"

html = (ROOT / "install/installation.html").read_text(encoding="utf-8")
m = re.search(r'<a class="bookmark" href="([^"]+)"', html)
assert m, "Bookmarklet drag link missing"
assert unescape(m.group(1)) == url, "Installer link differs from bookmarklet URL"

print("PASS: source modules, CSS/HTML assets, JS syntax, bookmarklet and installer")
