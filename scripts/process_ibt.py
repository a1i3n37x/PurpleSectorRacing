#!/usr/bin/env python3
"""
Process all .ibt (iRacing Binary Telemetry) files and extract session/lap data.
Outputs JSON for use in the web app.
"""

import os
import json
import struct
import re
import statistics
from pathlib import Path
from datetime import datetime
from typing import Optional

# Configuration
OUTLIER_THRESHOLD = 0.15  # Exclude laps >15% slower than session best
EXCLUDE_WET_SESSIONS = True  # Exclude sessions with precipitation > 0%
MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB limit

# Paths
SCRIPT_DIR = Path(__file__).parent
MONZA_DIR = SCRIPT_DIR.parent / "monza"
OUTPUT_DIR = SCRIPT_DIR.parent / "src" / "data"


def parse_ibt_header(data: bytes) -> dict:
    """Parse the IBT file header."""
    return {
        "version": struct.unpack_from("<i", data, 0)[0],
        "tick_rate": struct.unpack_from("<i", data, 8)[0],
        "session_info_len": struct.unpack_from("<i", data, 16)[0],
        "session_info_offset": struct.unpack_from("<i", data, 20)[0],
        "num_vars": struct.unpack_from("<i", data, 24)[0],
        "var_header_offset": struct.unpack_from("<i", data, 28)[0],
        "buf_len": struct.unpack_from("<i", data, 36)[0],
        "buf_offset": struct.unpack_from("<i", data, 52)[0],
    }


def parse_var_headers(data: bytes, num_vars: int, offset: int) -> list[dict]:
    """Parse variable headers from the IBT file."""
    VAR_HEADER_SIZE = 144
    variables = []

    for i in range(num_vars):
        pos = offset + i * VAR_HEADER_SIZE
        var_type = struct.unpack_from("<i", data, pos)[0]
        data_offset = struct.unpack_from("<i", data, pos + 4)[0]

        # Read name (null-terminated string at pos + 16)
        name_bytes = data[pos + 16 : pos + 48]
        name = name_bytes.split(b"\x00")[0].decode("utf-8", errors="ignore")

        variables.append({"name": name, "type": var_type, "data_offset": data_offset})

    return variables


def read_var(data: bytes, var_info: dict, sample_offset: int) -> Optional[float]:
    """Read a variable value from a telemetry sample."""
    pos = sample_offset + var_info["data_offset"]
    var_type = var_info["type"]

    try:
        if var_type == 2:  # int32
            return struct.unpack_from("<i", data, pos)[0]
        elif var_type == 4:  # float
            return struct.unpack_from("<f", data, pos)[0]
        elif var_type == 5:  # double
            return struct.unpack_from("<d", data, pos)[0]
    except struct.error:
        return None
    return None


def extract_session_info(data: bytes, offset: int, length: int) -> dict:
    """Extract session info from the YAML section."""
    yaml_text = data[offset : offset + length].decode("utf-8", errors="ignore").replace("\x00", "")

    def extract(pattern: str) -> Optional[str]:
        match = re.search(pattern, yaml_text)
        return match.group(1).strip() if match else None

    precipitation = int(extract(r"TrackPrecipitation:\s*(\d+)") or 0)

    # Extract sector boundaries
    sector_starts = [float(m.group(1)) for m in re.finditer(r"SectorStartPct:\s*([\d.]+)", yaml_text)]

    return {
        "track": extract(r"TrackDisplayName:\s*(.+)") or "Unknown",
        "track_short": extract(r"TrackDisplayShortName:\s*(.+)") or "Unknown",
        "car": extract(r"CarScreenName:\s*(.+)") or "Unknown",
        "driver": extract(r"UserName:\s*(.+)") or "Unknown",
        "precipitation": precipitation,
        "skies": extract(r"TrackSkies:\s*(.+)") or "Unknown",
        "is_wet": precipitation > 0,
        "sector_starts": sector_starts,
        "num_sectors": len(sector_starts),
    }


