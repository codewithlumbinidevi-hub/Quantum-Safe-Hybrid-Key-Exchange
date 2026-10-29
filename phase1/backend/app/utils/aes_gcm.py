"""
AES-256-GCM symmetric encryption utility for demonstrating secure communication
using keys derived from the hybrid ECDH + ML-KEM-768 key exchange.
"""
import os
from typing import Dict, Any, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag


def encrypt_aes_gcm(key: bytes, plaintext: bytes, associated_data: bytes = b"") -> Dict[str, str]:
    """
    Encrypt plaintext using AES-256-GCM.
    
    Args:
        key: 32-byte symmetric key derived from hybrid key exchange.
        plaintext: Raw plaintext message bytes.
        associated_data: Optional authenticated data (AAD).
        
    Returns:
        Dict containing hex-encoded nonce, ciphertext (including auth tag), and success flag.
    """
    if len(key) != 32:
        raise ValueError(f"AES-256-GCM requires a 32-byte key, received {len(key)} bytes")
        
    aesgcm = AESGCM(key)
    # Recommended 96-bit (12-byte) nonce
    nonce = os.urandom(12)
    # AESGCM.encrypt appends 16-byte authentication tag to ciphertext
    ciphertext_and_tag = aesgcm.encrypt(nonce, plaintext, associated_data)
    
    # In cryptography's AESGCM, the last 16 bytes are the authentication tag
    tag = ciphertext_and_tag[-16:]
    raw_ciphertext = ciphertext_and_tag[:-16]
    
    return {
        "nonce_hex": nonce.hex(),
        "ciphertext_hex": raw_ciphertext.hex(),
        "tag_hex": tag.hex(),
        "combined_hex": ciphertext_and_tag.hex(),
        "plaintext_len": len(plaintext),
        "ciphertext_len": len(ciphertext_and_tag),
    }


def decrypt_aes_gcm(key: bytes, nonce: bytes, ciphertext_and_tag: bytes, associated_data: bytes = b"") -> Tuple[bool, bytes, str]:
    """
    Decrypt and authenticate ciphertext using AES-256-GCM.
    
    Args:
        key: 32-byte symmetric key.
        nonce: 12-byte initialization vector.
        ciphertext_and_tag: Ciphertext with appended 16-byte authentication tag.
        associated_data: Authenticated data to verify.
        
    Returns:
        Tuple of (success: bool, decrypted_bytes: bytes, error_message: str)
    """
    if len(key) != 32:
        return False, b"", f"Invalid key length: {len(key)} bytes"
    if len(nonce) != 12:
        return False, b"", f"Invalid nonce length: {len(nonce)} bytes"
        
    try:
        aesgcm = AESGCM(key)
        decrypted = aesgcm.decrypt(nonce, ciphertext_and_tag, associated_data)
        return True, decrypted, ""
    except InvalidTag:
        return False, b"", "Authentication failed: Invalid authentication tag (ciphertext or AAD modified)"
    except Exception as e:
        return False, b"", f"Decryption error: {str(e)}"
