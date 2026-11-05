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

# Never use an old generated installer as the source of the next release.
# The static template is authoritative; the version is read from the same
# JavaScript source that is embedded in the bookmarklet.
match = re.search(r"\bconst VERSION = '(\d+\.\d+\.\d+)';", source)
assert match, "Missing semantic version in source"
version = match.group(1)
template = (ROOT / "install/installer-template.html").read_text(encoding="utf-8")
href_marker, version_marker = "@@KP_BOOKMARKLET_HREF@@", "@@KP_VERSION@@"
assert template.count(href_marker) == 1, "Expected exactly one bookmarklet anchor"
assert template.count(version_marker) == 2, "Installer version marker missing or duplicated"
html = template.replace(href_marker, escape(url, quote=True)).replace(version_marker, version)
assert href_marker not in html and version_marker not in html, "Unresolved installer placeholder"
installer = ROOT / "install/installation.html"
installer.write_text(html, encoding="utf-8")
print(f"Built Kalenderprofile {version}; {len(source)} JS characters; {len(url)} bookmarklet URL characters")