def extract_sector_times(data: bytes, header: dict, variables: list, sector_starts: list) -> list:
    """Extract sector times for each completed lap from telemetry data.

    Only includes sectors where no incidents occurred (off-track, cutting, etc.)
    """
    if not sector_starts or len(sector_starts) < 2:
        return {}

    num_sectors = len(sector_starts)
    sector_bounds = sector_starts + [1.0]  # Add finish line

    # Build variable lookup
    var_map = {v["name"]: v for v in variables}

    # Check if we have incident tracking
    has_incidents = "PlayerCarMyIncidentCount" in var_map

    buf_offset = header["buf_offset"]
    buf_len = header["buf_len"]
    total_samples = (len(data) - buf_offset) // buf_len

    # Process telemetry to find sector boundary crossings
    laps_sectors = {}
    prev_lap = None
    prev_pct = 0.0
    prev_incident_count = 0
    split_times = {}
    sector_incidents = {}  # Track which sectors had incidents

    for i in range(total_samples):
        sample_offset = buf_offset + i * buf_len

        lap = read_var(data, var_map.get("Lap"), sample_offset)
        pct = read_var(data, var_map.get("LapDistPct"), sample_offset)
        lap_time = read_var(data, var_map.get("LapCurrentLapTime"), sample_offset)
        last_lap_time = read_var(data, var_map.get("LapLastLapTime"), sample_offset)

        # Track incidents
        incident_count = 0
        if has_incidents:
            incident_count = read_var(data, var_map.get("PlayerCarMyIncidentCount"), sample_offset) or 0

        if lap is None or pct is None or lap_time is None:
            continue

        # Check for incident during this sample
        if has_incidents and incident_count > prev_incident_count:
            # Find which sector we're in
            current_sector = 0
            for s_idx, bound in enumerate(sector_bounds[1:]):
                if pct < bound:
                    current_sector = s_idx
                    break
            sector_incidents[current_sector] = True
            prev_incident_count = incident_count

        # New lap - save previous lap's sectors
        if prev_lap is not None and lap != prev_lap:
            if split_times:
                sectors = {}
                sorted_splits = sorted(split_times.items())
                for j in range(len(sorted_splits)):
                    if j == 0:
                        sectors[0] = sorted_splits[0][1]
                    else:
                        sectors[j] = sorted_splits[j][1] - sorted_splits[j - 1][1]

                # Validate sector times - STRICT validation:
                # 1. Each sector must be reasonable (varies by track/sector count)
                # 2. Lap time must be in realistic range (75-130s covers most tracks)
                # 3. Sum of sectors MUST match actual lap time within 0.5 seconds
                # 4. NO incidents during any sector of this lap
                if len(sectors) == num_sectors:
                    times = list(sectors.values())
                    sector_sum = sum(times)

                    # Accept lap times in reasonable range for formula cars
                    actual_lap = last_lap_time if last_lap_time and 75 < last_lap_time < 130 else None

                    # Each sector must be reasonable - min varies by sector count
                    # 3 sectors: ~25-35s each, 5 sectors: ~14-25s each
                    min_sector = 20 if num_sectors <= 3 else 14
                    sectors_valid = all(min_sector < t < 60 for t in times)
                    # Total must be a realistic lap time
                    total_valid = 75 < sector_sum < 130
                    # Sector sum MUST match actual lap time very closely
                    matches_lap = actual_lap is not None and abs(sector_sum - actual_lap) < 0.5
                    # NO incidents during this lap
                    no_incidents = len(sector_incidents) == 0

                    if sectors_valid and total_valid and matches_lap and no_incidents:
                        laps_sectors[prev_lap] = {
                            "sectors": sectors,
                            "lap_time": actual_lap,
                            "clean": True,
                        }

            split_times = {}
            sector_incidents = {}  # Reset for new lap

        prev_lap = lap

        # Check for boundary crossings
        for bound in sector_bounds[1:]:
            if bound < 1.0:
                if prev_pct < bound <= pct:
                    split_times[bound] = lap_time
            else:
                # Finish line wrap-around
                if pct < prev_pct and prev_pct > 0.9:
                    split_times[1.0] = lap_time

        prev_pct = pct

    return laps_sectors


