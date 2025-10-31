import csv
import json

csv_file = "/home/asus/Downloads/Map Database - Hydrogen infrastructure May2024.xlsx - Pipeline Coordinates.csv"
output_sql = "insert_pipelines.sql"

file_link = "https://docs.google.com/spreadsheets/d/1dTtyOdUE2c9p4ZIcVo_AoHDR4nh5_8aXLtzrjmgGFm8/edit?gid=2026630654#gid=2026630654"

def safe_float(value):
    try:
        return float(value.strip())
    except (ValueError, AttributeError):
        return None

with open(csv_file, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    inserts = []
    line = 1
    for row in reader:
        pipeline_nr = row.get("Pipeline nr.", "").strip()
        segment = row.get("Segment", "").strip()
        start_coords = row.get("Start", "").split(",")
        stop_coords = row.get("Stop", "").split(",")
        start_loc = row.get("Approx location Start", "").strip()
        stop_loc = row.get("Approx location Stop", "").strip()

        start_lat = safe_float(start_coords[0]) if len(start_coords) > 0 else None
        start_lng = safe_float(start_coords[1]) if len(start_coords) > 1 else None
        stop_lat = safe_float(stop_coords[0]) if len(stop_coords) > 0 else None
        stop_lng = safe_float(stop_coords[1]) if len(stop_coords) > 1 else None

        data = {
            "pipeline_nr": pipeline_nr if pipeline_nr else None,
            "segment": segment if segment else None,
            "start": {
                "lat": start_lat,
                "lng": start_lng,
                "location": start_loc if start_loc else None
            },
            "stop": {
                "lat": stop_lat,
                "lng": stop_lng,
                "location": stop_loc if stop_loc else None
            }
        }

        sql = f"""
INSERT INTO project_map (
    internal_id, data, file_link, tab, line, sector, created_by_name
) VALUES (
    'pipeline_{pipeline_nr or "X"}_{segment or "NA"}_{line}',
    '{json.dumps(data)}'::jsonb,
    '{file_link}',
    'pipelines',
    {line},
    'Pipeline',
    'Maryem'
);
"""
        inserts.append(sql)
        line += 1

with open(output_sql, "w", encoding="utf-8") as out:
    out.writelines(inserts)

print(f"✅ SQL script generated: {output_sql}")
