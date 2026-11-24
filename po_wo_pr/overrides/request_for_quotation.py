from erpnext.buying.doctype.request_for_quotation.request_for_quotation import (
	RequestforQuotation,
)
import frappe

from po_wo_pr.api.request_for_quotation_email import send_to_selected_suppliers
from po_wo_pr.overrides.enquiry_ref import build_ref_enquiry_no


class CustomRequestforQuotation(RequestforQuotation):
	def validate(self):
		super().validate()
		self.validate_email_template_required_for_email()
		build_ref_enquiry_no(self)

	def validate_email_template_required_for_email(self):
		if self.email_template:
			return

		if any(supplier.send_email for supplier in self.suppliers):
			frappe.throw(
				"Email Template is mandatory when Send Email is checked for any supplier."
			)

	def send_to_supplier(self):
		self.validate_email_template_required_for_email()
		send_to_selected_suppliers(self)


def get_dashboard_data(data):
	"""Show the Material Request(s) an RFQ was created from under Connections.

	The link lives on the item rows (`Request for Quotation Item.material_request`),
	so it is an internal link rather than a reverse lookup.
	"""
	data.setdefault("internal_links", {})["Material Request"] = ["items", "material_request"]
	data.setdefault("transactions", []).insert(0, {"label": "Reference", "items": ["Material Request"]})
	return data
