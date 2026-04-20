import frappe
from po_wo_pr.api.attendance_utils import sync_attendance_exact_times

def execute():
    sync_attendance_exact_times()
