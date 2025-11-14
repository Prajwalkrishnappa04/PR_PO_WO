# Copyright (c) 2025, Hybrowlabs and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class OutwardDocuments(Document):
	def save_entry_By(self):
		if not self.entry_by:
			self.entry_by = frappe.session.user

	#before save hook
	def before_save(self):
		self.save_entry_By()
