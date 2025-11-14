import frappe
@frappe.whitelist()
def bulk_inward_to_outward(docnames,extra_data=None):
    try:
        docnames = frappe.parse_json(docnames)
        for docname in docnames:
            doc = frappe.get_doc("Inward Document", docname)
            frappe.new_doc("Outward Documents").update({
                "inward": doc.name,
                "doc_no": doc.doc_name,
                "url": doc.postal_url,
                "date": doc.date,
            }).insert()
        return "ok"
    except Exception as e:
        return str(e)