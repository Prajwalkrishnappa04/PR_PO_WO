import frappe
from po_wo_pr.api.attendance_utils import update_all_attendance_work_hours

def execute():
    # Sync all existing attendance records to populate the new custom_work_hours field
    update_all_attendance_work_hours()
