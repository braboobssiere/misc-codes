from pathlib import Path
import sys

if len(sys.argv) < 2:
    raise SystemExit("Drag a PHP file onto this script, or run: python modify.py path/to/file.php")

source = Path(sys.argv[1])
if not source.is_file():
    raise SystemExit(f"File not found: {source}")

text = source.read_text(encoding="utf-8")

replacements = [
    (
        """        $body = [
            'longUrl' => $link,
        ];""",
        """        $exp = strtotime('+3 month');

        $body = [
            'url' => $link,
            'expiration' => $exp,
        ];""",
    ),
    (
        "'X-Api-Key: ' . $shlink_api_key . \"\\r\\n\",",
        "'Authorization: Bearer ' . $shlink_api_key . \"\\r\\n\",",
    ),
    (
        "return $data['shortUrl'] ?? null;",
        "return $data['shortLink'] ?? null;",
    ),
    (
    " * ShlinkProxy",
    " * sinkProxy",
    ),
]

updated = text
for old, new in replacements:
    count = updated.count(old)
    if count != 1:
        raise SystemExit(
            f"Expected each original snippet exactly once; found one {count} times. No output written."
        )
    updated = updated.replace(old, new, 1)

output = source.with_name(f"mod_{source.name}")
output.write_text(updated, encoding="utf-8")

print(f"Updated file written to: {output}")
