import frappe
from frappe import _


def get_my_employee():
    emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
    if not emp:
        frappe.throw(_("No Employee is linked to your user"))
    return emp


@frappe.whitelist()
def get_day_data(date):
    vehicles = frappe.get_all(
        "Vehicle",
        filters={"location": "Vapi"},
        fields=["name", "license_plate", "model"],
        order_by="license_plate",
    )
    bookings = frappe.get_all(
        "Maa Driver Allocation",
        filters={"allocation_date": date},
        fields=["name", "vehicle", "driver", "employee",
                "start", "end", "team", "project"],
    )

    my_emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
    driver_names = {d.name: d.full_name for d in
                    frappe.get_all("Driver", fields=["name", "full_name"])}
    emp_ids = list({b.employee for b in bookings if b.employee})
    emp_names = {e.name: e.employee_name for e in frappe.get_all(
        "Employee", filters={"name": ["in", emp_ids]},
        fields=["name", "employee_name"])} if emp_ids else {}

    for b in bookings:
        b["is_mine"] = (b.employee == my_emp)
        b["driver_name"] = driver_names.get(b.driver)
        b["employee_name"] = emp_names.get(b.employee)
        b["start"] = str(b.start)
        b["end"] = str(b.end)
    return {"vehicles": vehicles, "bookings": bookings}


@frappe.whitelist()
def book(vehicle, driver, allocation_date, start, end, team=None, project=None):
    doc = frappe.get_doc({
        "doctype": "Maa Driver Allocation",
        "employee": get_my_employee(),
        "vehicle": vehicle,
        "driver": driver,
        "allocation_date": allocation_date,
        "start": start,
        "end": end,
        "team": team,
        "project": project,
    })
    doc.insert()
    return doc.name


@frappe.whitelist()
def delete_booking(name):
    doc = frappe.get_doc("Maa Driver Allocation", name)
    if doc.employee != get_my_employee():
        frappe.throw(_("Only the creator can delete this booking"))
    frappe.delete_doc("Maa Driver Allocation", name, ignore_permissions=True)


@frappe.whitelist()
def transfer(name, new_employee):
    doc = frappe.get_doc("Maa Driver Allocation", name)
    if doc.employee != get_my_employee():
        frappe.throw(_("Only the current owner can transfer this booking"))
    if not frappe.db.exists("Employee", new_employee):
        frappe.throw(_("Employee {0} not found").format(new_employee))
    doc.employee = new_employee
    doc.flags.ignore_permissions = True
    doc.save()