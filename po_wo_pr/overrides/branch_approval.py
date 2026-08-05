"""Branch-scoped HOD approval for the buying workflow.

Purchase Order and Supplier Quotation both run a Draft -> Pending Approval ->
Approved/Rejected workflow. Approval authority is not "anyone holding the
Purchase Manager role" -- it is the one person named as `custom_hod` on the
document's own `custom_branch`. A Purchase Manager from another branch must not
be able to approve, and that branch HOD must additionally hold Purchase Manager.

Four layers enforce and support that, deliberately overlapping:

1. The workflow transition `condition` hides Approve/Reject from anyone who is
   not the branch HOD. Conditions run inside `safe_eval` with a tiny globals
   whitelist (`frappe.model.workflow.get_workflow_safe_globals`), so the
   expression can only reach `frappe.db.get_value` and `frappe.session`.
2. `guard_branch_approval` re-checks the same rule server-side. A hidden button
   is not a permission check -- `apply_workflow` is whitelisted and reachable
   directly -- and a failing condition produces no error at all, just a missing
   button. This layer is what actually says *why* it was refused.
3. `set_default_branch` keeps `custom_branch` populated so layers 1 and 2 always
   have something to resolve, and `require_branch_before_approval` stops a
   document leaving Draft without one.
4. `sync_approval_assignment` assigns the document to the HOD when it lands in
   Pending Approval, and closes that assignment once it is decided -- otherwise
   the HOD has no way of knowing something is waiting on them.

Two timing facts shape where these hang:

* The `validate` doc_event fires before `Document._validate()` ->
  `validate_workflow()` (`frappe/model/document.py:414` then `:417`), and
  `apply_workflow` sets the state field *before* saving
  (`frappe/model/workflow.py:126`). So at `validate` time `doc.workflow_state`
  already holds the *target* state while Frappe has not yet accepted the
  transition -- which is what lets layers 2 and 3 veto with a readable message
  instead of a silent no-op.
* Assignment, by contrast, needs a *saved* document: `assign_to` loads it with
  `frappe.get_doc(doctype, name)`. So layer 4 hangs off the post-save events
  instead -- `on_submit` (Draft -> Pending, docstatus 0->1),
  `on_update_after_submit` (Pending -> Approved, 1->1) and `on_cancel`
  (Pending -> Rejected, 1->2).
"""

import frappe
from frappe import _
from frappe.desk.form.assign_to import _add as assign_add
from frappe.desk.form.assign_to import close_all_assignments

BRANCH_FIELD = "custom_branch"
HOD_FIELD = "custom_hod"
STATE_FIELD = "workflow_state"

DRAFT_STATE = "Draft"
PENDING_STATE = "Pending Approval"
APPROVED_STATE = "Approved"
REJECTED_STATE = "Rejected"

# states only the branch HOD may move a document into
HOD_ONLY_STATES = (APPROVED_STATE, REJECTED_STATE)

APPROVER_ROLE = "Purchase Manager"


def get_user_branch(user=None):
	"""Branch of the Employee linked to `user` (None when unmapped).

	Mirrors the lookup Inward Document already uses -- an Employee row is the
	only place the user -> branch mapping lives.
	"""
	return frappe.db.get_value("Employee", {"user_id": user or frappe.session.user}, "branch")


def get_branch_hod(branch):
	"""User named as HOD on `branch` (None when the branch has none)."""
	if not branch:
		return None

	return frappe.db.get_value("Branch", branch, HOD_FIELD)


def set_default_branch(doc, method=None):
	"""Populate `custom_branch` from the creating user's Employee, once.

	Only ever fills a blank, so an explicit override survives every later save
	and an approved document never has its branch moved out from under it.
	"""
	if not doc.meta.has_field(BRANCH_FIELD):
		return

	if doc.get(BRANCH_FIELD):
		return

	branch = get_user_branch()
	if branch:
		doc.set(BRANCH_FIELD, branch)


