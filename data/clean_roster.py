# Panini FWC 2026 Roster Cleanup
# Cleans and standardizes the Panini FWC 2026 roster CSV, validates the header and row structure, 
# removes repeated headers and blank lines, normalizes Sticker IDs and club names, verifies sticker groups, 
# field requirements, DOB, positions, duplicates, sorting, and reports a final summary.
#
# Cleanup and validation process is carried out through the following functions:
# - clean_row(): Cleans whitespace in all fields, removes spaces from Sticker IDs, and adds required apostrophes 
#   to specific country codes.
# - clean_club_names(): Standardizes club names using CLUB_CHANGES.
# - check_missing_stickers(): Verifies that all expected Sticker IDs are present.
# - check_positions(): Verifies valid Position values for Player and Coca-Cola Star stickers.
# - check_duplicates_and_country_codes(): Checks duplicate Sticker IDs, expected sticker group codes, unexpected codes, 
#   and invalid Sticker ID formats.
# - sort_roster_rows(): Sorts roster rows according to the expected sticker group and Sticker ID order.
# - check_row_structure(): Verifies that every roster row contains exactly the expected number of columns.
# - check_field_requirements(): Verifies populated and blank fields according to each sticker type.
# - check_and_remove_repeated_headers(): Validates the CSV header and removes repeated header rows found inside the data.
# - check_dob(): Verifies that DOB is non-empty and formatted as YYYY-MM-DD for Player and Coca-Cola Star stickers,
#   and empty for all other sticker types.
# - show_changes(): Displays all cleanup changes made to the roster.
# - show_summary(): Displays the final cleanup and validation summary.
# - main(): Runs the complete cleanup, validation, sorting, output, and reporting process.

import csv
import re
from pathlib import Path

INPUT_FILE_NAME = "panini_fwc2026_roster.csv"
OUTPUT_FILE_NAME = "panini_fwc2026_roster_clean.csv"

BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / INPUT_FILE_NAME
OUTPUT_FILE = BASE_DIR / OUTPUT_FILE_NAME

# Expected CSV column organization
COLUMNS = ["Sticker ID", "Type", "Name/Description", "Country/Category", "Club", "Position", "DOB"]
# Expected header for the CSV file, which should match the COLUMNS list exactly.
EXPECTED_HEADER = COLUMNS

# Country codes that require a leading apostrophe to prevent spreadsheet applications
# from interpreting the Sticker ID as a date or other value.
# For example: MAR -> 'MAR
COUNTRY_CODES_TO_ADJUST = ["MAR"]

# Sticker ranges expected in the roster: (A,B) means from sticker A to sticker B inclusive.
EXPECTED_STICKERS = { "FWC": (0, 19), "COUNTRY": (1, 20), "CC": (1, 12), }

# Allowed values for the Position column
VALID_POSITIONS = {"Goalkeeper", "Defender", "Midfielder", "Forward"}

# Country codes expected in the roster, including FWC, country codes, and Coca-Cola stickers.
# Country codes are in th expected order (Album order).
EXPECTED_CODES = [
    "FWC", "MEX", "RSA", "KOR", "CZE", "CAN", "BIH", "QAT", "SUI",
    "BRA", "MAR", "HAI", "SCO", "USA", "PAR", "AUS", "TUR", "GER",
    "CUW", "CIV", "ECU", "NED", "JPN", "SWE", "TUN", "BEL", "EGY",
    "IRN", "NZL", "ESP", "CPV", "KSA", "URU", "FRA", "SEN", "IRQ",
    "NOR", "ARG", "ALG", "AUT", "JOR", "POR", "COD", "UZB", "COL",
    "ENG", "CRO", "GHA", "PAN", "CC",
]

