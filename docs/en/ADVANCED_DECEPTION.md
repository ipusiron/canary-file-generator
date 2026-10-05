# Advanced: deception techniques and security strategy in real operations

English · [日本語](../ADVANCED_DECEPTION.md)

> **Note**: The Advanced section below goes beyond what this tool does.
> It describes the theory and practice of deception in real operational environments.

## 1) Further benefits (from research and practice)
- **Behavior shaping**
  Naturally steer attackers toward paths, accounts and files that look "tasty", and **control the attack surface**.
  Example: draw attention to a "backup-style archive" instead of the production database.
- **TTP/IOC collection (an observation device)**
  Collect **techniques, tools and infrastructure (TTPs/IOCs)** at the bait, and strengthen detection rules and threat intelligence.
- **Help with attribution**
  Plant unique tokens (canary phrases, unique IDs), so that when they reappear elsewhere they help **identify the source and path of a leak**.
- **Continuous validation of controls (purple team)**
  Validate the SOC's detection, reporting and containment against the traps **continuously and cheaply** (a kind of synthetic monitoring).
- **Early detection of insider misuse and lateral movement**
  Access to data or accounts that legitimate work never touches makes **misuse, overreach and insider threats** visible.
- **Better evidence and traceability**
  Scatter canary identifiers through logs and data to improve **evidence preservation and reproducibility** and to shorten investigations.

> Summary: the trio of **bait + observation (sensors) + shaping (steering)** maximizes "the attacker's effort" and "the defender's learning".

## Operational design checklist
- **Plausibility**: consistency of naming, timestamps, permissions, placement, extensions, size and compression format.
- **Non-interference**: do not break production processing or availability. Keep it apart from authentication and authorization.
- **Observability**: capture opening, copying and transfer with `auditd/fanotify/EDR` and similar, and feed it to the SIEM. Put identifiers in **both logs and data**.
- **Rotation & hygiene**: update, retrieve and redeploy decoys regularly. Watch for exposure, false positives and staleness.
- **Deconfliction**: coordinate in advance with red teams, assessments and backup operations.
- **Governance / legal / ethics**: policy, personal information and regulatory compliance. Keep the number of people in the know to a minimum.

## Implementation patterns
- **Honeywords (fake passwords)**: store fake candidates that resemble the real password alongside it, and let only a separate server (the honeychecker) know which one is real. If someone tries to log in with a fake candidate, you know the password file has leaked (Juels and Rivest, ACM CCS 2013).
- **Breadcrumbs**: an "operations memo" file on a low-privilege host leads to **fake URLs/keys** for higher-value assets, which carry canaries.
- **Tarpit**: increase the **delay and retry cost** for SSH, SMTP and so on (mind the impact on availability).

## Failure patterns
- **Obvious fakes**: unnatural naming, paths, permissions or modification dates give it away at once.
- **Mixing with production**: it really allows logins, or production jobs refer to it by mistake.
- **Isolated logs**: audit events never reach the SIEM, so **you detect but cannot act**.
- **Left in place**: anachronistic traces give it away.
- **Excessive collection**: runs into governance and privacy problems.

## Summary
- Beyond bait leading to detection or buying time, combining **behavior shaping, observation and evidence** gives the greatest effect.
- A `passwd`/`shadow`-style decoy needs **separation from the main flow** + **strong hashes** + **auditing** + **identifiers**.
- The value of deception lies in **getting the attacker to make decisions on your ground**.