def require_branch_before_approval(doc, method=None):
	"""Block a document leaving Draft without a Branch.

	`reqd` on the field would also block *saving* a Draft, which stops people
	parking half-finished orders. `mandatory_depends_on` cannot express "is
	leaving Draft" either, because it only sees the current row and not the
	prior state. So the rule lives here.
	"""
	if not doc.meta.has_field(BRANCH_FIELD):
		return

	if doc.get(STATE_FIELD) in (None, "", DRAFT_STATE):
		return

	if doc.get(BRANCH_FIELD):
		return

	frappe.throw(
		_("Set the Branch before sending this {0} for approval.").format(_(doc.doctype)),
		title=_("Branch Required"),
	)


def guard_branch_approval(doc, method=None):
	"""Only the Branch's HOD may move a document to Approved / Rejected.

	Runs on every save but does nothing unless this save is the transition
	*into* an HOD-only state, so re-saving an already-decided document (or a
	patch touching one) is never re-checked.
	"""
	if not doc.meta.has_field(BRANCH_FIELD):
		return

	target_state = doc.get(STATE_FIELD)
	if target_state not in HOD_ONLY_STATES:
		return

	previous_state = (doc.get_doc_before_save() or {}).get(STATE_FIELD)
	if previous_state == target_state:
		# not a transition -- just another save of an already-decided document
		return

	user = frappe.session.user
	if user == "Administrator":
		return

	branch = doc.get(BRANCH_FIELD)
	if not branch:
		frappe.throw(
			_("This {0} has no Branch, so its approver cannot be determined.").format(_(doc.doctype)),
			title=_("Branch Required"),
		)

	hod = get_branch_hod(branch)
	if not hod:
		# Fail closed. Treating "no HOD" as "anyone may approve" would let the
		# whole control be bypassed by clearing one field.
		frappe.throw(
			_("Branch {0} has no HOD set. Ask a System Manager to set the HOD on the Branch before approving.").format(
				frappe.bold(branch)
			),
			title=_("HOD Not Configured"),
		)

	if user != hod:
		frappe.throw(
			_("Only {0}, the HOD of Branch {1}, can approve or reject this {2}.").format(
				frappe.bold(hod), frappe.bold(branch), _(doc.doctype)
			),
			title=_("Not Permitted"),
		)

	if APPROVER_ROLE not in frappe.get_roles(user):
		frappe.throw(
			_("You are the HOD of Branch {0} but do not have the {1} role. Ask a System Manager to grant it.").format(
				frappe.bold(branch), frappe.bold(_(APPROVER_ROLE))
			),
			title=_("Role Missing"),
		)


def sync_approval_assignment(doc, method=None):
	"""Assign to the branch HOD while pending, close the assignment once decided.

	Wrapped in try/except throughout: a ToDo that fails to appear is a nuisance,
	but it must never roll back an approval the user has already been told
	succeeded. Same reasoning as `notify_concern_person` on Outward Documents.
	"""
	if not doc.meta.has_field(BRANCH_FIELD):
		return

	state = doc.get(STATE_FIELD)

	if state == PENDING_STATE:
		_assign_to_hod(doc)
	elif state in HOD_ONLY_STATES:
		_close_assignments(doc)


def _assign_to_hod(doc):
	"""Put the document on the branch HOD's ToDo list."""
	hod = get_branch_hod(doc.get(BRANCH_FIELD))
	if not hod:
		return

	try:
		# `_add` rather than the whitelisted `add`: this runs in the session of
		# the Purchase User who clicked Send for Approval, and they need no
		# permission to put work on the HOD's list. `_add` also no-ops (with a
		# msgprint) when an Open ToDo already exists, so re-saves are safe.
		assign_add(
			{
				"assign_to": [hod],
				"doctype": doc.doctype,
				"name": doc.name,
				"description": _("{0} {1} is pending your approval.").format(_(doc.doctype), doc.name),
			},
			ignore_permissions=True,
		)
	except Exception:
		frappe.log_error(
			title="Branch approval assignment failed",
			message=f"{doc.doctype} {doc.name} -> {hod}\n\n{frappe.get_traceback()}",
		)


def _close_assignments(doc):
	"""Clear the pending-approval ToDo now that the document is decided."""
	try:
		close_all_assignments(doc.doctype, doc.name, ignore_permissions=True)
	except Exception:
		frappe.log_error(
			title="Branch approval assignment close failed",
			message=f"{doc.doctype} {doc.name}\n\n{frappe.get_traceback()}",
		)
