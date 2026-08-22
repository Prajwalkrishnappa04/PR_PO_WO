import frappe
from frappe.utils import getdate, add_days
from datetime import timedelta


def execute(filters=None):
    filters = frappe._dict(filters or {})
    columns = get_columns(filters)
    data = get_data(filters)
    return columns, data


def get_date_list(filters):
    if not filters.from_date or not filters.to_date:
        return []
    d, end = getdate(filters.from_date), getdate(filters.to_date)
    dates = []
    while d <= end:
        dates.append(d)
        d = add_days(d, 1)
    return dates


def format_time(value):
    """Convert Time fieldtype (timedelta) or string into clean HH:MM."""
    if not value:
        return "--"
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes = remainder // 60
        return f"{hours:02d}:{minutes:02d}"
    # fallback if it's already a string like "09:12:00"
    parts = str(value).split(":")
    if len(parts) >= 2:
        return f"{parts[0]:0>2}:{parts[1]:0>2}"
    return str(value)


def format_hours(value):
    """custom_work_hours is a Data (string) field, not Float — cast safely."""
    if not value:
        return "--"
    try:
        return f"{float(value):.2f}"
    except (ValueError, TypeError):
        return str(value)


def get_columns(filters):
    columns = [{
        "label": "Employee Code/Name",
        "fieldname": "employee_label",
        "fieldtype": "Data",
        "width": 260
    }]

    for d in get_date_list(filters):
        columns.append({
            "label": d.strftime("%d-%b-%Y"),
            "fieldname": "date_" + d.strftime("%Y_%m_%d"),
            "fieldtype": "Data",
            "width": 100
        })

    columns.append({
        "label": "Total Working Days",
        "fieldname": "total_working_days",
        "fieldtype": "Data",
        "width": 140
    })
    columns.append({
        "label": "Total Leaves",
        "fieldname": "total_leaves",
        "fieldtype": "Data",
        "width": 120
    })

    return columns


def get_data(filters):
    date_list = get_date_list(filters)
    if not date_list:
        return []

    employees = get_employees(filters)
    attendance_map = get_attendance_map(filters)

    data = []
    for emp in employees:
        emp_records = attendance_map.get(emp.name, {})
        branch = emp.get("custom_maa_branch") or "--"

        punch_in, punch_out, hours, status = (
            {"employee_label": "Punch In"},
            {"employee_label": "Punch Out"},
            {"employee_label": "Total Work Hours"},
            {"employee_label": "Status"},
        )

        working_days, leaves = 0, 0

        for d in date_list:
            key = "date_" + d.strftime("%Y_%m_%d")
            rec = emp_records.get(d)

            is_sunday = d.weekday() == 6

            if rec:
                punch_in[key] = format_time(rec.custom_exact_in_time)
                punch_out[key] = format_time(rec.custom_exact_out_time)
                hours[key] = format_hours(rec.custom_work_hours)
                status[key] = rec.status or "--"

                if rec.status in ("Present", "Work From Home", "Half Day"):
                    working_days += 1
                if rec.status in ("On Leave", "Absent"):
                    leaves += 1

            elif is_sunday:
                punch_in[key] = "--"
                punch_out[key] = "--"
                hours[key] = "--"
                status[key] = "Present"
                working_days += 1

            else:
                punch_in[key] = punch_out[key] = hours[key] = "--"
                status[key] = "Missed"

        emp_header = {
            "employee_label": f"{emp.name} - {emp.employee_name} ({branch})",
            "total_working_days": "",
            "total_leaves": "",
        }

        status["total_working_days"] = working_days
        status["total_leaves"] = leaves

        data.append(emp_header)
        data += [punch_in, punch_out, hours, status]
        data.append({"employee_label": ""})  # spacer

    return data


def get_employees(filters):
    conditions = {"status": "Active"}
    return frappe.get_all(
        "Employee", filters=conditions,
        fields=["name", "employee_name", "custom_maa_branch"],
        order_by="employee_name asc"
    )


def get_attendance_map(filters):
    conditions = ["attendance_date between %(from_date)s and %(to_date)s", "docstatus = 1"]
    values = {"from_date": filters.from_date, "to_date": filters.to_date}

    if filters.get("branch"):
        conditions.append("custom_branch = %(branch)s")
        values["branch"] = filters.branch

    records = frappe.db.sql(f"""
        select employee, attendance_date, status,
               custom_exact_in_time, custom_exact_out_time, custom_work_hours
        from `tabAttendance`
        where {' and '.join(conditions)}
    """, values, as_dict=True)

    m = {}
    for r in records:
        m.setdefault(r.employee, {})[r.attendance_date] = r
    return m