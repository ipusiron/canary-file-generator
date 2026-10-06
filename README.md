<!--
---
id: day054
slug: canary-file-generator

title: "Canary File Generator"

subtitle_ja: "教育用カナリア／ハニーファイル生成ツール"
subtitle_en: "Educational Canary/Honey File Generator"

description_ja: "教育用のカナリアファイル・ハニーファイルを生成し、ファイルごとに一意のハニートークンを書き込んで台帳に記録するツール。開封の擬似通知で、トークンからどのファイルが開かれたかを突き止める流れを体験できる。ネットワークへは何も送らない。"
description_en: "Generates educational canary files and honey files, writes a unique honeytoken into each one and records it in a ledger. Simulated alerts show how a token tells you which file was opened. Nothing is sent over the network."

category_ja:
  - 欺瞞技術
  - 侵入検知
  - ハニーポット
category_en:
  - Deception Technology
  - Intrusion Detection
  - Honeypot

difficulty: 4

tags:
  - canary
  - honeyfile
  - honeytoken
  - deception
  - intrusion-detection
  - security-awareness

repo_url: "https://github.com/ipusiron/canary-file-generator"
demo_url: "https://ipusiron.github.io/canary-file-generator/"

hub: true
---
-->

# Canary File Generator - 教育用カナリア／ハニーファイル生成ツール

