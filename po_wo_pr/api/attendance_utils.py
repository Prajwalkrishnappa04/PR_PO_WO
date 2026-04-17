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
