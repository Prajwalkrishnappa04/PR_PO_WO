import frappe

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
    from frappe.utils import get_time
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
    from frappe.utils import get_time
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
