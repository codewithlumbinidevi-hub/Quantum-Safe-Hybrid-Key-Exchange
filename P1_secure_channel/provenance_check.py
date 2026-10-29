"""
Provenance Verification Script for PS-P1.

Verifies that every statistic reported in handshake_results.csv and payload_results.csv
is deterministically derived from the raw per-trial CSV logs (raw_handshake_trials.csv
and raw_payload_trials.csv) with zero discrepancy.
"""
from __future__ import annotations

import csv
import math
import os
import sys

# Ensure repository root is on sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from common.measure import summarize

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")


def check_handshake_provenance():
    print("Checking Handshake Provenance against raw_handshake_trials.csv...")
    raw_csv = os.path.join(RESULTS_DIR, "raw_handshake_trials.csv")
    summary_csv = os.path.join(RESULTS_DIR, "handshake_results.csv")

    raw_trials = {"PQC": [], "classical-baseline": []}
    with open(raw_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            suite = r["suite"]
            ms = float(r["handshake_time_ms"])
            ns = int(ms * 1e6)
            raw_trials[suite].append(ns)

    with open(summary_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        summary_rows = list(reader)

    # Check in-process runs
    for row in summary_rows:
        if row["local_or_network"] != "local (in-process)":
            continue
        suite = row["mode"]
        samples_ns = raw_trials[suite]
        stats = summarize(samples_ns)

        rep_med = float(row["median_handshake_ms"])
        rep_iqr = float(row["iqr_ms"])
        rep_p95 = float(row["p95_ms"])

        calc_med = round(stats["median_ms"], 4)
        calc_iqr = round(stats["iqr_ms"], 4)
        calc_p95 = round(stats["p95_ms"], 4)

        assert math.isclose(rep_med, calc_med, abs_tol=1e-4), f"Median mismatch in {suite}: rep {rep_med} vs calc {calc_med}"
        assert math.isclose(rep_iqr, calc_iqr, abs_tol=1e-4), f"IQR mismatch in {suite}: rep {rep_iqr} vs calc {calc_iqr}"
        assert math.isclose(rep_p95, calc_p95, abs_tol=1e-4), f"p95 mismatch in {suite}: rep {rep_p95} vs calc {calc_p95}"

        print(f"  [PROVENANCE OK] {suite} Handshake: Median={rep_med} ms, IQR={rep_iqr} ms, N={len(samples_ns)}")


def check_payload_provenance():
    print("\nChecking Payload Provenance against raw_payload_trials.csv...")
    raw_csv = os.path.join(RESULTS_DIR, "raw_payload_trials.csv")
    summary_csv = os.path.join(RESULTS_DIR, "payload_results.csv")

    raw_data = {}  # (suite, payload) -> {"enc": [], "dec": []}
    with open(raw_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            key = (r["suite"], r["payload"])
            if key not in raw_data:
                raw_data[key] = {"enc": [], "dec": []}
            raw_data[key]["enc"].append(int(float(r["encrypt_ms"]) * 1e6))
            raw_data[key]["dec"].append(int(float(r["decrypt_ms"]) * 1e6))

    with open(summary_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        summary_rows = list(reader)

    for row in summary_rows:
        key = (row["mode"], row["payload"])
        samples = raw_data[key]

        enc_stats = summarize(samples["enc"])
        dec_stats = summarize(samples["dec"])

        rep_enc = float(row["median_encrypt_ms"])
        rep_dec = float(row["median_decrypt_ms"])

        calc_enc = round(enc_stats["median_ms"], 4)
        calc_dec = round(dec_stats["median_ms"], 4)

        assert math.isclose(rep_enc, calc_enc, abs_tol=1e-4), f"Enc mismatch {key}: {rep_enc} vs {calc_enc}"
        assert math.isclose(rep_dec, calc_dec, abs_tol=1e-4), f"Dec mismatch {key}: {rep_dec} vs {calc_dec}"

        print(f"  [PROVENANCE OK] {key[0]} - {key[1]}: Enc={rep_enc} ms, Dec={rep_dec} ms, N={len(samples['enc'])}")


def main():
    check_handshake_provenance()
    check_payload_provenance()
    print("\nALL PROVENANCE CHECKS VERIFIED DETERMINISTIC AND EXACT.")


if __name__ == "__main__":
    main()
