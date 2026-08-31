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

		if (
			column.fieldname === "employee_label" &&
			data.employee_label &&
			data.employee_label.includes(" - ") &&
			!["Punch In", "Punch Out", "Total Work Hours", "Status"].includes(data.employee_label)
		) {
			value = `<b>${value}</b>`;
		}

		if (
			data.employee_label === "Status" &&
			column.fieldname.startsWith("date_")
		) {
			if (value === "Absent") {
				value = `<span style="color: var(--red-500)">${value}</span>`;
			} else if (value === "Present" || value === "Work From Home") {
				value = `<span style="color: var(--green-500)">${value}</span>`;
			} else if (value === "Holiday") {
				value = `<span style="color: var(--blue-500)">${value}</span>`;
			} else if (value === "Week Off") {
				value = `<span style="color: var(--gray-500)">${value}</span>`;
			} else if (value === "On Leave") {
				value = `<span style="color: var(--orange-500)">${value}</span>`;
			}
		}

		if (
			data.employee_label === "Status" &&
			["total_present", "total_absent", "total_holidays", "total_week_off"].includes(column.fieldname)
		) {
			value = `<b>${value}</b>`;
		}

		return value;
	}
};