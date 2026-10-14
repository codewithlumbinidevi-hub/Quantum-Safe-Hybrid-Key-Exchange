"""
Q-SHIELD Cryptographic Scanner — Detection Rule Definitions.

Rules are deterministic pattern-based and AST-assisted.
Each rule has a unique ID, explanation, severity, and migration guidance.

Limitations:
  - Currently supports Python source files only.
  - AST rules detect import/call patterns; they do not perform data-flow analysis.
  - Regex rules may produce false positives in comments or string literals.
  - Severity reflects the quantum-security risk classification, not an exploitability score.
  - A finding does not confirm an exploitable vulnerability; it marks usage requiring review.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Pattern
import re


@dataclass
class DetectionRule:
    rule_id: str
    rule_name: str
    algorithm_family: str          # AlgorithmFamily value
    severity: str                  # Severity value
    explanation: str
    migration_recommendation: str
    confidence: str                # 'definite' | 'probable' | 'possible'
    patterns: List[Pattern]        # compiled regex patterns
    references: List[str] = field(default_factory=list)
    language: str = "python"


def _p(pattern: str) -> Pattern:
    return re.compile(pattern)


# ---------------------------------------------------------------------------
# RSA rules
# ---------------------------------------------------------------------------
RSA_001 = DetectionRule(
    rule_id="CRYPTO-RSA-001",
    rule_name="RSA Key Generation",
    algorithm_family="RSA",
    severity="high",
    explanation=(
        "RSA security relies on the hardness of integer factorization. "
        "A sufficiently large quantum computer running Shor's algorithm can "
        "factor RSA moduli in polynomial time, breaking RSA encryption and signatures. "
        "This rule detects RSA key pair generation calls."
    ),
    migration_recommendation=(
        "For key establishment, consider ML-KEM (FIPS 203). "
        "For digital signatures, consider ML-DSA (FIPS 204) or SLH-DSA (FIPS 205), "
        "depending on performance and security requirements. "
        "Migration also depends on protocol compatibility and library support."
    ),
    confidence="definite",
    patterns=[
        _p(r'\brsa\.generate_private_key\b'),
        _p(r'\bRSA\.generate\b'),
        _p(r'\bgenerate_private_key\s*\(.*\bpublic_exponent\b'),
        _p(r'\bcryptography\.hazmat\.primitives\.asymmetric\.rsa\b'),
        _p(r'\bfrom\s+Crypto\.PublicKey\s+import\s+RSA\b'),
        _p(r'\bPyCrypto.*RSA\b'),
        _p(r'\bRSA\.import_key\b'),
        _p(r'\bRSA\.construct\b'),
    ],
    references=[
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf",
        "https://csrc.nist.gov/projects/post-quantum-cryptography",
        "https://pq-crystals.org/kyber/",
    ],
)

RSA_002 = DetectionRule(
    rule_id="CRYPTO-RSA-002",
    rule_name="RSA Encryption / Decryption",
    algorithm_family="RSA",
    severity="high",
    explanation=(
        "RSA-based encryption (OAEP, PKCS#1 v1.5) is vulnerable to Shor's algorithm on a quantum computer. "
        "This rule detects RSA encrypt/decrypt API usage."
    ),
    migration_recommendation=(
        "Replace RSA-based key encapsulation with ML-KEM (FIPS 203) based key establishment. "
        "Hybrid schemes combining ML-KEM with a classical algorithm may be appropriate "
        "during transition periods, following a reviewed protocol specification."
    ),
    confidence="definite",
    patterns=[
        _p(r'\.encrypt\s*\(.*OAEP'),
        _p(r'\.decrypt\s*\(.*OAEP'),
        _p(r'\bPKCS1v15\b'),
        _p(r'padding\.OAEP'),
        _p(r'padding\.PKCS1v15'),
        _p(r'\bRSA\.encrypt\b'),
        _p(r'\bRSA\.decrypt\b'),
    ],
    references=[
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
    ],
)

RSA_003 = DetectionRule(
    rule_id="CRYPTO-RSA-003",
    rule_name="RSA Digital Signature",
    algorithm_family="RSA",
    severity="high",
    explanation=(
        "RSA-based digital signatures (PSS, PKCS1v15) are broken by Shor's algorithm. "
        "This rule detects RSA signing and verification API calls."
    ),
    migration_recommendation=(
        "Replace with ML-DSA (FIPS 204) or SLH-DSA (FIPS 205) for digital signatures."
    ),
    confidence="definite",
    patterns=[
        _p(r'\.sign\s*\(.*PSS'),
        _p(r'\.verify\s*\(.*PSS'),
        _p(r'padding\.PSS'),
        _p(r'\bRSA\.sign\b'),
        _p(r'\bRSA\.verify\b'),
    ],
    references=[
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf",
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.205.pdf",
    ],
)

# ---------------------------------------------------------------------------
# DSA rules
# ---------------------------------------------------------------------------
DSA_001 = DetectionRule(
    rule_id="CRYPTO-DSA-001",
    rule_name="DSA Key Generation",
    algorithm_family="DSA",
    severity="high",
    explanation=(
        "The Digital Signature Algorithm (DSA) relies on the discrete logarithm problem. "
        "Shor's algorithm solves discrete logarithm in polynomial time, making DSA "
        "insecure against a sufficiently capable quantum computer."
    ),
    migration_recommendation=(
        "Replace DSA with ML-DSA (FIPS 204) or SLH-DSA (FIPS 205) for digital signatures."
    ),
    confidence="definite",
    patterns=[
        _p(r'\bdsa\.generate_private_key\b'),
        _p(r'\bDSA\.generate\b'),
        _p(r'\bcryptography\.hazmat\.primitives\.asymmetric\.dsa\b'),
        _p(r'\bfrom\s+Crypto\.PublicKey\s+import\s+DSA\b'),
        _p(r'\bimport\s+.*?\bdsa\b'),
        _p(r'\bfrom\s+.*?import\s+.*?\bdsa\b'),
    ],
    references=[
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf",
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.205.pdf",
    ],
)

# ---------------------------------------------------------------------------
# Diffie-Hellman rules
# ---------------------------------------------------------------------------
DH_001 = DetectionRule(
    rule_id="CRYPTO-DH-001",
    rule_name="Finite-Field Diffie-Hellman Key Exchange",
    algorithm_family="DH",
    severity="high",
    explanation=(
        "Classical Diffie-Hellman key exchange relies on the discrete logarithm problem "
        "in a finite field. Shor's algorithm can solve this in polynomial time, "
        "making classical DH insecure against a quantum adversary."
    ),
    migration_recommendation=(
        "Replace with ML-KEM (FIPS 203) for key establishment. "
        "Hybrid key establishment schemes (ML-KEM + classical) may be appropriate "
        "for transition, following a reviewed protocol such as X-Wing or similar."
    ),
    confidence="definite",
    patterns=[
        _p(r'\bdh\.generate_parameters\b'),
        _p(r'\bcryptography\.hazmat\.primitives\.asymmetric\.dh\b'),
        _p(r'\bDHParameters\b'),
        _p(r'\bDiffieHellman\b'),
        _p(r'\bfrom\s+Crypto\.Protocol\s+import\s+.*DH'),
    ],
    references=[
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
    ],
)

# ---------------------------------------------------------------------------
# ECC rules
# ---------------------------------------------------------------------------
ECC_001 = DetectionRule(
    rule_id="CRYPTO-ECC-001",
    rule_name="Elliptic-Curve Cryptography Key Generation",
    algorithm_family="ECC",
    severity="high",
    explanation=(
        "Elliptic-curve cryptography (ECC) relies on the elliptic-curve discrete "
        "logarithm problem, which Shor's algorithm solves in polynomial time. "
        "This makes ECDH, ECDSA, and related algorithms insecure against quantum adversaries."
    ),
    migration_recommendation=(
        "For key establishment using ECDH, consider ML-KEM (FIPS 203). "
        "For digital signatures using ECDSA, consider ML-DSA (FIPS 204) or SLH-DSA (FIPS 205)."
    ),
    confidence="definite",
    patterns=[
        _p(r'\bec\.generate_private_key\b'),
        _p(r'\bcryptography\.hazmat\.primitives\.asymmetric\.ec\b'),
        _p(r'\bEllipticCurvePrivateKey\b'),
        _p(r'\bEllipticCurvePublicKey\b'),
        _p(r'\bfrom\s+Crypto\.PublicKey\s+import\s+ECC\b'),
        _p(r'\bECC\.generate\b'),
        _p(r'\bECDSA\b'),
        _p(r'\bECDH\b'),
        _p(r'\bP-256\b'),
        _p(r'\bP-384\b'),
        _p(r'\bP-521\b'),
        _p(r'\bsecp256r1\b'),
        _p(r'\bsecp384r1\b'),
        _p(r'\bprime256v1\b'),
        _p(r'(?i)\bcurve25519\w*'),
        _p(r'\bX25519\w*'),
        _p(r'\bEd25519\w*'),
    ],
    references=[
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf",
    ],
)

ECC_002 = DetectionRule(
    rule_id="CRYPTO-ECC-002",
    rule_name="ECDH Key Exchange",
    algorithm_family="ECC",
    severity="high",
    explanation=(
        "Elliptic-Curve Diffie-Hellman (ECDH) key exchange is based on the elliptic-curve "
        "discrete logarithm problem, vulnerable to Shor's algorithm on a quantum computer."
    ),
    migration_recommendation=(
        "Replace ECDH key establishment with ML-KEM (FIPS 203). "
        "Hybrid designs combining ML-KEM and X25519 or P-256 may be used during transition."
    ),
    confidence="definite",
    patterns=[
        _p(r'\bECDH\b'),
        _p(r'\becdh\b'),
        _p(r'\bexchange\s*\(.*ECDHPrivateKey'),
        _p(r'ECDH\(\)'),
        _p(r'\.exchange\s*\(\s*ECDH'),
    ],
    references=[
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf",
    ],
)

ECC_003 = DetectionRule(
    rule_id="CRYPTO-ECC-003",
    rule_name="ECDSA Signature",
    algorithm_family="ECC",
    severity="high",
    explanation=(
        "Elliptic-Curve Digital Signature Algorithm (ECDSA) is based on the elliptic-curve "
        "discrete logarithm problem, vulnerable to Shor's algorithm."
    ),
    migration_recommendation=(
        "Replace ECDSA with ML-DSA (FIPS 204) or SLH-DSA (FIPS 205) for digital signatures."
    ),
    confidence="definite",
    patterns=[
        _p(r'\bECDSA\b'),
        _p(r'\becdsa\b'),
        _p(r'\.sign\s*\(.*ECDSA'),
        _p(r'\.verify\s*\(.*ECDSA'),
    ],
    references=[
        "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf",
    ],
)

# ---------------------------------------------------------------------------
# Library import rules (lower confidence)
# ---------------------------------------------------------------------------
LIB_001 = DetectionRule(
    rule_id="CRYPTO-LIB-001",
    rule_name="Classical Cryptography Library Import",
    algorithm_family="RSA",  # general
    severity="medium",
    explanation=(
        "This file imports a classical cryptography library that likely contains "
        "quantum-vulnerable algorithm implementations. Review the specific APIs used "
        "in this file to identify migration requirements."
    ),
    migration_recommendation=(
        "Audit all cryptographic API usage from this import. "
        "Identify specific algorithm families and apply the relevant migration recommendation."
    ),
    confidence="possible",
    patterns=[
        _p(r'\bimport\s+ssl\b'),
        _p(r'\bfrom\s+OpenSSL\b'),
        _p(r'\bimport\s+OpenSSL\b'),
        _p(r'\bimport\s+M2Crypto\b'),
        _p(r'\bimport\s+pyOpenSSL\b'),
        _p(r'\bfrom\s+ssl\b'),
    ],
    references=[
        "https://csrc.nist.gov/projects/post-quantum-cryptography",
    ],
)

# ---------------------------------------------------------------------------
# Key-size / algorithm-name reference rules (informational)
# ---------------------------------------------------------------------------
INFO_001 = DetectionRule(
    rule_id="CRYPTO-INFO-001",
    rule_name="RSA Key Size Reference",
    algorithm_family="RSA",
    severity="info",
    explanation=(
        "A numeric value commonly used as an RSA key size appears in this file. "
        "This may indicate RSA configuration. Verify the context and apply RSA migration guidance."
    ),
    migration_recommendation=(
        "If this is an RSA key size, review the RSA key generation and usage in this file."
    ),
    confidence="possible",
    patterns=[
        _p(r'\b(?:key_size|key_bits|rsa_bits)\s*=\s*(?:1024|2048|3072|4096)\b'),
        _p(r'\bkey_size=(?:1024|2048|3072|4096)\b'),
    ],
    references=[],
)

# ---------------------------------------------------------------------------
# Rule registry
# ---------------------------------------------------------------------------
ALL_RULES: List[DetectionRule] = [
    RSA_001,
    RSA_002,
    RSA_003,
    DSA_001,
    DH_001,
    ECC_001,
    ECC_002,
    ECC_003,
    LIB_001,
    INFO_001,
]

RULE_BY_ID: dict[str, DetectionRule] = {r.rule_id: r for r in ALL_RULES}
