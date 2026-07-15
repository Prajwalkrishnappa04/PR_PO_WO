# Copyright (c) 2025, Hybrowlabs and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document



@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def search_branch_employee(doctype, txt, searchfield, start, page_len, filters):
	user_branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "branch")
	if user_branch:
		return frappe.db.sql(
			"""SELECT name, employee_name
			FROM `tabEmployee`
			WHERE branch = %(branch)s
			AND (name LIKE %(txt)s OR employee_name LIKE %(txt)s)
			ORDER BY employee_name
			LIMIT %(start)s, %(page_len)s""",
			{"branch": user_branch, "txt": f"%{txt}%", "start": start, "page_len": page_len},
		)
	return frappe.db.sql(
		"""SELECT name, employee_name
		FROM `tabEmployee`
		WHERE (name LIKE %(txt)s OR employee_name LIKE %(txt)s)
		ORDER BY employee_name
		LIMIT %(start)s, %(page_len)s""",
		{"txt": f"%{txt}%", "start": start, "page_len": page_len},
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def search_student(doctype, txt, searchfield, start, page_len, filters):
	return frappe.db.sql(
		"""SELECT name, student_name, maa_code
		FROM `tabStudent`
		WHERE (maa_code LIKE %(txt)s OR student_name LIKE %(txt)s OR name LIKE %(txt)s)
		ORDER BY CAST(NULLIF(REGEXP_REPLACE(maa_code, '[^0-9]', ''), '') AS UNSIGNED)
		LIMIT %(start)s, %(page_len)s""",
		{"txt": f"%{txt}%", "start": start, "page_len": page_len},
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def search_town_village(doctype, txt, searchfield, start, page_len, filters):
	# Search only by the townvillage field (not by name/taluka).
	conditions = ["townvillage LIKE %(txt)s"]
	values = {"txt": f"%{txt}%", "start": start, "page_len": page_len}
	if filters and filters.get("taluka"):
		conditions.append("taluka = %(taluka)s")
		values["taluka"] = filters.get("taluka")

	return frappe.db.sql(
		"""SELECT name, townvillage
		FROM `tabTown Village`
		WHERE {conditions}
		ORDER BY townvillage
		LIMIT %(start)s, %(page_len)s""".format(conditions=" AND ".join(conditions)),
		values,
	)


@frappe.whitelist()
def get_project_by_name(project_name):
	# Resolve an IRS Project's id by its project_name, bypassing read-permission
	# (frappe.db.get_value does not enforce perms) so non-System-Manager users can
	# still get the auto-set project.
	return frappe.db.get_value("IRS Project", {"project_name": project_name}, "name")


@frappe.whitelist()
def create_student_and_set_maa_code(student_name, gender, interview_place, application_receive_date, maa_branch=None):
	student = frappe.get_doc({
		"doctype": "Student",
		"student_name": student_name,
		"gender": gender,
		"interview_place": interview_place,
		"maa_branch": maa_branch,
		"application_receive_date": application_receive_date
	})
	student.insert(ignore_permissions=True)
	return student.name


class InwardDocument(Document):
	#to save entry by user
	def save_entry_By(self):
		if not self.entry_by:
			self.entry_by = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

	def set_receiving_dates(self):
		# received_date set hoy to badhi child (document_records) rows ni receiving_date
		# ene barabar karo, jethi save par hameshaa parent ni received_date sathe match thay.
		if self.received_date:
			for row in self.document_records:
				row.receiving_date = self.received_date

	#before save hook
	def before_save(self):
		self.save_entry_By()
		self.set_receiving_dates()
