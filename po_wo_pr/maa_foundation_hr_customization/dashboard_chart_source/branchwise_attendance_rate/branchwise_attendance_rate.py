import frappe
from frappe.utils import today

@frappe.whitelist()
def get_branch_attendance_chart():
    branches = ["Vapi", "Bhavnagar", "Umbergaon", "Dharampur"]

    employee_counts = frappe.db.get_all(
        "Employee",
        filters={
            "status": "Active",
            "custom_maa_branch": ["in", branches]
        },
        fields=[
            "custom_maa_branch as branch",
            "count(name) as total"
        ],
        group_by="custom_maa_branch"
    )

    present_counts = frappe.db.get_all(
        "Attendance",
        filters={
            "attendance_date": today(),
            "status": ["in", ["Present", "Half Day"]],
            "custom_branch": ["in", branches]
        },
        fields=[
            "custom_branch as branch",
            "count(name) as present"
        ],
        group_by="custom_branch"
    )

    total_map = {row["branch"]: row["total"] for row in employee_counts}
    present_map = {row["branch"]: row["present"] for row in present_counts}

    values = []

    for branch in branches:
        total = total_map.get(branch, 0)
        present = present_map.get(branch, 0)
        rate = round((present / total) * 100, 2) if total else 0
        values.append(rate)

    return {
        "labels": branches,
        "datasets": [
            {
                "name": "Attendance Rate (%)",
                "values": values
            }
        ]
    }