def parse_date_from_filename(filename: str) -> Optional[dict]:
    """Extract date/time from IBT filename."""
    match = re.search(r"(\d{4}-\d{2}-\d{2})\s+(\d{2}-\d{2}-\d{2})\.ibt$", filename)
    if match:
        date_str, time_str = match.groups()
        hour, minute, sec = time_str.split("-")
        return {
            "date": date_str,
            "time": f"{hour}:{minute}:{sec}",
            "datetime": datetime.fromisoformat(f"{date_str}T{hour}:{minute}:{sec}"),
        }
    return None


def format_lap_time(seconds: Optional[float]) -> Optional[str]:
    """Format lap time in seconds to M:SS.mmm format."""
    if seconds is None or seconds <= 0 or seconds > 600:
        return None
    mins = int(seconds // 60)
    secs = seconds % 60
    return f"{mins}:{secs:06.3f}"


def format_duration(seconds: float) -> str:
    """Format duration in seconds to H:MM:SS format."""
    if seconds <= 0:
        return "0:00:00"
    hours = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours}:{mins:02d}:{secs:02d}"


def calculate_consistency_score(times: list[float]) -> Optional[int]:
    """
    Calculate consistency score (0-100) based on coefficient of variation.
    Lower CV = higher consistency.
    """
    if len(times) < 2:
        return None

    mean = statistics.mean(times)
    if mean == 0:
        return 100

    std_dev = statistics.stdev(times)
    cv = std_dev / mean

    # Scale: CV of 0 = 100%, CV of 0.05 = 75%, CV of 0.10 = 50%, CV of 0.20+ = 0%
    score = max(0, min(100, 100 * (1 - cv * 5)))
    return round(score)


def filter_outlier_laps(lap_times: list[float], best_time: float) -> list[float]:
    """Filter out laps significantly slower than best (incidents, warm-up, etc.)."""
    if not lap_times or not best_time:
        return lap_times

    threshold = best_time * (1 + OUTLIER_THRESHOLD)
    return [t for t in lap_times if t <= threshold]


def estimate_large_file_duration(file_path: Path) -> dict:
    """Estimate session duration from a large file by reading only the header."""
    filename = file_path.name
    date_info = parse_date_from_filename(filename)
    file_size = file_path.stat().st_size

    with open(file_path, "rb") as f:
        header_data = f.read(500000)  # Read enough for header + session info

    header = parse_ibt_header(header_data)
    session_info = extract_session_info(header_data, header["session_info_offset"], header["session_info_len"])

    # Estimate duration from file size
    tick_rate = header["tick_rate"]
    buf_len = header["buf_len"]
    buf_offset = header["buf_offset"]
    data_size = file_size - buf_offset
    estimated_samples = data_size // buf_len
    session_duration_seconds = estimated_samples / tick_rate if tick_rate > 0 else 0

    return {
        "file_name": filename,
        "date": date_info["date"] if date_info else None,
        "time": date_info["time"] if date_info else None,
        "datetime": date_info["datetime"].isoformat() if date_info else None,
        **session_info,
        "laps": [],
        "best_lap_time": None,
        "best_lap_time_formatted": None,
        "total_laps": 0,
        "session_duration_seconds": session_duration_seconds,
        "session_duration_formatted": format_duration(session_duration_seconds),
        "estimated": True,  # Flag that this is an estimate
    }


