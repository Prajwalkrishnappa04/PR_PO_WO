import frappe
from frappe import _
from frappe.utils import formatdate

from erpnext.controllers.website_list_for_contact import get_customers_suppliers


def get_context(context):
	context.no_cache = 1
	context.show_sidebar = True
	context.doc = frappe.get_doc(frappe.form_dict.doctype, frappe.form_dict.name)
	context.parents = frappe.form_dict.parents
	context.doc.supplier = get_supplier(context.doc)
	context.doc.rfq_links = get_link_quotation(context.doc.supplier, context.doc.name)
	unauthorized_user(context.doc, context.doc.supplier)
	update_supplier_details(context)
	context["title"] = frappe.form_dict.name


def get_supplier(doc):
	parties_doctype = (
		"Request for Quotation Supplier"
		if frappe.form_dict.doctype == "Request for Quotation"
		else frappe.form_dict.doctype
	)
	customers, suppliers = get_customers_suppliers(parties_doctype, frappe.session.user)
	rfq_suppliers = {row.supplier for row in doc.suppliers}

	for supplier in suppliers:
		if supplier in rfq_suppliers:
			return supplier

	return ""


def check_supplier_has_docname_access(doc, supplier):
	return bool(supplier and any(row.supplier == supplier for row in doc.suppliers))


def unauthorized_user(doc, supplier):
	if not check_supplier_has_docname_access(doc, supplier):
		frappe.throw(_("Not Permitted"), frappe.PermissionError)


def update_supplier_details(context):
	supplier_doc = frappe.get_doc("Supplier", context.doc.supplier)
	context.doc.currency = supplier_doc.default_currency or frappe.get_cached_value(
		"Company", context.doc.company, "default_currency"
	)
	context.doc.currency_symbol = frappe.db.get_value("Currency", context.doc.currency, "symbol", cache=True)
	context.doc.number_format = frappe.db.get_value(
		"Currency", context.doc.currency, "number_format", cache=True
	)
	context.doc.buying_price_list = supplier_doc.default_price_list or ""


def get_link_quotation(supplier, rfq):
	quotation = frappe.db.sql(
		""" select distinct `tabSupplier Quotation Item`.parent as name,
		`tabSupplier Quotation`.status, `tabSupplier Quotation`.transaction_date from
		`tabSupplier Quotation Item`, `tabSupplier Quotation` where `tabSupplier Quotation`.docstatus < 2 and
		`tabSupplier Quotation Item`.request_for_quotation =%(name)s and
		`tabSupplier Quotation Item`.parent = `tabSupplier Quotation`.name and
		`tabSupplier Quotation`.supplier = %(supplier)s order by `tabSupplier Quotation`.creation desc""",
		{"name": rfq, "supplier": supplier},
		as_dict=1,
	)

	for data in quotation:
		data.transaction_date = formatdate(data.transaction_date)

	return quotation or None
