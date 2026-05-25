import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.model.naming import make_autoname

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

def set_purchase_order_name(doc, method=None):
    item_group = "MISC"
    if doc.items:
        item_group = (doc.items[0].item_group or "MISC").strip().replace(" ", "-")

    series = f"MF/IND/{item_group}/.#####./.FY."
    doc.name = make_autoname(series, doc=doc)


def set_purchase_receipt_po_fields(doc, method=None):
    po_name = None
    for item in (doc.items or []):
        if item.purchase_order:
            po_name = item.purchase_order
            break

    if not po_name:
        return

    transaction_date = frappe.db.get_value("Purchase Order", po_name, "transaction_date")

    doc.db_set("custom_purchase_order_number", po_name, update_modified=False)
    doc.db_set("custom_purchase_order_date", str(transaction_date) if transaction_date else None, update_modified=False)


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
