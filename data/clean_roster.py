# Panini FWC 2026 Roster Cleanup
# Cleans, validates, sorts and reports the Panini FWC 2026 roster.

#region constants

import csv
import re
from pathlib import Path

GREEN = "\033[92m"
ORANGE = "\033[38;5;208m"
RED = "\033[91m"
RESET = "\033[0m"

INPUT_FILE_NAME = "panini_fwc2026_roster.csv"
OUTPUT_FILE_NAME = "panini_fwc2026_roster_clean.csv"

BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / INPUT_FILE_NAME
OUTPUT_FILE = BASE_DIR / OUTPUT_FILE_NAME

# CSV column order.
COLUMNS = ["Sticker ID", "Type", "Name/Description", "Country/Category", "Club", "Position", "DOB"]
TOTAL_COLUMNS = len(COLUMNS)

# Expected CSV header.
EXPECTED_HEADER = COLUMNS

# Country codes requiring a leading apostrophe in Sticker ID.
COUNTRY_CODES_TO_ADJUST = ["MAR"]

# Valid player's position values.
VALID_POSITIONS = {"Goalkeeper", "Defender", "Midfielder", "Forward"}

# Country codes in album order.
EXPECTED_COUNTRIES = {
    "FWC": "FIFA World Cup 2026",
    "MEX": "Mexico",
    "RSA": "South Africa",
    "KOR": "South Korea",
    "CZE": "Czechia",
    "CAN": "Canada",
    "BIH": "Bosnia and Herzegovina",
    "QAT": "Qatar",
    "SUI": "Switzerland",
    "BRA": "Brazil",
    "MAR": "Morocco",
    "HAI": "Haiti",
    "SCO": "Scotland",
    "USA": "United States",
    "PAR": "Paraguay",
    "AUS": "Australia",
    "TUR": "Türkiye",
    "GER": "Germany",
    "CUW": "Curaçao",
    "CIV": "Côte d'Ivoire",
    "ECU": "Ecuador",
    "NED": "Netherlands",
    "JPN": "Japan",
    "SWE": "Sweden",
    "TUN": "Tunisia",
    "BEL": "Belgium",
    "EGY": "Egypt",
    "IRN": "Iran",
    "NZL": "New Zealand",
    "ESP": "Spain",
    "CPV": "Cape Verde",
    "KSA": "Saudi Arabia",
    "URU": "Uruguay",
    "FRA": "France",
    "SEN": "Senegal",
    "IRQ": "Iraq",
    "NOR": "Norway",
    "ARG": "Argentina",
    "ALG": "Algeria",
    "AUT": "Austria",
    "JOR": "Jordan",
    "POR": "Portugal",
    "COD": "DR Congo",
    "UZB": "Uzbekistan",
    "COL": "Colombia",
    "ENG": "England",
    "CRO": "Croatia",
    "GHA": "Ghana",
    "PAN": "Panama",
    "CC": "Coca-Cola",
}
EXPECTED_CODES = list(EXPECTED_COUNTRIES)

# Expected Sticker ID ranges.
EXPECTED_STICKERS = {
    "FWC": list(range(0, 20)),
    **{code: list(range(1, 21))
       for code in EXPECTED_CODES if code not in {"FWC", "CC"}},
    "CC": list(range(1, 13)),
}

# Sticker types where trailing empty columns can be restored.
TRAILING_EMPTY_COLUMNS = {
    "FWC": {"Intro", "History"},
    "COUNTRY": {"Badge", "Photo"},
}

