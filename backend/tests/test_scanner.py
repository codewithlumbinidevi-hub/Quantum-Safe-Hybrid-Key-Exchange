"""
Q-SHIELD Scanner — Unit Tests.
PS-P2 — Post-Quantum Cryptographic Inventory & Migration Scanner.

Tests cover:
  - Individual detection rules.
  - Scanner engine (line-number accuracy, deduplication).
  - Demo repository scan.
  - Report generation.
  - Fetcher path-traversal protection.
"""
from __future__ import annotations
import io
import json
import zipfile
from pathlib import Path
import tempfile
import shutil

import pytest

from backend.app.services.scanner.rules import (
    RSA_001, RSA_002, RSA_003,
    DSA_001, DH_001,
    ECC_001, ECC_002, ECC_003,
    LIB_001, INFO_001,
)
from backend.app.services.scanner.engine import _scan_file, scan_directory
from backend.app.services.scanner.demo_data import create_demo_repository, DEMO_GROUND_TRUTH
from backend.app.services.scanner.report_generator import (
    generate_markdown_report,
    generate_csv_report,
    generate_json_report,
)
from backend.app.services.scanner.fetcher import extract_zip, FetchError


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _write_tmp(content: str, suffix: str = ".py") -> Path:
    """Write content to a named temp file and return its path."""
    f = tempfile.NamedTemporaryFile(suffix=suffix, mode="w", encoding="utf-8", delete=False)
    f.write(content)
    f.close()
    return Path(f.name)


# ===========================================================================
# Rule unit tests
# ===========================================================================

