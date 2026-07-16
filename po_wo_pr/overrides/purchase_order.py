import frappe

from erpnext.buying.doctype.purchase_order.purchase_order import (
	make_purchase_invoice as erpnext_make_purchase_invoice,
	make_purchase_receipt as erpnext_make_purchase_receipt,
)
from erpnext.buying.doctype.supplier_quotation.supplier_quotation import (
	make_purchase_invoice as erpnext_make_purchase_invoice_from_supplier_quotation,
	make_purchase_order as erpnext_make_purchase_order_from_supplier_quotation,
)
from erpnext.stock.doctype.purchase_receipt.purchase_receipt import (
	make_purchase_invoice as erpnext_make_purchase_invoice_from_receipt,
)


COMPANY_CONTACT_PERSON_FIELD = "custom_company_contact_person"
CONTACT_PERSON_FIELDS = ["custom_contact_person", "custom_contact_person_2"]


def set_company_contact_person(source_doctype, source_name, target_doc):
	company_contact_person = frappe.db.get_value(
		source_doctype, source_name, COMPANY_CONTACT_PERSON_FIELD
	)

	if not company_contact_person:
		return target_doc

	if target_doc.meta.has_field(COMPANY_CONTACT_PERSON_FIELD):
		target_doc.set(COMPANY_CONTACT_PERSON_FIELD, company_contact_person)

	return target_doc


def set_contact_persons(source_doctype, source_name, target_doc):
	values = frappe.db.get_value(
		source_doctype, source_name, CONTACT_PERSON_FIELDS, as_dict=True
	) or {}

	for field in CONTACT_PERSON_FIELDS:
		if values.get(field) and target_doc.meta.has_field(field):
			target_doc.set(field, values[field])

	return target_doc


def copy_supplier_quotation_taxes(source_name, target_doc):
	source_doc = frappe.get_doc("Supplier Quotation", source_name)

	target_doc.tax_category = source_doc.tax_category
	target_doc.taxes_and_charges = source_doc.taxes_and_charges

	if source_doc.taxes:
		target_doc.set("taxes", [])
		for tax in source_doc.taxes:
			tax_row = tax.as_dict()
			for fieldname in ("name", "parent", "parentfield", "parenttype", "idx"):
				tax_row.pop(fieldname, None)
			target_doc.append("taxes", tax_row)

	target_doc.run_method("calculate_taxes_and_totals")
	return target_doc


@frappe.whitelist()
def make_purchase_order_from_supplier_quotation(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_order_from_supplier_quotation(
		source_name, target_doc=target_doc, args=args
	)
	target_doc = copy_supplier_quotation_taxes(source_name, target_doc)
	return set_contact_persons("Supplier Quotation", source_name, target_doc)


@frappe.whitelist()
def make_purchase_invoice_from_supplier_quotation(source_name, target_doc=None):
	target_doc = erpnext_make_purchase_invoice_from_supplier_quotation(
		source_name, target_doc=target_doc
	)
	return set_contact_persons("Supplier Quotation", source_name, target_doc)


@frappe.whitelist()
def make_purchase_receipt(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_receipt(source_name, target_doc=target_doc, args=args)
	target_doc = set_company_contact_person("Purchase Order", source_name, target_doc)
	return set_contact_persons("Purchase Order", source_name, target_doc)


@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_invoice(source_name, target_doc=target_doc, args=args)
	target_doc = set_company_contact_person("Purchase Order", source_name, target_doc)
	return set_contact_persons("Purchase Order", source_name, target_doc)


@frappe.whitelist()
def make_purchase_invoice_from_receipt(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_invoice_from_receipt(source_name, target_doc=target_doc, args=args)
	target_doc = set_company_contact_person("Purchase Receipt", source_name, target_doc)
	return set_contact_persons("Purchase Receipt", source_name, target_doc)
