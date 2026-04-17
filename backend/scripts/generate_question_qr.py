import pathlib
import re
import sys

import qrcode


def safe_filename_part(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_")
    return normalized or "location"


def main() -> int:
    if len(sys.argv) != 5:
      print("Usage: generate_question_qr.py <output_dir> <round> <place> <payload>", file=sys.stderr)
      return 1

    output_dir = pathlib.Path(sys.argv[1])
    round_number = int(sys.argv[2])
    place = sys.argv[3]
    payload = sys.argv[4]

    output_dir.mkdir(parents=True, exist_ok=True)

    # Keep only one QR file per round to avoid stale images when place names change.
    for existing in output_dir.glob(f"round_{round_number:02d}_*.png"):
        existing.unlink()

    file_name = f"round_{round_number:02d}_{safe_filename_part(place)}.png"
    output_path = output_dir / file_name

    img = qrcode.make(payload)
    img.save(output_path)

    print(str(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
