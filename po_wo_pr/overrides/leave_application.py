import frappe
from frappe.utils import getdate
from hrms.hr.doctype.leave_application.leave_application import LeaveApplication


class CustomLeaveApplication(LeaveApplication):
    def validate(self):
        # sync custom_attendance_status -> core half_day fields
        # BEFORE core validate() runs, since validate_balance_leaves()
        # (which sets total_leave_days) depends on self.half_day
        if self.get("custom_attendance_status") == "Half Day":
            self.half_day = 1
            if not self.half_day_date:
                self.half_day_date = self.from_date
        elif self.get("custom_attendance_status") == "On Leave":
            self.half_day = 0
            self.half_day_date = None

        super().validate()

    def create_or_update_attendance(self, attendance_name, date):
        # default logic (same as core)
        status = (
            "Half Day"
            if self.half_day_date and getdate(date) == getdate(self.half_day_date)
            else "On Leave"
        )

        # --- custom override ---
        # if custom_attendance_status is explicitly set, force that status
        if self.get("custom_attendance_status") == "Half Day":
            status = "Half Day"
        elif self.get("custom_attendance_status") == "On Leave":
            status = "On Leave"
        # ------------------------

        if attendance_name:
            # update existing attendance, change absent to on leave or half day
            doc = frappe.get_doc("Attendance", attendance_name)
            half_day_status = None if status == "On Leave" else "Present"
            modify_half_day_status = 1 if doc.status == "Absent" and status == "Half Day" else 0
            doc.db_set(
                {
                    "status": status,
                    "leave_type": self.leave_type,
                    "leave_application": self.name,
                    "half_day_status": half_day_status,
                    "modify_half_day_status": modify_half_day_status,
                }
            )
        else:
            # make new attendance and submit it
            doc = frappe.new_doc("Attendance")
            doc.employee = self.employee
            doc.employee_name = self.employee_name
            doc.attendance_date = date
            doc.company = self.company
            doc.leave_type = self.leave_type
            doc.leave_application = self.name
            doc.status = status
            doc.half_day_status = "Present" if status == "Half Day" else None
            doc.modify_half_day_status = 1 if status == "Half Day" else 0
            doc.flags.ignore_validate = True  # ignores check leave record validation in attendance
            doc.insert(ignore_permissions=True)
            doc.submit()