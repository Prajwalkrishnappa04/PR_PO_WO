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


def short_branch_name(branch):
    """'Maa Foundation HO - Vapi' -> 'Vapi'. Takes the last ' - ' segment."""
    if not branch or branch == "--":
        return "--"
    parts = branch.split(" - ")
    return parts[-1].strip() if len(parts) > 1 else branch


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

    columns += [
        {"label": "Total Present", "fieldname": "total_present", "fieldtype": "Data", "width": 120},
        {"label": "Total Absent", "fieldname": "total_absent", "fieldtype": "Data", "width": 120},
        {"label": "Total Holidays", "fieldname": "total_holidays", "fieldtype": "Data", "width": 120},
        {"label": "Total Week Off", "fieldname": "total_week_off", "fieldtype": "Data", "width": 120},
    ]

    return columns


def get_data(filters):
    date_list = get_date_list(filters)
    if not date_list:
        return []

    employees = get_employees(filters)
    employee_names = [e.name for e in employees]
    attendance_map = get_attendance_map(filters, employee_names)
    holiday_map = get_holiday_map(filters)  # {date: description}, Sundays excluded

    data = []
    for emp in employees:
        emp_records = attendance_map.get(emp.name, {})
        branch = emp.get("branch") or "--"
        branch_short = short_branch_name(branch)

        punch_in, punch_out, hours, status = (
            {"employee_label": "Punch In"},
            {"employee_label": "Punch Out"},
            {"employee_label": "Total Work Hours"},
            {"employee_label": "Status"},
        )

        present_count, absent_count, holiday_count, week_off_count = 0, 0, 0, 0

        for d in date_list:
            key = "date_" + d.strftime("%Y_%m_%d")
            rec = emp_records.get(d)

            is_sunday = d.weekday() == 6
            is_holiday = d in holiday_map

            if rec:
                punch_in[key] = format_time(rec.custom_exact_in_time)
                punch_out[key] = format_time(rec.custom_exact_out_time)
                hours[key] = format_hours(rec.custom_work_hours)
                status[key] = rec.status or "--"

                if rec.status in ("Present", "Work From Home", "Half Day"):
                    present_count += 1
                elif rec.status in ("Absent", "On Leave"):
                    absent_count += 1

            elif is_sunday:
                punch_in[key] = "--"
                punch_out[key] = "--"
                hours[key] = "--"
                status[key] = "Week Off"
                week_off_count += 1

            elif is_holiday:
                punch_in[key] = "--"
                punch_out[key] = "--"
                hours[key] = "--"
                status[key] = "Holiday"
                holiday_count += 1

            else:
                punch_in[key] = punch_out[key] = hours[key] = "--"
                status[key] = "Absent"
                absent_count += 1

        emp_header = {
            "employee_label": f"{emp.name} - {emp.employee_name} ({branch_short})",
            "total_present": "",
            "total_absent": "",
            "total_holidays": "",
            "total_week_off": "",
        }

        status["total_present"] = present_count
        status["total_absent"] = absent_count
        status["total_holidays"] = holiday_count
        status["total_week_off"] = week_off_count

        data.append(emp_header)
        data += [punch_in, punch_out, hours, status]
        data.append({"employee_label": ""})  # spacer

    return data


def get_employees(filters):
    conditions = {"status": "Active"}
    if filters.get("branch"):
        conditions["branch"] = filters.branch
    return frappe.get_all(
        "Employee", filters=conditions,
        fields=["name", "employee_name", "branch"],
        order_by="employee_name asc"
    )


def get_attendance_map(filters, employee_names):
    """Filter Attendance by employee list (reliable — resolved via Employee.branch),
    never by Attendance's own custom_branch — that's a fetch_from field and can be
    blank/stale on records saved before the branch was set."""
    if not employee_names:
        return {}

    records = frappe.db.sql("""
        select employee, attendance_date, status,
               custom_exact_in_time, custom_exact_out_time, custom_work_hours
        from `tabAttendance`
        where attendance_date between %(from_date)s and %(to_date)s
          and docstatus = 1
          and employee in %(employees)s
    """, {
        "from_date": filters.from_date,
        "to_date": filters.to_date,
        "employees": tuple(employee_names),
    }, as_dict=True)

    m = {}
    for r in records:
        m.setdefault(r.employee, {})[r.attendance_date] = r
    return m


def get_holiday_list_parents(filters):
    """Build likely Holiday List parent names (e.g. '2026-2027') covering the date range."""
    start_year = getdate(filters.from_date).year
    end_year = getdate(filters.to_date).year

    parents = set()
    for y in range(start_year - 1, end_year + 1):
        parents.add(f"{y}-{y + 1}")
    return list(parents)


def get_holiday_map(filters):
    """Return {date: description} for real holidays (excludes Sunday) within the date range,
    scoped to the relevant Holiday List(s) only — keeps the query small."""
    parents = get_holiday_list_parents(filters)
    if not parents:
        return {}

    records = frappe.db.sql("""
        select holiday_date, description
        from `tabHoliday`
        where parent in %(parents)s
          and holiday_date between %(from_date)s and %(to_date)s
          and description != 'Sunday'
    """, {
        "parents": tuple(parents),
        "from_date": filters.from_date,
        "to_date": filters.to_date,
    }, as_dict=True)

    return {r.holiday_date: r.description for r in records}