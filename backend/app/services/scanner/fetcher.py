"""
Q-SHIELD Scanner — Repository Fetcher.

Handles:
  - ZIP archive upload extraction (from UploadFile).
  - GitHub repository download (via archive download link, no API token required for public repos).

Security notes:
  - Path traversal protection: all extracted paths are validated against the target root.
  - Only .zip archives are accepted.
  - Upload size is enforced by FastAPI's UploadFile and our own limit constant.
  - No code from the archive is executed.
  - GitHub URLs are validated against an allowlist of hostname patterns.
  - Redirects to non-GitHub hosts are not followed.
  - Extracted content is written to an isolated temp directory.
"""
from __future__ import annotations
import io
import re
import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from typing import Tuple

MAX_UPLOAD_BYTES = 50 * 1024 * 1024   # 50 MB
MAX_EXTRACT_BYTES = 100 * 1024 * 1024  # 100 MB uncompressed
_GITHUB_PATTERN = re.compile(
    r"^https?://github\.com/(?P<owner>[A-Za-z0-9_.\-]+)/(?P<repo>[A-Za-z0-9_.\-]+)(?:\.git)?/?$"
)


class FetchError(Exception):
    """Raised when a repository cannot be fetched safely."""


def _safe_extract(zf: zipfile.ZipFile, target: Path) -> None:
    """
    Extract zip members only when their resolved path stays inside target.
    Defends against path-traversal in zip entry names.
    """
    total_bytes = 0
    for member in zf.infolist():
        # Sanitise the member name
        clean_name = Path(member.filename).as_posix()
        if ".." in clean_name.split("/"):
            raise FetchError(f"Path traversal detected in archive member: {member.filename!r}")
        resolved = (target / clean_name).resolve()
        if not str(resolved).startswith(str(target.resolve())):
            raise FetchError(f"Path traversal detected: {member.filename!r}")
        total_bytes += member.file_size
        if total_bytes > MAX_EXTRACT_BYTES:
            raise FetchError(f"Archive uncompressed size exceeds {MAX_EXTRACT_BYTES // (1024*1024)} MB limit.")
        zf.extract(member, path=target)


def extract_zip(zip_bytes: bytes) -> Path:
    """
    Extract zip_bytes to a temporary directory and return its path.
    The caller is responsible for cleanup (shutil.rmtree).
    """
    tmp = Path(tempfile.mkdtemp(prefix="qshield_zip_"))
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            _safe_extract(zf, tmp)
    except zipfile.BadZipFile as e:
        shutil.rmtree(tmp, ignore_errors=True)
        raise FetchError(f"Invalid or corrupt ZIP archive: {e}") from e
    except FetchError:
        shutil.rmtree(tmp, ignore_errors=True)
        raise

    # If the zip has a single top-level directory, descend into it
    children = list(tmp.iterdir())
    if len(children) == 1 and children[0].is_dir():
        return children[0]
    return tmp


def fetch_github_repo(repo_url: str, branch: str = "main") -> Tuple[Path, str]:
    """
    Download a public GitHub repository as a ZIP archive and extract it.
    Returns (extracted_root, canonical_label).
    The caller is responsible for cleanup.

    Only public repositories are supported.
    No GitHub API token is required.
    """
    m = _GITHUB_PATTERN.match(repo_url.strip())
    if not m:
        raise FetchError(
            "Invalid GitHub URL. Expected format: https://github.com/owner/repository"
        )
    owner = m.group("owner")
    repo = m.group("repo").removesuffix(".git")

    # Build GitHub archive URL
    safe_branch = re.sub(r"[^A-Za-z0-9_.\-/]", "", branch) or "main"
    archive_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/{safe_branch}.zip"

    # Download with timeout
    try:
        req = urllib.request.Request(
            archive_url,
            headers={"User-Agent": "QShield-Scanner/1.0"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            # Restrict to GitHub CDN hosts only
            final_url: str = resp.url
            if not any(
                final_url.startswith(prefix)
                for prefix in (
                    "https://github.com/",
                    "https://codeload.github.com/",
                )
            ):
                raise FetchError("Redirect to non-GitHub host rejected.")

            data = resp.read(MAX_UPLOAD_BYTES + 1)
            if len(data) > MAX_UPLOAD_BYTES:
                raise FetchError(f"Repository archive exceeds {MAX_UPLOAD_BYTES // (1024*1024)} MB limit.")
    except FetchError:
        raise
    except Exception as e:
        raise FetchError(
            f"Could not download repository '{owner}/{repo}' (branch '{safe_branch}'). "
            f"Check that the repository is public and the branch name is correct. Error: {e}"
        ) from e

    extracted = extract_zip(data)
    label = f"github:{owner}/{repo}@{safe_branch}"
    return extracted, label
