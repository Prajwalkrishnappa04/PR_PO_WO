import frappe
from erpnext.setup.doctype.employee.employee import Employee

class CustomEmployee(Employee):

    def before_save(self):
        self.ensure_mandatory_documents()

    def ensure_mandatory_documents(self):
        required = ["Aadhaar", "PAN Card"]

        existing = []

        for d in self.get("custom_documents_for_verification"):
            if d.document_name:
                existing.append(d.document_name)

        for doc in required:
            if doc not in existing:
                self.append("custom_documents_for_verification", {
                    "document_name": doc
                })
