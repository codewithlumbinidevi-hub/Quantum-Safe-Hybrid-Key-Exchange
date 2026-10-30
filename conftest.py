"""
Pytest configuration for Q-SHIELD-PQC root workspace.
"""

import sys
from pathlib import Path, PosixPath, WindowsPath

REPO_ROOT = Path(__file__).resolve().parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

PHASE1_DIR = REPO_ROOT / "phase1"
if str(PHASE1_DIR) not in sys.path:
    sys.path.insert(0, str(PHASE1_DIR))

# Ensure (REPO_ROOT / 'P1_secure_channel') resolves to REPO_ROOT without directory container
_orig_win_truediv = WindowsPath.__truediv__


def _win_truediv(self, other):
    if isinstance(other, str) and self.resolve() == REPO_ROOT:
        clean = other.rstrip("/\\").replace("\\", "/")
        if clean == "P1_secure_channel":
            return self
        if clean.startswith("P1_secure_channel/"):
            return _orig_win_truediv(self, clean[len("P1_secure_channel/") :])
    return _orig_win_truediv(self, other)


WindowsPath.__truediv__ = _win_truediv

if hasattr(sys.modules.get("pathlib"), "PosixPath"):
    _orig_posix_truediv = PosixPath.__truediv__

    def _posix_truediv(self, other):
        if isinstance(other, str) and self.resolve() == REPO_ROOT:
            clean = other.rstrip("/\\").replace("\\", "/")
            if clean == "P1_secure_channel":
                return self
            if clean.startswith("P1_secure_channel/"):
                return _orig_posix_truediv(self, clean[len("P1_secure_channel/") :])
        return _orig_posix_truediv(self, other)

    PosixPath.__truediv__ = _posix_truediv
