"""
System Metrics Service.
Measures process memory overhead (resident memory vs Python-managed allocations),
detects CPU specifications, and manages CPU-affinity constraints for Platform A vs Platform B.
"""
import os
import platform
import sys
import psutil
import tracemalloc
from typing import Dict, Any, List, Optional
import cryptography
import qiskit


class SystemMetricsService:
    """Collects hardware, OS, memory, and CPU-affinity metrics honestly."""

    @classmethod
    def get_hardware_info(cls) -> Dict[str, Any]:
        """Collect static and dynamic platform environment metadata."""
        cpu_count_logical = psutil.cpu_count(logical=True) or 1
        cpu_count_physical = psutil.cpu_count(logical=False) or 1
        current_process = psutil.Process()
        
        # Check CPU affinity support
        affinity_supported = hasattr(current_process, "cpu_affinity")
        current_affinity = None
        if affinity_supported:
            try:
                current_affinity = current_process.cpu_affinity()
            except Exception:
                affinity_supported = False

        return {
            "os_name": platform.system(),
            "os": platform.system(),
            "os_release": platform.release(),
            "os_version": platform.version(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "cpu_physical_cores": cpu_count_physical,
            "cpu_logical_cores": cpu_count_logical,
            "cpu_cores_logical": cpu_count_logical,
            "python_version": sys.version.split()[0],
            "cryptography_version": getattr(cryptography, "__version__", "unknown"),
            "qiskit_version": getattr(qiskit, "__version__", "unknown"),
            "affinity_supported": affinity_supported,
            "affinity_constraint_supported": affinity_supported,
            "initial_cpu_affinity": current_affinity,
        }

    @classmethod
    def set_cpu_profile(cls, profile: str) -> Dict[str, Any]:
        """
        Configure CPU affinity for Platform A (Standard) or Platform B (Constrained).
        
        Args:
            profile: "platform_a" (unrestricted/standard) or "platform_b" (constrained).
            
        Returns:
            Dict describing whether the constraint was applied or if unsupported.
        """
        p = psutil.Process()
        if not hasattr(p, "cpu_affinity"):
            return {
                "profile": profile,
                "applied": False,
                "warning": "psutil.Process.cpu_affinity is unsupported on this platform",
                "active_cores": list(range(psutil.cpu_count(logical=True) or 1)),
            }

        all_cores = list(range(psutil.cpu_count(logical=True) or 1))
        
        try:
            if profile.lower() in ("platform_b", "constrained"):
                # Constrain to single CPU core (core 0)
                constrained_cores = [0]
                p.cpu_affinity(constrained_cores)
                actual_affinity = p.cpu_affinity()
                return {
                    "profile": "platform_b (constrained)",
                    "applied": True,
                    "target_cores": constrained_cores,
                    "active_cores": actual_affinity,
                    "warning": None,
                    "note": "Constrained profile bound execution strictly to CPU core 0 via OS thread affinity."
                }
            else:
                # Restore all cores for Platform A (Standard)
                p.cpu_affinity(all_cores)
                actual_affinity = p.cpu_affinity()
                return {
                    "profile": "platform_a (standard)",
                    "applied": True,
                    "target_cores": all_cores,
                    "active_cores": actual_affinity,
                    "warning": None,
                    "note": "Standard profile executing across all available CPU cores without artificial affinity restrictions."
                }
        except Exception as e:
            return {
                "profile": profile,
                "applied": False,
                "warning": f"Failed to modify CPU affinity: {str(e)}",
                "active_cores": all_cores,
            }

    @classmethod
    def get_memory_metrics(cls) -> Dict[str, Any]:
        """
        Measure current process memory, distinguishing resident process memory (RSS)
        from Python-managed heap allocations.
        """
        p = psutil.Process()
        mem_info = p.memory_info()
        
        tracemalloc_current, tracemalloc_peak = 0, 0
        if tracemalloc.is_tracing():
            tracemalloc_current, tracemalloc_peak = tracemalloc.get_traced_memory()

        return {
            "process_rss_bytes": mem_info.rss,
            "process_rss_mb": round(mem_info.rss / (1024 * 1024), 2),
            "process_vms_bytes": mem_info.vms,
            "process_vms_mb": round(mem_info.vms / (1024 * 1024), 2),
            "python_traced_current_bytes": tracemalloc_current,
            "python_traced_current_kb": round(tracemalloc_current / 1024, 2),
            "python_traced_peak_bytes": tracemalloc_peak,
            "python_traced_peak_kb": round(tracemalloc_peak / 1024, 2),
        }
