import frappe
from frappe import _
from frappe.utils import get_time


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
                "start", "end", "team", "project", "total_passengers"],
    )

    my_emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
    driver_names = {d.name: d.full_name for d in
                    frappe.get_all("Driver", fields=["name", "full_name"])}

    emp_ids = list({b.employee for b in bookings if b.employee})
    emp_names = {e.name: e.employee_name for e in frappe.get_all(
        "Employee", filters={"name": ["in", emp_ids]},
        fields=["name", "employee_name"])} if emp_ids else {}

    proj_ids = list({b.project for b in bookings if b.project})
    proj_names = {p.name: p.project_name for p in frappe.get_all(
        "Maa Project", filters={"name": ["in", proj_ids]},
        fields=["name", "project_name"])} if proj_ids else {}

    for b in bookings:
        b["is_mine"] = (b.employee == my_emp)
        b["driver_name"] = driver_names.get(b.driver)
        b["employee_name"] = emp_names.get(b.employee)
        b["project_name"] = proj_names.get(b.project)
        b["start"] = get_time(b.start).strftime("%H:%M:%S")
        b["end"] = get_time(b.end).strftime("%H:%M:%S")
    return {"vehicles": vehicles, "bookings": bookings}


@frappe.whitelist()
def book(vehicle, driver, allocation_date, start, end,
         team=None, project=None, total_passengers=None):
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
        "total_passengers": total_passengers,
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


@frappe.whitelist()
def edit_booking(name, start, end, driver, team=None, project=None, total_passengers=None):
    doc = frappe.get_doc("Maa Driver Allocation", name)
    if doc.employee != get_my_employee():
        frappe.throw(_("Only the creator can edit this booking"))
    doc.start = start
    doc.end = end
    doc.driver = driver
    doc.team = team
    doc.project = project
    doc.total_passengers = total_passengers
    doc.flags.ignore_permissions = True
    doc.save()  # runs validate() -> overlap check