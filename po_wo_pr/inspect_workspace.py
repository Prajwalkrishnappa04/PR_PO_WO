import frappe
import json

def execute():
    # To run this, use: bench --site maafoundation.localhost execute inspect_workspace.execute
    meta = frappe.get_meta('Workspace')
    fields = [{'fieldname': f.fieldname, 'fieldtype': f.fieldtype, 'options': f.options} for f in meta.fields if not f.is_virtual]
    print(json.dumps(fields, indent=2))

    # Also check what a typical workspace looks like, maybe "Selling"
    if frappe.db.exists('Workspace', 'Selling'):
        w = frappe.get_doc('Workspace', 'Selling')
        print("Selling Workspace linkages:")
        for link in w.get('links', []):
            print(f" - {link.label}: {link.type} -> {link.link_to}")
