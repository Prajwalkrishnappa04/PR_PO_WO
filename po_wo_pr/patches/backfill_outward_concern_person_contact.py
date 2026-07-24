"""Backfill Concern Person's email and mobile onto existing Outward Documents.

`concern_person_email` (fetched from Employee.company_email) and `mob_no`
(fetched from Employee.cell_number) were added as fetch fields. fetch_from only
populates on a fresh save, so historical docs keep those fields empty. This
patch fills them in from the linked Employee -- but only where the doc has a
concern_person AND the target field is currently empty, so anything already
entered by hand is left untouched.
"""

import frappe


def execute():
	if not frappe.db.table_exists("Outward Documents"):
		return
	if not frappe.db.has_column("Outward Documents", "concern_person"):
		return

	docs = frappe.get_all(
		"Outward Documents",
		filters={"concern_person": ["is", "set"]},
		fields=["name", "concern_person", "concern_person_email", "mob_no"],
	)

	filled = 0
	for d in docs:
		emp = frappe.db.get_value(
			"Employee", d.concern_person, ["company_email", "cell_number"], as_dict=True
		)
		if not emp:
			continue

		updates = {}
		# Only fill empty slots -- never clobber a value already on the doc.
		if not d.concern_person_email and emp.company_email:
			updates["concern_person_email"] = emp.company_email
		if not d.mob_no and emp.cell_number:
			updates["mob_no"] = emp.cell_number

		if updates:
			frappe.db.set_value("Outward Documents", d.name, updates, update_modified=False)
			filled += 1

	frappe.db.commit()
	print("backfill_outward_concern_person_contact: updated %d record(s)." % filled)
