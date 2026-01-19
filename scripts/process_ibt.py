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

    return {
        "track": extract(r"TrackDisplayName:\s*(.+)") or "Unknown",
        "track_short": extract(r"TrackDisplayShortName:\s*(.+)") or "Unknown",
        "car": extract(r"CarScreenName:\s*(.+)") or "Unknown",
        "driver": extract(r"UserName:\s*(.+)") or "Unknown",
        "precipitation": precipitation,
        "skies": extract(r"TrackSkies:\s*(.+)") or "Unknown",
        "is_wet": precipitation > 0,
    }


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


def process_ibt_file(file_path: Path) -> dict:
    """Process a single IBT file and extract lap data."""
    filename = file_path.name
    date_info = parse_date_from_filename(filename)

    # Check file size
    file_size = file_path.stat().st_size
    if file_size > MAX_FILE_SIZE:
        raise ValueError(f"File size ({file_size}) is greater than 2 GiB")

    with open(file_path, "rb") as f:
        data = f.read()

    header = parse_ibt_header(data)
    session_info = extract_session_info(data, header["session_info_offset"], header["session_info_len"])
    variables = parse_var_headers(data, header["num_vars"], header["var_header_offset"])

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
            "error": "Missing lap variables",
        }

    buf_offset = header["buf_offset"]
    buf_len = header["buf_len"]
    total_samples = (len(data) - buf_offset) // buf_len

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
    }


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

    for i, file_path in enumerate(files, 1):
        print(f"\r[{i}/{len(files)}] {file_path.name[:50]}...", end="", flush=True)

        try:
            result = process_ibt_file(file_path)
            sessions.append(result)
            total_laps += result["total_laps"]

            if result["best_lap_time"] and result["best_lap_time"] < best_overall_time:
                best_overall_time = result["best_lap_time"]
                best_overall_file = file_path.name
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
    wet_sessions_skipped = 0
    outlier_laps_filtered = 0

    for s in sessions:
        if "error" in s or not s.get("date") or not s.get("car"):
            continue

        # Skip wet sessions if configured
        if EXCLUDE_WET_SESSIONS and s.get("is_wet"):
            wet_sessions_skipped += 1
            continue

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
            }

        entry = by_date_and_car[key]
        entry["sessions"] += 1
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
            }

        car_entry = car_stats[car]
        car_entry["total_sessions"] += 1
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

        del entry["all_lap_times"]

    # Sort daily bests by date, then car
    daily_bests = sorted(by_date_and_car.values(), key=lambda x: (x["date"], x["car"]))

    # Sort car stats by session count (most used first)
    car_stats_list = sorted(car_stats.values(), key=lambda x: x["total_sessions"], reverse=True)

    print("\n--- Filtering Stats ---")
    print(f"Wet sessions skipped: {wet_sessions_skipped}")
    print(f"Outlier laps filtered: {outlier_laps_filtered} (>{OUTLIER_THRESHOLD * 100:.0f}% slower than best)")

    print("\n--- Car Statistics ---")
    for c in car_stats_list:
        consistency = f"{c['consistency_score']}%" if c["consistency_score"] else "N/A"
        print(f"{c['car']}: {c['best_time_formatted']} best, median {c['median_time_formatted']}, {consistency} consistency, {c['total_laps_clean']}/{c['total_laps_raw']} laps")

    print("\n--- Daily Stats (by car) ---")
    for d in daily_bests:
        consistency = f"{d['consistency_score']}%" if d["consistency_score"] else "N/A"
        range_str = d["range_formatted"] or "N/A"
        filtered = f" [{d['outliers_filtered']} outliers]" if d["outliers_filtered"] > 0 else ""
        print(f"{d['date']} [{d['car']}]: Best {d['best_time_formatted']}, Median {d['median_time_formatted']}, Range {range_str}, Consistency {consistency} ({d['total_laps_clean']} laps){filtered}")

    # Convert keys for JSON (camelCase for JS compatibility)
    def to_camel_case(data):
        if isinstance(data, dict):
            return {
                "".join(word.capitalize() if i > 0 else word for i, word in enumerate(k.split("_"))): to_camel_case(v)
                for k, v in data.items()
            }
        elif isinstance(data, list):
            return [to_camel_case(item) for item in data]
        return data

    # Save full telemetry data
    best_time_final = best_overall_time if best_overall_time < float("inf") else None
    output_data = {
        "generated": datetime.now().isoformat(),
        "totalSessions": len(sessions),
        "totalLaps": total_laps,
        "bestOverallTime": best_time_final,
        "bestOverallTimeFormatted": format_lap_time(best_time_final),
        "carStats": to_camel_case(car_stats_list),
        "dailyBests": to_camel_case(daily_bests),
        "sessions": to_camel_case([s for s in sessions if "error" not in s]),
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
        "bestOverallTime": best_time_final,
        "bestOverallTimeFormatted": format_lap_time(best_time_final),
        "carStats": to_camel_case(car_stats_list),
        "dailyBests": to_camel_case(daily_bests),
    }

    summary_file = OUTPUT_DIR / "summary.json"
    with open(summary_file, "w") as f:
        json.dump(summary_data, f, indent=2)
    print(f"Summary saved to: {summary_file}")


if __name__ == "__main__":
    main()
