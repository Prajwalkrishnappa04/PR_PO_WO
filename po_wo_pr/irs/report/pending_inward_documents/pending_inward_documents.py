import frappe


def execute(filters=None):
    data = frappe.db.sql("""
        SELECT
            pi.name,
            pi.mob_no,
            pi.place,
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
        WHERE ci.received = 0 
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
                    "place": row["place"],
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
            "label": "Mobile No",
            "fieldname": "mobile_no",
            "fieldtype": "Data",
            "width": 120
        },
        {
            "label": "Place",
            "fieldname": "place",
            "fieldtype": "Link",
            "options":"Town Village",
            "width": 150
        },
        {
            "label": "Maa Code",
            "fieldname": "maa_code",
            "fieldtype": "Link",
            "options":"Student",
            "width": 120
        },
        {
            "label": "Udaan Maa Code",
            "fieldname": "udaan_maa_code",
            "fieldtype": "Link",
            "options":"Udaan Student"
            "width": 150
        },
        {
            "label": "Sender",
            "fieldname": "sender",
            "fieldtype": "Data",
            "width": 150
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
            "width": 80
        }
    ]

    data = []

    for row in rows:
        pending_doc = ", ".join(row["document_names"])

        data.append({
            "document_name": row["name"],
            "mobile_no": row["mob_no"],
            "place": row["place"],
            "maa_code": row["maa_code"],
            "udaan_maa_code": row["udaan_maa_code"],
            "sender": row["sender"],
            "project": row["project"],
            "pending_doc_str": pending_doc,
            "whatsapp": row["mob_no"]
        })

    return columns, data