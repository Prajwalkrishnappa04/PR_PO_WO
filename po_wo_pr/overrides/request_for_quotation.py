from erpnext.buying.doctype.request_for_quotation.request_for_quotation import (
	RequestforQuotation,
)
import frappe

from po_wo_pr.api.request_for_quotation_email import send_to_selected_suppliers


class CustomRequestforQuotation(RequestforQuotation):
	def validate(self):
		super().validate()
		self.validate_email_template_required_for_email()

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
