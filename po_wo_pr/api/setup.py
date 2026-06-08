import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.model.naming import make_autoname

def create_employee_custom_fields():
    create_custom_fields({
        "Employee": [
            {
                "fieldname": "custom_total_loan_balance",
                "label": "Total Loan Balance",
                "fieldtype": "Currency",
                "insert_after": "ctc",
                "read_only": 1,
                "options": "salary_currency"
            }
        ]
    })
    frappe.db.commit()

def set_purchase_order_name(doc, method=None):
    series = doc.naming_series or "MF/IND/CPX/.#####./.FY"
    if series.endswith("/.FY"):
        series = f"{series}."
    doc.name = make_autoname(series, doc=doc)


def set_purchase_receipt_po_fields(doc, method=None):
    po_name = None
    for item in (doc.items or []):
        if item.purchase_order:
            po_name = item.purchase_order
            break

    if not po_name:
        return

    transaction_date = frappe.db.get_value("Purchase Order", po_name, "transaction_date")

    doc.db_set("custom_purchase_order_number", po_name, update_modified=False)
    doc.db_set("custom_purchase_order_date", str(transaction_date) if transaction_date else None, update_modified=False)


def update_po_received_qty(doc, method=None):
    po_names = {item.purchase_order for item in (doc.items or []) if item.purchase_order}
    for po_name in po_names:
        received_qty = frappe.db.sql("""
            SELECT COALESCE(SUM(received_qty), 0)
            FROM `tabPurchase Order Item`
            WHERE parent = %s
        """, po_name)[0][0]
        frappe.db.set_value("Purchase Order", po_name, "custom_received_qty", received_qty)


@frappe.whitelist()
def get_last_ordered_rate(item_code, supplier):
    result = frappe.db.sql("""
        SELECT poi.rate
        FROM `tabPurchase Order Item` poi
        INNER JOIN `tabPurchase Order` po ON po.name = poi.parent
        WHERE poi.item_code = %s
          AND po.supplier = %s
          AND po.docstatus = 1
        ORDER BY po.transaction_date DESC, po.creation DESC
        LIMIT 1
    """, (item_code, supplier), as_dict=True)
    return result[0].rate if result else 0


def update_employee_loan_balance(doc, method=None):
    applicant = getattr(doc, "applicant", None)
    applicant_type = getattr(doc, "applicant_type", None)

    if not (applicant and applicant_type):
        # In some cases, like Loan Repayment, it might be against_loan
        if hasattr(doc, "against_loan") and doc.against_loan:
            loan_details = frappe.db.get_value("Loan", doc.against_loan, ["applicant", "applicant_type"], as_dict=True)
            if loan_details:
                applicant = loan_details.applicant
                applicant_type = loan_details.applicant_type

    if applicant_type == "Employee" and applicant:
        try:
            employee = frappe.get_doc("Employee", applicant)
            employee.save(ignore_permissions=True)
        except Exception:
            # Avoid breaking Loan submission if Employee update fails
            frappe.log_error(frappe.get_traceback(), "Update Employee Loan Balance Error")



# import frappe


# @frappe.whitelist()
# def get_purchase_order_comparison(po_name):
#     po = frappe.get_doc("Purchase Order", po_name)

#     items = frappe.get_all(
#         "Purchase Order Item",
#         filters={"parent": po_name},
#         fields=[
#             "name",
#             "item_code",
#             "item_name",
#             "qty",
#             "uom",
#             "rate",
#             "discount_percentage",
#             "discount_amount",
#             "amount"
#         ],
#         order_by="idx asc"
#     )

#     if not items:
#         return {
#             "items": {},
#             "suppliers": []
#         }

#     supplier = po.supplier
#     suppliers = [supplier] if supplier else []

#     data = {}

#     for row in items:
#         data[row.name] = {
#             "item_code": row.item_code,
#             "item_name": row.item_name,
#             "qty": row.qty,
#             "uom": row.uom,
#             "suppliers": {}
#         }

#         if supplier:
#             data[row.name]["suppliers"][supplier] = {
#                 "rate": row.rate or 0,
#                 "discount_percentage": row.discount_percentage or 0,
#                 "discount_amount": row.discount_amount or 0,
#                 "amount": row.amount or 0
#             }

#     return {
#         "items": data,
#         "suppliers": suppliers
#     }



