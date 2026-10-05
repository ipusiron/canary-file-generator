# カナリアファイル・ハニーファイルの歴史

[English](en/HISTORY.md) · 日本語

## 概要

カナリアファイル・ハニーファイル・ハニートークンにつながる出来事を、年代順に整理しました。年と事実は、末尾の参考文献（論文・公式文書）で確かめています。

---

## 年表

- **1943年：第二次世界大戦の文書欺瞞（Operation Mincemeat）**
  英国の海軍情報部のEwen Montaguと空軍のCharles Cholmondeleyが立案した作戦。英国軍の将校に見せかけた遺体に、連合軍の上陸先がギリシャとサルデーニャだと思わせる偽の文書を持たせ、1943年4月30日にスペイン沖へ流した。実際の上陸先はシチリアだった。IT分野の話ではないが、重要そうに見える餌で相手の行動を誘導する欺瞞の例として、よく引かれる。

- **1976年：FIPS PUB 39の「entrapment」**
  NBS（現在のNIST）の用語集FIPS PUB 39は、entrapmentを「侵入の試みを検知するため、または侵入者がどの欠陥を突くかを迷わせるために、見かけ上の欠陥（apparent flaws）を意図的にシステムに仕込むこと」と定義している。別の見出し語pseudo-flawでは「侵入者への罠として、OSのプログラムに意図的に仕込んだ見かけの抜け穴」と定義している。

- **1980年：Anderson報告**
  James P. Anderson Co.の報告書「Computer Security Threat Monitoring and Surveillance」。監査記録を使って、コンピューターの不正な利用を監視・検出する枠組みを示した。

- **1987年：Denning「An Intrusion-Detection Model」**
  Dorothy Denning（SRI International）が、監査記録からシステムの使い方の異常なパターンを検出するモデルを、IEEE Transactions on Software Engineeringに発表した。

- **1988〜1989年：Clifford Stoll「Stalking the Wily Hacker」と『The Cuckoo's Egg』**
  ローレンス・バークレー研究所のStollは、侵入者を締め出さずに泳がせ、行動を記録して発信元をたどった。その途中で、SDI（戦略防衛構想）に関する架空のメモを入れたファイルを作り、誰が読んだかがわかるように警報を仕掛けた。侵入者がこのファイルを1時間以上読んでいるあいだに、電話の逆探知が完了した（1988年、Communications of the ACM）。翌1989年に書籍『The Cuckoo's Egg』（邦訳『カッコウはコンピュータに卵を産む』）にまとめた。Spitzner（2003）は、この本をデジタルのファイルで侵入者を追跡・監視した例として挙げている。

- **1992年：Cheswick「An Evening with Berferd」**
  AT&Tベル研究所のBill Cheswickが、1991年1月の侵入者とのやり取りを、1992年のWinter USENIXで発表した。侵入者に偽のpasswdファイルを渡し、chrootで作った「Jail」の中で行動を観察した。

- **1998年：Fred Cohen「Deception ToolKit（DTK）」**
  1998年の初めに公開された欺瞞のツールキット。よく知られた脆弱性を多数抱えているように見せかけて応答し、攻撃者を欺く。公式ページは、偽のパスワードファイルを解読させて攻撃者の時間と手間を浪費させる例を挙げている。

- **1999年：The Honeynet Projectの発足**
  1999年4月に発足した国際的な研究コミュニティ。攻撃者の行動を記録・分析し、書籍・論文・ツールとして公開した。

- **2001年：LaBrea Tarpit**
  Tom Listonが、ワームのCode Redへの対抗として作った「sticky honeypot」。使われていないIPアドレスになりすまして接続を引き留め、スキャンを遅らせる。2001年8月に公開された。

- **2002年：Honeyd**
  Niels Provosが作った、多数の仮想ホストを模擬するハニーポット。0.2版が2002年4月17日に公開された。設計は2004年のUSENIX Securityの論文「A Virtual Honeypot Framework」にまとめられている。

- **2002年：Spitzner『Honeypots: Tracking Hackers』**
  Lance Spitznerの著書（Addison-Wesley、2002年9月10日刊）。ハニーポットの目的・種類・運用上のリスクを体系的に整理した。

- **2003年：「ハニートークン」という語**
  2003年2月21日、Augusto Paes de Barrosがメーリングリストfocus-idsに「honeytokens」と呼ぶ考えを投稿し、同じ日にLance Spitznerがhoneypotsのリストへ転送した。Spitznerは2003年7月17日の記事「Honeytokens: The Other Honeypot」（SecurityFocus）で、この考えを広めた。

- **2004年：Yuillほか「Honeyfiles」**
  Jim Yuill、Mike Zappe、Dorothy Denning、Fred Feerが、ファイルサーバーに置いた餌のファイル（honeyfile）に触れると警報を出す仕組みを、IEEE Information Assurance Workshopで発表した。例としてpasswords.txtのような名前を挙げている。

- **2005年：Potemkin Virtual Honeyfarm**
  カリフォルニア大学サンディエゴ校（UCSD）のVrableほかが、SOSP 2005で発表した大規模なハニーファーム。少数の物理サーバーで、64,000を超えるインターネットのハニーポットを模擬した。数十万のIPアドレスにも広げられる、という見通しを示している。

