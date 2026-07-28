import frappe

from erpnext.buying.doctype.request_for_quotation.request_for_quotation import (
	make_supplier_quotation_from_rfq as erpnext_make_supplier_quotation_from_rfq,
)


CONTACT_PERSON_SOURCE_FIELD = "custom_contact_person"
CONTACT_PERSON_TARGET_FIELD = "custom_contact_persons"


def map_rfq_contact_person(source_name, target_doc):
	contact_person = frappe.db.get_value(
		"Request for Quotation", source_name, CONTACT_PERSON_SOURCE_FIELD
	)

	if contact_person and target_doc.meta.has_field(CONTACT_PERSON_TARGET_FIELD):
		target_doc.set(CONTACT_PERSON_TARGET_FIELD, contact_person)

	return target_doc


@frappe.whitelist()
def make_supplier_quotation_from_rfq(source_name, target_doc=None, for_supplier=None):
	target_doc = erpnext_make_supplier_quotation_from_rfq(
		source_name, target_doc=target_doc, for_supplier=for_supplier
	)
	return map_rfq_contact_person(source_name, target_doc)