# Dictionary for club name normalization
CLUB_CHANGES = {
# General club normalization (in alphabetical order)
"A.E.K. Athens": "AEK Athens",
"Alkmaar City FC": "AZ Alkmaar",
"Arsenal": "Arsenal FC",
"Atlas": "Atlas FC",
"Auxerre": "AJ Auxerre",
"Barcelona": "FC Barcelona",
"Basel": "FC Basel",
"Bastia": "SC Bastia",
"Bologna": "Bologna FC",
"Bologna FC 1909": "Bologna FC",
"Braga": "SC Braga",
"Como": "Como 1907",
"FC Köln": "1. FC Köln",
"Genoa": "Genoa CFC",
"Girona": "Girona FC",
"Guadalajara": "Chivas Guadalajara",
"Hamburg": "Hamburger SV",
"Hearts": "Heart of Midlothian",
"Hoffenheim": "TSG Hoffenheim",
"Junior": "Junior FC",
"Lens": "RC Lens",
"Lille": "LOSC Lille",
"Liverpool": "Liverpool FC",
"Lorient": "FC Lorient",
"Lyon": "Olympique Lyonnais",
"Madrid": "Real Madrid",
"Mainz 05": "1. FSV Mainz 05",
"Mallorca": "RCD Mallorca",
"Marseille": "Olympique Marseille",
"Metz": "FC Metz",
"Milan": "Inter Milan",
"Monterrey": "CF Monterrey",
"Montpellier": "Montpellier HSC",
"Neom": "NEOM SC",
"Nice": "OGC Nice",
"Parma": "Parma Calcio",
"Red Star Belgrade": "Crvena zvezda",
"Rennes": "Stade Rennais",
"Roma": "AS Roma",
"Saprissa": "Deportivo Saprissa",
"Selangor": "Selangor FC",
"Stade Rennes FC": "Stade Rennais",
"Toluca": "Toluca FC",
"Torino": "Torino FC",
"Universidad Católica": "Universidad Católica (Chile)",
"Universitario": "Universitario de Deportes",
"Viking": "Viking FK",
"Wolfsburg": "VfL Wolfsburg",

# Arabic club normalization (in alphabetical order)
"Al Ahly": "Al Ahly SC",
"Al Ain": "Al-Ain",
"Al Arabi": "Al-Arabi",
"Al Duhail": "Al-Duhail",
"Al Ettifaq": "Al-Ettifaq",
"Al-Faisaly": "Al-Faisaly SC",
"Al Gharafa": "Al-Gharafa",
"Al Hazem": "Al-Hazem",
"Al Hilal": "Al-Hilal",
"Al-Hussein": "Al-Hussein SC",
"Al Ittihad": "Al-Ittihad",
"Al Khaleej": "Al-Khaleej",
"Al Kholood": "Al-Kholood",
"Al Nassr": "Al-Nassr",
"Al Qadsiah": "Al-Qadsiah",
"Al Riyadh": "Al-Riyadh",
"Al Shabab": "Al-Shabab",
"Al Taawoun": "Al-Taawoun",
"Al Wakrah": "Al-Wakrah",
"Al Wehda": "Al-Wehda",

# Already hyphenated / alternate spellings (in alphabetical order)
"Al-Ahli": "Al-Ahli Saudi FC",
"Al-Jazira": "Al Jazira",
"Al Jazira Club": "Al Jazira",
"Neom SC": "NEOM SC",
}

# Functions for cleaning, validation and standardizing the roster data
# ====================================================================

# Function clean_row() removes whitespace from all fields, removes spaces from the Sticker ID,
# and adds a leading apostrophe to Sticker IDs for specific country codes when required.
def clean_row(row):
    """
    Cleans and standardizes a roster row.
    Removes surrounding whitespace from all fields.
    Removes spaces from the Sticker ID.
    Adds a leading apostrophe to Sticker IDs for country codes listed
    in COUNTRY_CODES_TO_ADJUST when the apostrophe is missing.
    Leaves already-clean values unchanged.
    """
    if not row:
        return row
    row = [field.strip() for field in row]
    if row:
        row[0] = row[0].replace(" ", "")
        for country_code in COUNTRY_CODES_TO_ADJUST:
            if row[0].startswith(country_code) and not row[0].startswith("'"):
                row[0] = "'" + row[0]
                break
    return row