def process_ibt_file(file_path: Path) -> dict:
    """Process a single IBT file and extract lap data."""
    filename = file_path.name
    date_info = parse_date_from_filename(filename)

    # Check file size - for large files, just estimate duration
    file_size = file_path.stat().st_size
    if file_size > MAX_FILE_SIZE:
        return estimate_large_file_duration(file_path)

    with open(file_path, "rb") as f:
        data = f.read()

    header = parse_ibt_header(data)
    session_info = extract_session_info(data, header["session_info_offset"], header["session_info_len"])
    variables = parse_var_headers(data, header["num_vars"], header["var_header_offset"])

    # Calculate session duration from telemetry samples
    buf_offset = header["buf_offset"]
    buf_len = header["buf_len"]
    tick_rate = header["tick_rate"]
    total_samples = (len(data) - buf_offset) // buf_len
    session_duration_seconds = total_samples / tick_rate if tick_rate > 0 else 0

    # Find lap variables
    var_map = {v["name"]: v for v in variables}
    lap_var = var_map.get("Lap")
    last_lap_time_var = var_map.get("LapLastLapTime")
    best_lap_time_var = var_map.get("LapBestLapTime")

    if not lap_var or not last_lap_time_var:
        return {
            "file_name": filename,
            "date": date_info["date"] if date_info else None,
            "time": date_info["time"] if date_info else None,
            **session_info,
            "laps": [],
            "best_lap_time": None,
            "total_laps": 0,
            "session_duration_seconds": session_duration_seconds,
            "session_duration_formatted": format_duration(session_duration_seconds),
            "error": "Missing lap variables",
        }

    # Extract lap times
    laps = []
    prev_lap = -1
    session_best_time = float("inf")

    for i in range(total_samples):
        sample_offset = buf_offset + i * buf_len
        lap = read_var(data, lap_var, sample_offset)
        last_lap_time = read_var(data, last_lap_time_var, sample_offset)

        if lap != prev_lap and prev_lap >= 0:
            if last_lap_time and 0 < last_lap_time < 600:
                laps.append(
                    {
                        "lap_number": prev_lap,
                        "time_seconds": last_lap_time,
                        "time_formatted": format_lap_time(last_lap_time),
                    }
                )
                if last_lap_time < session_best_time:
                    session_best_time = last_lap_time

        prev_lap = lap

    # Check final best lap time from telemetry
    if best_lap_time_var and total_samples > 0:
        last_sample_offset = buf_offset + (total_samples - 1) * buf_len
        final_best = read_var(data, best_lap_time_var, last_sample_offset)
        if final_best and 0 < final_best < session_best_time:
            session_best_time = final_best

    best_time = session_best_time if session_best_time < float("inf") else None

    # Extract sector times for each lap
    sector_starts = session_info.get("sector_starts", [])
    laps_with_sectors = extract_sector_times(data, header, variables, sector_starts)

    return {
        "file_name": filename,
        "date": date_info["date"] if date_info else None,
        "time": date_info["time"] if date_info else None,
        "datetime": date_info["datetime"].isoformat() if date_info else None,
        **session_info,
        "laps": laps,
        "best_lap_time": best_time,
        "best_lap_time_formatted": format_lap_time(best_time),
        "total_laps": len(laps),
        "session_duration_seconds": session_duration_seconds,
        "session_duration_formatted": format_duration(session_duration_seconds),
        "laps_with_sectors": laps_with_sectors,
    }


def detect_purple_sectors(laps_with_sectors: dict, best_sectors: dict, num_sectors: int) -> list:
    """
    Detect purple (personal best) sectors for each lap.
    Returns list of notable laps with purple sector info.
    """
    notable_laps = []

    # We need to process laps in order to track evolving personal bests
    current_bests = {i: float("inf") for i in range(num_sectors)}

    for lap_num in sorted(laps_with_sectors.keys()):
        lap_data = laps_with_sectors[lap_num]
        sectors = lap_data.get("sectors", {})

        if len(sectors) != num_sectors:
            continue

        purple_count = 0
        purple_sectors = []

        for sector_idx in range(num_sectors):
            sector_time = sectors.get(sector_idx)
            if sector_time is None:
                continue

            # Check if this is a personal best for this sector
            if sector_time < current_bests[sector_idx]:
                purple_count += 1
                purple_sectors.append(sector_idx)
                current_bests[sector_idx] = sector_time

        # Determine lap classification
        if purple_count == num_sectors:
            classification = "ALL_PURPLE"
        elif purple_count == num_sectors - 1:
            classification = "ALMOST"
        elif purple_count > 0:
            classification = "PARTIAL"
        else:
            classification = None

        if classification:
            notable_laps.append({
                "lap": lap_num,
                "classification": classification,
                "purple_count": purple_count,
                "purple_sectors": purple_sectors,
                "sector_times": [sectors.get(i) for i in range(num_sectors)],
                "lap_time": lap_data.get("lap_time"),
            })

    return notable_laps, current_bests


