frappe.query_reports["Maa Attendance"] = {
	"filters": [
		{
			fieldname: "from_date",
			label: "From Date",
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), -7),
			reqd: 1
		},
		{
			fieldname: "to_date",
			label: "To Date",
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1
		},
		{
			fieldname: "branch",
			label: "Branch",
			fieldtype: "Link",
			options: "Branch"
		}
	],

	formatter: function (value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (!data) return value;

		// Employee header row: "EMP001 - Rahul"
		if (
			column.fieldname === "employee_label" &&
			data.employee_label &&
			data.employee_label.includes(" - ") &&
			!data.employee_label.startsWith("Punch") &&
			!data.employee_label.startsWith("Total")
		) {
			value = `<b>${value}</b>`;
		}

		// Summary rows: Total Working Days / Total Leaves
		if (
			column.fieldname === "employee_label" &&
			data.employee_label &&
			data.employee_label.startsWith("Total")
		) {
			value = `<span style="color: var(--text-muted)">${value}</span>`;
		}

		// Status column values
		if (
			data.employee_label === "Status" &&
			column.fieldname !== "employee_label"
		) {
			if (value === "Absent") {
				value = `<span style="color: var(--red-500)">${value}</span>`;
			} else if (value === "Present" || value === "Work From Home") {
				value = `<span style="color: var(--green-500)">${value}</span>`;
			} else if (value === "Missed") {
				value = `<span style="color: var(--orange-500)">${value}</span>`;
			}
		}

		return value;
	}
};