# Function clean_club_names() standardizes the club name in column 5 using the CLUB_CHANGES dictionary.
def clean_club_names(row):
    """
    Cleans and standardizes the club name in a roster row.
    Checks the Club column at index 4.
    Removes surrounding whitespace from the club name.
    Replaces known alternate or inconsistent club names using
    the CLUB_CHANGES mapping.
    Leaves already-standardized club names unchanged.
    """
    if len(row) > 4:
        club = row[4].strip()
        if club in CLUB_CHANGES:
            row[4] = CLUB_CHANGES[club]
        else:
            row[4] = club
    return row

# Function check_missing_stickers() checks the roster for missing Sticker IDs.
def check_missing_stickers(rows):
    """
    Checks the roster for missing Sticker IDs.
    Verifies FWC stickers from FWC0 through FWC19, allowing either
    FWC1 or FWC01 formatting, country stickers from 1 through 20,
    and Coca-Cola stickers from CC1 through CC12.
    """
    sticker_ids = {row[0].lstrip("'") for row in rows if row and row[0]}
    missing_stickers = {}
    fwc_start, fwc_end = EXPECTED_STICKERS["FWC"]
    missing_fwc = []
    for number in range(fwc_start, fwc_end + 1):
        expected_id = f"FWC{number}"
        padded_id = f"FWC{number:02d}"
        if expected_id not in sticker_ids and padded_id not in sticker_ids:
            missing_fwc.append(expected_id)
    if missing_fwc:
        missing_stickers["FWC"] = missing_fwc
    country_codes = set()
    for sticker_id in sticker_ids:
        if sticker_id.startswith("CC") or sticker_id.startswith("FWC"):
            continue
        if len(sticker_id) > 3 and sticker_id[:3].isalpha() and sticker_id[3:].isdigit():
            country_codes.add(sticker_id[:3])
    country_start, country_end = EXPECTED_STICKERS["COUNTRY"]
    for country_code in sorted(country_codes):
        missing = [f"{country_code}{number}" for number in range(country_start, country_end + 1) if f"{country_code}{number}" not in sticker_ids]
        if missing:
            missing_stickers[country_code] = missing
    cc_start, cc_end = EXPECTED_STICKERS["CC"]
    missing_cc = [f"CC{number}" for number in range(cc_start, cc_end + 1) if f"CC{number}" not in sticker_ids]
    if missing_cc:
        missing_stickers["CC"] = missing_cc
    print()
    print("MISSING STICKERS")
    print("=" * 100)
    if not missing_stickers:
        print("No missing stickers. All expected Sticker IDs are present.")
        return
    for prefix, missing in missing_stickers.items():
        print(f"{prefix}: {', '.join(missing)}")

# Function check_positions() checks the Position column for Player and Coca-Cola Star rows only.
def check_positions(rows):
    """
    Checks the Position column for Player and Coca-Cola Star rows only.
    Reports any Position value that does not exactly match one of
    the allowed values in VALID_POSITIONS.
    """
    valid_types = {"Player", "Coca-Cola Star"}
    invalid_positions = []
    for row_number, row in rows:
        if len(row) <= 1 or row[1].strip() not in valid_types:
            continue
        if len(row) <= 5:
            invalid_positions.append({ "row_number": row_number, "sticker_id": row[0] if row else "", "position": "" })
            continue
        position = row[5].strip()
        if position not in VALID_POSITIONS:
            invalid_positions.append({ "row_number": row_number, "sticker_id": row[0], "position": position })
    print()
    print("POSITION CHECK")
    print("=" * 100)
    if not invalid_positions:
        print("No invalid positions. All Player and Coca-Cola Star Position values are valid.")
        return
    for item in invalid_positions:
        row_label = f"[row {item['row_number']:03d}]"
        sticker_id = f"{item['sticker_id']:<5}"
        print(f"{row_label} {sticker_id} | Invalid Position: '{item['position']}'")

