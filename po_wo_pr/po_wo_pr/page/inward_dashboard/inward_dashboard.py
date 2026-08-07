import frappe
from frappe.utils import getdate


@frappe.whitelist()
def get_number_cards():
	"""Top-level totals for the dashboard cards."""
	data = frappe.db.sql("""
		SELECT
			COUNT(*) AS total,
			SUM(CASE WHEN application_status = 'Pending' THEN 1 ELSE 0 END) AS pending,
			SUM(CASE WHEN application_status = 'Approved' THEN 1 ELSE 0 END) AS approved,
			SUM(CASE WHEN application_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
		FROM `tabInward Document`
	""", as_dict=True)[0]

	return data


@frappe.whitelist()
def get_status_summary():
	"""Count grouped by application_status."""
	return frappe.db.sql("""
		SELECT application_status AS label, COUNT(*) AS count
		FROM `tabInward Document`
		GROUP BY application_status
		ORDER BY count DESC
	""", as_dict=True)


@frappe.whitelist()
def get_workflow_summary():
	"""Count grouped by workflow_state."""
	return frappe.db.sql("""
		SELECT workflow_state AS label, COUNT(*) AS count
		FROM `tabInward Document`
		WHERE workflow_state IS NOT NULL
		GROUP BY workflow_state
		ORDER BY count DESC
	""", as_dict=True)


@frappe.whitelist()
def get_medium_summary():
	"""Count grouped by medium (how the document was received)."""
	return frappe.db.sql("""
		SELECT medium AS label, COUNT(*) AS count
		FROM `tabInward Document`
		WHERE medium IS NOT NULL
		GROUP BY medium
		ORDER BY count DESC
	""", as_dict=True)


@frappe.whitelist()
def get_location_summary(level="district"):
	"""
	Count grouped by location. level can be 'district', 'taluka', or 'state'.
	Defaults to district since that's the most useful granularity for a chart.
	"""
	if level not in ("district", "taluka", "state"):
		frappe.throw("Invalid level")

	return frappe.db.sql(f"""
		SELECT `{level}` AS label, COUNT(*) AS count
		FROM `tabInward Document`
		WHERE `{level}` IS NOT NULL
		GROUP BY `{level}`
		ORDER BY count DESC
		LIMIT 20
	""", as_dict=True)


@frappe.whitelist()
def get_monthly_trend(months=6):
	"""Date-wise count, grouped by month, for the last N months."""
	months = int(months)
	return frappe.db.sql("""
		SELECT
			DATE_FORMAT(date, '%%Y-%%m') AS label,
			COUNT(*) AS count
		FROM `tabInward Document`
		WHERE date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
		GROUP BY label
		ORDER BY label ASC
	""", (months,), as_dict=True)