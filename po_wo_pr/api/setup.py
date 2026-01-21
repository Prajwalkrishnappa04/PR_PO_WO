import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def create_employee_custom_fields():
    create_custom_fields({
        "Employee": [
            {
                "fieldname": "custom_total_loan_balance",
                "label": "Total Loan Balance",
                "fieldtype": "Currency",
                "insert_after": "ctc",
                "read_only": 1,
                "options": "salary_currency"
            }
        ]
    })
    frappe.db.commit()

def update_employee_loan_balance(doc, method=None):
    applicant = getattr(doc, "applicant", None)
    applicant_type = getattr(doc, "applicant_type", None)

    if not (applicant and applicant_type):
        # In some cases, like Loan Repayment, it might be against_loan
        if hasattr(doc, "against_loan") and doc.against_loan:
            loan_details = frappe.db.get_value("Loan", doc.against_loan, ["applicant", "applicant_type"], as_dict=True)
            if loan_details:
                applicant = loan_details.applicant
                applicant_type = loan_details.applicant_type

    if applicant_type == "Employee" and applicant:
        try:
            employee = frappe.get_doc("Employee", applicant)
            employee.save(ignore_permissions=True)
        except Exception:
            # Avoid breaking Loan submission if Employee update fails
            frappe.log_error(frappe.get_traceback(), "Update Employee Loan Balance Error")
