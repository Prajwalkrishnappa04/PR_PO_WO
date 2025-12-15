import json
import requests
import frappe
from frappe.utils import nowdate


BIOMETRIC_URL = "http://api.microcrispr.com/Maafoundation/api/Values"
BIOMETRIC_USER = "admin"
BIOMETRIC_PASSWORD = "MerilADM"


@frappe.whitelist()
def import_today_biometric_data():
    """Fetch today's punches from biometric API and create Employee Checkin records."""
    today = nowdate()  # "YYYY-MM-DD"

    params = {
        "username": BIOMETRIC_USER,
        "password": BIOMETRIC_PASSWORD,
        "frm": today,
        "to": today,
    }

    try:
        res = requests.get(BIOMETRIC_URL, params=params, timeout=30)
        res.raise_for_status()
        print(res)
        return res
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Biometric API Request Failed")
        frappe.throw(f"Biometric API request failed: {e}")

    # Try to parse JSON once
    raw = res.text

    try:
        data = res.json()
    except ValueError:
        # If res.json() fails, maybe it's a JSON string inside a string
        try:
            data = json.loads(raw)
        except Exception:
            frappe.log_error(raw, "Biometric API Invalid JSON")
            frappe.throw("Biometric API returned invalid JSON.")

    # Normalize: we expect a list of dicts
    if isinstance(data, dict):
        punch_list = [data]
    elif isinstance(data, list):
        punch_list = data
    else:
        frappe.log_error(str(type(data)), "Biometric API Unexpected Root Type")
        frappe.throw(f"Unexpected biometric API response type: {type(data)}")

    process_biometric_punches(punch_list)


def process_biometric_punches(punch_list: list):
    """
    Process list of biometric punches.
    Each item should end up as a dict like:
        {"EmpCode": "...", "OFFICEPUNCH": "2025-12-05 17:54:33"}
    """
    for row in punch_list:
        # If the row is a JSON string, parse it
        if isinstance(row, str):
            try:
                row = json.loads(row)
            except Exception:
                frappe.log_error(
                    f"Cannot parse row (string): {row}",
                    "Biometric Import Row Parse Error",
                )
                continue

        # If it's still not a dict, skip
        if not isinstance(row, dict):
            frappe.log_error(
                f"Unexpected row type: {type(row)} | value: {row}",
                "Biometric Import Row Type Error",
            )
            continue

        emp_code = row.get("EmpCode")
        punch_time_str = row.get("OFFICEPUNCH")

        if not emp_code or not punch_time_str:
            frappe.log_error(
                f"Incomplete row: {row}",
                "Biometric Import Missing Fields",
            )
            continue

        # Map EmpCode to Employee (change field name if different)
        employee = frappe.db.get_value(
            "Employee",
            {"attendance_device_id": emp_code},
            "name",
        )

        if not employee:
            frappe.log_error(
                f"No Employee found for EmpCode: {emp_code}",
                "Biometric Import Unknown Employee",
            )
            continue

        # Avoid duplicates – adjust unique keys as per your design
        exists = frappe.db.exists(
            "Employee Checkin",
            {
                "employee": employee,
                "time": punch_time_str,
            },
        )
        if exists:
            continue

        doc = frappe.new_doc("Employee Checkin")
        doc.update(
            {
                "employee": employee,
                "time": punch_time_str,
                # TODO: decide log_type – simple version always IN
                "log_type": "IN",
                "skip_auto_attendance": 0,
            }
        )

        try:
            doc.insert(ignore_permissions=True)
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                "Biometric Import Insert Failed",
            )

    frappe.db.commit()
