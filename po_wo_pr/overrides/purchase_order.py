import frappe

from erpnext.buying.doctype.purchase_order.purchase_order import (
	make_purchase_invoice as erpnext_make_purchase_invoice,
	make_purchase_receipt as erpnext_make_purchase_receipt,
)
from erpnext.stock.doctype.purchase_receipt.purchase_receipt import (
	make_purchase_invoice as erpnext_make_purchase_invoice_from_receipt,
)


COMPANY_CONTACT_PERSON_FIELD = "custom_company_contact_person"


def set_company_contact_person(source_doctype, source_name, target_doc):
	company_contact_person = frappe.db.get_value(
		source_doctype, source_name, COMPANY_CONTACT_PERSON_FIELD
	)

	if not company_contact_person:
		return target_doc

	if target_doc.meta.has_field(COMPANY_CONTACT_PERSON_FIELD):
		target_doc.set(COMPANY_CONTACT_PERSON_FIELD, company_contact_person)

	return target_doc


@frappe.whitelist()
def make_purchase_receipt(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_receipt(source_name, target_doc=target_doc, args=args)
	return set_company_contact_person("Purchase Order", source_name, target_doc)


@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_invoice(source_name, target_doc=target_doc, args=args)
	return set_company_contact_person("Purchase Order", source_name, target_doc)


@frappe.whitelist()
def make_purchase_invoice_from_receipt(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_invoice_from_receipt(source_name, target_doc=target_doc, args=args)
	return set_company_contact_person("Purchase Receipt", source_name, target_doc)