- **2009年：デコイ文書（Bowenほか）**
  コロンビア大学のBowen、Hershkop、Keromytis、Stolfoが、偽の認証情報と開封時のビーコンを入れたデコイ文書で、内部の攻撃者を検知する仕組み（D3）をSecureComm 2009で発表した。偽の認証情報が使われるか、文書に埋めたビーコンが開封を知らせると警報が出る。作成者に結びついた固有の語の並びをメタデータやコメントに埋め、持ち出しをSnortのシグネチャーで検知する方法も示している。

- **2013年：Honeywords（Juels・Rivest）**
  Ari JuelsとRonald Rivestが、本物のパスワードに偽のパスワード（honeywords）を混ぜて保存し、別のサーバー（honeychecker）がどれが本物かを覚えておく方法を、ACM CCS 2013で提案した。偽のパスワードでログインが試みられたら、パスワードのファイルが漏れたとわかる。

- **2015年：Canarytokens**
  Thinkstが、Black Hat USA 2015の講演「Bring Back the Honeypots」とともに公開した無料のサービス。URL・DNS・AWSの鍵・Word文書など、さまざまな種類のトークンを、置くだけで使える形で提供している。

---

## 位置づけの要点

- 戦時の文書欺瞞は誘引の原型であり、1980年代の監査・侵入検知の研究は検知の土台にあたる
- StollとCheswickの記録は、偽の文書や偽のpasswdで侵入者の行動を確かめた初期の例である
- DTK・Honeynet Project・Honeyd・Potemkinで、ハニーポットの実装と規模が広がった
- 2003年のハニートークン、2004年のハニーファイル、2009年のデコイ文書で、データそのものを罠にする考え方が整理された。2015年以降はCanarytokensで、実務で手軽に使えるようになった

---

## 体系の中での位置づけ

- MITRE D3FEND：欺瞞（Deceive）の戦術に、D3-DF Decoy File・D3-DUC Decoy User Credential・D3-DST Decoy Session Tokenなどがある。D3-DFは、ATT&CKのT1083（File and Directory Discovery）・T1552.001（Credentials In Files）などと対応づけられている
- MITRE Engage：EAC0005 Lures（攻撃者に特定の行動を取らせる餌）と、EAC0011 Pocket Litter（特定の行動を促すのではなく、環境のもっともらしさを支えるために置く文書・履歴などのデータ）がある
- MITRE ATT&CK：攻撃者がファイルを探す技術として、T1083 File and Directory Discovery、T1552.001 Credentials In Filesなどがある

---

## 参考文献

- [Imperial War Museums「The War On Paper: Operation Mincemeat」](https://www.iwm.org.uk/history/second-world-war/intelligence/the-war-on-paper-operation-mincemeat)
- [NBS, FIPS PUB 39, Glossary for Computer Systems Security (1976)](https://nvlpubs.nist.gov/nistpubs/Legacy/FIPS/fipspub39.pdf)
- [J. P. Anderson, Computer Security Threat Monitoring and Surveillance (1980)](https://csrc.nist.gov/csrc/media/publications/conference-paper/1998/10/08/proceedings-of-the-21st-nissc-1998/documents/early-cs-papers/ande80.pdf)
- [D. E. Denning, An Intrusion-Detection Model, IEEE TSE SE-13(2), 1987](https://doi.org/10.1109/TSE.1987.232894)
- [C. Stoll, Stalking the Wily Hacker, CACM 31(5), 1988](https://doi.org/10.1145/42411.42412)
- [B. Cheswick, An Evening with Berferd (1992)](https://www.cheswick.com/ches/papers/berferd.pdf)
- [F. Cohen, A Note on the Role of Deception in Information Protection, Computers & Security 17(6), 1998](http://all.net/journal/deception/deception.html)
- [The Honeynet Project](https://www.honeynet.org/about/)
- [LaBrea](https://labrea.sourceforge.io/Intro-History.html)
- [Honeyd（2002年の公式ページ）](https://web.archive.org/web/20020603151055id_/http://www.citi.umich.edu:80/u/provos/honeyd/)
- [L. Spitzner, Honeypots: Tracking Hackers, Addison-Wesley, 2002](https://www.informit.com/store/honeypots-tracking-hackers-9780321108951)
- [A. Paes de Barrosの投稿（2003-02-21）](https://seclists.org/honeypots/2003/q1/128)
- [L. Spitzner, Honeytokens: The Other Honeypot (2003)](https://web.archive.org/web/20040211083829id_/http://www.securityfocus.com/infocus/1713)
- [J. Yuill et al., Honeyfiles: Deceptive Files for Intrusion Detection, IEEE IAW 2004](https://doi.org/10.1109/IAW.2004.1437806)
- [M. Vrable et al., Scalability, Fidelity, and Containment in the Potemkin Virtual Honeyfarm, SOSP 2005](https://cseweb.ucsd.edu/~savage/papers/Sosp05.pdf)
- [B. M. Bowen et al., Baiting Inside Attackers Using Decoy Documents, SecureComm 2009](https://doi.org/10.1007/978-3-642-05284-2_4)
- [A. Juels, R. L. Rivest, Honeywords: Making Password-Cracking Detectable, ACM CCS 2013](https://people.csail.mit.edu/rivest/pubs/JR13.pdf)
- [Thinkst, Canarytokens.org - Quick, Free, Detection for the Masses (2015)](https://blog.thinkst.com/2015/09/canarytokensorg-quick-free-detection.html)
- [MITRE D3FEND Decoy File](https://d3fend.mitre.org/technique/d3f:DecoyFile/)
- [MITRE Engage Lures](https://engage.mitre.org/matrix/?activity=lures)
- [MITRE ATT&CK T1083](https://attack.mitre.org/techniques/T1083/)
