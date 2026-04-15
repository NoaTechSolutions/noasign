#!/usr/bin/env bash
# Export all NTSsign documentation to PDF.
#
# Requirements:
#   npm install -g md-to-pdf
#
# Usage:
#   bash docs/export-pdf.sh
#
# Output: docs/pdf/ (mirrors the source folder structure)

set -euo pipefail

DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PDF_DIR="$DOCS_DIR/pdf"

# Verify md-to-pdf is installed
if ! command -v md-to-pdf &>/dev/null; then
  echo "ERROR: md-to-pdf is not installed."
  echo "Run: npm install -g md-to-pdf"
  exit 1
fi

echo "Exporting documentation to PDF..."
echo "Source : $DOCS_DIR"
echo "Output : $PDF_DIR"
echo ""

converted=0
failed=0

# Find all .md files except README files at the root level (index, not content)
while IFS= read -r -d '' md_file; do
  # Compute relative path from docs dir
  rel_path="${md_file#$DOCS_DIR/}"

  # Output path mirrors folder structure under pdf/
  pdf_file="$PDF_DIR/${rel_path%.md}.pdf"
  pdf_dir="$(dirname "$pdf_file")"

  mkdir -p "$pdf_dir"

  echo -n "  $rel_path → pdf/${rel_path%.md}.pdf ... "

  if md-to-pdf "$md_file" --dest "$pdf_dir" &>/dev/null; then
    echo "OK"
    ((converted++))
  else
    echo "FAILED"
    ((failed++))
  fi

done < <(find "$DOCS_DIR" -name "*.md" -not -path "$DOCS_DIR/pdf/*" -print0 | sort -z)

echo ""
echo "Done. Converted: $converted | Failed: $failed"
echo "PDF files are in: $PDF_DIR"
