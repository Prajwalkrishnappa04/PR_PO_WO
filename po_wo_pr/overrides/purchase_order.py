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

from frappe.model.mapper import get_mapped_doc



from po_wo_pr.overrides.enquiry_ref import copy_enquiry_refs


CONTACT_PERSON_FIELDS = ["custom_contact_person", "custom_contact_person_2"]
SUPPLIER_QUOTATION_NO_FIELD = "custom_supplier_quotation_no"


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


def set_supplier_quotation_no(source_name, target_doc):
	"""Put the quotation number given by the supplier (the SQ's `quotation_number`) on the PO.

	The PO's `custom_supplier_quotation_no` is read-only + mandatory, so it only gets a
	value from here — meaning only when the PO was created from a Supplier Quotation. On
	a directly created PO the user would have to fill it manually (which isn't possible
	since the field is read-only), so a PO with this field must always come from an SQ.
	"""
	if not target_doc.meta.has_field(SUPPLIER_QUOTATION_NO_FIELD):
		return target_doc

	quotation_number = frappe.db.get_value(
		"Supplier Quotation", source_name, "quotation_number"
	)

	if quotation_number:
		target_doc.set(SUPPLIER_QUOTATION_NO_FIELD, quotation_number)

	return target_doc


@frappe.whitelist()
def make_purchase_order_from_supplier_quotation(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_order_from_supplier_quotation(
		source_name, target_doc=target_doc, args=args
	)
	target_doc = copy_supplier_quotation_taxes(source_name, target_doc)
	target_doc = copy_enquiry_refs("Supplier Quotation", source_name, target_doc)
	target_doc = set_supplier_quotation_no(source_name, target_doc)
	return set_contact_persons("Supplier Quotation", source_name, target_doc)


@frappe.whitelist()
def make_purchase_invoice_from_supplier_quotation(source_name, target_doc=None):
	target_doc = erpnext_make_purchase_invoice_from_supplier_quotation(
		source_name, target_doc=target_doc
	)
	target_doc = copy_enquiry_refs("Supplier Quotation", source_name, target_doc)
	return set_contact_persons("Supplier Quotation", source_name, target_doc)


@frappe.whitelist()
def make_purchase_receipt(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_receipt(source_name, target_doc=target_doc, args=args)
	target_doc = copy_enquiry_refs("Purchase Order", source_name, target_doc)
	return set_contact_persons("Purchase Order", source_name, target_doc)


@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_invoice(source_name, target_doc=target_doc, args=args)
	target_doc = copy_enquiry_refs("Purchase Order", source_name, target_doc)
	return set_contact_persons("Purchase Order", source_name, target_doc)


@frappe.whitelist()
def make_purchase_invoice_from_receipt(source_name, target_doc=None, args=None):
	target_doc = erpnext_make_purchase_invoice_from_receipt(source_name, target_doc=target_doc, args=args)
	target_doc = copy_enquiry_refs("Purchase Receipt", source_name, target_doc)
	return set_contact_persons("Purchase Receipt", source_name, target_doc)


def create_mrn_on_po_approval(doc, method=None):
    if doc.workflow_state != "Approved":
        return

    # Check if a Purchase Receipt already exists to prevent duplicate execution
    existing_pr = frappe.db.get_value(
        "Purchase Receipt Item",
        {"purchase_order": doc.name, "docstatus": ["!=", 2]},
        "parent"
    )

    if existing_pr:
        return

    created_pr_names = []

    # Loop through each item in the Purchase Order
    for item in doc.items:
        no_of_services = int(item.get("custom_no_of_service") or 1)

        # Loop N times to create N individual Purchase Receipt documents
        for i in range(no_of_services):
            pr = get_mapped_doc("Purchase Order", doc.name, {
                "Purchase Order": {
                    "doctype": "Purchase Receipt",
                    "field_map": {
                        "supplier": "supplier",
                        "company": "company"
                    }
                },
                "Purchase Order Item": {
                    "doctype": "Purchase Receipt Item",
                    "field_map": {
                        "name": "purchase_order_item",
                        "parent": "purchase_order",
                        "qty": "qty"
                    },
                    # Filter: mapped PR will only include THIS specific PO item
                    "condition": lambda d: d.name == item.name
                }
            })

            # Force individual item quantity to 1 per document
            for pr_item in pr.items:
                pr_item.qty = 1
                pr_item.stock_qty = 1
                pr_item.amount = pr_item.rate * 1
                pr_item.base_amount = pr_item.base_rate * 1

            # Insert individual draft Purchase Receipt
            pr.insert(ignore_permissions=True)
            created_pr_names.append(pr.name)

    if created_pr_names:
        pr_list = ", ".join([f"<b>{name}</b>" for name in created_pr_names])
        frappe.msgprint(f"Created {len(created_pr_names)} MRN_Material Received Note document(s): {pr_list}")