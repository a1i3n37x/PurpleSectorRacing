#!/usr/bin/env python3
"""
Fetch driver stats from Garage61 API or iRacing Data API.

Usage:
    python fetch_stats.py                    # Use iRacing (default)
    python fetch_stats.py --source garage61  # Use Garage61

Credentials are loaded from .env file in project root.
"""

import os
import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import urllib.request
import urllib.error

# Load .env file
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ENV_FILE = PROJECT_ROOT / ".env"

if ENV_FILE.exists():
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())

# Configuration
GARAGE61_TOKEN = os.environ.get(
    "GARAGE61_TOKEN",
    "NJLKMZM0YMQTYWRIYS0ZNJY4LTKXNJITYTE2ZJY0YJQZNGJL"
)
GARAGE61_BASE_URL = "https://garage61.net/api/v1"

OUTPUT_DIR = PROJECT_ROOT / "src" / "data"


def fetch_garage61(endpoint: str) -> Optional[dict]:
    """Fetch data from Garage61 API."""
    url = f"{GARAGE61_BASE_URL}/{endpoint}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {GARAGE61_TOKEN}")

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Garage61 API error: {e.code} - {e.reason}")
        return None
    except urllib.error.URLError as e:
        print(f"Garage61 connection error: {e.reason}")
        return None


def fetch_garage61_stats() -> dict:
    """Fetch stats from Garage61."""
    stats = {
        "source": "garage61",
        "fetched": datetime.now().isoformat(),
        "profile": None,
        "currentRating": None,
        "laps": [],
        "dailyStats": [],
    }

    # Get profile
    profile = fetch_garage61("me")
    if profile:
        stats["profile"] = {
            "id": profile.get("id"),
            "name": f"{profile.get('firstName', '')} {profile.get('lastName', '')}".strip(),
            "slug": profile.get("slug"),
            "subscription": profile.get("subscriptionPlan"),
            "teams": [t.get("name") for t in profile.get("teams", [])],
        }
        print(f"Profile: {stats['profile']['name']}")

    # Get laps (this is where iRating comes from)
    laps_data = fetch_garage61("laps?limit=1000")
    if laps_data and laps_data.get("items"):
        items = laps_data["items"]
        stats["totalLapsInGarage61"] = laps_data.get("total", len(items))

        # Get latest rating from most recent lap
        if items:
            latest = max(items, key=lambda x: x.get("startTime", ""))
            stats["currentRating"] = {
                "iRating": latest.get("driverRating"),
                "asOf": latest.get("startTime"),
                "car": latest.get("car", {}).get("name"),
                "track": latest.get("track", {}).get("name"),
            }
            print(f"Current iRating: {stats['currentRating']['iRating']}")

        # Aggregate by day
        from collections import defaultdict
        by_date = defaultdict(lambda: {"laps": 0, "trackTime": 0.0, "cars": set(), "tracks": set()})

        for lap in items:
            date = lap.get("startTime", "")[:10]
            if date:
                by_date[date]["laps"] += 1
                by_date[date]["trackTime"] += lap.get("lapTime", 0)
                if lap.get("car", {}).get("name"):
                    by_date[date]["cars"].add(lap["car"]["name"])
                if lap.get("track", {}).get("name"):
                    by_date[date]["tracks"].add(lap["track"]["name"])

        stats["dailyStats"] = [
            {
                "date": date,
                "laps": data["laps"],
                "trackTimeMinutes": round(data["trackTime"] / 60, 1),
                "cars": list(data["cars"]),
                "tracks": list(data["tracks"]),
            }
            for date, data in sorted(by_date.items())
        ]

        print(f"Total laps in Garage61: {stats['totalLapsInGarage61']}")
    else:
        print("Warning: No lap data from Garage61 (sync may not be working)")

    return stats