# Function check_duplicates_and_country_codes() checks for duplicated Sticker IDs, verifies that all 
# expected sticker group codes are present, reports unexpected codes, and validates Sticker ID formats.
def check_duplicates_and_country_codes(rows):
    """
    Checks for duplicated Sticker IDs, verifies that all expected
    sticker group codes are present, reports unexpected codes,
    and validates Sticker ID formats.
    """
    sticker_ids = [row[0].lstrip("'").strip() for row in rows if row and row[0]]
    seen = set()
    duplicates = set()
    for sticker_id in sticker_ids:
        if sticker_id in seen:
            duplicates.add(sticker_id)
        else:
            seen.add(sticker_id)
    found_codes = set()
    invalid_ids = []
    for sticker_id in sticker_ids:
        match = re.match(r"^([A-Z]+)\d+$", sticker_id)
        if match:
            found_codes.add(match.group(1))
        else:
            invalid_ids.append(sticker_id)
    missing_codes = set(EXPECTED_CODES) - found_codes
    unexpected_codes = found_codes - set(EXPECTED_CODES)
    print()
    print("DUPLICATE AND COUNTRY CODE CHECK")
    print("=" * 100)
    if not duplicates:
        print("No duplicate Sticker IDs found.")
    else:
        print("Duplicate Sticker IDs:")
        for sticker_id in sorted(duplicates):
            print(f"{sticker_id}")
    if not missing_codes:
        print("All expected sticker group codes are present.")
    else:
        print("Missing sticker group codes:")
        for code in sorted(missing_codes):
            print(f"{code}")
    if unexpected_codes:
        print("Unexpected sticker group codes:")
        for code in sorted(unexpected_codes):
            print(f"{code}")
    if invalid_ids:
        print("Invalid Sticker ID formats:")
        for sticker_id in sorted(set(invalid_ids)):
            print(f"{sticker_id}")
    if not duplicates and not missing_codes and not unexpected_codes and not invalid_ids:
        print("Duplicate and sticker group code verification passed.")

# Function sort_roster_rows() sorts roster rows by the expected sticker group order and then by Sticker ID number within each group.
def sort_roster_rows(rows):
    """
    Sorts roster rows by the expected sticker group order and then
    by Sticker ID number within each group.

    Rows from the same country/group are kept together.
    Sticker numbers are sorted numerically rather than alphabetically.
    """
    code_order = {code: index for index, code in enumerate(EXPECTED_CODES)}

    def sort_key(item):
        row_number, row = item
        sticker_id = row[0].lstrip("'").strip() if row and row[0] else ""
        match = re.match(r"^([A-Z]+)(\d+)$", sticker_id)
        if not match:
            return (len(EXPECTED_CODES), float("inf"), row_number)
        code = match.group(1)
        number = int(match.group(2))
        return ( code_order.get(code, len(EXPECTED_CODES)), number, row_number, )
    return sorted(rows, key=sort_key)

# Function check_row_structure() checks that every roster row contains exactly the expected number of columns.
def check_row_structure(rows):
    """
    Checks that every roster row contains exactly the expected number
    of columns.
    """
    expected_columns = len(COLUMNS)
    invalid_rows = []
    for row_number, row in rows:
        if len(row) != expected_columns:
            invalid_rows.append({ "row_number": row_number, "sticker_id": row[0] if row else "", "column_count": len(row) })
    print()
    print("ROW STRUCTURE CHECK")
    print("=" * 100)
    if not invalid_rows:
        print(f"All roster rows contain exactly {expected_columns} columns.")
        return
    print(f"Expected columns per row: {expected_columns}")
    print("Rows with incorrect column counts:")
    for item in invalid_rows:
        row_label = f"[row {item['row_number']:03d}]"
        sticker_id = f"{item['sticker_id']:<5}"
        print(f"{row_label} {sticker_id} | Found {item['column_count']} columns")

