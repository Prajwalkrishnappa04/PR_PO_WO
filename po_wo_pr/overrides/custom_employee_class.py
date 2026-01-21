import frappe
from erpnext.setup.doctype.employee.employee import Employee
from frappe.utils import flt

class CustomEmployee(Employee):

    def validate(self):
        super(CustomEmployee, self).validate()
        self.set_total_loan_balance()

    def before_save(self):
        self.ensure_mandatory_documents()

    def set_total_loan_balance(self):
        loans = frappe.get_all("Loan", filters={
            "applicant_type": "Employee",
            "applicant": self.name,
            "docstatus": 1,
            "status": ["not in", ["Closed", "Loan Closure Requested"]]
        }, fields=["loan_amount", "total_amount_paid"])
        
        total_balance = 0
        for loan in loans:
            total_balance += flt(loan.loan_amount) - flt(loan.total_amount_paid)
        
        # We'll use the fieldname custom_total_loan_balance to follow Frappe's best practices for custom fields
        self.custom_total_loan_balance = total_balance

    def ensure_mandatory_documents(self):
        required = ["Aadhaar", "PAN Card"]

        existing = []
        if self.get("custom_documents_for_verification"):
            for d in self.get("custom_documents_for_verification"):
                if d.document_name:
                    existing.append(d.document_name)

        for doc in required:
            if doc not in existing:
                self.append("custom_documents_for_verification", {
                    "document_name": doc
                })
