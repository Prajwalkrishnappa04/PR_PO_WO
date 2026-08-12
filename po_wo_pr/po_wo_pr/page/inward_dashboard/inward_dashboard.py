import frappe
from frappe.utils import getdate


@frappe.whitelist()
def get_number_cards(project=None, subject=None, month=None, academic_year=None):
    where, values = get_conditions(project, subject, month, academic_year)

    return frappe.db.sql(f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN application_status='Pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN application_status='Accept' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN application_status='Reject' THEN 1 ELSE 0 END) AS rejected,
            SUM(CASE WHEN application_status='Repeat Reject' THEN 1 ELSE 0 END) AS repeat_rejected
        FROM `tabInward Document`
        {where}
    """, values, as_dict=True)[0]


@frappe.whitelist()
def get_status_summary(project=None, subject=None, month=None, academic_year=None):
    where, values = get_conditions(project, subject, month, academic_year)

    return frappe.db.sql(f"""
        SELECT application_status AS label,
               COUNT(*) AS count
        FROM `tabInward Document`
        {where}
        GROUP BY application_status
        ORDER BY count DESC
    """, values, as_dict=True)


@frappe.whitelist()
def get_application_status_summary(project=None, subject=None, month=None, academic_year=None):
    where, values = get_conditions(project, subject, month, academic_year)

    status_condition = "application_status IN ('Accept', 'Reject', 'Repeat Reject')"

    if where:
        where += f" AND {status_condition}"
    else:
        where = f"WHERE {status_condition}"

    return frappe.db.sql(f"""
        SELECT application_status AS label,
               COUNT(*) AS count
        FROM `tabInward Document`
        {where}
        GROUP BY application_status
        ORDER BY count DESC
    """, values, as_dict=True)


@frappe.whitelist()
def get_medium_summary(project=None, subject=None, month=None, academic_year=None):
    where, values = get_conditions(project, subject, month, academic_year)

    if where:
        where += " AND medium IS NOT NULL"
    else:
        where = "WHERE medium IS NOT NULL"

    return frappe.db.sql(f"""
        SELECT medium AS label,
               COUNT(*) AS count
        FROM `tabInward Document`
        {where}
        GROUP BY medium
        ORDER BY count DESC
    """, values, as_dict=True)


@frappe.whitelist()
def get_location_summary(level="district", project=None, subject=None, month=None, academic_year=None):

    if level not in ("district", "taluka", "state"):
        frappe.throw("Invalid level")

    where, values = get_conditions(project, subject, month, academic_year)

    if where:
        where += f" AND `{level}` IS NOT NULL"
    else:
        where = f"WHERE `{level}` IS NOT NULL"

    return frappe.db.sql(f"""
        SELECT `{level}` AS label,
               COUNT(*) AS count
        FROM `tabInward Document`
        {where}
        GROUP BY `{level}`
        ORDER BY count DESC
        LIMIT 20
    """, values, as_dict=True)


@frappe.whitelist()
def get_monthly_trend(months=6, project=None, subject=None, month=None, academic_year=None):

    months = int(months)

    where, values = get_conditions(project, subject, month, academic_year)

    values["months"] = months

    if where:
        where += " AND received_date >= DATE_SUB(CURDATE(), INTERVAL %(months)s MONTH)"
    else:
        where = "WHERE received_date >= DATE_SUB(CURDATE(), INTERVAL %(months)s MONTH)"

    return frappe.db.sql(f"""
        SELECT
            DATE_FORMAT(received_date, '%%Y-%%m') AS label,
            COUNT(*) AS count
        FROM `tabInward Document`
        {where}
        GROUP BY label
        ORDER BY label
    """, values, as_dict=True)


MONTH_NAME_TO_NUMBER = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12
}


def get_conditions(project=None, subject=None, month=None, academic_year=None):
    conditions = []
    values = {}

    if project:
        conditions.append("project = %(project)s")
        values["project"] = project

    if subject:
        conditions.append("subject = %(subject)s")
        values["subject"] = subject

    if month:
        month_number = MONTH_NAME_TO_NUMBER.get(month)
        if month_number:
            conditions.append("MONTH(received_date) = %(month)s")
            values["month"] = month_number

    if academic_year:
        ay = frappe.db.get_value(
            "Academic Year", academic_year, ["start_date", "end_date"], as_dict=True
        )
        if ay and ay.start_date and ay.end_date:
            conditions.append("received_date BETWEEN %(ay_start)s AND %(ay_end)s")
            values["ay_start"] = ay.start_date
            values["ay_end"] = ay.end_date

    where = ""
    if conditions:
        where = "WHERE " + " AND ".join(conditions)

    return where, values

@frappe.whitelist()
def get_rejection_reason_summary(project=None, subject=None, month=None, academic_year=None):
    where, values = get_conditions(project, subject, month, academic_year)

    reject_condition = "application_status IN ('Reject', 'Repeat Reject')"

    if where:
        where += f" AND {reject_condition} AND reason_for_rejection IS NOT NULL"
    else:
        where = f"WHERE {reject_condition} AND reason_for_rejection IS NOT NULL"

    return frappe.db.sql(f"""
        SELECT reason_for_rejection AS label,
               COUNT(*) AS count
        FROM `tabInward Document`
        {where}
        GROUP BY reason_for_rejection
        ORDER BY count DESC
    """, values, as_dict=True)

@frappe.whitelist()
def get_missing_documents_summary(project=None, subject=None, month=None, academic_year=None):
    where, values = get_conditions(project, subject, month, academic_year)

    if where:
        where += " AND ifnull(det.received, 0) = 0"
    else:
        where = "WHERE ifnull(det.received, 0) = 0"

    return frappe.db.sql(f"""
        SELECT det.document_name AS label,
               COUNT(*) AS count
        FROM `tabInward Details` det
        INNER JOIN `tabInward Document` id ON det.parent = id.name
        {where}
        GROUP BY det.document_name
        ORDER BY count DESC
    """, values, as_dict=True)