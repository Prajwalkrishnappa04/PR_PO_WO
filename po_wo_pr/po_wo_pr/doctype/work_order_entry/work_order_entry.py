# Copyright (c) 2025, Hybrowlabs and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class WorkOrderEntry(Document):
	def before_insert(self):
		if self.description:
			first_data = self.description[0].item_group
			self.item_group = first_data
		
