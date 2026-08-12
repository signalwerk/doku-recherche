#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 input.pdf output.pdf" >&2
  exit 2
fi

if ! command -v mutool >/dev/null 2>&1; then
  echo "mutool is required (MuPDF 1.26 or newer)." >&2
  exit 1
fi

input_path=$1
output_path=$2
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
temporary_dir=$(mktemp -d)
trap 'rm -rf "$temporary_dir"' EXIT HUP INT TERM

mutool run \
  "$script_dir/set-pdf-trim-box.js" \
  "$temporary_dir/trimmed.pdf" \
  "$input_path"

mutool clean \
  -gggg \
  -z \
  -f \
  -i \
  -c \
  -s \
  -t \
  --color-image-subsample-method bicubic \
  --color-image-subsample-dpi 180,144 \
  --color-image-recompress-method jpeg:85 \
  --gray-image-subsample-method bicubic \
  --gray-image-subsample-dpi 180,144 \
  --gray-image-recompress-method jpeg:85 \
  "$temporary_dir/trimmed.pdf" \
  "$output_path"

echo "Optimized PDF written to $output_path"
