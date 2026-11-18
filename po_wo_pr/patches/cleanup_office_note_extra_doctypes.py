"""Drop unused Office Note masters and leftover Inward Document columns."""

import frappe


UNUSED_DOCTYPES = (
	"Case Type",
	"Community",
	"Caste Category",
	"Occupation",
	"Office Note Family Member",
)

UNUSED_COLUMNS = (
	"office_note_family_members",
)


def execute():
	for dt in UNUSED_DOCTYPES:
		if frappe.db.exists("DocType", dt):
			frappe.delete_doc("DocType", dt, ignore_permissions=True, force=True)

	if frappe.db.table_exists("Inward Document"):
		for column in UNUSED_COLUMNS:
			if frappe.db.has_column("Inward Document", column):
				frappe.db.sql_ddl(f"ALTER TABLE `tabInward Document` DROP COLUMN `{column}`")
