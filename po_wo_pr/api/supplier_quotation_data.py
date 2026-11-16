import frappe


@frappe.whitelist()
def get_rfq_comparison_for_supplier_quotation(sq_name):
    """Rate comparison for every RFQ this Supplier Quotation was raised against.

    One block per RFQ: each RFQ item with one entry per RFQ supplier. Rates come
    from submitted Supplier Quotations of that same RFQ, plus this document
    itself so the user sees their own quote while it is still a draft.
    """
    frappe.has_permission("Supplier Quotation", "read", sq_name, throw=True)

    rfq_names = frappe.get_all(
        "Supplier Quotation Item",
        filters={"parent": sq_name, "request_for_quotation": ["is", "set"]},
        pluck="request_for_quotation",
        distinct=True,
    )

    return [_build_rfq_block(rfq, sq_name) for rfq in rfq_names]


def _build_rfq_block(rfq, sq_name):
    rfq_items = frappe.get_all(
        "Request for Quotation Item",
        filters={"parent": rfq},
        fields=["name", "item_code", "item_name", "qty", "uom"],
        order_by="idx asc",
    )
    suppliers = frappe.get_all(
        "Request for Quotation Supplier",
        filters={"parent": rfq},
        pluck="supplier",
        order_by="idx asc",
    )

    items = {
        i.name: {
            "item_code": i.item_code,
            "item_name": i.item_name,
            "qty": i.qty,
            "uom": i.uom,
            "suppliers": {},
        }
        for i in rfq_items
    }

    sq = frappe.qb.DocType("Supplier Quotation")
    sq_item = frappe.qb.DocType("Supplier Quotation Item")
    rows = (
        frappe.qb.from_(sq_item)
        .join(sq)
        .on(sq.name == sq_item.parent)
        .select(
            sq.supplier,
            sq_item.request_for_quotation_item,
            sq_item.rate,
            sq_item.discount_percentage,
            sq_item.discount_amount,
            sq_item.amount,
        )
        .where(sq_item.request_for_quotation == rfq)
        .where((sq.docstatus == 1) | (sq.name == sq_name))
        .orderby(sq.creation)  # a later quotation of the same supplier wins
        .run(as_dict=True)
    )

    for r in rows:
        item = items.get(r.request_for_quotation_item)
        if not item:
            continue
        item["suppliers"][r.supplier] = {
            "rate": r.rate,
            "discount_percentage": r.discount_percentage,
            "discount_amount": r.discount_amount,
            "amount": r.amount,
        }
        if r.supplier not in suppliers:
            suppliers.append(r.supplier)

    return {"rfq": rfq, "items": items, "suppliers": suppliers}
