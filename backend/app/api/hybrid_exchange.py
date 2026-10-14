"""
Hybrid Key Exchange API.
Provides endpoints for executing Alice <-> Bob hybrid key establishment.
"""
from fastapi import APIRouter, HTTPException
from backend.app.schemas.crypto_schemas import HybridExchangeRequest, HybridExchangeResponse
from backend.app.services.hybrid_exchange_service import HybridExchangeService

router = APIRouter(prefix="/api/hybrid-exchange", tags=["Hybrid Key Exchange"])


@router.post("/run", response_model=HybridExchangeResponse)
async def run_hybrid_exchange(request: HybridExchangeRequest = HybridExchangeRequest()):
    """
    Execute an interactive hybrid key exchange between Alice and Bob:
    1. Ephemeral ECDH P-256 key pair generation.
    2. Ephemeral ML-KEM-768 key pair generation.
    3. Independent ECDH derivation.
    4. ML-KEM encapsulation & decapsulation.
    5. Transcript-bound HKDF-SHA256 hybrid key derivation.
    6. Independent key equality verification.
    7. Optional AES-256-GCM authenticated message encryption.
    """
    try:
        result = HybridExchangeService.execute_handshake(demo_message=request.demo_message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hybrid exchange failed: {str(e)}")