def fetch_iracing_stats() -> dict:
    """Fetch stats directly from iRacing Data API."""
    try:
        from iracingdataapi.client import irDataClient
    except ImportError:
        print("Error: iracingdataapi not installed")
        print("Run: source .venv/bin/activate && pip install iracingdataapi")
        return {"error": "iracingdataapi not installed"}

    username = os.environ.get("IRACING_USERNAME")
    password = os.environ.get("IRACING_PASSWORD")

    if not username or not password:
        print("Error: IRACING_USERNAME and IRACING_PASSWORD not found in .env")
        return {"error": "credentials not set"}

    stats = {
        "source": "iracing",
        "fetched": datetime.now().isoformat(),
    }

    try:
        print(f"Connecting to iRacing as {username}...")
        idc = irDataClient(username=username, password=password)

        # Get member info
        print("Fetching member info...")
        member_info = idc.member_info()
        if member_info:
            stats["member"] = {
                "custId": member_info.get("cust_id"),
                "displayName": member_info.get("display_name"),
                "memberSince": member_info.get("member_since"),
                "clubName": member_info.get("club_name"),
            }
            print(f"  Member: {stats['member'].get('displayName')}")

        # Get member summary (includes iRating, Safety Rating by category)
        print("Fetching career stats...")
        summary = idc.stats_member_summary()
        if summary:
            stats["careerStats"] = summary
            # Extract current ratings per category
            if isinstance(summary, list):
                stats["ratings"] = {}
                for cat in summary:
                    cat_name = cat.get("category", "unknown")
                    stats["ratings"][cat_name] = {
                        "iRating": cat.get("irating"),
                        "safetyRating": cat.get("sr_sub_level"),
                        "license": cat.get("license_level_name"),
                        "starts": cat.get("starts"),
                        "wins": cat.get("wins"),
                        "top5": cat.get("top5"),
                        "avgStartPos": cat.get("avg_start_position"),
                        "avgFinishPos": cat.get("avg_finish_position"),
                        "lapsLed": cat.get("laps_led"),
                        "incidents": cat.get("incidents"),
                        "incidentsPerRace": cat.get("avg_incidents"),
                    }
                    ir = cat.get("irating", "N/A")
                    sr = cat.get("sr_sub_level", "N/A")
                    lic = cat.get("license_level_name", "")
                    print(f"  {cat_name}: iR {ir}, SR {sr} ({lic})")

        # Get recent races
        print("Fetching recent races...")
        recent = idc.stats_member_recent_races()
        if recent:
            stats["recentRaces"] = recent[:20]  # Last 20 races
            print(f"  Found {len(recent)} recent races")

        # Get yearly stats
        print("Fetching yearly stats...")
        yearly = idc.stats_member_yearly()
        if yearly:
            stats["yearlyStats"] = yearly
            print(f"  Found stats for {len(yearly)} years")

        # Get member profile for more details
        print("Fetching profile...")
        try:
            profile = idc.member_profile()
            if profile:
                stats["profile"] = profile
                # Extract key info
                if profile.get("member_info"):
                    mi = profile["member_info"]
                    stats["member"]["licenses"] = mi.get("licenses", [])
        except Exception as e:
            print(f"  Profile fetch failed: {e}")

    except Exception as e:
        print(f"iRacing API error: {e}")
        import traceback
        traceback.print_exc()
        stats["error"] = str(e)

    return stats


def main():
    parser = argparse.ArgumentParser(description="Fetch driver stats from Garage61 or iRacing")
    parser.add_argument(
        "--source",
        choices=["iracing", "garage61"],
        default="iracing",
        help="Data source (default: iracing)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output file path (default: src/data/driver-stats.json)"
    )
    args = parser.parse_args()

    print(f"Fetching stats from {args.source}...")
    print()

    if args.source == "garage61":
        stats = fetch_garage61_stats()
    else:
        stats = fetch_iracing_stats()

    # Save to file
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = Path(args.output) if args.output else OUTPUT_DIR / "driver-stats.json"

    with open(output_file, "w") as f:
        json.dump(stats, f, indent=2, default=str)

    print()
    print(f"Stats saved to: {output_file}")

    # Print summary
    if stats.get("currentRating"):
        print(f"\n=== Current Stats ===")
        print(f"iRating: {stats['currentRating'].get('iRating', 'N/A')}")

    if stats.get("dailyStats"):
        print(f"\n=== Recent Activity ===")
        for day in stats["dailyStats"][-5:]:
            print(f"  {day['date']}: {day['laps']} laps, {day['trackTimeMinutes']} min")


if __name__ == "__main__":
    main()
