import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_time, getdate, nowdate, today, add_days
from datetime import time


OPEN_TIME = time(6, 0)
CLOSE_TIME = time(21, 0)

def fmt_time(t):
    return get_time(t).strftime("%I:%M %p").lstrip("0")   # 06:00:00 -> 6:00 AM

class MaaDriverAllocation(Document):
    def validate(self):
        self.check_not_past()
        self.check_times()
        self.check_overlap("vehicle")
        self.check_overlap("driver")
        self.check_future()

    def check_times(self):
        start, end = get_time(self.start), get_time(self.end)
        if start >= end:
            frappe.throw(_("End time must be after start time"))
        if start < OPEN_TIME or end > CLOSE_TIME:
            frappe.throw(_("Bookings are only allowed between 6:00 AM and 9:00 PM"))

    def check_future(self):
        booking_date = getdate(self.allocation_date)
        today_date = getdate(today())
        last_allowed_date = add_days(today_date, 2)

        if booking_date > last_allowed_date:
            frappe.throw(_("Bookings are allowed only for the next 3 days, including today"))

    def check_not_past(self):
        today = getdate(nowdate())

        if self.is_new():
            if getdate(self.allocation_date) < today:
                frappe.throw(_("Cannot book on a past date"))
            return

        old = self.get_doc_before_save()   # the saved version, not the edited one
        if old and getdate(old.allocation_date) < today:
            frappe.throw(_("Past bookings cannot be modified"))

    def on_trash(self):
        if getdate(self.allocation_date) < getdate(nowdate()):
            frappe.throw(_("Past bookings cannot be deleted"))

    def check_overlap(self, field):
        value = self.get(field)
        if not value:
            return

        clash = frappe.get_all(
            "Maa Driver Allocation",
            filters={
                field: value,
                "allocation_date": self.allocation_date,
                "name": ["!=", self.name],
                "start": ["<", self.end],
                "end": [">", self.start],
            },
            fields=["start", "end", "employee"],
            limit=1,
        )
        if not clash:
            return
        c = clash[0]

        if field == "driver":
            what = _("driver")
            who = frappe.db.get_value("Driver", value, "full_name") or value
        else:
            what = _("vehicle")
            who = frappe.db.get_value("Vehicle", value, "model") or value
        booker = frappe.db.get_value("Employee", c.employee, "employee_name") or c.employee

        frappe.throw(
            _("{0} is already booked from {1} to {2} by {3}. Please choose a different time or a different {4}.").format(
                who, fmt_time(c.start), fmt_time(c.end), booker, what
            ),
            title=_("Slot not available"),
        )