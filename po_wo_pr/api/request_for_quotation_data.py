import frappe


def set_supplier_for_print(doc, method=None, settings=None):
    supplier = frappe.form_dict.get("supplier")
    if not supplier:
        return

    selected_supplier = next((row for row in doc.suppliers if row.supplier == supplier), None)
    if not selected_supplier:
        return

    doc.update_supplier_part_no(supplier)
    doc.suppliers[:] = [
        selected_supplier,
        *(row for row in doc.suppliers if row is not selected_supplier)
    ]


@frappe.whitelist()
def get_supplier_quotation_comparison(rfq_name):

    # 1️⃣ Get RFQ Items
    rfq_items = frappe.get_all(
        "Request for Quotation Item",
        filters={"parent": rfq_name},
        fields=["name", "item_code", "item_name", "uom"]
    )

    if not rfq_items:
        return {}

    rfq_item_map = {i.name: i for i in rfq_items}

    # 2️⃣ Get all suppliers from RFQ
    rfq_suppliers = frappe.get_all(
        "Request for Quotation Supplier",
        filters={"parent": rfq_name},
        fields=["supplier", "supplier_name"]
    )
    all_suppliers = [s.supplier for s in rfq_suppliers]

    # 3️⃣ Get Supplier Quotations linked to this RFQ that are submitted
    submitted_sqs = frappe.get_all(
        "Supplier Quotation",
        filters={
            "docstatus": 1
        },
        fields=["name", "supplier"]
    )

    if not submitted_sqs:
        # Return data structure with all items but no rates yet
        data = {}
        for rfq_item in rfq_items:
            data[rfq_item.item_code] = {
                "item_name": rfq_item.item_name,
                "uom": rfq_item.uom,
                "rates": {}
            }
        return {"items": data, "suppliers": all_suppliers}

    submitted_sq_names = [sq.name for sq in submitted_sqs]

    # 4️⃣ Get Supplier Quotation Items linked to RFQ Items from submitted quotations
    sq_items = frappe.get_all(
        "Supplier Quotation Item",
        filters={
            "request_for_quotation_item": ["in", list(rfq_item_map.keys())],
            "parent": ["in", submitted_sq_names]
        },
        fields=["parent", "item_code", "rate", "request_for_quotation_item"]
    )

    # Initialize data with all RFQ items
    data = {}
    for rfq_item in rfq_items:
        data[rfq_item.item_code] = {
            "item_name": rfq_item.item_name,
            "uom": rfq_item.uom,
            "rates": {}
        }

    # Populate rates from submitted quotations
    for row in sq_items:
        supplier = frappe.db.get_value(
            "Supplier Quotation", row.parent, "supplier"
        )

        if row.item_code in data:
            data[row.item_code]["rates"][supplier] = row.rate

    return {"items": data, "suppliers": all_suppliers}


@frappe.whitelist()
def get_any_supplier_qs(rfq_name):
    print("81===============")
    supplier_qs_found = frappe.db.exists(
        "Supplier Quotation Item",
        {"request_for_quotation": rfq_name}  
    )
    print("supplier_qs_found=============",supplier_qs_found)
    return 1 if supplier_qs_found else 0
