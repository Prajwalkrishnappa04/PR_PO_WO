import frappe
from frappe.utils import get_time, getdate

def execute():
    if not frappe.db.has_column("Employee Checkin", "custom_exact_time"):
        return

    # Fetch check-ins where custom_exact_time or custom_exact_date is missing
    checkins = frappe.get_all("Employee Checkin", or_filters=[
        ["custom_exact_time", "is", "not set"],
        ["custom_exact_date", "is", "not set"]
    ], fields=["name", "time"])
    
    for c in checkins:
        if c.time:
            frappe.db.set_value("Employee Checkin", c.name, {
                "custom_exact_time": get_time(c.time),
                "custom_exact_date": getdate(c.time)
            }, update_modified=False)
    
    frappe.db.commit()
