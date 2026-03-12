import frappe
from hrms.overrides.employee_master import EmployeeMaster
from frappe.utils import flt, getdate, today
from dateutil.relativedelta import relativedelta

class CustomEmployee(EmployeeMaster):

    def validate(self):
        super(CustomEmployee, self).validate()
        self.update_custom_loan_fields()
        self.calculate_maa_foundation_experience()
        # self.calculate_external_work_experience()



    def update_custom_loan_fields(self):
        loans = frappe.get_all("Loan", filters={
            "applicant_type": "Employee",
            "applicant": self.name,
            "docstatus": 1
        }, fields=["total_payment", "total_amount_paid"])
        
        total_loan_amount = 0
        total_paid_amount = 0
        
        for loan in loans:
            total_loan_amount += flt(loan.total_payment)
            total_paid_amount += flt(loan.total_amount_paid)
        
        remaining_amount = total_loan_amount - total_paid_amount
        
        # We'll use the fieldname custom_total_loan_balance to follow Frappe's best practices for custom fields
        self.custom_total_loan_balance = remaining_amount
        self.custom_loan_amount = total_loan_amount
        self.custom_paid_amount = total_paid_amount
        self.custom_remaining_amount = remaining_amount

    def calculate_maa_foundation_experience(self):
        if self.date_of_joining:
            doj = getdate(self.date_of_joining)
            curr_date = getdate(today())
            diff = relativedelta(curr_date, doj)
            
            years = diff.years
            months = diff.months
            days = diff.days
            
            experience_str = f"{years}year {months}month, {days}days"
            self.custom_maa_foundation_experience = experience_str

    def calculate_external_work_experience(self):
        for row in self.external_work_history:
            if row.custom_from_datee and row.custom_to_datee:
                from_date = getdate(row.custom_from_datee)
                to_date = getdate(row.custom_to_datee)
                diff = relativedelta(to_date, from_date)
                
                years = diff.years
                months = diff.months
                days = diff.days
                
                experience_str = f"{years} Year(s) {months} Month(s) {days} Day(s)"
                row.total_experience = experience_str


@frappe.whitelist()
def update_employee_loan_data(employee):
    loans = frappe.get_all("Loan", filters={
        "applicant_type": "Employee",
        "applicant": employee,
        "docstatus": 1,
        "status": ["in", ["Sanctioned", "Closed"]]
    }, fields=["total_payment", "total_amount_paid"])

    total_loan_amount = 0
    total_paid_amount = 0
    for loan in loans:
        total_loan_amount += flt(loan.total_payment)
        total_paid_amount += flt(loan.total_amount_paid)
    remaining_amount = total_loan_amount - total_paid_amount

    doj = frappe.db.get_value("Employee", employee, "date_of_joining")
    experience_str = ""
    if doj:
        diff = relativedelta(getdate(today()), getdate(doj))
        experience_str = f"{diff.years}year {diff.months}month, {diff.days}days"

    frappe.db.set_value("Employee", employee, {
        "custom_total_loan_balance": remaining_amount,
        "custom_loan_amount": total_loan_amount,
        "custom_paid_amount": total_paid_amount,
        "custom_remaining_amount": remaining_amount,
        "custom_maa_foundation_experience": experience_str
    }, update_modified=False)

    return {
        "custom_total_loan_balance": remaining_amount,
        "custom_loan_amount": total_loan_amount,
        "custom_paid_amount": total_paid_amount,
        "custom_remaining_amount": remaining_amount,
        "custom_maa_foundation_experience": experience_str
    }
