#!/usr/bin/env python3
"""Build the standalone bookmarklet from the readable source modules and UI assets."""
from pathlib import Path
from urllib.parse import quote, unquote
from html import escape
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parts = sorted((ROOT / "src/parts").glob("*.js"))
assert len(parts) == 8, "Expected exactly eight ordered JavaScript modules"

source = "".join(p.read_text(encoding="utf-8") for p in parts)
for marker, asset in [
    ("@STYLE_INLINE@", "calendar-management.css"),
    ("@HTML_INLINE@", "calendar-management.html"),
]:
    token = "/* " + marker + " */"
    assert source.count(token) == 1, marker
    body = (ROOT / "src/assets" / asset).read_text(encoding="utf-8")
    assert "`" not in body, "Unescaped template literal in " + asset
    source = source.replace(token, "`" + body + "`")

assert source.endswith("})();\n")
bundle = ROOT / "src/calendar-management-generic.js"
bundle.write_text(source, encoding="utf-8")
subprocess.run(["node", "--check", str(bundle)], check=True)

url = "javascript:" + quote(source, safe="!'()+,-./:;=_{}")
assert unquote(url[len("javascript:"):]) == source
(ROOT / "install/bookmarklet-url.txt").write_text(url + "\n", encoding="utf-8")

installer = ROOT / "install/installation.html"
html = installer.read_text(encoding="utf-8")
html, n = re.subn(
    r'(<a class="bookmark" href=")[^"]*(")',
    lambda m: m.group(1) + escape(url, quote=True) + m.group(2),
    html,
    count=1,
)
assert n == 1, "Missing bookmarklet link in installer"
installer.write_text(html, encoding="utf-8")
print(f"Built {len(source)} JS characters; {len(url)} bookmarklet URL characters")
