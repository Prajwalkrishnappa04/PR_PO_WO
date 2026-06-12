from erpnext.buying.doctype.request_for_quotation.request_for_quotation import (
	RequestforQuotation,
)

from po_wo_pr.api.request_for_quotation_email import send_to_selected_suppliers


class CustomRequestforQuotation(RequestforQuotation):
	def send_to_supplier(self):
		send_to_selected_suppliers(self)
