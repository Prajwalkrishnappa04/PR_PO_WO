# Copyright (c) 2025, Hybrowlabs and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class OutwardDocuments(Document):
	def save_entry_By(self):
		if not self.entry_by:
			self.entry_by = frappe.session.user

	def before_save(self):
		self.save_entry_By()

	def on_trash(self):
		# Legacy docs with plain numeric names (created before naming_series was set)
		# cause revert_series_if_last to crash because doc.name is an int.
		# Clearing naming_series prevents Frappe from attempting the series revert.
		try:
			int(self.name)
			self.naming_series = None
		except (ValueError, TypeError):
			pass
