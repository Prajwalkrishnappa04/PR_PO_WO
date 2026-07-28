"""Create the Email Template used to notify the Concern Person on Outward Documents submit.

Created as a document (not a fixture) so the wording stays editable from the UI --
a fixture would overwrite the admin's edits on every migrate. Only inserted when
missing, so re-running the patch never clobbers an existing template.
"""

import frappe

from po_wo_pr.irs.doctype.outward_documents.outward_documents import CONCERN_PERSON_EMAIL_TEMPLATE

# Only the document name goes here -- Subject and Remaks belong in the body only.
SUBJECT = "Outward Document Notification - {{ doc.name }}"

RESPONSE = """<p>Dear {{ employee_name or "Sir/Madam" }},</p>

<p>An Outward Document has been submitted and assigned to you. The details are below.</p>

<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
	<tr><td><b>Name</b></td><td>{{ name or "-" }}</td></tr>
	<tr><td><b>Subject</b></td><td>{{ subject or "-" }}</td></tr>
	<tr><td><b>Remaks</b></td><td>{{ remaks or "-" }}</td></tr>
</table>

<p>Regards,<br>MAA Foundation</p>
"""


def execute():
	if frappe.db.exists("Email Template", CONCERN_PERSON_EMAIL_TEMPLATE):
		return

	frappe.get_doc(
		{
			"doctype": "Email Template",
			"name": CONCERN_PERSON_EMAIL_TEMPLATE,
			"subject": SUBJECT,
			"use_html": 0,
			"response": RESPONSE,
		}
	).insert(ignore_permissions=True)

	frappe.db.commit()
	print("create_outward_document_email_template: created '%s'." % CONCERN_PERSON_EMAIL_TEMPLATE)
