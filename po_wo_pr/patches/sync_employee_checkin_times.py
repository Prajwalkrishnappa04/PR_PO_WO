import frappe
from po_wo_pr.api.attendance_utils import sync_old_checkin_times

def execute():
    sync_old_checkin_times()
