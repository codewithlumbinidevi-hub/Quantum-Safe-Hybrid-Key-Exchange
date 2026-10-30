"""
P1_secure_channel compatibility shim module.

Following the project restructuring where Phase 2 files and folders
were moved directly to the repository root directory (qff26/), this
module preserves backward compatibility for legacy and cross-phase imports
without requiring a P1_secure_channel/ directory container.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path, PosixPath, WindowsPath

REPO_ROOT = Path(__file__).resolve().parent

# Make this module act as a package containing the repository root
__path__ = [str(REPO_ROOT)]

# Hook Path division so that (REPO_ROOT / "P1_secure_channel") resolves to REPO_ROOT
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
