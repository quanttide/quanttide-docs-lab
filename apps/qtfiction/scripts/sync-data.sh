#!/usr/bin/env bash
# 从 quanttide-founder 的 assets/fiction 同步小说正文到 data/series/
# 用法：在 quanttide-founder 仓库根目录运行
#   bash apps/qtfiction/scripts/sync-data.sh
# 或在 qtfiction 内指定 fiction 源路径：
#   SRC=/path/to/assets/fiction bash scripts/sync-data.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 默认 fiction 源：同仓库父级的 assets/fiction；可用 SRC 覆盖
SRC="${SRC:-$REPO_ROOT/assets/fiction}"
DST="${SCRIPT_DIR}/../data/series"

if [ ! -d "$SRC" ]; then
  echo "fiction 数据源不存在: $SRC" >&2
  echo "请先初始化 quanttide-fiction-of-founder，或用 SRC=/path 指定" >&2
  exit 1
fi

rm -rf "$DST"
mkdir -p "$DST"

for key in 职场言情 校园言情 重生言情; do
  dir="$SRC/$key"
  out="$DST/$key"
  mkdir -p "$out"
  # 优先收录 4_改稿（成稿），其次 3_初稿
  for stage in 4_改稿 3_初稿; do
    if [ -d "$dir/$stage" ]; then
      for f in "$dir/$stage"/*.md; do
        base=$(basename "$f")
        [ "$base" = "README.md" ] && continue
        if [ ! -f "$out/$base" ]; then
          cp "$f" "$out/$base"
        fi
      done
    fi
  done
done

echo "已同步到 $DST:"
for d in "$DST"/*/; do
  echo "  $(basename "$d"): $(ls "$d" | wc -l) 篇"
done
