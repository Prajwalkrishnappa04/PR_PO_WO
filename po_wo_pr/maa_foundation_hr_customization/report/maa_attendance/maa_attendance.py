import frappe
from frappe.utils import getdate, add_days


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


def get_columns(filters):
    columns = [{
        "label": "Employee Code/Name",
        "fieldname": "employee_label",
        "fieldtype": "Data",
        "width": 220
    }]
    for d in get_date_list(filters):
        columns.append({
            "label": f"{d.strftime('%d-%b')}<br>{d.strftime('%A')}",
            "fieldname": "date_" + d.strftime("%Y_%m_%d"),
            "fieldtype": "Data",
            "width": 110
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

        data.append({"employee_label": f"{emp.name} - {emp.employee_name}"})

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

            is_sunday = d.weekday() == 6  # Monday=0 ... Sunday=6

            if rec:
                punch_in[key] = rec.in_time.strftime("%H:%M") if rec.in_time else "--"
                punch_out[key] = rec.out_time.strftime("%H:%M") if rec.out_time else "--"
                hours[key] = f"{rec.working_hours:.2f}" if rec.working_hours else "--"
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

        data += [punch_in, punch_out, hours, status]
        data.append({"employee_label": f"Total Working Days: {working_days}"})
        data.append({"employee_label": f"Total Leaves: {leaves}"})
        data.append({"employee_label": ""})  # spacer

    return data


def get_employees(filters):
    conditions = {"status": "Active"}
    return frappe.get_all(
        "Employee", filters=conditions,
        fields=["name", "employee_name"], order_by="employee_name asc"
    )


def get_attendance_map(filters):
    conditions = ["attendance_date between %(from_date)s and %(to_date)s", "docstatus = 1"]
    values = {"from_date": filters.from_date, "to_date": filters.to_date}

    if filters.get("branch"):
        conditions.append("custom_branch = %(branch)s")
        values["branch"] = filters.branch

    records = frappe.db.sql(f"""
        select employee, attendance_date, status, in_time, out_time, working_hours
        from `tabAttendance`
        where {' and '.join(conditions)}
    """, values, as_dict=True)

    m = {}
    for r in records:
        m.setdefault(r.employee, {})[r.attendance_date] = r
    return m