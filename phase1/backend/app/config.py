"""
Application configuration for Q-SHIELD-PQC.
"""
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Q-SHIELD-PQC"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Quantum-Safe Hybrid Key Exchange (ECDH P-256 + ML-KEM-768) and Qiskit Architecture Benchmark"
    
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    
    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    RESULTS_DIR: Path = BASE_DIR / "results"
    TABLES_DIR: Path = RESULTS_DIR / "tables"
    CRYPTO_RESULTS_DIR: Path = RESULTS_DIR / "crypto"
    PROCESSORS_RESULTS_DIR: Path = RESULTS_DIR / "processors"
    FIGURES_DIR: Path = RESULTS_DIR / "figures"
    PROCESSORS_DIR: Path = BASE_DIR / "processors"
    DATA_RAW_DIR: Path = BASE_DIR / "data" / "raw"
    DATA_PROCESSED_DIR: Path = BASE_DIR / "data" / "processed"
    ASSETS_DIR: Path = BASE_DIR / "assets"
    
    # Benchmarking Defaults
    DEFAULT_CRYPTO_ITERATIONS: int = 100
    MAX_CRYPTO_ITERATIONS: int = 1000
    WARMUP_ITERATIONS: int = 5
    
    # Qiskit Defaults
    DEFAULT_SHOTS: int = 4096
    TRANSPILER_OPTIMIZATION_LEVEL: int = 1
    TRANSPILER_SEED: int = 42

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

# Ensure mandated directories exist
settings.TABLES_DIR.mkdir(parents=True, exist_ok=True)
settings.CRYPTO_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
settings.PROCESSORS_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
settings.FIGURES_DIR.mkdir(parents=True, exist_ok=True)
settings.DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)
settings.DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
settings.ASSETS_DIR.mkdir(parents=True, exist_ok=True)
