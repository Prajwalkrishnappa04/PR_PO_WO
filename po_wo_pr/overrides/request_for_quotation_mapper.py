import frappe

from po_wo_pr.overrides.enquiry_ref import copy_enquiry_refs

from erpnext.buying.doctype.request_for_quotation.request_for_quotation import (
	make_supplier_quotation_from_rfq as erpnext_make_supplier_quotation_from_rfq,
)


CONTACT_PERSON_FIELDS = ["custom_contact_person", "custom_contact_person_2"]


def map_rfq_contact_persons(source_name, target_doc):
	values = frappe.db.get_value(
		"Request for Quotation", source_name, CONTACT_PERSON_FIELDS, as_dict=True
	) or {}

	for field in CONTACT_PERSON_FIELDS:
		if values.get(field) and target_doc.meta.has_field(field):
			target_doc.set(field, values[field])

	return target_doc


@frappe.whitelist()
def make_supplier_quotation_from_rfq(source_name, target_doc=None, for_supplier=None):
	target_doc = erpnext_make_supplier_quotation_from_rfq(
		source_name, target_doc=target_doc, for_supplier=for_supplier
	)
	target_doc = copy_enquiry_refs("Request for Quotation", source_name, target_doc)
	return map_rfq_contact_persons(source_name, target_doc)
