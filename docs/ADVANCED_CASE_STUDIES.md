# 高度なケーススタディ：パスワードファイルによる時間稼ぎ戦術

[English](en/ADVANCED_CASE_STUDIES.md) · 日本語

> **狙い**
>
> 脆弱そうなアカウント（例：`backup`、`dbmaint`、`legacy-admin`）を本物らしく見せる一方で、
> 実際には極端に解きにくいハッシュを置き、オフラインの総当たりに時間を浪費させる。

偽のパスワードファイルで攻撃者の時間を使わせる考え方は古く、Fred CohenのDeception ToolKit（1998年）も、偽のパスワードファイルを解読させて時間と手間を浪費させる例を挙げています（年表は[HISTORY.md](HISTORY.md)）。

## 安全設計の原則

- 本物の認証経路と分ける：実際の`/etc/passwd`・`/etc/shadow`は変更しない。代わりに、バックアップのように見えるデコイ（例：`/var/backups/shadow-2025-08-01.gz`）を作る
- 本物らしさ：ユーザー名・UID/GID・ホーム・シェル・更新日・期限などを、互いに矛盾しない値にする
- ハッシュの選び方：計算に時間とメモリーがかかる方式（yescrypt）か、回数を大きくしたSHA-512-crypt（sha512crypt）を使う。ハッシュの材料は、誰も知らない長くてランダムなパスワードにする（誰も知らないので、ログインには使えない）。パスワードのエントロピーの目安は[Token Entropy Estimator](https://ipusiron.github.io/token-entropy-estimator/)で測れる
- 行動観測の仕込み：デコイに一意のカナリア識別子（コメント・ファイル名・ユーザー名のパターン）を入れ、アクセスや再配布を追跡しやすくする。本ツールのトークンは、この識別子として使える

## デコイ生成例（バックアップのように見えるファイル）

> 実際に使っている`shadow`は、一切変更しない。以下は、デコイを`/var/backups/`に作る例である。

1. **強いハッシュを用意する**

   使える方式は、環境のlibcryptによって違います。先に`mkpasswd -m help`で一覧を確かめます（`mkpasswd`はDebian系ではwhoisパッケージに入っている）。

   - yescrypt（対応している環境なら推奨）
     ```bash
     HASH1=$(mkpasswd -m yescrypt 'SUPER-LONG-RANDOM-PASSWORD-AT-LEAST-64-CHARS')
     ```
   - SHA-512-crypt（互換性が広いが、メモリーを多く使う方式ではない）。`-R`で回数を指定する
     ```bash
     HASH2=$(mkpasswd -m sha512crypt -R 1000000 'ANOTHER-LONG-RANDOM-PASSWORD-AT-LEAST-64-CHARS')
     ```
   - `openssl passwd -6`も同じ形式（`$6$`）を作れるが、回数を指定するオプションがなく、既定の5000回になる。crypt(5)は5000回を、現代のハードウェアには少なすぎるとしている
   - Argon2idの`$argon2id$…`は、多くのLinuxのcrypt(5)（libxcrypt）が扱わない形式である。shadowの行に入れると、かえって不自然になる

2. **`shadow`風の行を組み立てる**

   形式：`login:hash:lastchg:min:max:warn:inactive:expire:reserved`
   ```text
   backupsvc:$y$j9T$...verylonghash...:19876:0:99999:7:::
   dbmaint:$6$rounds=1000000$SALT$...sha512crypthash...:19810:0:99999:7:::
   ```
   - `lastchg`は1970年1月1日からの日数（例：`echo $(( $(date +%s) / 86400 ))`）
   - 日付や有効期限は、本物らしい値にする

3. **バックアップのように見えるファイルを作る**

   ハッシュには`$`が入るので、シェルの変数のまま`printf`に渡し、`sudo tee`で書き込みます（`sudo sh -c '…$HASH1…'`の形では、変数が中のシェルに渡らず空になる）。
   ```bash
   printf '%s\n' \
     "backupsvc:${HASH1}:19876:0:99999:7:::" \
     "dbmaint:${HASH2}:19810:0:99999:7:::" \
     | sudo tee /var/backups/shadow-2025-08-01 > /dev/null
   sudo gzip -n /var/backups/shadow-2025-08-01
   sudo chown root:root /var/backups/shadow-2025-08-01.gz
   sudo chmod 0644 /var/backups/shadow-2025-08-01.gz
   ```
   - 本物の`shadow`は、一般のユーザーが読めてはならないファイルである（shadow(5)）。このデコイはわざと0644にして、設定を誤って読めるようになったバックアップに見せかける

4. **アクセスを監査する（例：auditd）**
   ```bash
   # 一時的なルール（永続化は /etc/audit/rules.d/ に書く）
   sudo auditctl -a always,exit -F arch=b64 -F path=/var/backups/shadow-2025-08-01.gz -F perm=r -k canary_shadow

   # 確かめる
   sudo ausearch -k canary_shadow -i
   ```
   - `-w パス -p r`の書き方は互換のためのもので、auditctl(8)では性能の理由で非推奨とされている
   - 既定で`-a never,task`のルールが入っている環境では、どのルールも効かない。`auditctl -l`で確かめる
   - SIEMやEDRと連携し、アラートから封じ込めまでの手順を訓練しておく

> **注意**
>
> 実際の`/etc/passwd`・`/etc/shadow`を編集して、本当にログインできる裏口を誤って作らないこと。
> デコイは本番の認証経路から完全に切り離し、読み取りの監査だけに使う。

## 参考

- [mkpasswd(1)](https://manpages.debian.org/trixie/whois/mkpasswd.1.en.html)
- [crypt(5)（libxcrypt）](https://manpages.debian.org/trixie/libcrypt-dev/crypt.5.en.html)
- [shadow(5)](https://man7.org/linux/man-pages/man5/shadow.5.html)
- [auditctl(8)](https://man7.org/linux/man-pages/man8/auditctl.8.html)
- [ausearch(8)](https://man7.org/linux/man-pages/man8/ausearch.8.html)
- [Deception ToolKit](http://all.net/dtk/)
