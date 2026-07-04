# Copyright (c) 2025, Hybrowlabs and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


@frappe.whitelist()
def send_concern_person_mail(concern_person, docname=None, date=None, project=None, subject=None, doc_no=None):
	email, employee_name = frappe.db.get_value("Employee", concern_person, ["company_email", "employee_name"])
	if not email:
		frappe.throw(f"No company email found for employee {concern_person}")

	mail_subject = f"Outward Document Notification - {docname or 'New'}"
	message = f"""
	<p>Dear {employee_name},</p>
	<p>Please be informed that an Outward Document has been created and assigned to you.</p>
	<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
		<tr><td><b>Document No</b></td><td>{docname or '-'}</td></tr>
		<tr><td><b>Date</b></td><td>{date or '-'}</td></tr>
		<tr><td><b>Project</b></td><td>{project or '-'}</td></tr>
		<tr><td><b>Subject</b></td><td>{subject or '-'}</td></tr>
		<tr><td><b>Doc No</b></td><td>{doc_no or '-'}</td></tr>
	</table>
	<br>
	<p>Regards,<br>MAA Foundation</p>
	"""

	frappe.sendmail(
		recipients=[email],
		subject=mail_subject,
		message=message,
		now=True
	)


class OutwardDocuments(Document):
	def save_entry_By(self):
		if not self.entry_by:
			self.entry_by = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

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
