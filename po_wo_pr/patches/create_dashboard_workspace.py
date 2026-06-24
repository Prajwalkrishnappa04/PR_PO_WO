import frappe
import json
import os

def get_random_id():
    return os.urandom(4).hex()

def execute():
    workspace_name = 'All Dashboards'
    
    # Optional: clean up the existing one
    if frappe.db.exists('Workspace', workspace_name):
        frappe.delete_doc('Workspace', workspace_name)
        frappe.db.commit()
        
    # Get all dashboards with module
    dashboards = frappe.get_all('Dashboard', fields=['name', 'module'], order_by='module asc, name asc')
    
    # Group by module
    by_module = {}
    for d in dashboards:
        m = d.module or 'Other'
        if m not in by_module:
            by_module[m] = []
        by_module[m].append(d.name)
        
    doc = frappe.new_doc('Workspace')
    doc.name = workspace_name
    doc.title = workspace_name
    doc.label = workspace_name
    doc.icon = 'dashboard'
    doc.module = 'Po Wo Pr'
    doc.is_standard = 1
    doc.public = 1
    
    content_blocks = []
    
    for module, d_names in by_module.items():
        # Add Header Block for the Module
        content_blocks.append({
            "id": get_random_id(),
            "type": "header",
            "data": {
                "text": f"<span class=\"h4\"><b>{module} Dashboards</b></span>",
                "col": 12
            }
        })
        
        # Add a block for each dashboard
        for d_name in d_names:
            doc.append('shortcuts', {
                'type': 'Dashboard',
                'label': d_name,
                'link_to': d_name,
                'color': 'Grey',
                'format': '{}'
            })
            
            content_blocks.append({
                "id": get_random_id(),
                "type": "shortcut",
                "data": {
                    "shortcut_name": d_name,
                    "col": 3
                }
            })
            
        # Add Spacer after module
        content_blocks.append({
            "id": get_random_id(),
            "type": "spacer",
            "data": {
                "col": 12
            }
        })
            
    doc.content = json.dumps(content_blocks)
        
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    
    # Export it to standard files inside po_wo_pr module
    try:
        from frappe.modules.export_file import export_to_files
        export_to_files(record_list=[['Workspace', workspace_name]])
    except Exception as e:
        frappe.log_error(title=f"Failed to export {workspace_name} Workspace", message=str(e))
