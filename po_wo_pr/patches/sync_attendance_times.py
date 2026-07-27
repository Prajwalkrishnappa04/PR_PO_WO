import frappe
from po_wo_pr.api.attendance_utils import sync_attendance_exact_times


def execute():
    if not frappe.db.has_column("Attendance", "custom_exact_in_time"):
        return
    sync_attendance_exact_times()
