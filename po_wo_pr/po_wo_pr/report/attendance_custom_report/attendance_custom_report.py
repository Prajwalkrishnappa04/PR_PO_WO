import frappe

def execute(filters=None):
    doctype = "Attendance"

    if not filters: filters = {}
    
    # Map filters to the actual doctype fields
    report_filters = {}
    if filters.get("from_date") and filters.get("to_date"):
        report_filters["attendance_date"] = ["between", [filters.get("from_date"), filters.get("to_date")]]
    elif filters.get("from_date"):
        report_filters["attendance_date"] = [">=", filters.get("from_date")]
    elif filters.get("to_date"):
        report_filters["attendance_date"] = ["<=", filters.get("to_date")]

    # Keep other filters if any
    for key, val in filters.items():
        if key not in ["from_date", "to_date"]:
            report_filters[key] = val

    meta = frappe.get_meta(doctype)

    # Get ALL list view fields (no limit)
    list_fields = [
        df for df in meta.fields
        if df.in_list_view and df.fieldtype not in ["Section Break", "Column Break"]
    ]

    # Build columns
    columns = [{
        "label": "ID",
        "fieldname": "name",
        "fieldtype": "Link",
        "options": doctype,
        "width": 150
    }]

    for df in list_fields:
        columns.append({
            "label": df.label,
            "fieldname": df.fieldname,
            "fieldtype": df.fieldtype,
            "options": df.options,
            "width": 150   # increase width so 9 fields fit nicely
        })

    fields = ["name"] + [df.fieldname for df in list_fields]

    data = frappe.get_all(
        doctype,
        fields=fields,
        filters=report_filters,
        order_by="modified desc"
    )

    return columns, data