def check_field_requirements(rows):
    """
    Validates populated and blank fields according to sticker type.
    Player and Coca-Cola Star require all fields.
    Badge, Photo, Intro, and History require columns 0-3 and blank columns 4-5.
    """
    rules = {"Player": ([0, 1, 2, 3, 4, 5], []), "Coca-Cola Star": ([0, 1, 2, 3, 4, 5], []), 
             "Badge": ([0, 1, 2, 3], [4, 5]), "Photo": ([0, 1, 2, 3], [4, 5]), "Intro": ([0, 1, 2, 3], [4, 5]), 
             "History": ([0, 1, 2, 3], [4, 5])}
    errors = []
    unknown_types = []
    for row_number, row in rows:
        if len(row) < len(COLUMNS):
            continue
        sticker_id, sticker_type = row[0].strip(), row[1].strip()
        if sticker_type not in rules:
            unknown_types.append((row_number, sticker_id, sticker_type))
            continue
        required, blank = rules[sticker_type]
        for index in required:
            if not row[index].strip():
                errors.append((row_number, sticker_id, sticker_type, COLUMNS[index], "Required field is blank"))
        for index in blank:
            if row[index].strip():
                errors.append((row_number, sticker_id, sticker_type, COLUMNS[index], "Field must be blank"))
    print()
    print("FIELD REQUIREMENTS CHECK")
    print("=" * 100)
    if not errors:
        print("All fields match the requirements for their sticker types.")
    else:
        print("Field requirement errors:")
        for row_number, sticker_id, sticker_type, column, problem in errors:
            print(f"[row {row_number:03d}] {sticker_id:<6} | {sticker_type} | {column} | {problem}")
    if unknown_types:
        print()
        print("Unknown sticker types:")
        for row_number, sticker_id, sticker_type in unknown_types:
            print(f"[row {row_number:03d}] {sticker_id:<6} | Unknown Type: '{sticker_type}'")


# Function check_and_remove_repeated_headers() validates the CSV header and removes any repeated header rows found inside the roster data.
def check_and_remove_repeated_headers(rows):
    """
    Validates the CSV header and removes any repeated header rows
    found inside the roster data.
    """
    if not rows:
        raise ValueError("The CSV file is empty. Expected a header row.")
    cleaned_rows = []
    removed_headers = []
    for row_number, row in rows:
        if row == EXPECTED_HEADER:
            removed_headers.append(row_number)
            continue
        cleaned_rows.append((row_number, row))
    return cleaned_rows, removed_headers

# Function check_dob() checks the DOB field according to sticker type.
def check_dob(rows):
    """
    Checks the DOB field according to sticker type.
    Player and Coca-Cola Star stickers require a non-empty DOB in YYYY-MM-DD format.
    All other sticker types require DOB to be blank.
    """
    valid_types = {"Player", "Coca-Cola Star"}
    dob_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    errors = []
    for row_number, row in rows:
        if len(row) <= 1:
            continue
        sticker_id = row[0] if row else ""
        sticker_type = row[1].strip()
        dob = row[6].strip() if len(row) > 6 else ""
        if sticker_type in valid_types:
            if not dob:
                errors.append((row_number, sticker_id, sticker_type, dob, "DOB is required"))
            elif not dob_pattern.fullmatch(dob):
                errors.append((row_number, sticker_id, sticker_type, dob, "DOB must use YYYY-MM-DD format"))
        elif dob:
            errors.append((row_number, sticker_id, sticker_type, dob, "DOB must be blank"))
    print()
    print("DOB CHECK")
    print("=" * 100)
    if not errors:
        print("All DOB values match the requirements for their sticker types.")
        return
    print("DOB errors:")
    for row_number, sticker_id, sticker_type, dob, problem in errors:
        print(f"[row {row_number:03d}] {sticker_id:<6} | {sticker_type} | DOB: '{dob}' | {problem}")