@frappe.whitelist()
def get_purchase_order_rfq_supplier_comparison(po_name):
    po = frappe.get_doc("Purchase Order", po_name)

    # Purchase Order Item fields
    poi_meta = frappe.get_meta("Purchase Order Item")

    poi_fields = [
        "name",
        "item_code",
        "item_name",
        "qty",
        "uom"
    ]

    if poi_meta.has_field("supplier_quotation"):
        poi_fields.append("supplier_quotation")

    if poi_meta.has_field("supplier_quotation_item"):
        poi_fields.append("supplier_quotation_item")

    po_items = frappe.get_all(
        "Purchase Order Item",
        filters={"parent": po_name},
        fields=poi_fields,
        order_by="idx asc"
    )

    if not po_items:
        return {
            "items": {},
            "suppliers": []
        }

    # Initialize PO items
    data = {}

    for po_item in po_items:
        data[po_item.name] = {
            "item_code": po_item.item_code,
            "item_name": po_item.item_name,
            "qty": po_item.qty,
            "uom": po_item.uom,
            "suppliers": {}
        }

    # Get linked Supplier Quotations from PO Item
    supplier_quotation_names = []

    for row in po_items:
        if row.get("supplier_quotation"):
            supplier_quotation_names.append(row.get("supplier_quotation"))

    supplier_quotation_names = list(set(supplier_quotation_names))

    if not supplier_quotation_names:
        # fallback: current PO supplier only
        if po.supplier:
            for po_item in po_items:
                row_doc = frappe.get_doc("Purchase Order Item", po_item.name)

                data[po_item.name]["suppliers"][po.supplier] = {
                    "rate": row_doc.rate or 0,
                    "discount_percentage": row_doc.discount_percentage or 0,
                    "discount_amount": row_doc.discount_amount or 0,
                    "amount": row_doc.amount or 0
                }

            return {
                "items": data,
                "suppliers": [po.supplier]
            }

        return {
            "items": data,
            "suppliers": []
        }

    # Get Supplier Quotation records
    supplier_quotations = frappe.get_all(
        "Supplier Quotation",
        filters={
            "name": ["in", supplier_quotation_names]
        },
        fields=["name", "supplier"]
    )

    sq_supplier_map = {
        row.name: row.supplier
        for row in supplier_quotations
    }

    # Get linked Supplier Quotation Items
    sqi_meta = frappe.get_meta("Supplier Quotation Item")

    sqi_fields = [
        "name",
        "parent",
        "item_code",
        "qty",
        "uom",
        "rate",
        "discount_percentage",
        "discount_amount",
        "amount"
    ]

    if sqi_meta.has_field("request_for_quotation"):
        sqi_fields.append("request_for_quotation")

    if sqi_meta.has_field("request_for_quotation_item"):
        sqi_fields.append("request_for_quotation_item")

    sq_items = frappe.get_all(
        "Supplier Quotation Item",
        filters={
            "parent": ["in", supplier_quotation_names]
        },
        fields=sqi_fields,
        order_by="idx asc"
    )

    # Find RFQ names from Supplier Quotation Items
    rfq_names = []

    for row in sq_items:
        if row.get("request_for_quotation"):
            rfq_names.append(row.get("request_for_quotation"))

    rfq_names = list(set(rfq_names))

    # Get all suppliers from linked RFQ
    all_suppliers = []

    if rfq_names:
        rfq_suppliers = frappe.get_all(
            "Request for Quotation Supplier",
            filters={
                "parent": ["in", rfq_names]
            },
            fields=["supplier"],
            order_by="idx asc"
        )

        for row in rfq_suppliers:
            if row.supplier and row.supplier not in all_suppliers:
                all_suppliers.append(row.supplier)

    # fallback suppliers from linked Supplier Quotation
    if not all_suppliers:
        for row in supplier_quotations:
            if row.supplier and row.supplier not in all_suppliers:
                all_suppliers.append(row.supplier)

    # Get all submitted Supplier Quotations of same RFQ suppliers
    all_sq_names = []

    if all_suppliers:
        all_sqs = frappe.get_all(
            "Supplier Quotation",
            filters={
                "docstatus": 1,
                "supplier": ["in", all_suppliers]
            },
            fields=["name", "supplier"]
        )

        all_sq_names = [row.name for row in all_sqs]
        sq_supplier_map = {
            row.name: row.supplier
            for row in all_sqs
        }
    else:
        all_sq_names = supplier_quotation_names

    # Get RFQ item names from selected SQ items
    rfq_item_names = []

    for row in sq_items:
        if row.get("request_for_quotation_item"):
            rfq_item_names.append(row.get("request_for_quotation_item"))

    rfq_item_names = list(set(rfq_item_names))

    # Get comparison SQ Items
    filters = {
        "parent": ["in", all_sq_names]
    }

    if rfq_item_names and sqi_meta.has_field("request_for_quotation_item"):
        filters["request_for_quotation_item"] = ["in", rfq_item_names]
    else:
        filters["item_code"] = ["in", [row.item_code for row in po_items if row.item_code]]

    comparison_sq_items = frappe.get_all(
        "Supplier Quotation Item",
        filters=filters,
        fields=sqi_fields,
        order_by="idx asc"
    )

    # Map PO item with SQ item
    rfq_item_to_po_item = {}
    item_code_to_po_item = {}

    for po_item in po_items:
        if po_item.get("supplier_quotation_item"):
            sqi_doc = frappe.get_doc("Supplier Quotation Item", po_item.get("supplier_quotation_item"))

            if sqi_doc.get("request_for_quotation_item"):
                rfq_item_to_po_item[sqi_doc.get("request_for_quotation_item")] = po_item.name

        if po_item.item_code:
            item_code_to_po_item[po_item.item_code] = po_item.name

    # Fill supplier wise data
    for row in comparison_sq_items:
        supplier = sq_supplier_map.get(row.parent)

        if not supplier:
            continue

        po_item_key = None

        if row.get("request_for_quotation_item"):
            po_item_key = rfq_item_to_po_item.get(row.get("request_for_quotation_item"))

        if not po_item_key:
            po_item_key = item_code_to_po_item.get(row.item_code)

        if not po_item_key or po_item_key not in data:
            continue

        data[po_item_key]["suppliers"][supplier] = {
            "rate": row.rate or 0,
            "discount_percentage": row.discount_percentage or 0,
            "discount_amount": row.discount_amount or 0,
            "amount": row.amount or 0
        }

    return {
        "items": data,
        "suppliers": all_suppliers
    }
