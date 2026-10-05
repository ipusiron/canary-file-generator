# Creating dummy files of a given size on Linux

English · [日本語](../LINUX_DUMMY_FILES.md)

There are several ways to create dummy data (test files) of a given size. In GNU dd, coreutils and util-linux, the size suffixes `K` and `M` are powers of 1024 (KiB and MiB).

## `dd`
Creates a file at a low level, byte by byte.

```bash
# 1 MiB dummy file (zero-filled)
dd if=/dev/zero of=dummy.bin bs=1M count=1

# 100 KiB dummy file (zero-filled)
dd if=/dev/zero of=dummy.bin bs=1K count=100
```

- `if=/dev/zero`: fill the content with zeros
- `bs=1M`: block size (for example, 1 MiB)
- `count=1`: number of blocks (total size = bs x count)

For random data, use `if=/dev/urandom`.

```bash
# 1 MiB file of random data
dd if=/dev/urandom of=dummy-rand.bin bs=1M count=1
```

## `fallocate`

Preallocates disk space. On file systems that support it, blocks are allocated and marked as uninitialized without writing any data, so it finishes much faster than filling a file with zeros (fallocate(1)).

```bash
# 5 MiB dummy file
fallocate -l 5M dummy.dat
```

## `truncate`

Sets a file to the given size. The part that is extended becomes a hole (sparse) and reads as zero bytes (truncate(1)). Disk space is often not allocated, so the apparent size and the actual usage differ (you can check with `du`).

```bash
# 5 MiB dummy file
truncate -s 5M dummy.dat
```

## head + /dev/urandom

Handy for small random files.

```bash
# 256-byte random file
head -c 256 /dev/urandom > dummy.bin
```

## Summary

- Exact size, filled with zeros → `dd if=/dev/zero`
- Random content → `dd if=/dev/urandom`
- Just reserve the size quickly → `fallocate` (also allocates the space) or `truncate` (creates a file with a hole)