# Function check_coca_cola_star_consistency() verifies that every Coca-Cola Star matches the corresponding Player 
# in Country/Category, Club, Position, and DOB.
def check_coca_cola_star_consistency(rows):
    """
    Verifies that every Coca-Cola Star matches the corresponding Player
    using Name/Description and Country/Category.
    Country/Category, Club, Position, and DOB must match exactly.
    Returns the consistency errors for the final summary.
    """
    player_lookup = {}
    errors = []
    for row_number, row in rows:
        if len(row) != len(COLUMNS) or row[1].strip() != "Player":
            continue
        key = (row[2].strip(), row[3].strip())
        player_lookup.setdefault(key, []).append((row_number, row))
    for row_number, row in rows:
        if len(row) != len(COLUMNS) or row[1].strip() != "Coca-Cola Star":
            continue
        sticker_id = row[0].strip()
        name = row[2].strip()
        country = row[3].strip()
        key = (name, country)
        matches = player_lookup.get(key, [])
        if not matches:
            errors.append((row_number, sticker_id, name, "No corresponding Player found"))
            continue
        if len(matches) > 1:
            errors.append((row_number, sticker_id, name, "Multiple corresponding Players found"))
            continue
        player_row_number, player_row = matches[0]
        for index, column_name in [(3, "Country/Category"), (4, "Club"), (5, "Position"), (6, "DOB")]:
            cc_value = row[index].strip()
            player_value = player_row[index].strip()
            if cc_value != player_value:
                errors.append((row_number, sticker_id, name, f"{column_name} differs from Player row {player_row_number}: CC='{cc_value}' | Player='{player_value}'"))
    print()
    print("COCA-COLA STAR CONSISTENCY CHECK")
    print("=" * 100)
    if not errors:
        print("All Coca-Cola Star players match their corresponding Player records.")
    else:
        print("Coca-Cola Star consistency errors:")
        for row_number, sticker_id, name, problem in errors:
            print(f"[row {row_number:03d}] {sticker_id:<6} | {name} | {problem}")
    return errors

# Function show_summary() displays the final cleanup summary, including the number of changes made, 
# whether roster sorting was corrected, whether repeated headers were removed, and whether all validation checks passed.
def show_summary(cleaned_rows, changes, removed_headers, sorting_changed, output_created, coca_cola_errors):
    """
    Displays the final cleanup and validation summary.
    Reports cleanup changes, removed headers, sorting corrections, duplicate Sticker IDs,
    row structure errors, field requirement errors, DOB errors, position errors,
    and Coca-Cola Star consistency errors.
    """
    sticker_ids = [row[0].lstrip("'").strip() for _, row in cleaned_rows if row and row[0]]
    duplicate_ids = {sticker_id for sticker_id in sticker_ids if sticker_ids.count(sticker_id) > 1}
    row_structure_errors = sum(1 for _, row in cleaned_rows if len(row) != len(COLUMNS))
    field_errors = 0
    position_errors = 0
    dob_errors = 0
    valid_types = {"Player", "Coca-Cola Star"}
    dob_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    rules = { "Player": ([0, 1, 2, 3, 4, 5, 6], []), "Coca-Cola Star": ([0, 1, 2, 3, 4, 5, 6], []), 
             "Badge": ([0, 1, 2, 3], [4, 5, 6]), "Photo": ([0, 1, 2, 3], [4, 5, 6]), "Intro": ([0, 1, 2, 3], [4, 5, 6]), 
             "History": ([0, 1, 2, 3], [4, 5, 6]) }
    for _, row in cleaned_rows:
        if len(row) != len(COLUMNS):
            continue
        sticker_type = row[1].strip()
        if sticker_type in rules:
            required, blank = rules[sticker_type]
            for index in required:
                if not row[index].strip():
                    field_errors += 1
            for index in blank:
                if row[index].strip():
                    field_errors += 1
        if sticker_type in valid_types and row[5].strip() not in VALID_POSITIONS:
            position_errors += 1
        if sticker_type in valid_types:
            dob = row[6].strip()
            if not dob or not dob_pattern.fullmatch(dob):
                dob_errors += 1
        elif row[6].strip():
            dob_errors += 1
    print()
    print("SUMMARY")
    print("=" * 100)
    print(f"Rows processed: {len(cleaned_rows)}")
    print(f"Cleanup changes: {len(changes)}")
    print(f"Repeated headers removed: {len(removed_headers)}")
    print(f"Roster sorting corrected: {'Yes' if sorting_changed else 'No'}")
    print(f"Duplicate Sticker IDs: {len(duplicate_ids)}")
    print(f"Row structure errors: {row_structure_errors}")
    print(f"Field requirement errors: {field_errors}")
    print(f"DOB errors: {dob_errors}")
    print(f"Position errors: {position_errors}")
    print(f"Coca-Cola Star consistency errors: {len(coca_cola_errors)}")
    print(f"Output file created: {'Yes' if output_created else 'No'}")
    if output_created:
        print(f"Output: {OUTPUT_FILE}")

