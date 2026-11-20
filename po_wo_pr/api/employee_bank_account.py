import frappe
from frappe import _
from frappe.utils import escape_html, get_link_to_form


def _clean(value):
	return (value or "").strip()


def _employee_bank_details(doc):
	return {
		"bank_name": _clean(doc.get("bank_name")),
		"bank_ac_no": _clean(doc.get("bank_ac_no")),
		"ifsc_code": _clean(doc.get("ifsc_code")),
	}


def _missing_labels(details):
	labels = {
		"bank_name": _("Bank Name"),
		"bank_ac_no": _("Bank A/C No."),
		"ifsc_code": _("IFSC Code"),
	}
	return [label for key, label in labels.items() if not details[key]]


def _find_bank_account(bank, account_no, for_update=False):
	# Identity is bank + account number. Bank Account naming is overridden by other
	# installed apps (account_name - account_no vs account_name - bank), so the document
	# name is never used for lookup.
	return frappe.db.get_value(
		"Bank Account",
		{"bank": bank, "bank_account_no": account_no},
		"name",
		order_by="creation asc",
		for_update=for_update,
	)


def _bank_exists(bank_name):
	# Link lookups are case-insensitive on MariaDB; require the exact master name.
	return frappe.db.get_value("Bank", bank_name, "name") == bank_name


def _can_read_bank_account(name):
	return bool(name) and frappe.has_permission("Bank Account", "read", doc=name)


def create_bank_account_on_employee_update(doc, method=None):
	"""Employee on_update (runs for insert and update): create a Bank Account from the
	Employee bank details when none exists yet. Never creates a Bank, never modifies or
	duplicates an existing Bank Account, never raises into the Employee save."""
	details = _employee_bank_details(doc)
	employee_name = _clean(doc.get("employee_name"))

	if _missing_labels(details) or not employee_name:
		return

	bank_name, account_no, ifsc_code = details["bank_name"], details["bank_ac_no"], details["ifsc_code"]

	try:
		if not _bank_exists(bank_name):
			frappe.msgprint(
				_(
					"Bank Account was not created: Bank {0} does not exist in the Bank master. "
					"Create the Bank first (or correct the Bank Name) and save the Employee again."
				).format(frappe.bold(escape_html(bank_name))),
				title=_("Bank Account Not Created"),
				indicator="orange",
			)
			return

		# Serialize automatic creation per Bank (concurrent saves sharing an account), then
		# look up with a current read so a just-committed account is seen.
		frappe.db.get_value("Bank", bank_name, "name", for_update=True)
		existing = _find_bank_account(bank_name, account_no, for_update=True)
		if existing:
			_notify_exists(existing)
			return

		bank_account = frappe.new_doc("Bank Account")
		bank_account.update(
			{
				"account_name": employee_name,
				"bank": bank_name,
				"bank_account_no": account_no,
				"branch_code": ifsc_code,
				"is_company_account": 0,
				"party_type": None,
				"party": None,
			}
		)

		# No permission escalation: the saving user must be allowed to create Bank Accounts.
		if not frappe.has_permission("Bank Account", "create", doc=bank_account):
			frappe.msgprint(
				_(
					"Bank Account was not created: you do not have permission to create Bank Accounts. "
					"Ask a user with Bank Account access to create it."
				),
				title=_("Bank Account Not Created"),
				indicator="orange",
			)
			return

		savepoint = "employee_bank_account"
		frappe.db.savepoint(savepoint)
		try:
			bank_account.insert()
		except frappe.DuplicateEntryError:
			frappe.db.rollback(save_point=savepoint)
			existing = _find_bank_account(bank_name, account_no)
			if existing:
				_notify_exists(existing)
			else:
				frappe.msgprint(
					_(
						"Bank Account was not created: a Bank Account named {0} already exists "
						"for a different bank or account."
					).format(frappe.bold(escape_html(bank_account.name or employee_name))),
					title=_("Bank Account Not Created"),
					indicator="orange",
				)
			return
		except Exception:
			frappe.db.rollback(save_point=savepoint)
			raise

		frappe.msgprint(
			_("Bank Account {0} created for {1}.").format(
				get_link_to_form("Bank Account", bank_account.name), frappe.bold(escape_html(employee_name))
			),
			indicator="green",
			alert=True,
		)
	except Exception:
		frappe.log_error(
			title=f"Employee Bank Account creation failed: {doc.name}",
			message=frappe.get_traceback(),
		)
		frappe.msgprint(
			_(
				"Employee was saved, but the Bank Account could not be created. "
				"Check Bank Account permissions and details, then save the Employee again."
			),
			title=_("Bank Account Not Created"),
			indicator="orange",
		)


def _notify_exists(bank_account):
	if _can_read_bank_account(bank_account):
		message = _("Bank Account {0} already exists.").format(get_link_to_form("Bank Account", bank_account))
	else:
		message = _("A Bank Account for these bank details already exists.")
	frappe.msgprint(message, indicator="blue", alert=True)


@frappe.whitelist()
def get_employee_bank_account_status(employee):
	"""Status of the Bank Account matching the *saved* bank details of an Employee.

	Requires read permission on the Employee. The Bank Account name is only returned
	when the user may read that Bank Account."""
	if not employee or not isinstance(employee, str):
		frappe.throw(_("Employee is required"))

	frappe.has_permission("Employee", "read", doc=employee, throw=True)

	values = frappe.db.get_value(
		"Employee",
		employee,
		["bank_name", "bank_ac_no", "ifsc_code"],
		as_dict=True,
	)
	if not values:
		frappe.throw(_("Employee {0} not found").format(escape_html(employee)), frappe.DoesNotExistError)

	details = _employee_bank_details(values)
	result = {"employee": employee, "saved": details, "state": None, "bank_account": None, "missing": []}

	missing = _missing_labels(details)
	if missing:
		result.update(state="incomplete", missing=missing)
		return result

	existing = _find_bank_account(details["bank_name"], details["bank_ac_no"])
	if existing:
		result["state"] = "exists"
		if _can_read_bank_account(existing):
			result["bank_account"] = existing
		return result

	if not _bank_exists(details["bank_name"]):
		result["state"] = "bank_missing"
		return result

	result["state"] = "not_created"
	return result
