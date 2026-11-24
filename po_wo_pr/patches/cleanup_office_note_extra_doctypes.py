"""Drop unused Office Note masters (Case Type, Community, Caste Category, Occupation)."""

import frappe


UNUSED_DOCTYPES = (
	"Case Type",
	"Community",
	"Caste Category",
	"Occupation",
)


def execute():
	for dt in UNUSED_DOCTYPES:
		if frappe.db.exists("DocType", dt):
			frappe.delete_doc("DocType", dt, ignore_permissions=True, force=True)
