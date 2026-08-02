"""Remove the two legacy free-text buying fields.

`custom_enquiry_ref_name` (Data) is superseded by the `custom_our_enquiry_ref`
MultiSelect + its rebuilt `custom_ref_enquiry_no` text -- see
`po_wo_pr.overrides.enquiry_ref`. `custom_company_contact_person` (Data) is
superseded by the `custom_contact_person` / `custom_contact_person_2` links
created by `migrate_contact_person_fields`.

Both fields were also hand-added on some sites beyond what `custom/*.json`
tracks (production carries `custom_company_contact_person` on Purchase Order
too), so everything here keys off the fieldname and never a fixed doctype list.

Deleting the Custom Field hides the field everywhere -- form, list view, reports
and the API -- but Frappe leaves the underlying column in place. That orphan
column is harmless (nothing reads it any more) and keeps the old text around as
a safety net. The patch also dumps every non-empty value into the Error Log
first, so the data stays recoverable even if the column is dropped later.
"""

import frappe

FIELDS = ["custom_enquiry_ref_name", "custom_company_contact_person"]


def execute():
	for cf in frappe.get_all(
		"Custom Field",
		filters={"fieldname": ["in", FIELDS]},
		fields=["name", "dt", "fieldname"],
	):
		_log_existing_data(cf.dt, cf.fieldname)
		frappe.delete_doc("Custom Field", cf.name, ignore_permissions=True, force=True)

	# in_list_view / other tweaks pointing at the now-gone fields
	for ps in frappe.get_all(
		"Property Setter", filters={"field_name": ["in", FIELDS]}, pluck="name"
	):
		frappe.delete_doc("Property Setter", ps, ignore_permissions=True, force=True)

	_clean_field_order()
	_clean_print_formats()

	frappe.clear_cache()
	frappe.db.commit()


def _log_existing_data(dt, fieldname):
	"""Keep a copy of whatever is in the column before it disappears."""
	if not frappe.db.has_column(dt, fieldname):
		return

	rows = frappe.db.sql(
		"""
		select name, `{field}` from `tab{dt}`
		where `{field}` is not null and `{field}` != ''
		""".format(field=fieldname, dt=dt)
	)
	if not rows:
		return

	dump = "\n".join("%s: %s" % (name, value) for name, value in rows)
	frappe.log_error(
		dump[:100000],
		"removed %s.%s (%d record(s))" % (dt, fieldname, len(rows)),
	)


def _clean_print_formats():
	"""Drop the dead fields from Print Format Builder layouts.

	A builder format keeps its layout as JSON in `format_data`; removing the rows
	there is enough. A hand-written `html` format can reference the field in
	arbitrary Jinja, so that is only reported -- a bad guess at rewriting the
	template would break the print silently.
	"""
	for pf in frappe.get_all("Print Format", fields=["name", "html", "format_data"]):
		if pf.format_data and any(f in pf.format_data for f in FIELDS):
			try:
				layout = frappe.parse_json(pf.format_data)
			except Exception:
				layout = None

			if layout is not None:
				cleaned = _strip_fields(layout)
				frappe.db.set_value(
					"Print Format", pf.name, "format_data", frappe.as_json(cleaned), update_modified=False
				)

		if pf.html and any(f in pf.html for f in FIELDS):
			frappe.log_error(
				"Print Format %s still references %s in its custom HTML -- update the template by hand."
				% (pf.name, ", ".join(f for f in FIELDS if f in pf.html)),
				"legacy field still in print format",
			)


def _strip_fields(node):
	"""Recursively drop any dict carrying one of the dead fieldnames."""
	if isinstance(node, list):
		return [_strip_fields(x) for x in node if not _is_dead_field(x)]

	if isinstance(node, dict):
		return {k: _strip_fields(v) for k, v in node.items()}

	return node


def _is_dead_field(node):
	return isinstance(node, dict) and node.get("fieldname") in FIELDS


def _clean_field_order():
	"""Drop the dead fieldnames from any `field_order` Property Setter."""
	for ps in frappe.get_all(
		"Property Setter", filters={"property": "field_order"}, fields=["name", "value"]
	):
		try:
			order = frappe.parse_json(ps.value)
		except Exception:
			continue

		if not isinstance(order, list):
			continue

		cleaned = [f for f in order if f not in FIELDS]
		if len(cleaned) != len(order):
			frappe.db.set_value(
				"Property Setter", ps.name, "value", frappe.as_json(cleaned), update_modified=False
			)
