"""
Universal Processor A/B Framework: Topology and Noise Model Loaders.
Adheres strictly to the Qiskit Fall Fest 2026 Phase 1 universal specification:
- Processor A: 5 qubits (0-4), baseline linear chain [(0,1),(1,2),(2,3),(3,4)]
- Processor B: 9 qubits (0-8), reference sparse heavy-hex-inspired graph (12 edges):
  [(0,1),(1,2),(1,6),(2,3),(2,6),(2,5),(3,4),(4,5),(5,6),(6,7),(6,8),(8,0)]
- Basis gates: ['rz', 'sx', 'x', 'cx']
- Identical synthetic noise: 1q depolarizing p=0.001, 2q CX depolarizing p=0.005, readout error p=0.01
- Transpiler baseline: optimization_level=1, seed=42, shots=4096
"""
from pathlib import Path
from typing import Tuple, Dict, Any

from processors.coupling_maps import ProcessorTopology, load_processors
from processors.noise_models import create_reference_noise_model, get_noise_model_metadata

# Project configuration root paths
ROOT_DIR = Path(__file__).resolve().parent.parent
PROCESSORS_DIR = ROOT_DIR / "processors"
PROCESSOR_A_JSON = PROCESSORS_DIR / "processor_A.json"
PROCESSOR_B_JSON = PROCESSORS_DIR / "processor_B.json"

BASIS_GATES = ["rz", "sx", "x", "cx"]
DEFAULT_TRANSPILER_SETTINGS = {
    "optimization_level": 1,
    "seed": 42,
    "shots": 4096
}


def get_processor_a() -> ProcessorTopology:
    """Load Processor A (5-qubit linear chain) from the single-source-of-truth JSON configuration."""
    return ProcessorTopology.from_json_file(PROCESSOR_A_JSON)


def get_processor_b() -> ProcessorTopology:
    """Load Processor B (9-qubit sparse heavy-hex) from the single-source-of-truth JSON configuration."""
    return ProcessorTopology.from_json_file(PROCESSOR_B_JSON)


def load_all_processors() -> Tuple[ProcessorTopology, ProcessorTopology]:
    """Convenience loader returning (Processor A, Processor B)."""
    return get_processor_a(), get_processor_b()
