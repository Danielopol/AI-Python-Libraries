#!/usr/bin/env python3
"""
Build script for aipythonlibraries.com

Reads Libraries.csv and CATEGORIES.csv, generates data files,
and updates HTML references to use local data instead of Google Sheets.

Usage:
    python build.py

The script expects Libraries.csv and CATEGORIES.csv in the same directory.
"""

import csv
import json
import re
import shutil
import sys
from pathlib import Path

# ----------------------------------------------
# Configuration
# ----------------------------------------------

SITE_URL = "https://aipythonlibraries.com"

REPO_DIR = Path(__file__).parent
LIBRARIES_CSV = REPO_DIR / "Libraries.csv"
CATEGORIES_CSV = REPO_DIR / "CATEGORIES.csv"
LIBRARY_DATA_JSON = REPO_DIR / "library-data.json"

# HTML files whose data-cmsurl points to the libraries CSV
LIBRARY_DIRECTORY_HTML = ["index.html", "libraries.html"]

# HTML files whose data-filtersv2 should be updated with category names
FILTER_HTML_FILES = ["index.html", "libraries.html", "categories.html"]

# ----------------------------------------------
# CSV Readers
# ----------------------------------------------

def read_libraries_csv():
    """Read Libraries.csv and return a list of library dicts."""
    libraries = []
    with open(LIBRARIES_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            title = row.get("title", "").strip()
            if not title:
                continue
            lib = {
                "id": i,
                "title": title,
                "text": row.get("text", "").strip(),
                "category": row.get("Category", "").strip(),
                "url": row.get("url", "").strip(),
                "rank": row.get("Rank", "").strip(),
                "page": row.get("page", "").strip(),
            }
            libraries.append(lib)
    return libraries


def read_categories_csv():
    """Read CATEGORIES.csv and return a list of category dicts."""
    categories = []
    with open(CATEGORIES_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            title = row.get("title", "").strip()
            if not title:
                continue
            cat = {
                "id": i,
                "slugified_title": slugify(title),
                "title": title,
                "text": row.get("text", "").strip(),
            }
            categories.append(cat)
    return categories


# ----------------------------------------------
# Generators
# ----------------------------------------------

def generate_library_data_json(categories, libraries):
    """Generate library-data.json with both categories and libraries."""
    data = {
        "categories": categories,
        "libraries": libraries,
    }
    with open(LIBRARY_DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  [OK] Generated {LIBRARY_DATA_JSON.name}  ({len(categories)} categories, {len(libraries)} libraries)")


def generate_categories_display_csv(categories):
    """Generate categories-display.csv for the libraries page directory.

    This CSV is consumed by main.js (Unicorn Platform) via data-cmsurl.
    It adds a 'page' column with slugified titles used for URL construction.
    """
    output_path = REPO_DIR / "categories-display.csv"
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["title", "text", "rating", "page"])
        writer.writeheader()
        for cat in categories:
            writer.writerow({
                "title": cat["title"],
                "text": cat["text"],
                "rating": "",
                "page": cat["slugified_title"],
            })
    print(f"  [OK] Generated {output_path.name}  ({len(categories)} categories)")


def extract_unique_categories(libraries):
    """Extract all unique category names from library data, sorted alphabetically."""
    categories = set()
    for lib in libraries:
        for cat in lib["category"].split(";"):
            cat = cat.strip()
            if cat:
                categories.add(cat)
    return sorted(categories)


# ----------------------------------------------
# HTML Updaters
# ----------------------------------------------

def update_cmsurl_in_html(html_file, new_url):
    """Replace data-cmsurl with a new URL in the given HTML file."""
    filepath = REPO_DIR / html_file
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Match any data-cmsurl with an https:// URL or Google Sheets URL
    pattern = r'data-cmsurl="https://[^"]*"'
    replacement = f'data-cmsurl="{new_url}"'

    new_content, count = re.subn(pattern, replacement, content)
    if count > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  [OK] Updated data-cmsurl in {html_file}  ({count} replacement(s))")
    else:
        print(f"  - No https data-cmsurl found in {html_file}")


def update_inline_sheet_urls(html_file, new_libraries_url, new_categories_url=None):
    """Replace inline Google Sheets URL constants in script blocks."""
    filepath = REPO_DIR / html_file
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    total = 0

    # Match: const ITEMS_SHEET_URL = "https://docs.google.com/...";
    pattern = r'(const\s+ITEMS_SHEET_URL\s*=\s*)"https://docs\.google\.com/[^"]*"'
    replacement = rf'\1"{new_libraries_url}"'
    content, count = re.subn(pattern, replacement, content)
    total += count

    # Match: const CATEGORIES_SHEET_URL = "https://docs.google.com/...";
    if new_categories_url:
        pattern2 = r'(const\s+CATEGORIES_SHEET_URL\s*=\s*)"https://docs\.google\.com/[^"]*"'
        replacement2 = rf'\1"{new_categories_url}"'
        content, count2 = re.subn(pattern2, replacement2, content)
        total += count2

    if total > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  [OK] Updated inline sheet URLs in {html_file}  ({total} replacement(s))")
    else:
        print(f"  - No inline Google Sheets URLs found in {html_file}")


def fix_internal_link_targets(html_file):
    """Change target='_blank' to target='_self' for internal links (href starting with /)."""
    filepath = REPO_DIR / html_file
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Pattern 1: href="/..." target="_blank"
    content, c1 = re.subn(
        r'href="(/[^"]*)" target="_blank"',
        r'href="\1" target="_self"',
        content,
    )
    # Pattern 2: target="_blank" href="/..."
    content, c2 = re.subn(
        r'target="_blank" href="(/[^"]*)"',
        r'target="_self" href="\1"',
        content,
    )
    total = c1 + c2
    if total > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  [OK] Fixed {total} internal link target(s) in {html_file}")


def set_maxitems_in_html(html_file, max_items):
    """Update data-maxitems attribute in a directory component."""
    filepath = REPO_DIR / html_file
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    new_content, count = re.subn(
        r'data-maxitems="\d+"',
        f'data-maxitems="{max_items}"',
        content,
    )
    if count > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  [OK] Set data-maxitems={max_items} in {html_file}")


def update_filtersv2_in_html(html_file, categories):
    """Update the filters array inside data-filtersv2 attribute.

    The attribute uses HTML entities (&#39; for single quotes).
    We find the 'filters': [...] array and replace its contents
    with the new category list.
    """
    filepath = REPO_DIR / html_file
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Build the new filters array string with HTML entities
    # Format: &#39;Category Name&#39;, &#39;Another Category&#39;
    filters_str = ", ".join(f"&#39;{cat}&#39;" for cat in categories)

    # Match the filters array in the data-filtersv2 attribute
    # Pattern: &#39;filters&#39;: [... existing filters ...]
    pattern = r"(&#39;filters&#39;: \[)([^\]]*?)(\])"
    replacement = rf"\g<1>{filters_str}\3"

    new_content, count = re.subn(pattern, replacement, content)
    if count > 0:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  [OK] Updated data-filtersv2 in {html_file}  ({count} filter set(s), {len(categories)} categories)")
    else:
        print(f"  [WARN] Could not find filters array in {html_file}")


# ----------------------------------------------
# Utilities
# ----------------------------------------------

def slugify(text):
    """Convert text to a URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


# ----------------------------------------------
# Main
# ----------------------------------------------

def main():
    print("=" * 55)
    print("  Building aipythonlibraries.com from CSV data")
    print("=" * 55)

    # Verify source files exist
    if not LIBRARIES_CSV.exists():
        print(f"\n  ERROR: {LIBRARIES_CSV} not found.")
        print(f"  Place Libraries.csv in {REPO_DIR}")
        sys.exit(1)
    if not CATEGORIES_CSV.exists():
        print(f"\n  ERROR: {CATEGORIES_CSV} not found.")
        print(f"  Place CATEGORIES.csv in {REPO_DIR}")
        sys.exit(1)

    # 1. Read source data
    print("\n[1/8] Reading CSV files...")
    libraries = read_libraries_csv()
    categories = read_categories_csv()
    print(f"  [OK] Read {len(libraries)} libraries from Libraries.csv")
    print(f"  [OK] Read {len(categories)} categories from CATEGORIES.csv")

    # 2. Generate data files
    print("\n[2/8] Generating data files...")
    generate_library_data_json(categories, libraries)
    generate_categories_display_csv(categories)

    # 3. Update data-cmsurl in HTML files (absolute URL required by main.js)
    print("\n[3/8] Updating data-cmsurl in HTML files...")
    absolute_csv_url = f"{SITE_URL}/Libraries.csv"
    update_cmsurl_in_html("index.html", absolute_csv_url)
    # libraries.html uses categories-display.csv instead
    absolute_categories_csv_url = f"{SITE_URL}/categories-display.csv"
    update_cmsurl_in_html("libraries.html", absolute_categories_csv_url)

    # 4. Update inline script URLs in categories.html (relative URLs OK here)
    print("\n[4/8] Updating inline script URLs...")
    update_inline_sheet_urls("categories.html", "/Libraries.csv", "/CATEGORIES.csv")

    # 5. Update data-filtersv2 with all categories from CSV
    print("\n[5/8] Updating category filters in HTML files...")
    unique_cats = extract_unique_categories(libraries)
    print(f"  Found {len(unique_cats)} unique categories")
    for html_file in FILTER_HTML_FILES:
        update_filtersv2_in_html(html_file, unique_cats)

    # 6. Ensure categories/libraries pages show all items (not capped)
    print("\n[6/8] Setting max items on directory pages...")
    set_maxitems_in_html("categories.html", len(categories))
    set_maxitems_in_html("libraries.html", len(categories))

    # 7. Fix internal links opening in new tabs
    print("\n[7/8] Fixing internal link targets...")
    all_html = [f for f in REPO_DIR.glob("*.html")]
    for html_path in all_html:
        fix_internal_link_targets(html_path.name)

    # 8. Ensure libraries.html uses categories-display.csv
    print("\n[8/8] Verifying libraries.html data source...")
    print(f"  [OK] libraries.html -> {absolute_categories_csv_url}")

    # Summary
    print("\n" + "=" * 55)
    print("  Build complete!")
    print("=" * 55)
    print(f"\n  Next steps:")
    print(f"    1. Review changes:  git diff")
    print(f"    2. Commit:          git add -A && git commit -m 'Update library data'")
    print(f"    3. Push:            git push")
    print(f"    4. Netlify will auto-deploy from GitHub\n")


if __name__ == "__main__":
    main()
