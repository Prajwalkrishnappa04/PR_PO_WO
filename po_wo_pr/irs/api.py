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