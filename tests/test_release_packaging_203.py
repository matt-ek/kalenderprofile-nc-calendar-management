"""Reproducible release packaging without creating a GitHub release or tag."""
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
import hashlib
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
startup = (ROOT / "src/parts/00-startup.js").read_text(encoding="utf-8")
version_match = re.search(r"const VERSION = '(\d+\.\d+\.\d+)'", startup)
assert version_match, "No semantic application version"
tag = "v" + version_match.group(1)
notes = ROOT / f"docs/releases/{tag}.md"
assert notes.is_file() and notes.stat().st_size > 0, "Missing release notes"

prefix = f"kalenderprofile-{tag}/"
command = ["git", "archive", "--format=zip", f"--prefix={prefix}", "HEAD"]
archive_a = subprocess.check_output(command, cwd=ROOT)
archive_b = subprocess.check_output(command, cwd=ROOT)
assert archive_a == archive_b, "Source archive not deterministic"
with ZipFile(BytesIO(archive_a)) as archive:
    bad = archive.testzip()
    assert bad is None, f"Corrupt source archive member: {bad}"
    files = set(archive.namelist())
    for path in [
        "src/calendar-management-generic.js",
        "install/installation.html",
        "install/bookmarklet-url.txt",
        "scripts/build.py",
        "tests/check_release.py",
        f"docs/releases/{tag}.md",
    ]:
        expected = prefix + path
        assert expected in files, f"Missing release archive asset {expected}"
        assert archive.read(expected) == (ROOT / path).read_bytes(), (
            f"Archive mismatch: {path}"
        )

installer = (ROOT / "install/installation.html").read_bytes()
assert b"javascript:" in installer, "Release installer has no bookmarklet"
digests = {
    f"kalenderprofile-{tag}-installation.html": hashlib.sha256(installer).hexdigest(),
    f"kalenderprofile-{tag}.zip": hashlib.sha256(archive_a).hexdigest(),
}
assert all(len(value) == 64 for value in digests.values())
print(f"PASS: deterministic {tag} ZIP, installer, archive contents, SHA-256 checksums")
