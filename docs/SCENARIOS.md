# 実戦シナリオ：カナリアファイル・ハニーファイルの使いどころ

[English](en/SCENARIOS.md) · 日本語

カナリアファイル・ハニーファイルを、どこに・何を置き・どう検知するかを、場面ごとにまとめました。本ツールは教育用で、ここに書いた検知の仕組み（監査ログ・EDR・クラウドのログなど）は、別に用意する必要があります。

---

## 1. ハニーポット・ハニーネット

- 誘引ファイル：`password.txt`、`confidential.docx`、`backup_keys.zip`のように、攻撃者が開きたくなる名前
- 配置：共有フォルダー、ユーザーのデスクトップ、Webサーバーの`/backup/`ディレクトリーなど目立つ場所
- 検知：ファイルの読み取りの監査（Linuxのauditd、WindowsのSACLとイベント4663）、定期的なハッシュ値の確認（書き換えの検知）。Sysmonには、ファイルの読み取りのイベントはない
- 得られるもの：攻撃者の手口（TTP）、侵入経路、攻撃のタイミング

## 2. マルウェア解析・動的解析

- サンドボックスの配置：仮想環境の中に本物らしいディレクトリー構造を作り、カナリアファイルを置く
- 行動の観察：マルウェアが、どのファイル名やパスを探すかを観察する
- わかること：暗号化する対象の選び方、持ち出すデータの優先順位
- 応用：新しいマルウェアファミリーの挙動の分析、YARAルールの作成

## 3. ランサムウェアの早期検出

- 配置場所：各ドライブの直下（`C:\`、`D:\`）、重要なフォルダー（ドキュメント・ピクチャ）
- カナリアフォルダー：フォルダーに複数のカナリアファイルを置き、まとめて暗号化されたことを検知する
- 自動対応：ファイルの書き換えを検知したら、すぐにネットワークから切り離す・プロセスを止める
- EDRとの連携：一部のEDR（Elastic Defend、Check Point Harmony Endpoint、Huntressなど）は、ランサムウェアの検知用にカナリアファイルを自動で置き、書き換えを検知する

## 4. サーバー・インフラへの侵入検知

- SSH：`.ssh/id_rsa`、`.ssh/authorized_keys.bak`、`.ssh/config.backup`
- 設定ファイル：`/etc/passwd.old`、`/etc/shadow.backup`、`.env.production`
- データベース：`database_backup.sql`、`users_export.csv`、`config.ini.bak`
- Web：`.htpasswd`、`web.config.backup`、`database.php.old`
- 監視するもの：読み取り・コピー・移動・内容の変更・権限の変更

## 5. 内部不正・特権の乱用の検知

- 役員の情報：`executives_contact.xlsx`、`board_meeting_notes.docx`
- 人事の情報：`salary_data.xlsx`、`employee_evaluation.pdf`
- 財務の情報：`financial_forecast.xlsx`、`audit_report.pdf`
- 技術の情報：`source_code_backup.zip`、`api_documentation.pdf`
- 検知：通常の業務では開く必要のないファイルへのアクセスを検知する

## 6. クラウド環境

- AWSの鍵：権限を持たないIAMユーザーの本物の鍵を`.aws/credentials`などに置き、使われたことをCloudTrailで知る（GitGuardianのggcanary、SpaceSirenなど）。形式だけ本物らしい無効な鍵は、使われても自分のアカウントのログには何も残らない
- Docker：環境変数に偽のAPIキーを入れた`docker-compose.yml`
- Kubernetes：ConfigMap・Secretに偽のデータ
- 検知：CloudTrail、VPC Flow Logs、GuardDutyとの連携

## 7. エンドポイント・デスクトップ

- ユーザーのフォルダー：各ユーザーのドキュメント・デスクトップに、重要そうなファイルを置く
- USBなどの外部媒体：リムーバブルメディア経由で広がったことを検知する
- メールの添付：偽の機密文書を添付で配り、どこで開かれたかを追う
- プリンター：ネットワークプリンターの共有フォルダーにカナリアファイルを置く

## 8. ネットワーク共有・ファイルサーバー

- 共有フォルダー：部門別の共有フォルダー（`\\server\HR\`、`\\server\Finance\`）
- アーカイブ：古いプロジェクトやバックアップを置いている場所
- テンプレート：文書のテンプレートのフォルダーに紛れ込ませる
- 検知：SMBのログ、ファイルサーバーの監査ログ

## 9. DevOps・開発環境

- Gitリポジトリー：`.env.production`、`secrets.yaml`、`database.config`
- CI/CD：ビルドスクリプトの中に偽の認証情報
- コンテナレジストリー：Dockerイメージに偽の設定を入れる
- 検知：Gitのアクセスログ、コンテナレジストリーのログ
- 注意：本物の形式の鍵を公開リポジトリーに置くと、GitHubのsecret scanningで発行元に通知されることがある

## 10. CTF・演習・教育

- 競技：偽のフラグで誤った方向へ導く、時間を稼ぐ
- レッドチームの演習：攻撃チームの手口の分析、防御チームの対応力の評価
- 社内の訓練：セキュリティ意識を高めるための「釣り」のファイル
- 学習の効果：攻撃者の視点の理解、検知の方法の実践

---

## 参考

- [Elastic Defendの詳細設定（ransomware canary）](https://www.elastic.co/docs/reference/security/defend-advanced-settings)
- [Check Point Harmony EndpointのAnti-Ransomware](https://sc1.checkpoint.com/documents/R81.10/SmartEndpoint_OLH/EN/Topics-EPSG-R81.10/Anti-Ransomware-Files.htm)
- [Huntress「Ransomware Canaries」](https://www.huntress.com/blog/huntress-service-ransomware-canaries)
- [GitGuardian ggcanary](https://github.com/GitGuardian/ggcanary)
- [SpaceSiren](https://github.com/spacesiren/spacesiren)
- [Microsoft Learn「4663(S): An attempt was made to access an object」](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4663)
- [auditctl(8)](https://man7.org/linux/man-pages/man8/auditctl.8.html)
- [Canarytokensのドキュメント](https://docs.canarytokens.org/)
