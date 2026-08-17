import frappe
@frappe.whitelist()
def bulk_inward_to_outward(docnames,extra_data=None):
    docnames = frappe.parse_json(docnames)
    extra_data = frappe.parse_json(extra_data)
    for docname in docnames:
        doc = frappe.get_doc("Inward Document", docname)
        frappe.new_doc("Outward Documents").update({
            "inward": doc.name,
            "doc_no": extra_data.doc_name,
            "url": extra_data.postal_url,
            "date": extra_data.date,
        }).insert()
    return "ok"

def outward_documents_permission(user):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return ""
    employee_branch = frappe.db.get_value("Employee", {"user_id": user}, "branch")
    if not employee_branch:
        return "1 = 0"
    return f"(`tabOutward Documents`.`maa_branch` = '{employee_branch}')"

def inward_documents_permission(user):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return ""
    employee_branch = frappe.db.get_value("Employee", {"user_id": user}, "branch")
    if not employee_branch:
        return "1 = 0"
    return f"(`tabInward Documents`.`maa_branch` = '{employee_branch}')"