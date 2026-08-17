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
def get_latest_application_receive_date(maa_code, udaan=0):
	"""Return the Received Date of the given student's most recently created Inward Document.

	application_receive_date in Academic Entry is filled from this date. `received_date`
	is used as the date, not Posting Date — when the application actually arrived is the
	correct meaning, whereas Posting Date only shows when the entry was made.

	If `udaan` is truthy it looks at the Udaan Student `udaan_maa_code` field, otherwise
	the regular Student `maa_code`. They are two separate Link fields, so the key differs.

	Sorting is on `creation` — that is set by the system and cannot be changed by the
	user, so the answer to "which entry was made last" stays reliable.

	A user without read permission on Inward Document can still fill an Academic Entry —
	frappe.get_all() does not enforce permission checks, so that case works too.
	Only a single date is returned, no other data leaks.
	"""
	if not maa_code:
		return None

	# cint() so that a string like "0" is also correctly treated as False — arguments
	# come through frappe.call as strings.
	link_field = "udaan_maa_code" if frappe.utils.cint(udaan) else "maa_code"

	rows = frappe.get_all(
		"Inward Document",
		filters={link_field: maa_code, "docstatus": ["<", 2]},
		fields=["received_date"],
		order_by="creation desc",
		limit=1,
	)
	return rows[0].received_date if rows else None

@frappe.whitelist()
def get_latest_medium(maa_code, udaan=0):
    """Return medium from the latest Inward Document for the student."""

    if not maa_code:
        return None

    link_field = "udaan_maa_code" if frappe.utils.cint(udaan) else "maa_code"

    rows = frappe.get_all(
        "Inward Document",
        filters={
            link_field: maa_code,
            "docstatus": ["<", 2]
        },
        fields=["medium"],
        order_by="creation desc",
        limit=1,
    )

    return rows[0].medium if rows else None

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
		# Fill received_date only into rows with an empty receiving_date — don't
		# overwrite rows where the user has set a different date.
		if self.received_date:
			for row in self.document_records:
				if not row.receiving_date:
					row.receiving_date = self.received_date

	def add_branch(self):
		current_user = frappe.session.user
		branch = frappe.db.get_value("Employee", {"user_id":current_user}, "branch")
		self.maa_branch = branch

	#before save hook
	def before_save(self):
		self.save_entry_By()
		self.set_receiving_dates()
		self.add_branch()

	def autoname(self):
		employee = frappe.db.get_value(
			"Employee",
			{"user_id": frappe.session.user},
			"custom_maa_branch"
		)

		if not employee:
			frappe.throw("Employee Branch not found for current user.")

		branch_letter = employee.strip()[0].upper()
		prefix = f"IN{branch_letter}"

		year = frappe.utils.now_datetime().year

		last = frappe.db.sql("""
			SELECT name
			FROM `tabInward Document`
			WHERE name LIKE %s
			ORDER BY CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(name, '-', 2), '-', -1) AS UNSIGNED) DESC
			LIMIT 1
		""", (f"{prefix}-%-{year}",))

		if last:
			last_no = int(last[0][0].split("-")[1])
			next_no = last_no + 1
		else:
			next_no = 1

		self.name = f"{prefix}-{str(next_no).zfill(5)}-{year}"		
