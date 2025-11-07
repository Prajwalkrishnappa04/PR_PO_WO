import frappe
@frappe.whitelist()
def bulk_inward_to_outward(docnames):
    print("*****************bulk_inward_to_outward called****************")
    print(docnames)
    docnames = frappe.parse_json(docnames)
    for docname in docnames:
        doc = frappe.get_doc("Inward Document", docname)
        frappe.new_doc("Outward Documents").update({
            "inward": doc.name,
        }).insert()