class TestRSA001:
    def test_generate_private_key_detected(self):
        p = _write_tmp("key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n")
        findings, _ = _scan_file(p, "test.py", [RSA_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-RSA-001" for f in findings)

    def test_line_number_is_correct(self):
        p = _write_tmp("# comment\nkey = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n")
        findings, _ = _scan_file(p, "test.py", [RSA_001])
        p.unlink()
        rsa_findings = [f for f in findings if f.rule_id == "CRYPTO-RSA-001"]
        assert rsa_findings
        assert rsa_findings[0].line_number == 2

    def test_no_false_positive_on_unrelated(self):
        p = _write_tmp("x = 1 + 2\nprint('hello')\n")
        findings, _ = _scan_file(p, "test.py", [RSA_001])
        p.unlink()
        assert not findings

    def test_rsa_import_detected(self):
        p = _write_tmp("from Crypto.PublicKey import RSA\n")
        findings, _ = _scan_file(p, "test.py", [RSA_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-RSA-001" for f in findings)


class TestRSA002:
    def test_oaep_encrypt_detected(self):
        p = _write_tmp("ct = pub.encrypt(data, padding.OAEP(mgf=MGF1()))\n")
        findings, _ = _scan_file(p, "test.py", [RSA_002])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-RSA-002" for f in findings)

    def test_pkcs1v15_detected(self):
        p = _write_tmp("from cryptography.hazmat.primitives.asymmetric.padding import PKCS1v15\n")
        findings, _ = _scan_file(p, "test.py", [RSA_002])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-RSA-002" for f in findings)


class TestRSA003:
    def test_pss_sign_detected(self):
        p = _write_tmp("sig = key.sign(data, padding.PSS(mgf=MGF1(SHA256()), salt_length=PSS.MAX_LENGTH), SHA256())\n")
        findings, _ = _scan_file(p, "test.py", [RSA_003])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-RSA-003" for f in findings)


class TestDSA001:
    def test_dsa_generate_detected(self):
        p = _write_tmp("key = dsa.generate_private_key(key_size=2048)\n")
        findings, _ = _scan_file(p, "test.py", [DSA_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-DSA-001" for f in findings)

    def test_dsa_import_detected(self):
        p = _write_tmp("from cryptography.hazmat.primitives.asymmetric import dsa\n")
        findings, _ = _scan_file(p, "test.py", [DSA_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-DSA-001" for f in findings)


class TestDH001:
    def test_dh_generate_parameters_detected(self):
        p = _write_tmp("params = dh.generate_parameters(generator=2, key_size=2048)\n")
        findings, _ = _scan_file(p, "test.py", [DH_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-DH-001" for f in findings)

    def test_diffie_hellman_class_detected(self):
        p = _write_tmp("from some_lib import DiffieHellman\n")
        findings, _ = _scan_file(p, "test.py", [DH_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-DH-001" for f in findings)


class TestECC001:
    def test_ec_generate_detected(self):
        p = _write_tmp("key = ec.generate_private_key(ec.SECP256R1())\n")
        findings, _ = _scan_file(p, "test.py", [ECC_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-ECC-001" for f in findings)

    def test_p256_reference_detected(self):
        p = _write_tmp('CURVE = "P-256"\n')
        findings, _ = _scan_file(p, "test.py", [ECC_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-ECC-001" for f in findings)

    def test_ed25519_detected(self):
        p = _write_tmp("from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey\n")
        findings, _ = _scan_file(p, "test.py", [ECC_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-ECC-001" for f in findings)


class TestECC002:
    def test_ecdh_class_detected(self):
        p = _write_tmp("shared = priv.exchange(ECDH(), peer_pub)\n")
        findings, _ = _scan_file(p, "test.py", [ECC_002])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-ECC-002" for f in findings)


class TestECC003:
    def test_ecdsa_detected(self):
        p = _write_tmp("sig = key.sign(msg, ec.ECDSA(hashes.SHA256()))\n")
        findings, _ = _scan_file(p, "test.py", [ECC_003])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-ECC-003" for f in findings)


class TestLIB001:
    def test_ssl_import_detected(self):
        p = _write_tmp("import ssl\n")
        findings, _ = _scan_file(p, "test.py", [LIB_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-LIB-001" for f in findings)

    def test_from_ssl_detected(self):
        p = _write_tmp("from ssl import SSLContext\n")
        findings, _ = _scan_file(p, "test.py", [LIB_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-LIB-001" for f in findings)


class TestINFO001:
    def test_rsa_key_size_detected(self):
        p = _write_tmp("key_size = 2048\n")
        findings, _ = _scan_file(p, "test.py", [INFO_001])
        p.unlink()
        assert any(f.rule_id == "CRYPTO-INFO-001" for f in findings)


# ===========================================================================
# Engine tests
# ===========================================================================

class TestEngine:
    def test_scan_empty_directory(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            result = scan_directory(tmp, "test:empty")
            assert result["summary"]["files_scanned"] == 0
            assert result["summary"]["total_findings"] == 0
        finally:
            shutil.rmtree(tmp)

    def test_scan_detects_findings(self):
        tmp = Path(tempfile.mkdtemp())
        (tmp / "test_rsa.py").write_text(
            "from cryptography.hazmat.primitives.asymmetric import rsa\n"
            "key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n",
            encoding="utf-8",
        )
        try:
            result = scan_directory(tmp, "test:rsa")
            assert result["summary"]["total_findings"] > 0
        finally:
            shutil.rmtree(tmp)

    def test_finding_has_required_fields(self):
        tmp = Path(tempfile.mkdtemp())
        (tmp / "test_rsa.py").write_text(
            "key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n",
            encoding="utf-8",
        )
        try:
            result = scan_directory(tmp, "test:fields")
            findings = result["findings"]
            assert findings
            f = findings[0]
            for field in [
                "finding_id", "file_path", "line_number", "algorithm_family",
                "matched_symbol", "severity", "rule_id", "rule_name",
                "explanation", "migration_recommendation", "evidence_excerpt",
                "confidence", "references",
            ]:
                assert field in f, f"Missing field: {field}"
        finally:
            shutil.rmtree(tmp)

    def test_no_duplicate_findings_same_line(self):
        tmp = Path(tempfile.mkdtemp())
        (tmp / "test_rsa.py").write_text(
            "key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n",
            encoding="utf-8",
        )
        try:
            result = scan_directory(tmp, "test:dedup")
            rsa001 = [f for f in result["findings"] if f["rule_id"] == "CRYPTO-RSA-001"]
            assert len(rsa001) == 1
        finally:
            shutil.rmtree(tmp)


# ===========================================================================
# Demo repository tests
# ===========================================================================

class TestDemoRepository:
    def test_demo_scan_produces_findings(self):
        root = create_demo_repository()
        try:
            result = scan_directory(root, "test:demo")
            assert result["summary"]["total_findings"] > 0
        finally:
            shutil.rmtree(root)

    def test_demo_scan_detects_all_rule_families(self):
        root = create_demo_repository()
        try:
            result = scan_directory(root, "test:demo_families")
            families = {f["algorithm_family"] for f in result["findings"]}
            assert "RSA" in families
            assert "ECC" in families
            assert "DSA" in families
            assert "DH" in families
        finally:
            shutil.rmtree(root)

    def test_demo_scan_precision_and_recall(self):
        """
        Verify that precision and recall on the demo ground truth are non-zero.
        This is a smoke test; it does not enforce specific threshold values.
        """
        root = create_demo_repository()
        try:
            result = scan_directory(root, "test:metrics")
        finally:
            shutil.rmtree(root)

        findings = result["findings"]
        gt_set = set((gt[0], gt[1]) for gt in DEMO_GROUND_TRUTH)
        detected_set = set((f["file_path"], f["rule_id"]) for f in findings)

        tp = len(gt_set & detected_set)
        fp = len(detected_set - gt_set)
        fn = len(gt_set - detected_set)

        precision = tp / (tp + fp) if (tp + fp) > 0 else None
        recall = tp / (tp + fn) if (tp + fn) > 0 else None

        assert precision is not None and precision > 0, "Precision should be > 0"
        assert recall is not None and recall > 0, "Recall should be > 0"


# ===========================================================================
# Report generation tests
# ===========================================================================

class TestReportGeneration:
    def _sample_result(self):
        root = create_demo_repository()
        try:
            return scan_directory(root, "test:report")
        finally:
            shutil.rmtree(root)

    def test_markdown_report_contains_required_sections(self):
        result = self._sample_result()
        md = generate_markdown_report(result)
        assert "## Scan Summary" in md
        assert "## Algorithm Inventory" in md
        assert "## Findings" in md
        assert "## Migration Recommendations" in md
        assert "## Limitations" in md

    def test_csv_report_has_header(self):
        result = self._sample_result()
        csv_str = generate_csv_report(result["findings"])
        first_line = csv_str.splitlines()[0]
        assert "finding_id" in first_line
        assert "severity" in first_line

    def test_json_report_is_valid(self):
        result = self._sample_result()
        json_str = generate_json_report(result)
        parsed = json.loads(json_str)
        assert "summary" in parsed
        assert "findings" in parsed


# ===========================================================================
# Fetcher security tests
# ===========================================================================

class TestFetcherSecurity:
    def _make_zip_with_traversal(self) -> bytes:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            info = zipfile.ZipInfo("../../evil.txt")
            zf.writestr(info, "malicious content")
        return buf.getvalue()

    def test_path_traversal_in_zip_raises(self):
        zip_bytes = self._make_zip_with_traversal()
        with pytest.raises(FetchError, match="traversal"):
            extract_zip(zip_bytes)

    def test_valid_zip_extracted_successfully(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("safe_file.py", "x = 1\n")
        root = extract_zip(buf.getvalue())
        try:
            assert (root / "safe_file.py").exists() or any(root.rglob("safe_file.py"))
        finally:
            shutil.rmtree(root)

    def test_corrupt_zip_raises(self):
        with pytest.raises(FetchError):
            extract_zip(b"this is not a zip file")
