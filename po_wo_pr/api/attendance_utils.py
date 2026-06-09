import frappe
from frappe.utils import date_diff, get_datetime, get_time, getdate

def update_custom_work_hours(doc, method=None):
    if doc.working_hours:
        doc.custom_work_hours = format_decimal_to_time(doc.working_hours)
    else:
        doc.custom_work_hours = ""

def format_decimal_to_time(decimal_hours):
    if not decimal_hours:
        return "00:00:00"
    
    try:
        hours = int(decimal_hours)
        minutes_decimal = (decimal_hours - hours) * 60
        minutes = int(minutes_decimal)
        seconds = int(round((minutes_decimal - minutes) * 60))
        
        # Handle overflow
        if seconds >= 60:
            seconds = 0
            minutes += 1
        if minutes >= 60:
            minutes = 0
            hours += 1
            
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    except Exception:
        return "00:00:00"

def update_custom_exact_time(doc, method=None):
    if doc.time:
        # doc.time is a datetime object or string
        from frappe.utils import get_time, getdate
        doc.custom_exact_time = get_time(doc.time)
        doc.custom_exact_date = getdate(doc.time)
    else:
        doc.custom_exact_time = None
        doc.custom_exact_date = None

def update_attendance_exact_times(doc, method=None):
    if doc.in_time:
        doc.custom_exact_in_time = get_time(doc.in_time)
    else:
        doc.custom_exact_in_time = None
        
    if doc.out_time:
        doc.custom_exact_out_time = get_time(doc.out_time)
    else:
        doc.custom_exact_out_time = None

def sync_old_checkin_times():
    from frappe.utils import get_time, getdate
    # To get records where EITHER is missing:
    checkins = frappe.get_all("Employee Checkin", or_filters=[
        ["custom_exact_time", "is", "not set"],
        ["custom_exact_date", "is", "not set"]
    ], fields=["name", "time"])
    
    count = 0
    for c in checkins:
        if c.time:
            frappe.db.set_value("Employee Checkin", c.name, {
                "custom_exact_time": get_time(c.time),
                "custom_exact_date": getdate(c.time)
            }, update_modified=False)
            count += 1
    
    frappe.db.commit()
    return f"Synced {count} records."

def update_all_attendance_work_hours():
    records = frappe.get_all("Attendance", filters={"working_hours": [">", 0]}, fields=["name", "working_hours", "custom_work_hours"])
    count = 0
    for r in records:
        expected_time = format_decimal_to_time(r.working_hours)
        if r.custom_work_hours != expected_time:
            frappe.db.set_value("Attendance", r.name, "custom_work_hours", expected_time, update_modified=False)
            count += 1
    
    frappe.db.commit()
    return f"Updated {count} records."

def sync_attendance_exact_times():
    # To get records where EITHER is missing:
    attendance_records = frappe.get_all("Attendance", or_filters=[
        ["custom_exact_in_time", "is", "not set"],
        ["custom_exact_out_time", "is", "not set"]
    ], fields=["name", "in_time", "out_time"])
    
    count = 0
    for a in attendance_records:
        updates = {}
        if a.in_time:
            updates["custom_exact_in_time"] = get_time(a.in_time)
        if a.out_time:
            updates["custom_exact_out_time"] = get_time(a.out_time)
            
        if updates:
            frappe.db.set_value("Attendance", a.name, updates, update_modified=False)
            count += 1
    
    frappe.db.commit()
    return f"Synced {count} Attendance records."


def apply_attendance_request_times(doc, method=None):
    if doc.reason != "On Duty":
        return

    in_time = _get_request_datetime(doc, "custom_in_time")
    out_time = _get_request_datetime(doc, "custom_out_time")

    if not in_time and not out_time:
        return

    request_days = date_diff(doc.to_date, doc.from_date) + 1
    for day in range(request_days):
        attendance_date = frappe.utils.add_days(doc.from_date, day)
        attendance_name = frappe.db.exists(
            "Attendance",
            {
                "employee": doc.employee,
                "attendance_date": attendance_date,
                "docstatus": ("!=", 2),
            },
        )

        if not attendance_name:
            continue

        updates = {"attendance_request": doc.name}

        if in_time and getdate(in_time) == getdate(attendance_date):
            updates["in_time"] = in_time
            if _has_attendance_field("custom_exact_in_time"):
                updates["custom_exact_in_time"] = get_time(in_time)

        if out_time and getdate(out_time) == getdate(attendance_date):
            updates["out_time"] = out_time
            if _has_attendance_field("custom_exact_out_time"):
                updates["custom_exact_out_time"] = get_time(out_time)

        _set_working_hours(attendance_name, updates)

        if len(updates) > 1:
            frappe.db.set_value("Attendance", attendance_name, updates, update_modified=False)


def _get_request_datetime(doc, fieldname):
    if not doc.meta.has_field(fieldname) or not doc.get(fieldname):
        return None

    try:
        return get_datetime(doc.get(fieldname))
    except Exception:
        return None


def _has_attendance_field(fieldname):
    return frappe.get_meta("Attendance").has_field(fieldname)


def _set_working_hours(attendance_name, updates):
    in_time = updates.get("in_time")
    out_time = updates.get("out_time")

    if not in_time or not out_time:
        existing_in_time, existing_out_time = frappe.db.get_value(
            "Attendance",
            attendance_name,
            ["in_time", "out_time"],
        )
        in_time = in_time or existing_in_time
        out_time = out_time or existing_out_time

    if not in_time or not out_time:
        return

    working_hours = (get_datetime(out_time) - get_datetime(in_time)).total_seconds() / 3600
    if working_hours < 0:
        return

    updates["working_hours"] = working_hours
    if _has_attendance_field("custom_work_hours"):
        updates["custom_work_hours"] = format_decimal_to_time(working_hours)