# Function show_changes() displays all changes made during the cleanup process.
def show_changes(changes):
    """
    Displays all changes made during the cleanup process.
    Shows the row number, cleaned Sticker ID, original value,
    and cleaned value for every field that was modified.
    """
    print()
    print("CLEANUP CHANGES")
    print("=" * 100)
    if not changes:
        print("No changes were made. The file was already clean and standardized.")
        return
    for change in changes:
        row_label = f"[row {change['row_number']:03d}]"
        sticker_id = f"{change['sticker_id']:<5}"
        print(f"{row_label} {sticker_id} | '{change['before']}' -> '{change['after']}'")
    print()
    print(f"Total changes: {len(changes)}")

# Main function to run the roster cleanup process
# ====================================================================

def main():
    """
    Runs the complete roster cleanup process.
    Reads the input CSV, validates the header, removes repeated headers,
    cleans each data row, standardizes club names, records all changes,
    writes the cleaned CSV only when changes or sorting are detected,
    and displays all cleanup and validation results.
    """
    changes = []
    cleaned_rows = []
    rows_to_write = []
    with open(INPUT_FILE, "r", encoding="utf-8-sig", newline="") as infile:
        reader = csv.reader(infile)
        all_rows = list(reader)
    if not all_rows:
        raise ValueError("The CSV file is empty. Expected a header row.")
    header = all_rows[0]
    if header != EXPECTED_HEADER:
        raise ValueError(f"Invalid CSV header.\nExpected: {EXPECTED_HEADER}\nFound:    {header}")
    data_rows = [(row_number + 1, row) for row_number, row in enumerate(all_rows[1:], start=1)]
    data_rows, removed_headers = check_and_remove_repeated_headers(data_rows)
    rows_to_write.append(header)
    for row_number, row in data_rows:
        if not row:
            continue
        original_row = row.copy()
        row = clean_row(row)
        row = clean_club_names(row)
        cleaned_rows.append((row_number, row))
        for column_index, (before, after) in enumerate(zip(original_row, row)):
            if before != after:
                column_name = COLUMNS[column_index] if column_index < len(COLUMNS) else f"Column {column_index + 1}"
                changes.append({"row_number": row_number, "sticker_id": row[0] if row else "", "column": column_name, "before": before, "after": after})
        rows_to_write.append(row)
    sorted_cleaned_rows = sort_roster_rows(cleaned_rows)
    original_data_rows = [row for _, row in cleaned_rows]
    sorted_data_rows = [row for _, row in sorted_cleaned_rows]
    sorting_changed = original_data_rows != sorted_data_rows
    headers_removed = bool(removed_headers)
    rows_to_write = [rows_to_write[0]] + sorted_data_rows
    output_created = False
    if changes or sorting_changed or headers_removed:
        with open(OUTPUT_FILE, "w", encoding="utf-8-sig", newline="") as outfile:
            writer = csv.writer(outfile, quoting=csv.QUOTE_ALL)
            writer.writerows(rows_to_write)
        output_created = True
        print(f"Created: {OUTPUT_FILE}")
        if sorting_changed:
            print("Roster order was corrected.")
        if headers_removed:
            print(f"Repeated header rows removed: {len(removed_headers)}")
    else:
        print("No changes detected. Output file was not created.")
    show_changes(changes)
    check_missing_stickers([row for _, row in cleaned_rows])
    check_row_structure(cleaned_rows)
    check_field_requirements(cleaned_rows)
    check_dob(cleaned_rows)
    check_duplicates_and_country_codes([row for _, row in cleaned_rows])
    check_positions(cleaned_rows)
    coca_cola_errors = check_coca_cola_star_consistency(cleaned_rows)
    show_summary(cleaned_rows, changes, removed_headers, sorting_changed, output_created, coca_cola_errors)


# Entry point for the script
# ====================================================================

if __name__ == "__main__":
    main()