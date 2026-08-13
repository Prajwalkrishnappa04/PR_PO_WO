frappe.ui.form.on("Supplier Quotation", {
    refresh(frm) {
        set_supplier_quotation_series(frm);
    }
});

function set_supplier_quotation_series(frm) {
    if (!frm.doc.items || !frm.doc.items.length) {
        return;
    }

    // Get RFQ from the first item
    const rfq = frm.doc.items.find(
        row => row.request_for_quotation
    )?.request_for_quotation;

    if (!rfq) {
        return;
    }

    frappe.db.get_value(
        "Request for Quotation",
        rfq,
        "naming_series"
    ).then(r => {
        if (!r.message) {
            return;
        }

        if (r.message.naming_series === "MF-RFQ-WO.##.-.MFY") {
            frm.set_value(
                "naming_series",
                "MF-SQ-WO.##.-.MFY"
            );
        } else {
            frm.set_value(
                "naming_series",
                "MF-SQ-.##.-.MFY"
            );
        }
    });
}

frappe.ui.form.on("Purchase Order", {
    refresh(frm) {
        set_purchase_order_series(frm);
    }
});

function set_purchase_order_series(frm) {
    const item = (frm.doc.items || []).find(
        row => row.supplier_quotation_item
    );

    if (!item) {
        return;
    }

    frappe.db.get_value(
        "Supplier Quotation Item",
        item.supplier_quotation_item,
        "request_for_quotation"
    ).then(r => {

        const rfq = r.message?.request_for_quotation;

        if (!rfq) {
            return;
        }

        frappe.db.get_value(
            "Request for Quotation",
            rfq,
            "naming_series"
        ).then(rfq_result => {

            if (
                rfq_result.message?.naming_series ===
                "MF-RFQ-WO.##.-.MFY"
            ) {
                frm.set_value(
                    "naming_series",
                    "MF-WO-SER-.##.-.MFY"
                );
            } else {
                frm.set_value(
                    "naming_series",
                    "MF-PO-CPX-.##.-.MFY"
                );
            }
        });
    });
}

frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        set_purchase_receipt_series(frm);
    }
});

function set_purchase_receipt_series(frm) {
    const item = (frm.doc.items || []).find(
        row => row.purchase_order
    );

    if (!item) {
        return;
    }

    const po = item.purchase_order;

    frappe.db.get_value(
        "Purchase Order",
        po,
        "naming_series"
    ).then(r => {

        if (!r.message) {
            return;
        }

        if (
            r.message.naming_series ===
            "MF-WO-SER-.##.-.MFY"
        ) {
            frm.set_value(
                "naming_series",
                "MF-MRN-WO.##.-.MFY"
            );
        } else {
            frm.set_value(
                "naming_series",
                "MF-MRN-.##.-.MFY"
            );
        }
    });
}

frappe.ui.form.on("Purchase Invoice", {
    refresh(frm) {
        set_purchase_invoice_series(frm);
    }
});

function set_purchase_invoice_series(frm) {
    const item = (frm.doc.items || []).find(
        row => row.purchase_order
    );

    if (!item) {
        return;
    }

    const po = item.purchase_order;

    frappe.db.get_value(
        "Purchase Order",
        po,
        "naming_series"
    ).then(r => {

        if (!r.message) {
            return;
        }

        if (
            r.message.naming_series ===
            "MF-WO-SER-.##.-.MFY"
        ) {
            frm.set_value(
                "naming_series",
                "MF-PI-WO.##.-.MFY"
            );
        } else {
            frm.set_value(
                "naming_series",
                "MF-PI-.##.-.MFY"
            );
        }
    });
}