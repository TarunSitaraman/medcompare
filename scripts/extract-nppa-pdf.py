"""Extract NPPA price list from PDF and write to CSV."""
import csv
import re
import sys
import pdfplumber

PDF_PATH = r"C:\Users\Tarun\Documents\MedCompare\data\nppa-price-list.pdf"
OUT_PATH = r"C:\Users\Tarun\Documents\MedCompare\data\nppa-price-list.csv"

HEADER = ["sl_no", "medicine_name", "dosage_form_strength", "unit", "ceiling_price", "so_number", "so_date"]


def clean(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", value.strip())


def parse_price(raw):
    """Return the most recent ceiling price from the cell.

    The cell may look like:
      "21.42\nPrice revised to\nRs.17.74/-\nvide S.O.2027(E)\ndated 06.05.2025"
    In that case we want 17.74 (the revised price).
    Otherwise just parse the first decimal number.
    """
    if not raw:
        return ""
    # Check for revised price pattern: "revised to Rs.XX.XX/-"
    revised = re.search(r"revised\s+to\s+Rs\.?\s*([\d,]+\.?\d*)", raw, re.IGNORECASE)
    if revised:
        return revised.group(1).replace(",", "")
    # Fallback: first decimal-looking number
    match = re.search(r"([\d,]+\.\d+)", raw)
    if match:
        return match.group(1).replace(",", "")
    return ""


def extract_rows():
    rows = []
    with pdfplumber.open(PDF_PATH) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            if (i + 1) % 100 == 0:
                print(f"  Processing page {i+1}/{total}...", flush=True)
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row or len(row) < 5:
                        continue
                    sl = clean(row[0])
                    # Skip header rows
                    if not sl or sl in ("Sl. No", "(1)", "Sl.No"):
                        continue
                    # Must look like a row number (digit or digit+dot)
                    if not re.match(r"^\d+\.?$", sl):
                        continue

                    medicine = clean(row[1]) if len(row) > 1 else ""
                    dosage   = clean(row[2]) if len(row) > 2 else ""
                    unit     = clean(row[3]) if len(row) > 3 else ""
                    price_raw = row[4] if len(row) > 4 else ""
                    price    = parse_price(price_raw)
                    so_num   = clean(row[5]) if len(row) > 5 else ""
                    so_date  = clean(row[6]) if len(row) > 6 else ""

                    if not medicine:
                        continue

                    rows.append([sl.rstrip("."), medicine, dosage, unit, price, so_num, so_date])
    return rows


def main():
    print(f"Extracting from {PDF_PATH} ...")
    rows = extract_rows()
    print(f"Extracted {len(rows)} medicine rows")

    with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(HEADER)
        writer.writerows(rows)

    print(f"Saved to {OUT_PATH}")
    print("\nSample (first 5 rows):")
    for r in rows[:5]:
        print(r)


if __name__ == "__main__":
    main()
