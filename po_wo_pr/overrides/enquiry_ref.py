"""Enquiry reference persons shared across the buying chain.

`custom_our_enquiry_ref` is a Table MultiSelect of `RFQ Enquiry Reference` rows,
each pointing at an `Enquiry Reference No` (a person with a name + mobile).
`custom_ref_enquiry_no` is a read-only text rebuilt from those rows as
"person_name : mobile_no", one per line.

The text is always recomputed from the rows -- never copied -- so a corrected
mobile number in the master shows up everywhere on the next save.
"""

import frappe

MULTISELECT_FIELD = "custom_our_enquiry_ref"
TEXT_FIELD = "custom_ref_enquiry_no"
CHILD_DOCTYPE = "RFQ Enquiry Reference"
CHILD_LINK_FIELD = "enquiry_reference_no"


def build_ref_enquiry_no(doc):
	"""Rebuild TEXT_FIELD from the rows currently on `doc`."""
	if not doc.meta.has_field(TEXT_FIELD):
		return

	lines = []

	for row in doc.get(MULTISELECT_FIELD) or []:
		ref = row.get(CHILD_LINK_FIELD)
		if not ref:
			continue

		person = frappe.db.get_value(
			"Enquiry Reference No", ref, ["person_name", "mobile_no"], as_dict=True
		) or {}

		name = person.get("person_name") or ref
		mobile = person.get("mobile_no") or ""
		lines.append(f"{name} : {mobile}".strip())

	doc.set(TEXT_FIELD, "\n".join(lines))


def set_ref_enquiry_no(doc, method=None):
	"""doc_events entry point for Supplier Quotation / PO / PR / PI."""
	build_ref_enquiry_no(doc)


def copy_enquiry_refs(source_doctype, source_name, target_doc):
	"""Carry the picked enquiry persons from a source document onto `target_doc`."""
	if not target_doc.meta.has_field(MULTISELECT_FIELD):
		return target_doc

	rows = frappe.get_all(
		CHILD_DOCTYPE,
		filters={
			"parenttype": source_doctype,
			"parent": source_name,
			"parentfield": MULTISELECT_FIELD,
		},
		fields=[CHILD_LINK_FIELD],
		order_by="idx asc",
	)

	if not rows:
		return target_doc

	target_doc.set(MULTISELECT_FIELD, [])
	for row in rows:
		if row.get(CHILD_LINK_FIELD):
			target_doc.append(MULTISELECT_FIELD, {CHILD_LINK_FIELD: row[CHILD_LINK_FIELD]})

	build_ref_enquiry_no(target_doc)

	return target_doc
