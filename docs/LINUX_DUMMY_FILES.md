# Linuxで指定サイズのダミーファイルを作成する方法

指定したサイズのダミーデータ（テスト用ファイル）を生成するには、以下の方法があります。

## `dd`コマンド
低レベルにバイト単位でファイルを作成できます。

```bash
# 1MBのダミーファイル（ゼロ埋め）
dd if=/dev/zero of=dummy.bin bs=1M count=1

# 100KBのダミーファイル（ゼロ埋め）
dd if=/dev/zero of=dummy.bin bs=1K count=100
```

- `if=/dev/zero` : 中身をゼロで埋める
- `bs=1M` : ブロックサイズ（例：1MB）
- `count=1` : ブロック数（合計サイズ = bs × count）

ランダムデータが欲しい場合は、`if=/dev/urandom`を使用します。

```bash
# 1MBのランダムデータファイル
dd if=/dev/urandom of=dummy-rand.bin bs=1M count=1
```

## `fallocate`コマンド

高速に「指定サイズ分の領域」を確保します。実際の書き込みは行わないので非常に速いです。

```bash
# 5MBのダミーファイル
fallocate -l 5M dummy.dat
```

## `truncate`コマンド

ファイルの論理サイズを指定できます。内容は未定義（読み出すとゼロになることが多い）。

```bash
# 5MBのダミーファイル
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
- 高速にサイズだけ確保したい → `fallocate` または `truncate`