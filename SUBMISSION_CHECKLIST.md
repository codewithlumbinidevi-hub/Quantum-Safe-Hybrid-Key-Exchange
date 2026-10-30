# Final Submission Checklist (PS-P1 — Q-SHIELD)

- [x] Repository (GitHub or Hugging Face Space) is public or shared with the organizers, and the link has been submitted
- [x] README follows `common/templates/README_template.md`, with exact setup and run commands
- [x] `requirements.txt` with pinned versions (`cryptography==50.0.2`, `pqcrypto==1.0.0`, `psutil>=5.9`, etc.)
- [x] `platform_A_info.json` committed; `platform_runs.jsonl` committed with current paths (Platform B tested: 1 core pinned, 128 MB RAM budget, peak RSS 86.9 MB — labeled approximation on Windows)
- [x] No self-implemented cryptographic primitives; vetted libraries are used and named (`cryptography==50.0.2`, `pqcrypto==1.0.0`)
- [x] Automated tests with expected behaviour and recorded results (`results/security_tests.csv`)
- [x] Raw results (CSV/JSON) and the scripts that produced every table and figure (`raw_handshake_trials.csv`, `raw_payload_trials.csv`, `raw_platform_D_trials.csv`, `plot_results.py`, `tools/verify_results.py`)
- [x] Baseline identified and compared (Classical X25519 + Ed25519 suite `0x0002` behind identical interface)
- [x] Technical report (`report.md`), including explicit threat model, design decisions, mutual authentication statement, key schedule details, and honest limitations
- [x] PS-P1: all of `SECURITY_TESTS.md` T1–T9 addressed (PASS across PQC and Classical); N=100 handshakes measured; three official payloads (1 KB, 100 KB, 10 MB) verified byte-exact
- [x] Platform D (optional): `platform_D.md` included and measured (50ms RTT, 1 Mbps constrained WAN emulation, N=100 trials)
- [x] A teammate who did not write the code has re-run the README from a clean clone (Clean clone test executed and verified)
