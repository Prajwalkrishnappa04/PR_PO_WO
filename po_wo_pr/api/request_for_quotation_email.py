import frappe

from erpnext.buying.doctype.request_for_quotation.request_for_quotation import (
	check_portal_enabled,
)


@frappe.whitelist()
def send_supplier_emails(rfq_name):
	check_portal_enabled("Request for Quotation")

	rfq = frappe.get_doc("Request for Quotation", rfq_name)
	if rfq.docstatus != 1:
		return

	send_to_selected_suppliers(rfq)


def send_to_selected_suppliers(rfq):
	rfq_link = rfq.get_link()
	all_suppliers = list(rfq.suppliers)

	for supplier_row in all_suppliers:
		if not supplier_row.send_email:
			continue

		rfq.validate_email_id(supplier_row)

		update_password_link, contact = rfq.update_supplier_contact(supplier_row, rfq_link)
		rfq.update_supplier_part_no(supplier_row.supplier)

		# Keep each outgoing email and print attachment scoped to that supplier only.
		rfq.set("suppliers", [supplier_row])
		rfq.supplier_rfq_mail(supplier_row, update_password_link, rfq_link)

		frappe.db.set_value(
			"Request for Quotation Supplier",
			supplier_row.name,
			{
				"email_sent": 1,
				"contact": supplier_row.contact or contact,
			},
			update_modified=False,
		)

	rfq.set("suppliers", all_suppliers)
