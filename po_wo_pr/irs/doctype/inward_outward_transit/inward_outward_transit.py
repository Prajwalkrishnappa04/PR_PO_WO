# Copyright (c) 2026, Hybrowlabs and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class InwardOutwardTransit(Document):
	def on_change(self):
		"""Mirror this transit's status onto the Outward Document so the sender can see it."""
		if not self.outward_reference:
			return

		frappe.db.set_value(
			"Outward Documents",
			self.outward_reference,
			{"transit_record": self.name, "transit_status": self.status},
			update_modified=False,
		)
