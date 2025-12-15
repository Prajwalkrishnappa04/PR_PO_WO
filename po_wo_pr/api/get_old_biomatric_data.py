import frappe

@frappe.whitelist()
def import_old_biometric_data():
    import requests

    url = "http://api.microcrispr.com/Maafoundation/api/Values"
    params = {
        "username": "admin",
        "password": "MerilADM",
        "frm": "2025-11-01",
        "to": "2025-12-08"
    }

    # Fetch API Data
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        punch_list = response.json()
    except Exception as e:
        frappe.log_error("Biometric API Error", str(e))
        return {"status": "error", "message": str(e)}

    created = 0
    skipped = 0

    # Group by employee + day
    punches = {}

    for row in punch_list:
        emp = row.get("EmpCode")
        ts = row.get("OFFICEPUNCH")

        if not emp or not ts:
            continue

        punch_time = frappe.utils.get_datetime(ts)
        date_key = punch_time.date()

        punches.setdefault(emp, {})
        punches[emp].setdefault(date_key, [])
        punches[emp][date_key].append(punch_time)

    for emp_code, days in punches.items():

        employee = frappe.db.get_value("Employee", {"attendance_device_id": emp_code}, "name")
        if not employee:
            frappe.log_error(f"Employee not found: {emp_code}", "Biometric Import")
            continue

        for day, times in days.items():
            times.sort()

            for index, punch_time in enumerate(times):

                log_type = "IN" if index % 2 == 0 else "OUT"

                if frappe.db.exists("Employee Checkin", {"employee": employee, "time": punch_time}):
                    skipped += 1
                    continue

                frappe.get_doc({
                    "doctype": "Employee Checkin",
                    "employee": employee,
                    "time": punch_time,
                    "log_type": log_type,
                    "device_id": emp_code
                }).insert(ignore_permissions=True)

                created += 1

            employee = frappe.db.get_value("Employee", {"attendance_device_id": emp_code}, "name")
            if not employee:
                frappe.log_error(f"Employee not found: {emp_code}", "Biometric Import")
                continue

            for day, times in days.items():
                times.sort()
                limited = times[:2]

                for i, punch_time in enumerate(limited):

                    log_type = "IN" if i == 0 else "OUT"
                    if frappe.db.exists("Employee Checkin", {"employee": employee, "time": punch_time}):
                        skipped += 1
                        continue

                    # Create checkin
                    frappe.get_doc({
                        "doctype": "Employee Checkin",
                        "employee": employee,
                        "time": punch_time,
                        "log_type": log_type,
                        "device_id": emp_code
                    }).insert(ignore_permissions=True)

                    created += 1

        frappe.db.commit()

        return {
            "status": "success",
            "created": created,
            "skipped": skipped,
            "message": f"{created} created, {skipped} skipped"
        }