def main():
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Get all .ibt files
    files = sorted(MONZA_DIR.glob("*.ibt"))
    print(f"Processing {len(files)} .ibt files...\n")

    sessions = []
    total_laps = 0
    best_overall_time = float("inf")
    best_overall_file = None

    # Track sector personal bests across all sessions
    global_best_sectors: dict[str, dict[int, float]] = {}  # key: car, value: {sector_idx: time}
    all_purple_laps = []  # Laps where ALL sectors were purple
    almost_purple_laps = []  # Laps where all but 1 sector were purple

    for i, file_path in enumerate(files, 1):
        print(f"\r[{i}/{len(files)}] {file_path.name[:50]}...", end="", flush=True)

        try:
            result = process_ibt_file(file_path)
            sessions.append(result)
            total_laps += result["total_laps"]

            if result["best_lap_time"] and result["best_lap_time"] < best_overall_time:
                best_overall_time = result["best_lap_time"]
                best_overall_file = file_path.name

            # Process sector data for purple detection
            laps_with_sectors = result.get("laps_with_sectors", {})
            num_sectors = result.get("num_sectors", 0)
            car = result.get("car", "Unknown")
            is_wet = result.get("is_wet", False)

            if laps_with_sectors and num_sectors > 0 and not is_wet:
                # Initialize car's best sectors if needed
                if car not in global_best_sectors:
                    global_best_sectors[car] = {i: float("inf") for i in range(num_sectors)}

                # Check each lap for purple sectors
                for lap_num in sorted(laps_with_sectors.keys()):
                    lap_data = laps_with_sectors[lap_num]
                    sectors = lap_data.get("sectors", {})

                    if len(sectors) != num_sectors:
                        continue

                    purple_count = 0
                    purple_sectors = []

                    for sector_idx in range(num_sectors):
                        sector_time = sectors.get(sector_idx)
                        if sector_time is None:
                            continue

                        # Check if this is a personal best for this sector
                        if sector_time < global_best_sectors[car][sector_idx]:
                            purple_count += 1
                            purple_sectors.append(sector_idx)
                            global_best_sectors[car][sector_idx] = sector_time

                    # Record notable laps
                    if purple_count == num_sectors:
                        all_purple_laps.append({
                            "file": file_path.name,
                            "date": result.get("date"),
                            "car": car,
                            "lap": lap_num,
                            "sector_times": [sectors.get(i) for i in range(num_sectors)],
                            "lap_time": lap_data.get("lap_time"),
                            "lap_time_formatted": format_lap_time(lap_data.get("lap_time")),
                        })
                    elif purple_count == num_sectors - 1:
                        # Find which sector wasn't purple
                        non_purple = [i for i in range(num_sectors) if i not in purple_sectors]
                        almost_purple_laps.append({
                            "file": file_path.name,
                            "date": result.get("date"),
                            "car": car,
                            "lap": lap_num,
                            "purple_sectors": purple_sectors,
                            "missed_sector": non_purple[0] if non_purple else None,
                            "sector_times": [sectors.get(i) for i in range(num_sectors)],
                            "lap_time": lap_data.get("lap_time"),
                            "lap_time_formatted": format_lap_time(lap_data.get("lap_time")),
                        })

        except Exception as e:
            print(f"\nError processing {file_path.name}: {e}")
            sessions.append({"file_name": file_path.name, "error": str(e)})

    print("\n\n--- Summary ---")
    print(f"Total sessions: {len(sessions)}")
    print(f"Total laps recorded: {total_laps}")
    print(f"Best overall lap: {format_lap_time(best_overall_time)} ({best_overall_file})")

    # Group by date AND car for daily stats
    by_date_and_car: dict[str, dict] = {}
    car_stats: dict[str, dict] = {}
    wet_sessions_count = 0
    outlier_laps_filtered = 0

    for s in sessions:
        if "error" in s or not s.get("date") or not s.get("car"):
            continue

        is_wet = s.get("is_wet", False)
        if is_wet:
            wet_sessions_count += 1

        key = f"{s['date']}|{s['car']}"

        # Track per date+car
        if key not in by_date_and_car:
            by_date_and_car[key] = {
                "date": s["date"],
                "car": s["car"],
                "sessions": 0,
                "total_laps": 0,
                "all_lap_times": [],
                "best_time": float("inf"),
                "best_time_formatted": None,
                "track": s["track"],
                "session_time_seconds": 0,
            }

        entry = by_date_and_car[key]
        entry["sessions"] += 1
        entry["session_time_seconds"] += s.get("session_duration_seconds", 0)

        # Only include lap data from dry sessions
        if not is_wet:
            entry["total_laps"] += s["total_laps"]

            # Collect lap times
            for lap in s.get("laps", []):
                time_sec = lap["time_seconds"]
                if 0 < time_sec < 600:
                    entry["all_lap_times"].append(time_sec)

            if s["best_lap_time"] and s["best_lap_time"] < entry["best_time"]:
                entry["best_time"] = s["best_lap_time"]
                entry["best_time_formatted"] = s["best_lap_time_formatted"]

        # Track overall car stats
        car = s["car"]
        if car not in car_stats:
            car_stats[car] = {
                "car": car,
                "total_sessions": 0,
                "total_laps": 0,
                "all_lap_times": [],
                "best_time": float("inf"),
                "best_time_formatted": None,
                "session_time_seconds": 0,
            }

        car_entry = car_stats[car]
        car_entry["total_sessions"] += 1
        car_entry["session_time_seconds"] += s.get("session_duration_seconds", 0)

        # Only include lap data from dry sessions
        if not is_wet:
            car_entry["total_laps"] += s["total_laps"]

            for lap in s.get("laps", []):
                time_sec = lap["time_seconds"]
                if 0 < time_sec < 600:
                    car_entry["all_lap_times"].append(time_sec)

            if s["best_lap_time"] and s["best_lap_time"] < car_entry["best_time"]:
                car_entry["best_time"] = s["best_lap_time"]
                car_entry["best_time_formatted"] = s["best_lap_time_formatted"]

    # Calculate consistency stats for each date+car combo
    for entry in by_date_and_car.values():
        all_times = entry["all_lap_times"]
        best = entry["best_time"] if entry["best_time"] < float("inf") else None
        times = filter_outlier_laps(all_times, best) if best else all_times
        outlier_count = len(all_times) - len(times)
        outlier_laps_filtered += outlier_count

        entry["total_laps_raw"] = len(all_times)
        entry["total_laps_clean"] = len(times)
        entry["outliers_filtered"] = outlier_count

        if times:
            entry["median_time"] = statistics.median(times)
            entry["median_time_formatted"] = format_lap_time(entry["median_time"])
            entry["slowest_time"] = max(times)
            entry["slowest_time_formatted"] = format_lap_time(entry["slowest_time"])
            entry["range"] = entry["slowest_time"] - entry["best_time"] if entry["best_time"] < float("inf") else None
            entry["range_formatted"] = f"{entry['range']:.3f}s" if entry["range"] else None
            entry["consistency_score"] = calculate_consistency_score(times)
        else:
            entry["median_time"] = None
            entry["median_time_formatted"] = None
            entry["slowest_time"] = None
            entry["slowest_time_formatted"] = None
            entry["range"] = None
            entry["range_formatted"] = None
            entry["consistency_score"] = None

        # Clean up best_time infinity
        if entry["best_time"] == float("inf"):
            entry["best_time"] = None

        # Add formatted session time
        entry["session_time_formatted"] = format_duration(entry["session_time_seconds"])

        del entry["all_lap_times"]

    # Calculate consistency stats for each car
    for entry in car_stats.values():
        all_times = entry["all_lap_times"]
        best = entry["best_time"] if entry["best_time"] < float("inf") else None
        times = filter_outlier_laps(all_times, best) if best else all_times

        entry["total_laps_raw"] = len(all_times)
        entry["total_laps_clean"] = len(times)

        if times:
            entry["median_time"] = statistics.median(times)
            entry["median_time_formatted"] = format_lap_time(entry["median_time"])
            entry["consistency_score"] = calculate_consistency_score(times)
        else:
            entry["median_time"] = None
            entry["median_time_formatted"] = None
            entry["consistency_score"] = None

        if entry["best_time"] == float("inf"):
            entry["best_time"] = None

        # Add formatted session time
        entry["session_time_formatted"] = format_duration(entry["session_time_seconds"])

        del entry["all_lap_times"]

    # Sort daily bests by date, then car
    daily_bests = sorted(by_date_and_car.values(), key=lambda x: (x["date"], x["car"]))

    # Sort car stats by session count (most used first)
    car_stats_list = sorted(car_stats.values(), key=lambda x: x["total_sessions"], reverse=True)

    print("\n--- Filtering Stats ---")
    print(f"Wet sessions: {wet_sessions_count} (time counted, lap data excluded)")
    print(f"Outlier laps filtered: {outlier_laps_filtered} (>{OUTLIER_THRESHOLD * 100:.0f}% slower than best)")

    # Calculate total time
    total_session_time = sum(s.get("session_duration_seconds", 0) for s in sessions if "error" not in s)

    print("\n--- Car Statistics ---")
    for c in car_stats_list:
        consistency = f"{c['consistency_score']}%" if c["consistency_score"] else "N/A"
        print(f"{c['car']}: {c['best_time_formatted']} best, median {c['median_time_formatted']}, {consistency} consistency, {c['total_laps_clean']}/{c['total_laps_raw']} laps, {c['session_time_formatted']} track time")

    print("\n--- Daily Stats (by car) ---")
    for d in daily_bests:
        consistency = f"{d['consistency_score']}%" if d["consistency_score"] else "N/A"
        range_str = d["range_formatted"] or "N/A"
        filtered = f" [{d['outliers_filtered']} outliers]" if d["outliers_filtered"] > 0 else ""
        print(f"{d['date']} [{d['car']}]: Best {d['best_time_formatted']}, {d['session_time_formatted']} on track, {d['total_laps_clean']} laps, {consistency} consistency{filtered}")

    print(f"\n--- Total Track Time: {format_duration(total_session_time)} ---")

    # Print purple sector summary
    print(f"\n--- Purple Sector Achievements ---")
    print(f"ALL PURPLE laps: {len(all_purple_laps)}")
    for lap in all_purple_laps:
        sectors_str = " | ".join([f"{t:.3f}" for t in lap["sector_times"]])
        print(f"  {lap['date']} - {lap['car']} Lap {lap['lap']}: [{sectors_str}] = {lap['lap_time_formatted']}")

    print(f"\nALMOST purple laps (1 sector off): {len(almost_purple_laps)}")
    for lap in almost_purple_laps[-10:]:  # Show last 10
        sectors_str = " | ".join([f"{t:.3f}" for t in lap["sector_times"]])
        missed = lap["missed_sector"] + 1  # 1-indexed for display
        print(f"  {lap['date']} - {lap['car']} Lap {lap['lap']}: [{sectors_str}] = {lap['lap_time_formatted']} (missed S{missed})")
    if len(almost_purple_laps) > 10:
        print(f"  ... and {len(almost_purple_laps) - 10} more")

    # Print current best sectors per car
    print(f"\n--- Current Best Sectors ---")
    for car, sectors in global_best_sectors.items():
        if all(t < float("inf") for t in sectors.values()):
            sector_str = " | ".join([f"S{i+1}: {t:.3f}" for i, t in sectors.items()])
            theoretical_best = sum(sectors.values())
            print(f"  {car}: [{sector_str}] = {format_lap_time(theoretical_best)} theoretical")

    # Convert keys for JSON (camelCase for JS compatibility)
    def to_camel_case(data):
        if isinstance(data, dict):
            result = {}
            for k, v in data.items():
                # Handle integer keys (like lap numbers) - keep as-is
                if isinstance(k, int):
                    result[k] = to_camel_case(v)
                else:
                    camel_key = "".join(word.capitalize() if i > 0 else word for i, word in enumerate(k.split("_")))
                    result[camel_key] = to_camel_case(v)
            return result
        elif isinstance(data, list):
            return [to_camel_case(item) for item in data]
        return data

    # Prepare best sectors for JSON (convert to list format)
    best_sectors_output = {}
    for car, sectors in global_best_sectors.items():
        if all(t < float("inf") for t in sectors.values()):
            best_sectors_output[car] = {
                "sectors": [sectors[i] for i in range(len(sectors))],
                "sectorsFormatted": [f"{sectors[i]:.3f}" for i in range(len(sectors))],
                "theoreticalBest": sum(sectors.values()),
                "theoreticalBestFormatted": format_lap_time(sum(sectors.values())),
            }

    # Save full telemetry data
    best_time_final = best_overall_time if best_overall_time < float("inf") else None
    output_data = {
        "generated": datetime.now().isoformat(),
        "totalSessions": len(sessions),
        "totalLaps": total_laps,
        "totalTrackTimeSeconds": total_session_time,
        "totalTrackTimeFormatted": format_duration(total_session_time),
        "bestOverallTime": best_time_final,
        "bestOverallTimeFormatted": format_lap_time(best_time_final),
        "carStats": to_camel_case(car_stats_list),
        "dailyBests": to_camel_case(daily_bests),
        "sessions": to_camel_case([s for s in sessions if "error" not in s]),
        "purpleSectors": {
            "allPurpleLaps": to_camel_case(all_purple_laps),
            "almostPurpleLaps": to_camel_case(almost_purple_laps),
            "bestSectorsByCar": best_sectors_output,
        },
    }

    output_file = OUTPUT_DIR / "telemetry-data.json"
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)
    print(f"\nData saved to: {output_file}")

    # Save summary
    summary_data = {
        "generated": datetime.now().isoformat(),
        "track": "Autodromo Nazionale Monza",
        "trackShort": "Monza Full",
        "totalSessions": len(sessions),
        "totalLaps": total_laps,
        "totalTrackTimeSeconds": total_session_time,
        "totalTrackTimeFormatted": format_duration(total_session_time),
        "bestOverallTime": best_time_final,
        "bestOverallTimeFormatted": format_lap_time(best_time_final),
        "carStats": to_camel_case(car_stats_list),
        "dailyBests": to_camel_case(daily_bests),
        "purpleSectors": {
            "allPurpleLaps": to_camel_case(all_purple_laps),
            "almostPurpleLaps": to_camel_case(almost_purple_laps),
            "bestSectorsByCar": best_sectors_output,
            "totalAllPurple": len(all_purple_laps),
            "totalAlmostPurple": len(almost_purple_laps),
        },
    }

    summary_file = OUTPUT_DIR / "summary.json"
    with open(summary_file, "w") as f:
        json.dump(summary_data, f, indent=2)
    print(f"Summary saved to: {summary_file}")


if __name__ == "__main__":
    main()
