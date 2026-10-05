# Linuxで指定サイズのダミーファイルを作成する方法

[English](en/LINUX_DUMMY_FILES.md) · 日本語

指定したサイズのダミーデータ（テスト用ファイル）を生成するには、以下の方法があります。サイズの`K`・`M`は、GNUのdd・coreutils・util-linuxでは1024の累乗（KiB・MiB）です。

## `dd`コマンド
低レベルにバイト単位でファイルを作成できます。

```bash
# 1MiBのダミーファイル（ゼロ埋め）
dd if=/dev/zero of=dummy.bin bs=1M count=1

# 100KiBのダミーファイル（ゼロ埋め）
dd if=/dev/zero of=dummy.bin bs=1K count=100
```

- `if=/dev/zero`：中身をゼロで埋める
- `bs=1M`：ブロックサイズ（例：1MiB）
- `count=1`：ブロック数（合計サイズ＝bs×count）

ランダムデータが欲しい場合は、`if=/dev/urandom`を使用します。

```bash
# 1MiBのランダムデータファイル
dd if=/dev/urandom of=dummy-rand.bin bs=1M count=1
```

## `fallocate`コマンド

ディスクの領域を先に確保します。対応しているファイルシステムでは、ブロックを確保して「未初期化」の印を付けるだけで、データを書き込まないので、ゼロで埋めて作るよりずっと速く終わります（fallocate(1)）。

```bash
# 5MiBのダミーファイル
fallocate -l 5M dummy.dat
```

## `truncate`コマンド

ファイルの大きさを指定した値にします。元より大きくした部分は穴（スパース）になり、読むとゼロのバイトとして返ります（truncate(1)）。ディスクの領域は確保されないことが多く、見かけの大きさと実際の使用量が違います（`du`で確かめられる）。

```bash
# 5MiBのダミーファイル
truncate -s 5M dummy.dat
```

## head + /dev/urandom

小さいサイズのランダムファイルを作りたいときに便利です。

```bash
# 256バイトのランダムファイル
head -c 256 /dev/urandom > dummy.bin
```

## まとめ

- ゼロ埋めで正確なサイズが欲しい → `dd if=/dev/zero`
- ランダム内容で欲しい → `dd if=/dev/urandom`
- 高速にサイズだけ確保したい → `fallocate`（領域も確保する）または`truncate`（穴のあるファイルになる）
