# 高度なケーススタディ：パスワードファイルによる時間稼ぎ戦術

> **狙い**：  
> "脆弱そう" なアカウント（例：`backup`、`dbmaint`、`legacy-admin`）を **それっぽく見せる** 一方、  
> 実際には **極端に解きにくいハッシュ** を置き、**オフライン総当たりの時間を浪費** させる。

## 安全設計の原則
- **本物の認証経路と隔離**：  
  実際の `/etc/passwd`・`/etc/shadow` は改変しない。→ **"バックアップ風" デコイ**（例：`/var/backups/shadow-2025-08-01.gz`）を作る。
- **リアリティ**：  
  ユーザー名・UID/GID・HOME・SHELL・更新日・期限など **整合したメタデータ** を付与。
- **ハッシュ選定**：  
  メモリハードな KDF（**yescrypt** / **Argon2id**）や十分に強化した **SHA-512-crypt** を使用。  
  さらに **長大・高エントロピーなパスワード** を材料にハッシュを生成（そのPWは誰も知らない＝実利用不可）。  
  参考：トークンやパスワードのエントロピー測定には [Token Entropy Estimator](https://ipusiron.github.io/token-entropy-estimator/) が有用。
- **行動観測の仕込み**：  
  デコイに **一意なカナリア識別子**（コメント、ファイル名、ユーザー名パターン）を入れ、**アクセス・再配布の追跡**を容易にする。

## デコイ生成例（安全な"バックアップ風"ファイル）
> 実運用の `shadow` を **一切変更しない**。以下は **デコイ** を `/var/backups/` に作る例。

1. **強いハッシュを用意**  
   - **yescrypt（推奨・環境対応要）**：
     ```bash
     # 要: mkpasswd（whois パッケージ等）と yescrypt 対応
     mkpasswd -m yescrypt 'SUPER-LONG-RANDOM-PASSWORD-AT-LEAST-64-CHARS'
     ```
   - **Argon2id（対応環境のみ）**：
     ```bash
     # 要: argon2 CLI（出力を /etc/shadow 形式に整形）
     echo -n 'SUPER-LONG-RANDOM-PASSWORD-AT-LEAST-64-CHARS' \
       | argon2 somesalt -id -t 5 -m 19 -p 1
     # 生成された $argon2id$... 形式を使用
     ```
   - **SHA-512-crypt（互換性が広いが非メモリハード）**：
     ```bash
     openssl passwd -6 -salt "$(openssl rand -hex 16)" \
       'SUPER-LONG-RANDOM-PASSWORD-AT-LEAST-64-CHARS'
     ```

2. **`shadow` 風データ行を組み立てる**  
   形式：`login:hash:lastchg:min:max:warn:inactive:expire:reserved`
   ```text
   backupsvc:$y$j9T$...verylonghash...:19876:0:99999:7:::
   dbmaint:$6$SALT$...sha512crypthash...:19810:0:99999:7:::
   ```
   - `lastchg` は通日（`date +%s`/86400）で算出。  
   - 日付・有効期限は妥当な値を設定してリアルさを保つ。

3. **"バックアップ風" ファイルを作成**
   ```bash
   sudo install -D -m 0644 /dev/null /var/backups/shadow-2025-08-01
   sudo sh -c 'printf "%s\n" \
     "backupsvc:$HASH1:19876:0:99999:7:::" \
     "dbmaint:$HASH2:19810:0:99999:7:::" \
     >> /var/backups/shadow-2025-08-01'
   sudo gzip -n /var/backups/shadow-2025-08-01
   sudo chown root:root /var/backups/shadow-2025-08-01.gz
   sudo chmod 0644 /var/backups/shadow-2025-08-01.gz
   ```

4. **アクセス監査（例：auditd）**  
   ```bash
   # 一時的（永続化は /etc/audit/rules.d/ へ）
   sudo auditctl -w /var/backups/shadow-2025-08-01.gz -p r -k canary_shadow

   # 確認
   sudo ausearch -k canary_shadow -i
   ```
   - SIEM/EDR と連携し、**アラート → 封じ込め手順** をドリル化。

> **注意**：  
> 実 `/etc/passwd` `/etc/shadow` を編集して **誤って"本当にログイン可能なバックドア"** を作らないこと。  
> デコイは **本番認証経路から完全分離**、**読み取り監査のみ** を想定。