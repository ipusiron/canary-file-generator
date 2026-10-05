# Advanced case study: buying time with a password file

English · [日本語](../ADVANCED_CASE_STUDIES.md)

> **Goal**:
> Make vulnerable-looking accounts (for example `backup`, `dbmaint`, `legacy-admin`) look real,
> while actually placing extremely hard-to-crack hashes so that offline brute force wastes time.

Using a fake password file to make an attacker spend time is an old idea. Fred Cohen's Deception ToolKit (1998) also gives the example of a fake password file that wastes the attacker's time and effort on cracking (see the timeline in [HISTORY.md](HISTORY.md)).

## Principles for a safe design

- Keep it apart from real authentication: do not change the real `/etc/passwd` or `/etc/shadow`. Instead, create a decoy that looks like a backup (for example `/var/backups/shadow-2025-08-01.gz`)
- Plausibility: give the user names, UID/GID, home directories, shells, change dates and expiry values that are consistent with each other
- Choice of hash: use a scheme that costs time and memory (yescrypt), or SHA-512-crypt (sha512crypt) with a large number of rounds. Hash a long random password that nobody knows (nobody knows it, so it cannot be used to log in). [Token Entropy Estimator](https://ipusiron.github.io/token-entropy-estimator/) gives a rough measure of a password's entropy
- Plant something to observe behavior: put a unique canary identifier in the decoy (a comment, a file name, a user name pattern) to make access and redistribution easier to trace. The tokens of this tool can serve as that identifier

## Building a decoy (a file that looks like a backup)

> Never change the `shadow` that is actually in use. The example below creates a decoy in `/var/backups/`.

1. **Prepare strong hashes**

   The available schemes depend on the libcrypt of your environment. Check the list first with `mkpasswd -m help` (on Debian-based systems, `mkpasswd` is in the whois package).

   - yescrypt (recommended where supported)
     ```bash
     HASH1=$(mkpasswd -m yescrypt 'SUPER-LONG-RANDOM-PASSWORD-AT-LEAST-64-CHARS')
     ```
   - SHA-512-crypt (widely compatible, but not a memory-hard scheme). Set the number of rounds with `-R`
     ```bash
     HASH2=$(mkpasswd -m sha512crypt -R 1000000 'ANOTHER-LONG-RANDOM-PASSWORD-AT-LEAST-64-CHARS')
     ```
   - `openssl passwd -6` can produce the same format (`$6$`), but it has no option for the number of rounds and uses the default of 5000. crypt(5) says 5000 is too low for modern hardware
   - The `$argon2id$...` format of Argon2id is not handled by crypt(5) (libxcrypt) on most Linux systems. Putting it in a shadow line makes the decoy less plausible

2. **Build `shadow`-style lines**

   Format: `login:hash:lastchg:min:max:warn:inactive:expire:reserved`
   ```text
   backupsvc:$y$j9T$...verylonghash...:19876:0:99999:7:::
   dbmaint:$6$rounds=1000000$SALT$...sha512crypthash...:19810:0:99999:7:::
   ```
   - `lastchg` is the number of days since 1 January 1970 (for example `echo $(( $(date +%s) / 86400 ))`)
   - Use plausible values for dates and expiry

3. **Create a file that looks like a backup**

   Hashes contain `$`, so pass them to `printf` as shell variables and write with `sudo tee` (with `sudo sh -c '...$HASH1...'`, the variable does not reach the inner shell and ends up empty).
   ```bash
   printf '%s\n' \
     "backupsvc:${HASH1}:19876:0:99999:7:::" \
     "dbmaint:${HASH2}:19810:0:99999:7:::" \
     | sudo tee /var/backups/shadow-2025-08-01 > /dev/null
   sudo gzip -n /var/backups/shadow-2025-08-01
   sudo chown root:root /var/backups/shadow-2025-08-01.gz
   sudo chmod 0644 /var/backups/shadow-2025-08-01.gz
   ```
   - The real `shadow` must not be readable by regular users (shadow(5)). This decoy is deliberately 0644, to look like a backup that became readable by mistake

4. **Audit access (for example with auditd)**
   ```bash
   # Temporary rule (for persistence, write it in /etc/audit/rules.d/)
   sudo auditctl -a always,exit -F arch=b64 -F path=/var/backups/shadow-2025-08-01.gz -F perm=r -k canary_shadow

   # Check
   sudo ausearch -k canary_shadow -i
   ```
   - The `-w path -p r` form exists for backward compatibility, and auditctl(8) calls it deprecated for performance reasons
   - On systems that install an `-a never,task` rule by default, no rule takes effect. Check with `auditctl -l`
   - Integrate with your SIEM or EDR and drill the steps from alert to containment

> **Caution**:
> Do not edit the real `/etc/passwd` or `/etc/shadow` and accidentally create a back door that really allows logins.
> Keep the decoy completely apart from production authentication, and use it only for auditing reads.

## References

- [mkpasswd(1)](https://manpages.debian.org/trixie/whois/mkpasswd.1.en.html)
- [crypt(5) (libxcrypt)](https://manpages.debian.org/trixie/libcrypt-dev/crypt.5.en.html)
- [shadow(5)](https://man7.org/linux/man-pages/man5/shadow.5.html)
- [auditctl(8)](https://man7.org/linux/man-pages/man8/auditctl.8.html)
- [ausearch(8)](https://man7.org/linux/man-pages/man8/ausearch.8.html)
- [Deception ToolKit](http://all.net/dtk/)
