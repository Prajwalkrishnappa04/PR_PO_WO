# Copyright (c) 2025, Hybrowlabs and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def search_student(doctype, txt, searchfield, start, page_len, filters):
	return frappe.db.sql(
		"""SELECT name, student_name
		FROM `tabStudent`
		WHERE (name LIKE %(txt)s OR student_name LIKE %(txt)s)
		ORDER BY student_name
		LIMIT %(start)s, %(page_len)s""",
		{"txt": f"%{txt}%", "start": start, "page_len": page_len},
	)


class InwardDocument(Document):
	#to save entry by user
	def save_entry_By(self):
		if not self.entry_by:
			self.entry_by = frappe.session.user

	#before save hook
	def before_save(self):
		self.save_entry_By()
