import frappe
from frappe.utils import add_days, today


def execute(filters=None):
	filters = filters or {}
	columns = [
		{"label": "Employee", "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 120},
		{"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 160},
		{"label": "Date", "fieldname": "attendance_date", "fieldtype": "Date", "width": 100},
		{"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 90},
		{"label": "In Time", "fieldname": "in_time", "fieldtype": "Datetime", "width": 150},
		{"label": "Out Time", "fieldname": "out_time", "fieldtype": "Datetime", "width": 150},
		{"label": "Missing", "fieldname": "missing", "fieldtype": "Data", "width": 100},
	]

	yesterday = add_days(today(), -1)
	from_date = filters.get("from_date") or yesterday
	to_date = filters.get("to_date") or yesterday

	records = frappe.db.sql("""
		SELECT
			employee, employee_name, attendance_date, status, in_time, out_time
		FROM `tabAttendance`
		WHERE
			attendance_date BETWEEN %(from_date)s AND %(to_date)s
			AND (
				(in_time IS NOT NULL AND out_time IS NULL)
				OR (in_time IS NULL AND out_time IS NOT NULL)
			)
		ORDER BY attendance_date DESC
	""", {"from_date": from_date, "to_date": to_date}, as_dict=True)

	data = []
	for row in records:
		row["missing"] = "Out Time" if row["in_time"] else "In Time"
		data.append(row)

	return columns, data