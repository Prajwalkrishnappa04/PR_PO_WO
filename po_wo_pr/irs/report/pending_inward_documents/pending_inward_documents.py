import frappe


def execute(filters=None):
    data = frappe.db.sql("""
        SELECT
            pi.name,
            pi.mob_no,
            tv.townvillage,
            t.taluka,
            d.district,
            pi.maa_code,
            pi.udaan_maa_code,
            pi.sender,
            p.project_name as project,
            ci.document_name
        FROM `tabInward Document` pi
        LEFT JOIN `tabInward Details` ci
            ON pi.name = ci.parent
        LEFT JOIN `tabIRS Project` p
            ON pi.project = p.name
        LEFT JOIN `tabTown Village` tv
            ON pi.place = tv.name
        LEFT JOIN `tabTaluka` t
            ON pi.taluka = t.name
        LEFT JOIN `tabDistrict` d
            ON pi.district = d.name
        WHERE ci.received = 0
            AND application_status = 'Pending'
            AND pi.project IN ('IRS-PROJ-0001', 'IRS-PROJ-0002')
        ORDER BY pi.name
    """, as_dict=True)

    rows = []

    if data:
        comparision_doc = data[0]["name"]
        i = -1

        for row in data:
            if comparision_doc == row["name"] and i != -1:
                if row["document_name"]:
                    rows[i]["document_names"].append(row["document_name"])
            else:
                i = i + 1
                comparision_doc = row["name"]

                rows.append({
                    "name": row["name"],
                    "mob_no": row["mob_no"],
                    "townvillage": row["townvillage"],
                    "taluka": row["taluka"],
                    "district": row["district"],
                    "maa_code": row["maa_code"],
                    "udaan_maa_code": row["udaan_maa_code"],
                    "sender": row["sender"],
                    "project": row["project"],
                    "document_names": []
                })

                if row["document_name"]:
                    rows[i]["document_names"].append(row["document_name"])

    columns = [
        {
            "label": "Document Name",
            "fieldname": "document_name",
            "fieldtype": "Link",
            "options": "Inward Document",
            "width": 150
        },
        {
            "label": "Sender",
            "fieldname": "sender",
            "fieldtype": "Data",
            "width": 150
        },
        {
            "label": "Mobile No",
            "fieldname": "mobile_no",
            "fieldtype": "Data",
            "width": 120
        },
        {
            "label": "Place",
            "fieldname": "townvillage",
            "fieldtype": "Data",
            "width": 100
        },
        {
            "label": "Taluka",
            "fieldname": "taluka",
            "fieldtype": "Data",
            "width": 100
        },
        {
            "label": "District",
            "fieldname": "district",
            "fieldtype": "Data",
            "width": 100
        },
        {
            "label": "Maa Code",
            "fieldname": "maa_code",
            "fieldtype": "Link",
            "options":"Student",
            "width": 100
        },
        {
            "label": "Udaan Maa Code",
            "fieldname": "udaan_maa_code",
            "fieldtype": "Link",
            "options":"Udaan Student",
            "width": 100
        },
        {
            "label": "Project",
            "fieldname": "project",
            "fieldtype": "Data",
            "width": 150
        },
        {
            "label": "Pending Documents",
            "fieldname": "pending_doc_str",
            "fieldtype": "Data",
            "width": 250
        },
        {
            "label": "WhatsApp",
            "fieldname": "whatsapp",
            "fieldtype": "Data",
            "width": 60
        }
    ]

    data = []

    for row in rows:
        pending_doc = ", ".join(row["document_names"])

        data.append({
            "document_name": row["name"],
            "mobile_no": row["mob_no"],
            "townvillage": row["townvillage"],
            "taluka": row["taluka"],
            "district": row["district"],
            "maa_code": row["maa_code"],
            "udaan_maa_code": row["udaan_maa_code"],
            "sender": row["sender"],
            "project": row["project"],
            "pending_doc_str": pending_doc,
            "whatsapp": row["mob_no"]
        })

    return columns, data