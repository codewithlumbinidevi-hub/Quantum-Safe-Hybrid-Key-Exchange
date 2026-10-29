"""
Coupling Maps and Processor Topology Modeling.
Loads processor JSON specifications and builds Qiskit CouplingMap instances.
Uses NetworkX to validate topology connectivity and graph-theoretic metrics.
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
import networkx as nx
from qiskit.transpiler import CouplingMap


class ProcessorTopology:
    """Represents a quantum processor architecture coupling graph."""

    def __init__(self, config_dict: Dict[str, Any]):
        self.name = config_dict.get("name", "Unknown Processor")
        self.architecture_id = config_dict.get("architecture_id", "proc")
        self.topology_type = config_dict.get("topology_type", "Unknown")
        self.num_qubits = config_dict.get("num_qubits", 5)
        self.qubit_indices = config_dict.get("qubit_indices", list(range(self.num_qubits)))
        self.basis_gates = config_dict.get("basis_gates", ["rz", "sx", "x", "cx"])
        self.raw_coupling_map = config_dict.get("coupling_map", [])
        self.description = config_dict.get("description", "")
        self.synthetic_noise = config_dict.get("synthetic_noise", {})
        self.transpile_settings = config_dict.get(
            "transpile_settings",
            {"optimization_level": 1, "seed": 42, "shots": 4096}
        )

        # Build bidirectional edges for standard superconducting architecture simulation
        self.bidirectional_edges: List[List[int]] = []
        for u, v in self.raw_coupling_map:
            if [u, v] not in self.bidirectional_edges:
                self.bidirectional_edges.append([u, v])
            if [v, u] not in self.bidirectional_edges:
                self.bidirectional_edges.append([v, u])

        # Construct NetworkX Graph for topological metrics
        self.nx_graph = nx.Graph()
        self.nx_graph.add_nodes_from(self.qubit_indices)
        for u, v in self.raw_coupling_map:
            self.nx_graph.add_edge(u, v)

    @classmethod
    def from_json_file(cls, filepath: Path) -> "ProcessorTopology":
        """Load topology from a JSON configuration file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(data)

    def get_qiskit_coupling_map(self) -> CouplingMap:
        """Generate a Qiskit CouplingMap object."""
        return CouplingMap(self.bidirectional_edges)

    def validate(self) -> Tuple[bool, str]:
        """Validate topology integrity and connectivity."""
        if not nx.is_connected(self.nx_graph):
            return False, f"Processor {self.name} coupling graph is disconnected!"
        if len(self.nx_graph.nodes) != self.num_qubits:
            return False, f"Node count mismatch: expected {self.num_qubits}, found {len(self.nx_graph.nodes)}"
        return True, "Valid connected topology"

    def get_graph_metrics(self) -> Dict[str, Any]:
        """Compute topological metrics: diameter, average degree, edge count, etc."""
        is_connected = nx.is_connected(self.nx_graph)
        diameter = nx.diameter(self.nx_graph) if is_connected else -1
        degrees = [deg for _, deg in self.nx_graph.degree()]
        avg_degree = round(sum(degrees) / len(degrees), 2) if degrees else 0.0

        return {
            "name": self.name,
            "architecture_id": self.architecture_id,
            "num_qubits": self.num_qubits,
            "undirected_edges_count": len(self.raw_coupling_map),
            "directed_edges_count": len(self.bidirectional_edges),
            "is_connected": is_connected,
            "graph_diameter": diameter,
            "avg_qubit_degree": avg_degree,
            "max_qubit_degree": max(degrees) if degrees else 0,
            "min_qubit_degree": min(degrees) if degrees else 0,
            "raw_edges": self.raw_coupling_map,
        }


def load_processors() -> Tuple[ProcessorTopology, ProcessorTopology]:
    """Load default Processor A and Processor B topologies from JSON files."""
    base_dir = Path(__file__).resolve().parent
    proc_a_path = base_dir / "processor_A.json"
    proc_b_path = base_dir / "processor_B.json"

    proc_a = ProcessorTopology.from_json_file(proc_a_path)
    proc_b = ProcessorTopology.from_json_file(proc_b_path)
    return proc_a, proc_b
