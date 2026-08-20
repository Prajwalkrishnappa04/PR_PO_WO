# Copyright (c) 2025, Hybrowlabs and contributors
# For license information, please see license.txt

import re
from html import unescape
from urllib.parse import urljoin

import requests

import frappe
from frappe import _
from frappe.model.document import Document

CONCERN_PERSON_EMAIL_TEMPLATE = "Outward Document Concern Person Notification"


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


@frappe.whitelist()
def get_tracking_url(doc_no, courier):
	base_url = frappe.db.get_value("URL Master", courier, "url")
	if not base_url:
		frappe.throw(_("No Tracking URL is set on Courier {0}").format(courier))

	doc_no = (doc_no or "").strip()
	if "shreetirupaticourier.net" in base_url:
		return get_shree_tirupati_tracking_url(base_url, doc_no)

	# Every other courier is assumed to take the docket straight in the URL, so its
	# Tracking URL has to end with its own parameter (e.g. "...?awb=").
	return f"{base_url}{doc_no}"


def get_shree_tirupati_tracking_url(base_url, doc_no):
	# Shree Tirupati's tracking page does not accept the AWB number: it wants an encrypted
	# token (Frm_DocList.aspx?docnos=<token>) that only their server can produce. So submit
	# the AWB to the very same TopHeader.aspx form their own site uses and hand back the
	# URL they redirect to.
	header_url = urljoin(base_url, "TopHeader.aspx")
	session = requests.Session()

	try:
		# The form is ASP.NET WebForms, so the POST has to echo back the hidden state
		# fields (and the session cookie) from a fresh GET of the page.
		page = session.get(header_url, timeout=30)
		page.raise_for_status()
		response = session.post(
			header_url,
			data={
				"__VIEWSTATE": get_aspnet_field(page.text, "__VIEWSTATE"),
				"__VIEWSTATEGENERATOR": get_aspnet_field(page.text, "__VIEWSTATEGENERATOR"),
				"__EVENTVALIDATION": get_aspnet_field(page.text, "__EVENTVALIDATION"),
				"trackingno": doc_no,
				"btnTrack": "Go",
			},
			allow_redirects=False,
			timeout=30,
		)
		response.raise_for_status()
	except requests.RequestException as e:
		frappe.throw(_("Could not reach the courier website: {0}").format(e))

	location = response.headers.get("Location")
	if not location:
		frappe.throw(_("The courier website did not return a tracking link for {0}.").format(doc_no))

	return urljoin(header_url, location)


def get_aspnet_field(html, fieldname):
	match = re.search(f'name="{fieldname}"[^>]*value="([^"]*)"', html)
	return unescape(match.group(1)) if match else ""


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def search_town_village(doctype, txt, searchfield, start, page_len, filters):
	# Search only by the townvillage field (not by name/taluka). Town Village is named
	# {taluka}-{townvillage}, so the default search matches every town under a taluka
	# whose name contains the text (e.g. "surat" would list Amroli, Rander, Varachha).
	return frappe.db.sql(
		"""SELECT name, townvillage
		FROM `tabTown Village`
		WHERE townvillage LIKE %(txt)s
		ORDER BY townvillage
		LIMIT %(start)s, %(page_len)s""",
		{"txt": f"%{txt}%", "start": start, "page_len": page_len},
	)


class OutwardDocuments(Document):
	def save_entry_By(self):
		if not self.entry_by:
			self.entry_by = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

	def add_branch(self):
		current_user = frappe.session.user
		branch = frappe.db.get_value("Employee", {"user_id":current_user}, "branch")
		self.maa_branch = branch

	def before_save(self):
		self.save_entry_By()
		self.add_branch()

	def on_submit(self):
		self.notify_concern_person()

	def after_submit(self):
		self.notify_concern_person()

	def get_concern_person_email(self):
		"""Resolve who the notification goes to.

		`concern_person_email` is a read-only fetch of Employee.company_email, so it is
		empty for every employee whose company email was never filled in. Fall back to
		their personal_email so those documents still notify someone.
		"""
		if self.concern_person_email:
			return self.concern_person_email

		if not self.concern_person:
			return None

		return frappe.db.get_value("Employee", self.concern_person, "personal_email")

	def notify_concern_person(self):
		"""Email the Concern Person the Name / Subject / Remaks of this document.

		Rendered from the "Outward Document Concern Person Notification" Email Template so
		the wording can be changed from the UI without touching code. Silently skips when
		there is no recipient or the template is missing -- a submit must not fail because
		of a notification.
		"""
		recipient = self.get_concern_person_email()
		if not recipient:
			return

		if not frappe.db.exists("Email Template", CONCERN_PERSON_EMAIL_TEMPLATE):
			frappe.log_error(
				f"Email Template '{CONCERN_PERSON_EMAIL_TEMPLATE}' is missing, so no mail was sent "
				f"for {self.name}.",
				"Outward Documents notification",
			)
			return

		template = frappe.get_doc("Email Template", CONCERN_PERSON_EMAIL_TEMPLATE)
		# `doc` is passed alongside the three listed fields so the template can reference
		# anything else on the document if it is extended later. `employee_name` is only
		# for the greeting -- `name` is the document ID (OUTB-xxxxx-YYYY), not a person.
		context = {
			"doc": self,
			"name": self.name,
			"subject": self.subject,
			"remaks": self.remaks,
			"employee_name": frappe.db.get_value("Employee", self.concern_person, "employee_name")
			if self.concern_person
			else None,
		}
		rendered = template.get_formatted_email(context)

		try:
			frappe.sendmail(
				recipients=[recipient],
				subject=rendered["subject"],
				message=rendered["message"],
				reference_doctype=self.doctype,
				reference_name=self.name,
			)
		except Exception:
			# No default outgoing Email Account (or the mail server refused the handoff).
			# The document is already submitted at this point, so swallow it and leave a
			# trail rather than rolling the user's submit back over a notification.
			self.log_error("Outward Documents: could not notify concern person")
			frappe.msgprint(
				_("Document submitted, but the notification email could not be sent to {0}.").format(
					recipient
				),
				indicator="orange",
				alert=True,
			)
			return

		if not self.mail_sent:
			self.db_set("mail_sent", 1, update_modified=False)

	def on_trash(self):
		# Legacy docs with plain numeric names (created before naming_series was set)
		# cause revert_series_if_last to crash because doc.name is an int.
		# Clearing naming_series prevents Frappe from attempting the series revert.
		try:
			int(self.name)
			self.naming_series = None
		except (ValueError, TypeError):
			pass
