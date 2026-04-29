import frappe

def main():
    report_name = "Attendance Custom Report"
    if not frappe.db.exists("Report", report_name):
        doc = frappe.get_doc({
            "doctype": "Report",
            "report_name": report_name,
            "report_type": "Script Report",
            "is_standard": "Yes",
            "module": "Po Wo Pr",
            "ref_doctype": "Attendance"
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"Successfully created Report: {report_name}")
    else:
        doc = frappe.get_doc("Report", report_name)
        doc.report_type = "Script Report"
        doc.is_standard = "Yes"
        doc.module = "Po Wo Pr"
        doc.ref_doctype = "Attendance"
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        print(f"Report {report_name} already exists, updated settings.")

if __name__ == "__main__":
    main()
