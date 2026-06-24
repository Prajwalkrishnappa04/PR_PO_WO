import os
import sys

# Add apps to sys.path
base_path = "/Users/aliklaha/Hybrowlabs/maa_foundation"
sys.path.append(os.path.join(base_path, "apps/frappe"))
sys.path.append(os.path.join(base_path, "apps/hrms"))
sys.path.append(os.path.join(base_path, "apps/po_wo_pr"))

import frappe

def run_sync():
    try:
        frappe.init(site="maafoundation.localhost", sites_path=os.path.join(base_path, "sites"))
        frappe.connect()
        
        from po_wo_pr.api.attendance_utils import update_all_attendance_work_hours
        result = update_all_attendance_work_hours()
        print(result)
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        if frappe.local.db:
            frappe.db.close()

if __name__ == "__main__":
    run_sync()
