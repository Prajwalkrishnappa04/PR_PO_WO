"""Consolidate the buying-document contact fields onto two clean Link fields.

Before: each of Supplier Quotation / Purchase Order / Purchase Receipt / Purchase
Invoice carried three contact fields -- `custom_contact_persons` (Link),
`custom_contact_personss` (Table MultiSelect -> MR Contact Person) and
`custom_contact_numbers` (Small Text). Request for Quotation carried the
MultiSelect `custom_contact_persons` + `custom_contact_numbers` alongside its
real `custom_contact_person` / `custom_contact_person_2` links.

After: every doctype keeps only `custom_contact_person` and
`custom_contact_person_2` (both Link -> Contact person). This patch preserves the
existing data into those two fields, then removes the old fields.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

# The four buying docs that gain the two new link fields (RFQ already has them).
BUYING_DOCS = ["Supplier Quotation", "Purchase Order", "Purchase Receipt", "Purchase Invoice"]

# insert_after for `custom_contact_person` on each buying doc (mirrors custom/*.json).
# PR/PI once anchored on custom_enquiry_ref_name / custom_company_contact_person; those
# fields were dropped by `remove_legacy_enquiry_contact_fields`, so anchor on the
# enquiry-ref text that replaced them. insert_after is only a layout hint -- a missing
# anchor would just append the field at the end, never fail.
INSERT_AFTER = {
	"Supplier Quotation": "custom_for",
	"Purchase Order": "custom_for",
	"Purchase Receipt": "custom_ref_enquiry_no",
	"Purchase Invoice": "custom_ref_enquiry_no",
}

# Old fields to delete once their data is preserved.
OLD_FIELDS = {
	"Supplier Quotation": ["custom_contact_persons", "custom_contact_personss", "custom_contact_numbers"],
	"Purchase Order": ["custom_contact_persons", "custom_contact_personss", "custom_contact_numbers"],
	"Purchase Receipt": ["custom_contact_persons", "custom_contact_personss", "custom_contact_numbers"],
	"Purchase Invoice": ["custom_contact_persons", "custom_contact_personss", "custom_contact_numbers"],
	"Request for Quotation": ["custom_contact_persons", "custom_contact_numbers"],
}

# The MultiSelect field name whose child rows (MR Contact Person) hold the contacts.
MULTISELECT_FIELD = {
	"Supplier Quotation": "custom_contact_personss",
	"Purchase Order": "custom_contact_personss",
	"Purchase Receipt": "custom_contact_personss",
	"Purchase Invoice": "custom_contact_personss",
	"Request for Quotation": "custom_contact_persons",
}

MIGRATE_DOCS = BUYING_DOCS + ["Request for Quotation"]


def execute():
	_ensure_new_fields()
	overflow = _preserve_contact_data()
	if overflow:
		frappe.log_error("\n".join(overflow), "contact_person migration: >2 contacts")
		print("WARNING: %d record(s) had >2 contacts; extras logged in Error Log." % len(overflow))
	_delete_old_fields()
	frappe.clear_cache()
	frappe.db.commit()


def _ensure_new_fields():
	fields = {}
	for dt in BUYING_DOCS:
		fields[dt] = [
			{
				"fieldname": "custom_contact_person",
				"label": "Contact Person 1",
				"fieldtype": "Link",
				"options": "Contact person",
				"insert_after": INSERT_AFTER[dt],
			},
			{
				"fieldname": "custom_contact_person_2",
				"label": "Contact Person 2",
				"fieldtype": "Link",
				"options": "Contact person",
				"insert_after": "custom_contact_person",
			},
		]
	create_custom_fields(fields, ignore_validate=True)


def _records_with_data(dt):
	names = set()
	# old single Link field only exists as a column on the four buying docs
	if frappe.db.has_column(dt, "custom_contact_persons"):
		names.update(frappe.get_all(dt, filters={"custom_contact_persons": ["is", "set"]}, pluck="name"))
	msf = MULTISELECT_FIELD.get(dt)
	if msf and frappe.db.table_exists("MR Contact Person"):
		names.update(
			frappe.get_all(
				"MR Contact Person",
				filters={"parenttype": dt, "parentfield": msf},
				pluck="parent",
				distinct=True,
			)
		)
	return names


def _ordered_contacts(dt, name):
	"""Primary contact first: the old Link value, then MultiSelect rows by idx, de-duped."""
	candidates = []
	if frappe.db.has_column(dt, "custom_contact_persons"):
		val = frappe.db.get_value(dt, name, "custom_contact_persons")
		if val:
			candidates.append(val)
	msf = MULTISELECT_FIELD.get(dt)
	if msf and frappe.db.table_exists("MR Contact Person"):
		rows = frappe.get_all(
			"MR Contact Person",
			filters={"parenttype": dt, "parent": name, "parentfield": msf},
			fields=["contact_person"],
			order_by="idx asc",
		)
		candidates += [r.contact_person for r in rows if r.contact_person]
	ordered, seen = [], set()
	for c in candidates:
		if c and c not in seen:
			seen.add(c)
			ordered.append(c)
	return ordered


def _preserve_contact_data():
	overflow = []
	for dt in MIGRATE_DOCS:
		if not frappe.db.table_exists(dt):
			continue
		for name in _records_with_data(dt):
			try:
				ordered = _ordered_contacts(dt, name)
				if not ordered:
					continue
				current = frappe.db.get_value(
					dt, name, ["custom_contact_person", "custom_contact_person_2"], as_dict=True
				) or {}
				updates = {}
				# only fill empty slots -- never clobber values already entered (e.g. RFQ)
				if not current.get("custom_contact_person") and len(ordered) >= 1:
					updates["custom_contact_person"] = ordered[0]
				if not current.get("custom_contact_person_2") and len(ordered) >= 2:
					updates["custom_contact_person_2"] = ordered[1]
				if updates:
					frappe.db.set_value(dt, name, updates, update_modified=False)
				if len(ordered) > 2:
					overflow.append("%s %s: dropped %s" % (dt, name, ordered[2:]))
			except Exception:
				frappe.log_error(frappe.get_traceback(), "contact_person migration: %s %s" % (dt, name))
	return overflow


def _delete_old_fields():
	for dt, fields in OLD_FIELDS.items():
		for fieldname in fields:
			cf_name = "%s-%s" % (dt, fieldname)
			if frappe.db.exists("Custom Field", cf_name):
				frappe.delete_doc("Custom Field", cf_name, ignore_permissions=True, force=True)
