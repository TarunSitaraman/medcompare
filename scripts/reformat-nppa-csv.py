"""Reformat the extracted NPPA CSV into headers the ingest script understands."""
import csv
import re

IN_PATH  = r"C:\Users\Tarun\Documents\MedCompare\data\nppa-price-list.csv"
OUT_PATH = r"C:\Users\Tarun\Documents\MedCompare\data\nppa-formatted.csv"


def extract_strength(text):
    m = re.search(
        r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b"
        r"(?:\s*[+/]\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b)*",
        text, re.IGNORECASE,
    )
    return m.group(0).strip() if m else ""


FORM_TOKENS = [
    "tablet", "tablets", "capsule", "capsules", "syrup", "suspension",
    "injection", "inj", "cream", "ointment", "gel", "drops", "drop",
    "inhaler", "respules", "lotion", "solution", "powder", "kit", "vial",
    "suppository", "suppositories", "enema", "patch", "spray", "infusion",
]

def extract_form(text):
    lower = text.lower()
    for token in FORM_TOKENS:
        if re.search(rf"\b{re.escape(token)}\b", lower):
            return token.capitalize()
    return ""


def main():
    rows_in = []
    with open(IN_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows_in = list(reader)

    out_headers = [
        "medicine name",   # → brand_name (full label: salt + form + strength)
        "salt name",       # → salt_name  (pure generic name)
        "form",            # → dosage form
        "strength",        # → dose strength
        "pack size",       # → unit (e.g. "1 Tablet")
        "ceiling price",   # → nppa_ceiling
    ]

    with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=out_headers)
        writer.writeheader()
        for row in rows_in:
            salt      = row["medicine_name"].strip()
            dosage    = row["dosage_form_strength"].strip()
            unit      = row["unit"].strip()
            price     = row["ceiling_price"].strip()

            form      = extract_form(dosage)
            strength  = extract_strength(dosage)
            # Full label used as brand_name so form/strength are in slug
            medicine_label = f"{salt} {dosage}".strip()

            writer.writerow({
                "medicine name": medicine_label,
                "salt name":     salt,
                "form":          form,
                "strength":      strength,
                "pack size":     unit,
                "ceiling price": price,
            })

    print(f"Written {len(rows_in)} rows to {OUT_PATH}")

    # Show sample
    with open(OUT_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= 5:
                break
            print(row)


if __name__ == "__main__":
    main()