# Club name replacements.
CLUB_CHANGES = {
    # General club normalization (in alphabetical order)
    "A.E.K. Athens": "AEK Athens",
    "Alkmaar City FC": "AZ Alkmaar",
    "Arsenal": "Arsenal FC",
    "Atlas": "Atlas FC",
    "Auxerre": "AJ Auxerre",
    "Augsburg": "FC Augsburg",
    "Benfica": "SL Benfica",
    "Bologna": "Bologna FC",
    "Bologna FC 1909": "Bologna FC",
    "Bournemouth": "AFC Bournemouth",
    "Barcelona": "FC Barcelona",
    "Basel": "FC Basel",
    "Bastia": "SC Bastia",
    "Braga": "SC Braga",
    "Brentford": "Brentford FC",
    "Burnley": "Burnley FC",
    "Como": "Como 1907",
    "Colorado Springs Switchbacks": "Colorado Springs Switchbacks FC",
    "Deportivo Toluca": "Toluca FC",
    "Esteghlal": "Esteghlal FC",
    "FC Köln": "1. FC Köln",
    "FC Copenhagen": "FC København",
    "Genoa": "Genoa CFC",
    "Gent": "KAA Gent",
    "Getafe": "Getafe CF",
    "Girona": "Girona FC",
    "Guadalajara": "Chivas Guadalajara",
    "Hamburg": "Hamburger SV",
    "Hearts": "Heart of Midlothian",
    "Hoffenheim": "TSG Hoffenheim",
    "Igdir": "Iğdır FK",
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
    "Middlesbrough": "Middlesbrough FC",
    "Milan": "Inter Milan",
    "Minnesota United": "Minnesota United FC",
    "Monterrey": "CF Monterrey",
    "Montpellier": "Montpellier HSC",
    "Napoli": "SSC Napoli",
    "Neom": "NEOM SC",
    "New York City": "New York City FC",
    "Nice": "OGC Nice",
    "Olympiacos": "Olympiacos FC",
    "Olympique Lyon": "Olympique Lyonnais",
    "Parma": "Parma Calcio",
    "Red Star Belgrade": "Crvena zvezda",
    "Rennes": "Stade Rennais",
    "Roma": "AS Roma",
    "Rizespor": "Çaykur Rizespor",
    "Saprissa": "Deportivo Saprissa",
    "Selangor": "Selangor FC",
    "Stade Rennais FC": "Stade Rennais",
    "Stade Rennes FC": "Stade Rennais",
    "Strasbourg": "RC Strasbourg",
    "Sunderland": "Sunderland AFC",
    "Toluca": "Toluca FC",
    "Torino": "Torino FC",
    "Toronto": "Toronto FC",
    "Universidad Católica": "Universidad Católica (Chile)",
    "Universitario": "Universitario de Deportes",
    "Viking": "Viking FK",
    "Villarreal": "Villarreal CF",
    "Watford": "Watford FC",
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
    "Al Sadd": "Al-Sadd",
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

#endregion constants


class PaniniRosterCleaner:
    """Cleans, validates, sorts and reports the Panini FWC 2026 roster."""

    def __init__(self, input_file=INPUT_FILE, output_file=OUTPUT_FILE):
        """Initializes the cleaner with input and output file paths."""
        self.input_file = input_file
        self.output_file = output_file
        self.changes = []
        self.cleaned_rows = []
        self.removed_headers = []
        self.sorting_changed = False
        self.sorting_changes = []
        self.output_created = False
        self.missing_stickers = {}
        self.row_structure_errors = []
        self.field_requirement_errors = {"errors": [], "unknown_types": []}
        self.dob_errors = []
        self.position_errors = []
        self.duplicate_and_country_code_errors = {}
        self.coca_cola_errors = []
        self.sticker_range_errors = []
        self.removed_blank_rows = []
        self.removed_duplicate_rows = []

    # Cleaning and validations methods
    # ===============================

    # Cleaning methods

    def clean_row(self, row_number, row):
        """Normalizes Sticker ID and Country/Category values."""
        changes = []
        if not row: return row, changes
        original_row = row.copy()
        row = [field.strip() for field in row]
        if row:
            row[0] = row[0].replace(" ", "")
        for country_code in COUNTRY_CODES_TO_ADJUST:
            if row[0].startswith(country_code) and not row[0].startswith("'"):
                before = row[0]
                row[0] = "'" + row[0]
                changes.append({
                    "row_number": row_number, "sticker_id": row[0], "column": "Sticker ID", "before": before,
                    "after": row[0]
                })
                break
        sticker_id = row[0].lstrip("'") if row else ""
        match = re.match(r"^([A-Z]+)\d+$", sticker_id)
        if match and match.group(1) not in {"FWC", "CC"} and match.group(1) in EXPECTED_COUNTRIES and len(row) > 3:
            country_code = match.group(1)
            expected_country = EXPECTED_COUNTRIES[country_code]
            if row[3] != expected_country:
                before = row[3]
                row[3] = expected_country
                changes.append({
                    "row_number": row_number, "sticker_id": row[0], "column": "Country/Category", "before": before,
                    "after": row[3]
                })
        if row != original_row:
            for index, (before, after) in enumerate(zip(original_row, row)):
                if before != after and not any(change["column"] == COLUMNS[index] for change in changes):
                    changes.append({
                        "row_number": row_number, "sticker_id": row[0] if row else "", "column": COLUMNS[index],
                        "before": before, "after": after
                    })
        return row, changes

    def clean_club_names(self, row_number, row):
        """Cleans and standardizes the Club column."""
        changes = []
        if len(row) > 4:
            original_club = row[4]
            club = row[4].strip()
            row[4] = CLUB_CHANGES.get(club, club)
            if original_club != row[4]:
                changes.append({
                    "row_number": row_number, "sticker_id": row[0] if row else "", "column": "Club",
                    "before": original_club, "after": row[4]
                })
        return row, changes

    def sort_roster_rows(self, rows):
        """Sorts roster rows by expected country code and Sticker ID order."""
        code_order = {code: index for index, code in enumerate(EXPECTED_CODES)}

        def sort_key(item):
            """Returns the country and Sticker ID sort key."""
            row_number, row = item
            sticker_id = row[0].lstrip("'").strip() if row and row[0] else ""
            match = re.match(r"^([A-Z]+)(\d+)$", sticker_id)
            if not match: return (len(EXPECTED_CODES), float("inf"), row_number)
            code = match.group(1)
            number = int(match.group(2))
            return (code_order.get(code, len(EXPECTED_CODES)), number, row_number)

        sorted_rows = sorted(rows, key=sort_key)
        sorting_changed = sorted_rows != rows
        if not sorting_changed: return sorted_rows, False, []
        original_positions = {id(item): index for index, item in enumerate(rows)}
        sorted_positions = {id(item): index for index, item in enumerate(sorted_rows)}
        original_by_country = {}
        country_runs = []
        for index, item in enumerate(rows):
            row_number, row = item
            sticker_id = row[0].lstrip("'").strip() if row and row[0] else ""
            match = re.match(r"^([A-Z]+)(\d+)$", sticker_id)
            if not match: continue
            country_code = match.group(1)
            original_by_country.setdefault(country_code, []).append((index, item))
            if not country_runs or country_runs[-1]["country_code"] != country_code:
                country_runs.append({"country_code": country_code, "start": index, "end": index})
            else:
                country_runs[-1]["end"] = index
        sorting_changes = []
        reported_countries = set()
        for country_code in EXPECTED_CODES:
            expected_ids = [f"{country_code}{number}" for number in EXPECTED_STICKERS.get(country_code, [])]
            country_items = original_by_country.get(country_code, [])
            if len(country_items) != len(expected_ids): continue
            original_ids = [item[1][1][0].lstrip("'").strip() for item in country_items]
            if original_ids != expected_ids: continue
            if country_items[-1][0] - country_items[0][0] + 1 != len(country_items): continue
            run_index = next((
                index for index, run in enumerate(country_runs)
                if run["country_code"] == country_code and run["start"] == country_items[0][0]
            ), None)
            if run_index is None or run_index == code_order[country_code]: continue
            if all(original_positions[id(item[1])] != sorted_positions[id(item[1])] for item in country_items):
                sorting_changes.append({
                    "type": "country", "country_code": country_code, "country": EXPECTED_COUNTRIES[country_code]
                })
                reported_countries.add(country_code)
        for new_position, item in enumerate(sorted_rows):
            old_position = original_positions[id(item)]
            if old_position == new_position: continue
            row_number, row = item
            sticker_id = row[0].lstrip("'").strip() if row else ""
            match = re.match(r"^([A-Z]+)\d+$", sticker_id)
            country_code = match.group(1) if match else ""
            if country_code in reported_countries: continue
            sorting_changes.append({"type": "sticker", "sticker_id": sticker_id, "row_number": row_number})
        return sorted_rows, sorting_changed, sorting_changes

    def remove_repeated_headers(self, rows):
        """Removes repeated CSV header rows from the data."""
        if not rows: raise ValueError("The CSV file is empty. Expected a header row.")
        cleaned_rows = []
        removed_headers = []
        for row_number, row in rows:
            if row == EXPECTED_HEADER:
                removed_headers.append(row_number)
                continue
            cleaned_rows.append((row_number, row))
        return cleaned_rows, removed_headers

    def clean_rows(self, data_rows):
        """Cleans roster rows and standardizes club names."""
        for row_number, row in data_rows:
            if not row or not any(field.strip() for field in row):
                self.removed_blank_rows.append(row_number)
                continue
            row, column_changes = self.restore_empty_columns(row_number, row)
            self.changes.extend(column_changes)
            row, row_changes = self.clean_row(row_number, row)
            self.changes.extend(row_changes)
            row, club_changes = self.clean_club_names(row_number, row)
            self.changes.extend(club_changes)
            self.cleaned_rows.append((row_number, row))

    def sort_and_record_changes(self):
        """Sorts the roster and stores any sorting cleanup changes."""
        self.cleaned_rows, self.sorting_changed, self.sorting_changes = self.sort_roster_rows(self.cleaned_rows)
        return [row for _, row in self.cleaned_rows]

    def restore_empty_columns(self, row_number, row):
        """Restores missing trailing empty columns for known sticker types."""
        if len(row) >= len(COLUMNS) or len(row) < 2: return row, []
        sticker_id = row[0].strip().lstrip("'")
        sticker_type = row[1].strip()
        match = re.match(r"^([A-Z]+)\d+$", sticker_id)
        if not match: return row, []
        code = match.group(1)
        is_fwc_empty_type = code == "FWC" and sticker_type in {"Intro", "History"}
        is_country_empty_type = code in EXPECTED_COUNTRIES and code != "FWC"
        is_country_empty_type = is_country_empty_type and sticker_type in {"Badge", "Photo"}
        if not is_fwc_empty_type and not is_country_empty_type: return row, []
        missing_columns = len(COLUMNS) - len(row)
        missing_column_names = COLUMNS[len(row):]
        row.extend([""] * missing_columns)
        changes = []
        for column_name in missing_column_names:
            changes.append({
                "row_number": row_number,
                "sticker_id": row[0],
                "column": column_name,
                "before": "<missing>",
                "after": "Added empty value",
            })
        return row, changes

    def remove_exact_duplicate_rows(self):
        """Removes exact duplicate rows while keeping the first occurrence."""
        seen_rows = set()
        cleaned_rows = []
        for row_number, row in self.cleaned_rows:
            row_key = tuple(row)
            if row_key in seen_rows:
                sticker_id = row[0].strip().lstrip("'") if row else ""
                self.removed_duplicate_rows.append((row_number, sticker_id))
                continue
            seen_rows.add(row_key)
            cleaned_rows.append((row_number, row))
        self.cleaned_rows = cleaned_rows

# Validation methods

    def check_missing_stickers(self, rows):
        """Checks the roster for missing Sticker IDs."""
        sticker_ids = {row[0].lstrip("'") for row in rows if row and row[0]}
        missing_stickers = {}
        missing_fwc = []
        for number in EXPECTED_STICKERS["FWC"]:
            expected_id = f"FWC{number}"
            padded_id = f"FWC{number:02d}"
            if expected_id not in sticker_ids and padded_id not in sticker_ids:
                missing_fwc.append(expected_id)
        if missing_fwc:
            missing_stickers["FWC"] = missing_fwc
        country_codes = [code for code in EXPECTED_CODES if code not in {"FWC", "CC"}]
        for country_code in country_codes:
            missing = [
                f"{country_code}{number}" for number in EXPECTED_STICKERS[country_code]
                if f"{country_code}{number}" not in sticker_ids
            ]
            if missing: missing_stickers[country_code] = missing
        missing_cc = [f"CC{number}" for number in EXPECTED_STICKERS["CC"] if f"CC{number}" not in sticker_ids]
        if missing_cc: missing_stickers["CC"] = missing_cc
        return missing_stickers

    def check_positions(self, rows):
        """Checks the Position column for Player and Coca-Cola Star rows."""
        valid_types = {"Player", "Coca-Cola Star"}
        invalid_positions = []
        for row_number, row in rows:
            if len(row) <= 1 or row[1].strip() not in valid_types: continue
            if len(row) <= 5:
                invalid_positions.append({
                    "row_number": row_number, "sticker_id": row[0] if row else "", "position": ""
                })
                continue
            position = row[5].strip()
            if position not in VALID_POSITIONS:
                invalid_positions.append({"row_number": row_number, "sticker_id": row[0], "position": position})
        return invalid_positions

    def check_duplicates_and_country_codes(self, rows):
        """Checks duplicate Sticker IDs, country codes and Sticker ID formats."""
        sticker_ids = [row[0].lstrip("'").strip() for row in rows if row and row[0]]
        seen = set()
        duplicates = set()
        found_codes = set()
        invalid_ids = []
        expected_codes = set(EXPECTED_CODES)
        for sticker_id in sticker_ids:
            if sticker_id in seen:
                duplicates.add(sticker_id)
            else:
                seen.add(sticker_id)
            match = re.match(r"^([A-Z]+)\d+$", sticker_id)
            if match:
                found_codes.add(match.group(1))
            else:
                invalid_ids.append(sticker_id)
        missing_codes = expected_codes - found_codes
        unexpected_codes = found_codes - expected_codes
        return {
            "duplicates": sorted(duplicates), "missing_codes": sorted(missing_codes),
            "unexpected_codes": sorted(unexpected_codes), "invalid_ids": sorted(set(invalid_ids))
        }

    def check_row_structure(self, rows):
        """Checks that every roster row contains exactly the expected number of columns."""
        expected_columns = len(COLUMNS)
        invalid_rows = []
        for row_number, row in rows:
            if len(row) != expected_columns:
                invalid_rows.append({
                    "row_number": row_number, "sticker_id": row[0] if row else "", "column_count": len(row)
                })
        return invalid_rows

    def check_field_requirements(self, rows):
        """Validates populated and blank fields according to sticker type."""
        rules = { # "Sticker Type": ([required_columns], [columns_that_must_be_blank])
            "Player": ([0, 1, 2, 3, 4, 5], []),
            "Coca-Cola Star": ([0, 1, 2, 3, 4, 5], []),
            "Badge": ([0, 1, 2, 3], [4, 5]),
            "Photo": ([0, 1, 2, 3], [4, 5]),
            "Intro": ([0, 1, 2, 3], [4, 5]),
            "History": ([0, 1, 2, 3], [4, 5]),
        }
        errors = []
        unknown_types = []
        for row_number, row in rows:
            if len(row) < len(COLUMNS): continue
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
        return {"errors": errors, "unknown_types": unknown_types}

    def check_dob(self, rows):
        """Checks the DOB field according to sticker type."""
        valid_types = {"Player", "Coca-Cola Star"}
        dob_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        errors = []
        for row_number, row in rows:
            if len(row) <= 1: continue
            sticker_id = row[0] if row else ""
            sticker_type = row[1].strip()
            dob = row[6].strip() if len(row) > 6 else ""
            if sticker_type in valid_types:
                if not dob:
                    errors.append((row_number, sticker_id, sticker_type, dob, "DOB is required"))
                elif not dob_pattern.fullmatch(dob):
                    errors.append(
                        (row_number, sticker_id, sticker_type, dob, "DOB must use YYYY-MM-DD format or invalid date")
                    )
            elif dob:
                errors.append((row_number, sticker_id, sticker_type, dob, "DOB must be blank"))
        return errors

    def check_sticker_ranges(self, rows):
        """Checks Sticker ID numbers against the expected ranges."""
        errors = []
        for row_number, row in rows:
            if not row or not row[0]:
                continue
            sticker_id = row[0].strip().lstrip("'")
            match = re.match(r"^([A-Z]+)(\d+)$", sticker_id)
            if not match: continue
            code, number = match.groups()
            if code not in EXPECTED_STICKERS: continue
            sticker_number = int(number)
            if sticker_number not in EXPECTED_STICKERS[code]:
                valid_numbers = EXPECTED_STICKERS[code]
                minimum = min(valid_numbers)
                maximum = max(valid_numbers)
                errors.append({
                    "row_number": row_number,
                    "sticker_id": sticker_id,
                    "message": f"Sticker number {sticker_number} is outside the valid range "
                    f"{code}{minimum}-{code}{maximum}",
                })
        return errors

    def check_coca_cola_star_consistency(self, rows):
        """Verifies Coca-Cola Star values against the corresponding Player."""
        player_lookup = {}
        errors = []
        for row_number, row in rows:
            if len(row) != len(COLUMNS) or row[1].strip() != "Player": continue
            key = (row[2].strip(), row[3].strip())
            player_lookup.setdefault(key, []).append((row_number, row))
        for row_number, row in rows:
            if len(row) != len(COLUMNS) or row[1].strip() != "Coca-Cola Star": continue
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
            columns_to_check = [(3, "Country/Category"), (4, "Club"), (5, "Position"), (6, "DOB")]
            for index, column_name in columns_to_check:
                cc_value = row[index].strip()
                player_value = player_row[index].strip()
                if cc_value != player_value:
                    message = (
                        f"{column_name} differs from Player row {player_row_number}: "
                        f"CC='{cc_value}' | Player='{player_value}'"
                    )
                    errors.append((row_number, sticker_id, name, message))
        return errors

    # Helper functions used in run() method
    # ============================================

    def show_changes(self):
        """Displays cleanup changes and validation issues."""
        has_errors = False

        def show_section(title, items, formatter):
            """Displays an error section when items are present."""
            nonlocal has_errors
            if not items: return
            has_errors = True
            print()
            print(title)
            print("=" * 100)
            for item in items:
                print(formatter(item))

        has_cleanup_changes = bool(
            self.changes or self.removed_headers or self.removed_blank_rows or self.removed_duplicate_rows
        )
        print()
        print("# CLEANUP CHANGES")
        print("=" * 100)
        if not has_cleanup_changes:
            print("No cleanup changes were required.")
        else:
            for change in self.changes:
                row_label = f"[row {change['row_number']:03d}]"
                sticker_id = f"{change['sticker_id']:<5}"
                print(f"{row_label} {sticker_id} | {change['column']} | '{change['before']}' -> '{change['after']}'")
            if self.removed_headers:
                print(f"Repeated header rows removed: {len(self.removed_headers)}")
            if self.removed_blank_rows:
                print(f"Blank rows removed: {len(self.removed_blank_rows)}")
            if self.removed_duplicate_rows:
                duplicate_ids = ", ".join(sticker_id for _, sticker_id in self.removed_duplicate_rows)
                print(f"Exact duplicate rows removed: {duplicate_ids}")
            cleanup_count = len(self.changes) + len(self.removed_headers) + len(self.removed_blank_rows) + \
                len(self.removed_duplicate_rows)
            print(f"Total cleanup changes: {cleanup_count}")
        if self.sorting_changed:
            print()
            print("ROSTER SORTING CHANGES")
            print("=" * 100)
            for change in self.sorting_changes:
                if change["type"] == "country":
                    print(f"{change['country_code']} stickers moved to their correct position")
                else:
                    print(f"[row {change['row_number']:03d}] {change['sticker_id']} moved to its correct position")
        show_section(
            "MISSING STICKERS", self.missing_stickers.items(), lambda issue: f"{issue[0]}: {', '.join(issue[1])}"
        )
        duplicate_errors = self.duplicate_and_country_code_errors
        if any(duplicate_errors.values()):
            show_section(
                "DUPLICATE AND COUNTRY CODE ERRORS", [duplicate_errors],
                lambda issue: f"Duplicates: {', '.join(issue['duplicates']) or 'None'} | "
                f"Missing codes: {', '.join(issue['missing_codes']) or 'None'} | "
                f"Unexpected codes: {', '.join(issue['unexpected_codes']) or 'None'} | "
                f"Invalid IDs: {', '.join(issue['invalid_ids']) or 'None'}"
            )
        show_section(
            "ROW STRUCTURE ERRORS", self.row_structure_errors, lambda issue:
            f"[row {issue['row_number']:03d}] {issue['sticker_id']:<6} | Found {issue['column_count']} columns, expected {TOTAL_COLUMNS}"
        )
        show_section(
            "FIELD REQUIREMENT ERRORS", self.field_requirement_errors["errors"],
            lambda issue: f"[row {issue[0]:03d}] {issue[1]:<6} | {issue[2]} | {issue[3]} | {issue[4]}"
        )
        show_section(
            "UNKNOWN STICKER TYPES", self.field_requirement_errors["unknown_types"],
            lambda issue: f"[row {issue[0]:03d}] {issue[1]:<6} | Unknown Type: '{issue[2]}'"
        )
        show_section(
            "DOB ERRORS", self.dob_errors,
            lambda issue: f"[row {issue[0]:03d}] {issue[1]:<6} | {issue[2]} | DOB: '{issue[3]}' | {issue[4]}"
        )
        show_section(
            "POSITION ERRORS", self.position_errors, lambda issue:
            f"[row {issue['row_number']:03d}] {issue['sticker_id']:<6} | Invalid Position: '{issue['position']}'"
        )
        show_section(
            "COCA-COLA STAR CONSISTENCY ERRORS", self.coca_cola_errors,
            lambda issue: f"[row {issue[0]:03d}] {issue[1]:<6} | {issue[2]} | {issue[3]}"
        )
        show_section(
            "STICKER RANGE ERRORS", self.sticker_range_errors,
            lambda issue: f"[row {issue['row_number']:03d}] {issue['sticker_id']:<6} | {issue['message']}"
        )
        if not has_errors:
            print()
            print("VALIDATION ISSUES")
            print("=" * 100)
            print("No validation issues found.")

    def show_summary(self):
        """Displays the final cleanup and validation summary."""

        def print_status(label, value, status="ok"):
            """Prints a summary value using the appropriate color."""
            color = RED if status == "error" else ORANGE if status == "warning" else GREEN
            print(f"{label}: {color}{value}{RESET}")

        has_duplicate_errors = any(self.duplicate_and_country_code_errors.values())
        has_validation_errors = bool(
            self.missing_stickers or self.sticker_range_errors or has_duplicate_errors or self.row_structure_errors or
            self.field_requirement_errors["errors"] or self.field_requirement_errors["unknown_types"] or
            self.dob_errors or self.position_errors or self.coca_cola_errors
        )
        cleanup_count = len(self.changes) + len(self.removed_headers) + len(self.removed_blank_rows) + \
            len(self.removed_duplicate_rows) + len(self.sorting_changes)
        has_cleanup_changes = cleanup_count > 0
        has_sorting_changes = self.sorting_changed
        print()
        print("# SUMMARY")
        print("=" * 100)
        print(f"Rows processed: {len(self.cleaned_rows)}")
        print_status("Cleanup changes", cleanup_count, "warning" if has_cleanup_changes else "ok")
        print_status("Repeated headers removed", len(self.removed_headers), "warning" if self.removed_headers else "ok")
        print_status("Blank rows removed", len(self.removed_blank_rows), "warning" if self.removed_blank_rows else "ok")
        print_status(
            "Roster sorting corrected", "Yes" if has_sorting_changes else "No",
            "warning" if has_sorting_changes else "ok"
        )
        print_status("Missing stickers", len(self.missing_stickers), "error" if self.missing_stickers else "ok")
        print_status(
            "Sticker range errors", len(self.sticker_range_errors), "error" if self.sticker_range_errors else "ok"
        )
        print_status(
            "Row structure errors", len(self.row_structure_errors), "error" if self.row_structure_errors else "ok"
        )
        field_errors = len(self.field_requirement_errors["errors"]
                           ) + len(self.field_requirement_errors["unknown_types"])
        print_status("Field requirement errors", field_errors, "error" if field_errors else "ok")
        duplicate_count = sum(len(value) for value in self.duplicate_and_country_code_errors.values())
        print_status("Duplicate and country code errors", duplicate_count, "error" if has_duplicate_errors else "ok")
        print_status("DOB errors", len(self.dob_errors), "error" if self.dob_errors else "ok")
        print_status("Position errors", len(self.position_errors), "error" if self.position_errors else "ok")
        print_status(
            "Coca-Cola Star consistency errors", len(self.coca_cola_errors), "error" if self.coca_cola_errors else "ok"
        )
        print_status(
            "Output file created", "Yes" if self.output_created else "No", "ok" if self.output_created else "error"
        )
        return has_validation_errors

    def read_input_file(self):
        """Reads the input CSV and validates its header."""
        with open(self.input_file, "r", encoding="utf-8-sig", newline="") as infile:
            reader = csv.reader(infile)
            all_rows = list(reader)
            if not all_rows: raise ValueError("The CSV file is empty. Expected a header row.")
        header = all_rows[0]
        if header == EXPECTED_HEADER[:-1]:
            header.append("DOB")
            self.changes.append({"row_number": 1, "sticker_id": "", "column": "DOB", "before": "", "after": "DOB"})
        elif header != EXPECTED_HEADER:
            raise ValueError(f"Invalid CSV header.\nExpected: {EXPECTED_HEADER}\nFound:    {header}")
        data_rows = [(row_number + 1, row) for row_number, row in enumerate(all_rows[1:], start=1)]
        data_rows, self.removed_headers = self.remove_repeated_headers(data_rows)
        return header, data_rows

    def write_output(self, header, sorted_data_rows):
        """Writes the cleaned roster when changes were made."""
        has_changes = bool(
            self.changes or self.sorting_changed or self.removed_headers or self.removed_blank_rows or
            self.removed_duplicate_rows
        )
        if not has_changes: return
        with open(self.output_file, "w", encoding="utf-8", newline="") as outfile:
            writer = csv.writer(outfile)
            writer.writerow(header)
            writer.writerows(sorted_data_rows)
        self.output_created = True

    def validate(self, sorted_data_rows):
        """Runs all roster validation checks and stores the results."""
        self.missing_stickers = self.check_missing_stickers(sorted_data_rows)
        self.sticker_range_errors = self.check_sticker_ranges(self.cleaned_rows)
        self.row_structure_errors = self.check_row_structure(self.cleaned_rows)
        self.field_requirement_errors = self.check_field_requirements(self.cleaned_rows)
        self.dob_errors = self.check_dob(self.cleaned_rows)
        self.duplicate_and_country_code_errors = self.check_duplicates_and_country_codes(sorted_data_rows)
        self.position_errors = self.check_positions(self.cleaned_rows)
        self.coca_cola_errors = self.check_coca_cola_star_consistency(self.cleaned_rows)

    def has_validation_errors(self):
        """Returns True when one or more validation errors exist."""
        has_duplicate_errors = any(self.duplicate_and_country_code_errors.values())
        return bool(
            self.missing_stickers or self.sticker_range_errors or has_duplicate_errors or self.row_structure_errors or
            self.field_requirement_errors["errors"] or self.field_requirement_errors["unknown_types"] or
            self.dob_errors or self.position_errors or self.coca_cola_errors
        )

    def run(self):
        """Runs the complete roster cleanup process."""
        if self.output_file.exists():
            self.output_file.unlink()
        header, data_rows = self.read_input_file()
        # CLEANUP
        self.clean_rows(data_rows)
        self.remove_exact_duplicate_rows()
        sorted_data_rows = self.sort_and_record_changes()
        self.write_output(header, sorted_data_rows)
        # VALIDATION
        self.validate(sorted_data_rows)
        has_validation_errors = self.has_validation_errors()
        has_changes = bool(
            self.changes or self.sorting_changed or self.removed_headers or self.removed_blank_rows or
            self.removed_duplicate_rows
        )
        if not has_changes and not has_validation_errors:
            print("File validated successfully. No changes required.")
            return
        self.show_changes()
        self.show_summary()
        if has_validation_errors:
            raise SystemExit(1)


# Main function to run the roster cleanup process.
#=================================================


def main():
    """Runs the Panini FWC 2026 roster cleanup."""
    cleaner = PaniniRosterCleaner()
    cleaner.run()


# Entry point for the script
if __name__ == "__main__":
    main()