[English](README.en.md) · 日本語

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/canary-file-generator?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/canary-file-generator?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/canary-file-generator)
![GitHub license](https://img.shields.io/github/license/ipusiron/canary-file-generator)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/canary-file-generator/)

**Day054 - 生成AIで作るセキュリティツール100**

Canary File Generatorは、攻撃者の目を引く「重要そうなファイル」（カナリアファイル・ハニーファイル）を教育用に生成するツールです。ファイルごとに一意のトークン（ハニートークン）を書き込み、生成したファイルを台帳に記録します。開封の擬似通知を出すと、トークンからどのファイルが開かれたかを突き止める流れを、最初から最後までたどれます。置き場所に合わせた監視の設定例（Linuxのauditd・Windows・macOS）を出し、ログや流出したテキストを貼ればトークンと置き場所から台帳のファイルを特定します。ネットワークへは何も送りません。

---

## 🌐 デモページ

👉 **[https://ipusiron.github.io/canary-file-generator/](https://ipusiron.github.io/canary-file-generator/)**

ブラウザーで直接お試しいただけます。

---

## 📸 スクリーンショット

>![passwdのプリセットを生成した画面](assets/screenshot.png)
>
>*passwdを置き場所とメモつきで生成すると、トークンを書いた場所（冒頭の見出しと最後の行のコメント欄）を示す*

>![先頭がドットのファイル名を入れた画面](assets/screenshot2.png)
>
>*.aws/credentialsのような名前は、ブラウザーが保存のときに変える。保存される名前の目安を示す*

>![アラートタブの台帳と検知ログ（ダークモード）](assets/screenshot3.png)
>
>*生成したファイルの台帳と、経過時間で色分けした検知ログ*

>![監視の設定（Windows）](assets/screenshot4.png)
>
>*台帳の「監視の設定」で、置き場所に合わせた手順を出す（Windowsは監査ポリシーとSACL、確認はイベント4663）*

>![特定タブの結果（ダークモード）](assets/screenshot5.png)
>
>*ログや流出したテキストを貼ると、トークンと置き場所から台帳のファイルを引く*

>![座学タブの監視の例](assets/screenshot6.png)
>
>*検知に必要な監査の設定を、座学タブでまとめて確かめる*

---

## 🐤 カナリアファイルとハニートークン

カナリアファイルやハニーファイルは、正規の業務では開かれないはずの「餌」のファイルです。開かれたこと自体が、侵入や内部不正の手がかりになります。ただし、ファイルを置くだけでは何も検知できません。読み取りを記録する仕組み（監査ログやEDR）と組み合わせ、さらにファイルごとに一意の識別子（ハニートークン）を入れておくと、ログや流出したテキストの中からどのファイルが触られたかを突き止められます。

本ツールでの用語の区別は次のとおりです。

- ダミーファイル：代用品・テスト用のファイル。誘引や検知の仕掛けは持たない
- ハニーファイル：攻撃者を誘引する「餌」のファイル。検知の仕掛け（監査ログなど）を別に用意する
- カナリアファイル：触れられたら検知できるように、誘引と仕掛けを組み合わせた偽ファイル
- ハニートークン：正規の業務では使われないはずの偽データ（資格情報・鍵・文書・識別子など）。使われた時点で、漏洩や不正利用の確証になる

用語の境目は文献によって違います。Yuillほか（2004）はハニーファイルを「攻撃者が触れるとファイルサーバーが警報を出す餌のファイル」と定義し、検知の仕組みまで含めています。Spitzner（2003）はハニートークンに、資格情報だけでなく文書なども含めています。1988年のStollの囮の文書から2015年のCanarytokensまでの流れは、[docs/HISTORY.md](docs/HISTORY.md)にまとめました。

---

## ✨ 機能

### 生成

- ファイル名を入れるか、よく狙われるファイル名のプリセット（9つ）から選ぶ
- 誘引テキスト（ファイルの中身）を書く。プリセットを選ぶと、偽データの入った中身が入る。ダミーテキスト（Lorem ipsum風の英文）にも置き換えられる
- ファイルの冒頭に、教育用の見出しとメッセージを入れるかを選ぶ
- ダウンロードすると、ファイルごとに一意のトークンを書き込む。教育用の見出しを外しても、トークンは必ず入る
- ファイル名に、ブラウザーが保存のときに変える要素（先頭のドット・区切り文字・予約名など）があれば、理由と保存される名前の目安を示す
- 置く場所のパスとメモ（任意）を、トークンと一緒に台帳に記録する

### アラート（台帳と検知ログ）

- 生成したファイルを、名前・トークン・置き場所・メモ・生成日時とともに台帳に記録する
- 台帳のファイルごとに「監視の設定」を押すと、置き場所に合わせたLinux（auditd）・Windows・macOSの手順を出す。コマンドはボタンでコピーできる
- 台帳のファイルごとに「開封を擬似通知」を押すと、検知ログに1件足す。生成タブのボタンは、最後に生成したファイルに対して出す
- 検知ログは、通知からの経過時間で色分けし、区分を文字でも示す（1分ごとに更新）。擬似ログ（auditdの記録・イベント4663のXML）も出せる
- 擬似ログをまとめて特定タブへ送り、そのまま特定できる
- 台帳をJSON・CSVで書き出し、JSONを読み込む（別のブラウザーや端末へ移せる）
- 記録の削除・全消去。保存できないブラウザーでも、そのページを開いているあいだは動く

### 特定

- ログや流出したテキストを貼るか、テキストファイルを読み込むと、トークンと置き場所のパスを探して、台帳のどのファイルかを示す
- 結果は6つの区分に分け、行番号と前後の文を出す（下の「特定の結果の区分」）
- 「例を入れる」で、台帳の最後のファイルから、書き換えたトークン・auditdの擬似ログ・台帳にないトークン・途中で切れたトークンを入れた例を作る

### 座学

- 用語、ハニートークンの考え方、歴史、使われる場面、発展、監視の例（auditd・WindowsのSACLとイベント4663・macOSのeslogger）、実務で使うときの注意

### 共通

- 日本語と英語の切り替え（`?lang=ja`・`?lang=en`でも指定できる）
- ライトモードとダークモード（OSの設定に従い、手動でも切り替えられる）
- キーボードだけで操作できる（タブは矢印キー・Home・End）

---

## 📖 使い方

1. 生成タブで、プリセット（例：passwd）を押すか、ファイル名と誘引テキストを入れる
2. 誘引テキストのトークンを入れたい場所に`{{TOKEN}}`と書く（プリセットには1カ所ずつ入っている）
3. 「ダウンロード生成」を押す。トークンとその場所が、画面の下に出る
4. 「（教育用）このファイルの開封を擬似通知」を押すと、アラートタブに移って検知ログに1件足す
5. アラートタブの台帳で「監視の設定」を押し、置き場所に合わせた手順を見る
6. 検知ログの「擬似ログの形式」を選び、「擬似ログを特定タブで調べる」を押す。特定タブで、ログのどの行がどのファイルを指しているかを確かめる
7. 特定タブには、実際のログやどこかで見つかったテキストも貼れる（このページの外へは送らない）

---

## 🔬 技術的な説明

### トークン

トークンは`EDU_`＋16文字＋`_FAKE`の形です。中の16文字は、`crypto.getRandomValues`で作った10バイト（80ビット）を、CrockfordのBase32（I・L・O・Uを使わない32文字）で表したものです。`EDU_`と`_FAKE`は教育用の標識で、どのサービスの鍵の形式にも当たりません。

### トークンを書く場所

| 条件 | トークンを書く場所 |
|---|---|
| 誘引テキストに`{{TOKEN}}`がある | `{{TOKEN}}`と書いたすべての場所 |
| 誘引テキストに`{{TOKEN}}`がない | 末尾に足す「Ref: トークン」の1行 |
| 教育用の見出しを入れる | 上のどちらかに加えて、冒頭の見出しの「Token:」の行 |

`{{DATE}}`は、生成した日の日付（YYYY-MM-DD）に置き換わります。

### プリセット

| ファイル名 | トークンを書く行 |
|---|---|
| passwords.txt | `Backup Admin: backup-admin / {{TOKEN}}` |
| confidential.pdf | `Document ID: {{TOKEN}}` |
| budget.xlsx | `Budget Ref: {{TOKEN}}` |
| secrets.docx | `Report ID: {{TOKEN}}` |
| id_rsa | `Key-ID: {{TOKEN}}` |
| api_keys.txt | `{{TOKEN}}` |
| passwd | `svc_report:x:1006:1006:{{TOKEN}}:/var/lib/report:/usr/sbin/nologin` |
| .aws/credentials | `# owner: {{TOKEN}}` |
| .env | `INTERNAL_API_TOKEN={{TOKEN}}` |

api_keys.txtは「Internal Service Token:」の次の行、passwdは最後の行のコメント欄（第5欄）にトークンが入ります。

### ファイル名と保存される名前

ダウンロードは、どの名前でも`application/octet-stream`で渡します。`text/plain`で渡すと、Chromium・Edgeは拡張子のない名前に`.txt`を足すためです（passwdがpasswd.txtになる）。次の表は、Chromium・Edge・Firefoxで保存して確かめた名前です。

| 入力した名前 | 保存される名前の目安 | 画面の指摘 |
|---|---|---|
| `passwd` | `passwd` | 拡張子なし |
| `id_rsa` | `id_rsa` | 拡張子なし |
| `.env` | `env` | 先頭のドット・拡張子なし |
| `.aws/credentials` | `aws_credentials` | 区切り文字・先頭のドット・拡張子なし |
| `budget.xlsx` | `budget.xlsx` | 中身はテキスト |
| `notes.txt` | `notes.txt` | なし |

先頭のドットと、フォルダーの区切りは、ブラウザーのダウンロードでは保てません。保存したあとに、名前を戻すかフォルダーへ移します。

### 経過時間の色分け

| 通知からの経過時間 | 色 |
|---|---|
| 5分未満 | 赤（点滅。動きを減らす設定では止まる） |
| 30分未満 | 橙 |
| 60分未満 | 黄 |
| 60分以上 | 灰 |

### 特定の結果の区分

台帳に`EDU_VTPVXVR14D2PF2DB_FAKE`（置き場所は`/srv/share/passwords.txt`）があるときの例です。

| 区分 | 条件 | 例 |
|---|---|---|
| 一致 | 台帳のトークンと同じ | `EDU_VTPVXVR14D2PF2DB_FAKE` |
| 表記ゆれ | 大文字小文字・区切りの「-」・I・L・Oの書き換えだけが違う | `edu-vtpvxvrl4d2pf2db-fake` |
| 置き場所 | 台帳の置き場所のパスが現れた（Windowsのパスは大文字小文字を区別しない） | `/srv/share/passwords.txt` |
| 1文字違いの候補 | 台帳のトークンと1文字だけ違う | `EDU_VTPVXVR14D2PF2DC_FAKE` |
| 台帳にない | 形は正しいが、この台帳にない | `EDU_ZZZZZZZZZZZZZZZZ_FAKE` |
| 形が崩れている | 中身が16文字でない、または使わない文字がある | `EDU_VTPVXVR14D_FAKE` |

JSONの中のWindowsのパスのように、バックスラッシュを二重にした書き方も置き場所として拾います。調べるテキストは200万文字（2,000,000文字）まで、見つけた数が500を超えたら打ち切ります。

### 監視の設定例

| OS | 記録する仕組み | 本ツールが出す手順 |
|---|---|---|
| Linux | auditd（syscall形式のルール、読み取りで開いたとき） | `auditctl`でルールを入れ、/etc/audit/rules.d/に残して`augenrules --load`で読み込み、`ausearch -k`で確かめる |
| Windows | 「ファイルシステム」の監査とファイルのSACL | `auditpol`で監査を有効にし、PowerShellでSACLに`ReadData`を足し、`Id = 4663`のイベントを確かめる |
| macOS | eslogger（Endpoint Security） | `eslogger --list-events`でイベント名を確かめ、`eslogger open`の出力を置き場所のパスで絞る |

auditdのキーには、トークンそのもの（25文字。auditctlのキーは31バイトまで）を使います。記録にトークンが残るので、ログを特定タブに貼れば台帳のファイルを引けます。Windowsのサブカテゴリーは名前ではなくGUID（{0CCE921D-69AE-11D9-BED3-505054503030}）で指定するので、日本語版のWindowsでも同じコマンドで動きます。置き場所がそのOSのパスの形でないときは、例のパス（/srv/share/…・C:\Share\…・/Users/Shared/…）で示します。

### 擬似ログ

検知ログの擬似ログは、auditdの記録（SYSCALL・CWD・PATHの3行。x86_64のopenat）と、イベント4663のXML（AccessListは%%4416＝ReadData、AccessMaskは0x1）の形で作ります。時刻とファイルのパス以外の値（プロセス番号・ユーザー名など）は、教育用の作りものです。

---

## 🎯 ユースケース

- セキュリティの研修：誘引と検知の違い、ハニートークンで出所を突き止める流れを、生成→擬似通知→台帳→特定の順にたどらせる
- 情報システム部門の準備：ファイルサーバーの監査（WindowsのSACLとイベント4663、Linuxのauditd）を試す前に、置くファイルとトークンを用意し、台帳の「監視の設定」で置き場所に合わせた手順を確かめる
- 監査ログの読み方の練習：擬似ログ（auditdの記録・イベント4663のXML）を見て、どのフィールドにパスやキーが出るかを確かめ、特定タブで台帳と結びつける
- ランサムウェア対策の検討会：カナリアファイルを置く場所と名前の候補を、プリセットと[docs/SCENARIOS.md](docs/SCENARIOS.md)を手がかりに洗い出す（検知そのものは、EDRや監査の設定が要る）
- 情報漏洩の調査の練習：トークン入りの文書をいくつか作って台帳に残し、流出したテキストを特定タブに貼って、どの文書から出たかを突き止める。大文字小文字や区切りが書き換えられたトークン、1文字だけ違うトークンも見分ける
- 台帳の受け渡し：作った台帳をJSONで書き出し、監視の担当者のブラウザーで読み込む（CSVは一覧表として配る）
- CTF・謎解きの出題：偽のフラグや、回り道をさせるファイル（偽のpasswd・id_rsa）をトークン付きで作り、どのファイルが使われたかを見分ける
- 脱出ゲーム・TRPG・映像の小道具：「機密ファイル」らしい見た目の文書を、偽物の標識を付けたまま作る
- 授業（情報・情報セキュリティ）：`/etc/passwd`の形式、ファイル名と拡張子とMIMEの関係、ブラウザーが保存のときに名前を変える理由を、実際に保存して確かめる
- 開発・テスト：シークレットの検出ツールやDLPのルールが、標識付きの偽データをどう扱うかを確かめるテストデータに使う
- 自宅・小さな事務所：NASや共有フォルダーに目を引く名前のファイルを置き、NASのアクセスログなどで開かれた形跡を確かめる目印にする（記録はNASの側の機能が要る）
- 研究・調べもの：Canarytokens、MITRE D3FENDのDecoy File、MITRE EngageのLuresの説明を、本ツールのトークンと台帳に当てはめて読む
- 他のツールとの組み合わせ：[Token Entropy Estimator](https://ipusiron.github.io/token-entropy-estimator/)（Day048）で、トークンの文字の種類と長さからランダムな部分のビット数を測る

作者は、本ツールを悪用することを勧めません。

---

## 🏢 実務で使うとき

本ツールが作るファイルは、GitHubのsecret scanningなどの誤検出を避けるため、偽物であることを明示しています。実際のハニーファイル・カナリアファイルとして使うときは、生成したファイルを下書きにして、次の点を調整します。

1. 標識を外す：`EXAMPLE_`・`DUMMY_`・`[EDUCATIONAL ONLY]`などを削る（トークンは残し、台帳と対応させる）
2. 環境に合わせる：組織名・部門名・サーバー名・IPアドレス・日付を、置く場所に合わせる
3. 技術的に整える：ファイルの権限（例：SSHの秘密鍵は600、passwdは644）、作成日時、置くディレクトリー
4. 監視と通知を設定する：ファイルの読み取りの監査（auditd、SACLとイベント4663）、SIEMへの転送、通知の流れ

本物の形式の鍵（AWS・GitHub・Stripeなど）を公開の場所に置くと、secret scanningで発行元に通知されることがあります。クラウドの鍵のハニートークンは、権限のない本物の鍵を使い、クラウドの監査ログで使用を知るのが一般的な方法です（[docs/SCENARIOS.md](docs/SCENARIOS.md)の「6. クラウド環境」）。

---

## 🔒 セキュリティ

- Content Security Policy（metaタグ）：`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`。インラインのスクリプト・スタイルを許さず、外部への通信もしない
- ファイルはブラウザーの中で組み立て、BlobのURLでダウンロードする。入力した内容はどこにも送らない
- トークンは`crypto.getRandomValues`で作る（`Math.random`を使わない）
- 台帳と検知ログはlocalStorage（`cfg_canaries`・`cfg_alerts`）に保存する。読み込むときは型を確かめ、形の合わない記録は捨てて件数を知らせる
- 特定タブのテキストや読み込むファイルは、ブラウザーの中だけで読む（`connect-src 'none'`）
- 台帳のJSONの読み込みも、同じ型の検証を通す。CSVの書き出しでは、`=`・`+`・`-`・`@`などで始まる値の先頭に`'`を付け、表計算ソフトが式として解釈しないようにする（CSV Injectionの対策）
- 画面の組み立てはDOM（`textContent`）で行い、`innerHTML`を使わない。保存した記録を書き換えられても、スクリプトとして動かない
- 入力欄はスペルチェックを切っている
- `<meta name="referrer" content="no-referrer">`、外部リンクは`rel="noopener noreferrer"`

---

## ⚠️ 注意と限界

- 本ツールは検知をしない。開封の通知は、画面の上の擬似的なものである。実際の検知には、監査ログやEDRなどの仕組みが要る
- 監視の設定例のコマンドは、man・Microsoft Learn・MS-GPACなどの一次資料で書き方を確かめたが、実機で監査の記録が出るところまでは確かめていない。設定は管理者の権限で、組織の手順に沿って行う
- 擬似ログの値は作りものである。実際の記録のフィールドは、カーネルやauditd、Windowsの版で違うことがある
- 特定は、テキストの中の文字列を探すだけである。圧縮された.docx・.xlsx・.pdfのようなファイルの中身は、テキストに取り出してから貼る
- コピーのボタンは、ブラウザーがクリップボードへの書き込みを許さないと失敗する（そのときはコマンドを選択してコピーする）
- ファイルの中身はプレーンテキストである。.pdf・.docx・.xlsxとして開くアプリでは、壊れたファイルとして扱われる
- 先頭のドット・区切り文字・Windowsの予約名・ショートカットの拡張子は、ブラウザーが保存のときに変える
- 台帳と検知ログは、このブラウザーにだけ保存する（それぞれ200件まで。超えたら古いものから消える）。ほかのブラウザーや端末とは共有されない
- 経過時間の色分けは、この端末の時計で決まる
- プリセットの偽データには、AWSのドキュメントに載っている例の鍵（AKIAIOSFODNN7EXAMPLE）を含む。そのほかの鍵は、形式を崩した偽物である
- Safariでは動作を確かめていない

---

## 📚 ドキュメント

- [docs/HISTORY.md](docs/HISTORY.md)：カナリアファイル・ハニーファイル・ハニートークンの年表と参考文献
- [docs/SCENARIOS.md](docs/SCENARIOS.md)：場面ごとの置き場所と検知の方法（10の場面）
- [docs/ADVANCED_CASE_STUDIES.md](docs/ADVANCED_CASE_STUDIES.md)：パスワードファイルによる時間稼ぎ（shadow風のデコイと監査）
- [docs/ADVANCED_DECEPTION.md](docs/ADVANCED_DECEPTION.md)：実運用での欺瞞技術と、設計のチェックリスト
- [docs/LINUX_DUMMY_FILES.md](docs/LINUX_DUMMY_FILES.md)：Linuxで指定サイズのダミーファイルを作る方法

英語版は[docs/en/](docs/en/)にあります。

---

## 🧪 テスト

```bash
npm test
```

- Node.js 22以上の`node --test`で動き、依存パッケージはない（`npm install`は不要）
- GitHub Actionsで、pushとpull requestのたびに実行する
- `test/core.test.js`：トークンの既知解答と重複のなさ、本文の組み立て（トークンを書く場所）、ダミーテキストの改行、ファイル名の検査と保存される名前、色分けのしきい値、保存した記録の検証
- `test/presets.test.js`：プリセットの制御文字・バックスラッシュ・トークンの位置・passwdの欄の数・本物の形式の鍵がないこと
- `test/find.test.js`：特定の6つの区分、行番号と前後の文、Windowsのパスの大文字小文字と二重のバックスラッシュ、上限と200万文字での速さ、台帳のJSONの往復と読み込みの検証、CSVの引用とCSV Injectionの対策
- `test/monitor.test.js`：パスの形の見分け、例のパス、auditd・Windows・macOSの手順、シェルとPowerShellの引用、擬似ログの形、擬似ログを特定に通すと台帳のファイルに戻ること
- `test/html.test.js`・`test/contrast.test.js`・`test/messages.test.js`・`test/i18n.test.js`・`test/format.test.js`：CSP、タブのARIA、辞書と画面の文言、配色のコントラスト（4.5:1・3:1）、書式
- `test/readme.test.js`：READMEの表（トークンを書く場所・プリセット・保存される名前・色分け・特定の結果の区分・監視の設定例）を計算部と突き合わせ、日英のREADMEの見出し・画像・ディレクトリー構造を確かめる

---

## 🔗 参考

- [Canarytokensのドキュメント（Thinkst）](https://docs.canarytokens.org/)
- [J. Yuill et al., Honeyfiles: Deceptive Files for Intrusion Detection（IEEE IAW 2004）](https://doi.org/10.1109/IAW.2004.1437806)
- [L. Spitzner, Honeytokens: The Other Honeypot（2003）](https://web.archive.org/web/20040211083829id_/http://www.securityfocus.com/infocus/1713)
- [B. M. Bowen et al., Baiting Inside Attackers Using Decoy Documents（SecureComm 2009）](https://doi.org/10.1007/978-3-642-05284-2_4)
- [MITRE D3FEND Decoy File](https://d3fend.mitre.org/technique/d3f:DecoyFile/)
- [MITRE Engage Lures](https://engage.mitre.org/matrix/?activity=lures)
- [Microsoft Learn「4663(S): An attempt was made to access an object」](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4663)
- [auditctl(8)](https://man7.org/linux/man-pages/man8/auditctl.8.html)
- [augenrules(8)](https://man7.org/linux/man-pages/man8/augenrules.8.html)
- [MS-GPAC「Subcategory and SubcategoryGUID」](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-gpac/77878370-0712-47cd-997d-b07053429f6d)
- [SUSE「Understanding the audit logs」](https://documentation.suse.com/sles/15-SP6/html/SLES-all/cha-audit-comp.html)
- [OWASP「CSV Injection」](https://owasp.org/www-community/attacks/CSV_Injection)

---

## 📁 ディレクトリー構造

```text
canary-file-generator/
├── .github/                       # GitHubの設定
│   ├── SECURITY.md                # セキュリティポリシー（偽の認証情報についての説明）
│   └── workflows/                 # GitHub Actionsのワークフロー
│       └── test.yml               # pushとpull requestでnpm testを実行
├── assets/                        # README用の画像
│   ├── en/                        # 英語の画面のスクリーンショット
│   │   ├── screenshot.png         # 生成タブ（英語）
│   │   ├── screenshot2.png        # ファイル名の指摘（英語）
│   │   ├── screenshot3.png        # アラートタブ（英語・ダーク）
│   │   ├── screenshot4.png        # 監視の設定（英語）
│   │   ├── screenshot5.png        # 特定タブ（英語・ダーク）
│   │   └── screenshot6.png        # 座学タブ（英語）
│   ├── screenshot.png             # 生成タブ
│   ├── screenshot2.png            # ファイル名の指摘
│   ├── screenshot3.png            # アラートタブ（ダーク）
│   ├── screenshot4.png            # 監視の設定
│   ├── screenshot5.png            # 特定タブ（ダーク）
│   └── screenshot6.png            # 座学タブ
├── docs/                          # 詳しい解説
│   ├── en/                        # 英語版の解説
│   │   ├── ADVANCED_CASE_STUDIES.md # 時間稼ぎのケーススタディ（英語）
│   │   ├── ADVANCED_DECEPTION.md  # 実運用での欺瞞技術（英語）
│   │   ├── HISTORY.md             # 年表（英語）
│   │   ├── LINUX_DUMMY_FILES.md   # ダミーファイルの作り方（英語）
│   │   └── SCENARIOS.md           # 実戦シナリオ（英語）
│   ├── ADVANCED_CASE_STUDIES.md   # パスワードファイルによる時間稼ぎ
│   ├── ADVANCED_DECEPTION.md      # 実運用での欺瞞技術
│   ├── HISTORY.md                 # 年表と参考文献
│   ├── LINUX_DUMMY_FILES.md       # Linuxで指定サイズのダミーファイルを作る方法
│   └── SCENARIOS.md               # 実戦シナリオ（10の場面）
├── js/                            # 画面が読むスクリプト
│   ├── canary-core.js             # 計算部（トークン・本文・ファイル名の検査・記録の検証）
│   ├── formats.js                 # Word・Excel・PDF・ZIPを組み立てる
│   ├── i18n.js                    # 言語の選択と、HTMLの文言の差し替え
│   ├── messages.js                # 日本語・英語の文言
│   ├── monitor.js                 # 監視の設定例（auditd・Windows・macOS）と擬似ログ
│   ├── presets.js                 # プリセット（ファイル名と偽データ）
│   ├── theme-init.js              # 描画の前に保存したテーマを当てる
│   └── theme.js                   # ライト・ダークの切り替え
├── test/                          # 自動テスト（node --test）
│   ├── contrast.test.js           # 配色のコントラストと操作要素の大きさ
│   ├── core.test.js               # 計算部
│   ├── find.test.js               # 特定（トークンと置き場所）と台帳の書き出し・読み込み
│   ├── format.test.js             # 行の長さ・改行・制御文字
│   ├── formats.test.js            # ZIP・Word・Excel・PDFの組み立て
│   ├── html.test.js               # CSP・タブのARIA・文言とHTMLの一致
│   ├── i18n.test.js               # 言語の決め方
│   ├── load.js                    # 画面と同じスクリプトをテストに読み込む
│   ├── messages.test.js           # 日英の辞書
│   ├── monitor.test.js            # 監視の設定例と擬似ログ
│   ├── presets.test.js            # プリセット
│   └── readme.test.js             # READMEの表・見出し・画像・ディレクトリー構造
├── .gitignore                     # Gitの管理から外すファイル
├── .nojekyll                      # GitHub PagesでJekyllを使わない
├── CLAUDE.md                      # 開発のための説明（Claude Code用）
├── LICENSE                        # MITライセンス
├── README.en.md                   # 英語のREADME
├── README.md                      # このファイル
├── index.html                     # 画面
├── package.json                   # npm testの定義（依存パッケージなし）
├── script.js                      # 画面の処理
└── style.css                      # スタイル（ライト・ダーク）
```

---

## 💻 動作環境

- 最近のブラウザー（Chromium・Edge・Firefoxで動作を確かめている。Safariは未確認）
- `index.html`をブラウザーで直接開いても動く。ローカルのHTTPサーバーで開く場合は、次のとおり

```bash
python -m http.server 8000
# http://localhost:8000/ を開く
```

---

## 📄 ライセンス

- ソースコードのライセンスは`LICENSE`ファイル（MIT）を参照してください。
- 外部のライブラリーは使っていません。

---

## 🛠️ このツールについて

本ツールは、「生成AIで作るセキュリティツール100」プロジェクトの一環として開発されました。
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
