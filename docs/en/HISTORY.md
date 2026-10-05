# A history of canary files and honey files

English · [日本語](../HISTORY.md)

## Overview

This is a chronological list of events that led to canary files, honey files and honeytokens. The years and facts are checked against the references at the end (papers and official documents).

---

## Timeline

- **1943: Document deception in the Second World War (Operation Mincemeat)**
  An operation planned by Ewen Montagu of British Naval Intelligence and Charles Cholmondeley of the Royal Air Force. A corpse disguised as a British officer carried fake documents suggesting that the Allies would land in Greece and Sardinia, and was released off the coast of Spain on 30 April 1943. The actual landing was in Sicily. It is not an IT story, but it is often cited as an example of deception that steers an opponent with important-looking bait.

- **1976: "Entrapment" in FIPS PUB 39**
  FIPS PUB 39, a glossary from the NBS (now NIST), defines entrapment as "the deliberate planting of apparent flaws in a system for the purpose of detecting attempted penetrations or confusing an intruder about which flaws to exploit". A separate entry, pseudo-flaw, is defined as "an apparent loophole deliberately implanted in an operating system program as a trap for intruders".

- **1980: The Anderson report**
  "Computer Security Threat Monitoring and Surveillance", a report by James P. Anderson Co. It laid out a framework for monitoring and detecting misuse of computers from audit records.

- **1987: Denning, "An Intrusion-Detection Model"**
  Dorothy Denning (SRI International) published a model that detects abnormal patterns of system usage from audit records, in IEEE Transactions on Software Engineering.

- **1988-1989: Clifford Stoll, "Stalking the Wily Hacker" and The Cuckoo's Egg**
  At Lawrence Berkeley Laboratory, Stoll let the intruder in instead of locking him out, recorded his activities and traced him to his source. Along the way, he created files of fictitious memos about the SDI (Strategic Defense Initiative) and set alarms so that he would know who read them. While the intruder spent more than an hour reading these files, the telephone trace was completed (1988, Communications of the ACM). He wrote it up in the book The Cuckoo's Egg in 1989. Spitzner (2003) cites the book as an example of using digital files to track and monitor an intruder.

- **1992: Cheswick, "An Evening with Berferd"**
  Bill Cheswick of AT&T Bell Laboratories presented his exchanges with an intruder from January 1991 at the Winter 1992 USENIX conference. He handed the intruder a fake passwd file and watched his activities in a "Jail" built with chroot.

- **1998: Fred Cohen, Deception ToolKit (DTK)**
  A deception toolkit released early in 1998. It answers as if the system had a large number of widely known vulnerabilities, to deceive attackers. The official page gives the example of a fake password file that wastes the attacker's time and effort on cracking.

- **1999: The Honeynet Project is founded**
  An international research community founded in April 1999. It recorded and analyzed attacker behavior and published books, papers and tools.

- **2001: LaBrea Tarpit**
  A "sticky honeypot" written by Tom Liston as a response to the Code Red worm. It takes over unused IP addresses, holds connections and slows down scanning. It was released in August 2001.

- **2002: Honeyd**
  A honeypot by Niels Provos that simulates many virtual hosts. Version 0.2 was released on 17 April 2002. The design is described in the 2004 USENIX Security paper "A Virtual Honeypot Framework".

- **2002: Spitzner, Honeypots: Tracking Hackers**
  A book by Lance Spitzner (Addison-Wesley, published 10 September 2002). It organized the purposes, types and operational risks of honeypots.

- **2003: The word "honeytoken"**
  On 21 February 2003, Augusto Paes de Barros posted an idea he called "honeytokens" to the focus-ids mailing list, and Lance Spitzner forwarded it to the honeypots list the same day. Spitzner spread the idea in his article "Honeytokens: The Other Honeypot" (SecurityFocus, 17 July 2003).

- **2004: Yuill et al., "Honeyfiles"**
  Jim Yuill, Mike Zappe, Dorothy Denning and Fred Feer presented bait files (honeyfiles) on a file server that raise an alarm when accessed, at the IEEE Information Assurance Workshop. They give names such as passwords.txt as examples.

- **2005: The Potemkin Virtual Honeyfarm**
  A large honeyfarm presented at SOSP 2005 by Vrable et al. of the University of California, San Diego (UCSD). It emulated more than 64,000 Internet honeypots using only a handful of physical servers, and the authors argued that it could scale to hundreds of thousands of IP addresses.

- **2009: Decoy documents (Bowen et al.)**
  Bowen, Hershkop, Keromytis and Stolfo of Columbia University presented D3, a system that detects inside attackers with decoy documents carrying fake credentials and beacons that report when a document is opened, at SecureComm 2009. An alert is raised when the fake credentials are used or a beacon in the document reports that it was opened. The paper also shows how to embed a unique pattern of word tokens tied to the document creator in the metadata or comments, and detect exfiltration with Snort signatures.

