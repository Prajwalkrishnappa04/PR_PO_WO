import frappe
from frappe.utils import cint, flt, getdate
from hrms.hr.doctype.leave_application.leave_application import (
    LeaveApplication,
    get_leave_allocation_records,
    get_leave_approver,
    get_leave_balance_on,
    get_leaves_for_period,
    get_leaves_pending_approval_for_period,
    validate_leave_access,
)


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


@frappe.whitelist()
def get_leave_details(employee: str, date, for_salary_slip: bool = False) -> dict:
    """Override of core get_leave_details to also return half-day count per leave type"""
    validate_leave_access(employee)

    allocation_records = get_leave_allocation_records(employee, date)
    leave_allocation = {}
    precision = cint(frappe.db.get_single_value("System Settings", "float_precision")) or 2

    for d in allocation_records:
        allocation = allocation_records.get(d, frappe._dict())
        to_date = date if for_salary_slip else allocation.to_date
        remaining_leaves = get_leave_balance_on(
            employee,
            d,
            date,
            to_date=to_date,
            consider_all_leaves_in_the_allocation_period=False if for_salary_slip else True,
        )

        leaves_taken = get_leaves_for_period(employee, d, allocation.from_date, to_date) * -1
        leaves_pending = get_leaves_pending_approval_for_period(employee, d, allocation.from_date, to_date)
        expired_leaves = allocation.total_leaves_allocated - (remaining_leaves + leaves_taken)

        # --- custom: count half days taken in this period ---
        half_days_taken = frappe.db.count(
            "Leave Application",
            filters={
                "employee": employee,
                "leave_type": d,
                "docstatus": 1,
                "status": "Approved",
                "half_day": 1,
                "from_date": [">=", allocation.from_date],
                "to_date": ["<=", to_date],
            },
        )
        # ------------------------------------------------------

        leave_allocation[d] = {
            "total_leaves": flt(allocation.total_leaves_allocated, precision),
            "expired_leaves": flt(expired_leaves, precision) if expired_leaves > 0 else 0,
            "leaves_taken": flt(leaves_taken, precision),
            "leaves_pending_approval": flt(leaves_pending, precision),
            "remaining_leaves": flt(remaining_leaves, precision),
            "half_days_taken": half_days_taken,
        }

    # is used in set query
    lwp = frappe.get_list("Leave Type", filters={"is_lwp": 1}, pluck="name")

    return {
        "leave_allocation": leave_allocation,
        "leave_approver": get_leave_approver(employee),
        "lwps": lwp,
    }