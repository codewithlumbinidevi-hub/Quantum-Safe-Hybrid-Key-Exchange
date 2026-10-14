"""
Health Check and System Status API.
"""
from fastapi import APIRouter
from typing import Dict, Any
from backend.app.services.system_metrics_service import SystemMetricsService
from backend.app.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("", response_model=Dict[str, Any])
async def check_health() -> Dict[str, Any]:
    """
    Check backend operational status and inspect system environment metadata.
    """
    hardware = SystemMetricsService.get_hardware_info()
    memory = SystemMetricsService.get_memory_metrics()

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "description": settings.DESCRIPTION,
        "environment": {
            "os": hardware["os_name"],
            "architecture": hardware["architecture"],
            "processor": hardware["processor"],
            "cpu_cores_logical": hardware["cpu_logical_cores"],
            "python_version": hardware["python_version"],
            "cryptography_version": hardware["cryptography_version"],
            "qiskit_version": hardware["qiskit_version"],
            "affinity_constraint_supported": hardware["affinity_supported"],
        },
        "system_memory": memory,
    }