- **2013: Honeywords (Juels and Rivest)**
  Ari Juels and Ronald Rivest proposed, at ACM CCS 2013, storing fake passwords (honeywords) alongside the real one, with a separate server (the honeychecker) remembering which one is real. If someone tries to log in with a fake password, you know the password file has leaked.

- **2015: Canarytokens**
  A free service that Thinkst released together with the Black Hat USA 2015 talk "Bring Back the Honeypots". It offers many kinds of tokens (URLs, DNS names, AWS keys, Word documents and more) in a form you can simply drop in place.

---

## Key points

- Wartime document deception is the prototype of bait, and the audit and intrusion detection research of the 1980s is the foundation of detection
- The accounts of Stoll and Cheswick are early examples of learning an intruder's behavior with fake documents or a fake passwd file
- DTK, the Honeynet Project, Honeyd and Potemkin broadened the implementation and scale of honeypots
- Honeytokens in 2003, honeyfiles in 2004 and decoy documents in 2009 shaped the idea of turning data itself into a trap. Since 2015, Canarytokens has made it easy to use in practice

---

## Place in frameworks

- MITRE D3FEND: the Deceive tactic includes D3-DF Decoy File, D3-DUC Decoy User Credential, D3-DST Decoy Session Token and others. D3-DF is mapped to ATT&CK techniques such as T1083 (File and Directory Discovery) and T1552.001 (Credentials In Files)
- MITRE Engage: EAC0005 Lures (bait that gets an adversary to take a specific action) and EAC0011 Pocket Litter (data, such as documents and history, placed to support the credibility of the environment rather than to prompt a specific action)
- MITRE ATT&CK: techniques adversaries use to look for files include T1083 File and Directory Discovery and T1552.001 Credentials In Files

---

## References

- [Imperial War Museums, The War On Paper: Operation Mincemeat](https://www.iwm.org.uk/history/second-world-war/intelligence/the-war-on-paper-operation-mincemeat)
- [NBS, FIPS PUB 39, Glossary for Computer Systems Security (1976)](https://nvlpubs.nist.gov/nistpubs/Legacy/FIPS/fipspub39.pdf)
- [J. P. Anderson, Computer Security Threat Monitoring and Surveillance (1980)](https://csrc.nist.gov/csrc/media/publications/conference-paper/1998/10/08/proceedings-of-the-21st-nissc-1998/documents/early-cs-papers/ande80.pdf)
- [D. E. Denning, An Intrusion-Detection Model, IEEE TSE SE-13(2), 1987](https://doi.org/10.1109/TSE.1987.232894)
- [C. Stoll, Stalking the Wily Hacker, CACM 31(5), 1988](https://doi.org/10.1145/42411.42412)
- [B. Cheswick, An Evening with Berferd (1992)](https://www.cheswick.com/ches/papers/berferd.pdf)
- [F. Cohen, A Note on the Role of Deception in Information Protection, Computers & Security 17(6), 1998](http://all.net/journal/deception/deception.html)
- [The Honeynet Project](https://www.honeynet.org/about/)
- [LaBrea](https://labrea.sourceforge.io/Intro-History.html)
- [Honeyd (official page in 2002)](https://web.archive.org/web/20020603151055id_/http://www.citi.umich.edu:80/u/provos/honeyd/)
- [L. Spitzner, Honeypots: Tracking Hackers, Addison-Wesley, 2002](https://www.informit.com/store/honeypots-tracking-hackers-9780321108951)
- [A. Paes de Barros's post (2003-02-21)](https://seclists.org/honeypots/2003/q1/128)
- [L. Spitzner, Honeytokens: The Other Honeypot (2003)](https://web.archive.org/web/20040211083829id_/http://www.securityfocus.com/infocus/1713)
- [J. Yuill et al., Honeyfiles: Deceptive Files for Intrusion Detection, IEEE IAW 2004](https://doi.org/10.1109/IAW.2004.1437806)
- [M. Vrable et al., Scalability, Fidelity, and Containment in the Potemkin Virtual Honeyfarm, SOSP 2005](https://cseweb.ucsd.edu/~savage/papers/Sosp05.pdf)
- [B. M. Bowen et al., Baiting Inside Attackers Using Decoy Documents, SecureComm 2009](https://doi.org/10.1007/978-3-642-05284-2_4)
- [A. Juels, R. L. Rivest, Honeywords: Making Password-Cracking Detectable, ACM CCS 2013](https://people.csail.mit.edu/rivest/pubs/JR13.pdf)
- [Thinkst, Canarytokens.org - Quick, Free, Detection for the Masses (2015)](https://blog.thinkst.com/2015/09/canarytokensorg-quick-free-detection.html)
- [MITRE D3FEND Decoy File](https://d3fend.mitre.org/technique/d3f:DecoyFile/)
- [MITRE Engage Lures](https://engage.mitre.org/matrix/?activity=lures)
- [MITRE ATT&CK T1083](https://attack.mitre.org/techniques/T1083/)
