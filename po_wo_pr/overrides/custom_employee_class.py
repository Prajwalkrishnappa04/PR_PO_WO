import frappe
from erpnext.setup.doctype.employee.employee import Employee
from frappe.utils import flt, getdate, today
from dateutil.relativedelta import relativedelta

class CustomEmployee(Employee):

    def validate(self):
        super(CustomEmployee, self).validate()
        self.set_total_loan_balance()
        self.set_maa_experience()



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

    def set_maa_experience(self):
        if self.date_of_joining:
            doj = getdate(self.date_of_joining)
            curr_date = getdate(today())
            diff = relativedelta(curr_date, doj)
            
            years = diff.years
            months = diff.months
            days = diff.days
            
            experience_str = f"{years}year {months}month, {days}days"
            self.custom_maa_foundation_experience = experience_str
