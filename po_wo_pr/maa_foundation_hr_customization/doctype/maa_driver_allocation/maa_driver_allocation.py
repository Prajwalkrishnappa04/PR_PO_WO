import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_time


class MaaDriverAllocation(Document):
    def validate(self):
        self.check_times()
        self.check_overlap("vehicle")
        self.check_overlap("driver")

    def check_times(self):
        if get_time(self.start) >= get_time(self.end):
            frappe.throw(_("End time must be after start time"))

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
            fields=["name", "start", "end"],
            limit=1,
        )
        if clash:
            c = clash[0]
            frappe.throw(
                _("{0} {1} is already booked {2} to {3} ({4})").format(
                    field.title(), value, c.start, c.end, c.name
                )
            )