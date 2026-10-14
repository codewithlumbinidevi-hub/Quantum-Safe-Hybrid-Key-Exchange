"""
Q-SHIELD-PQC Backend Application Entrypoint.
FastAPI application orchestrating Post-Quantum Hybrid Key Agreement
and Qiskit Architecture Benchmarking.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.config import settings
from backend.app.api import (
    health,
    hybrid_exchange,
    crypto_benchmarks,
    processor_benchmarks,
    results,
    scanner,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup initialization
    print(f"[*] Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"[*] Results Directory: {settings.RESULTS_DIR}")
    yield
    # Shutdown cleanup
    print(f"[*] Shutting down {settings.PROJECT_NAME}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware restricted to configured frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router)
app.include_router(hybrid_exchange.router)
app.include_router(crypto_benchmarks.router)
app.include_router(processor_benchmarks.router)
app.include_router(results.router)
app.include_router(scanner.router)


@app.get("/")
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "api_health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
