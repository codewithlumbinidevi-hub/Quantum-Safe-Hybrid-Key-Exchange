"""
Generates manifest.json and SHA256SUMS for all files in results/.
"""
import hashlib
import json
import os
import sys

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")


def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def main():
    manifest = {}
    sha_lines = []

    for root, _, files in os.walk(RESULTS_DIR):
        for fname in sorted(files):
            if fname in ["SHA256SUMS", "manifest.json"]:
                continue
            full_path = os.path.join(root, fname)
            rel_path = os.path.relpath(full_path, RESULTS_DIR).replace("\\", "/")
            h = compute_sha256(full_path)
            size = os.path.getsize(full_path)
            manifest[rel_path] = {"sha256": h, "bytes": size}
            sha_lines.append(f"{h}  {rel_path}")

    # Write SHA256SUMS
    sha_path = os.path.join(RESULTS_DIR, "SHA256SUMS")
    with open(sha_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sha_lines) + "\n")

    # Write manifest.json
    manifest_path = os.path.join(RESULTS_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Generated manifest.json and SHA256SUMS for {len(manifest)} artifacts.")


if __name__ == "__main__":
    main()
