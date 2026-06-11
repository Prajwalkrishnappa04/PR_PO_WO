frappe.ui.form.on("Purchase Invoice", {
    refresh(frm) {
        refresh_all_stock_balances(frm);
    },

    set_warehouse(frm) {
        refresh_all_stock_balances(frm);
    }
});

frappe.ui.form.on("Purchase Invoice Item", {
    item_code(frm, cdt, cdn) {
        refresh_stock_balance(frm, cdt, cdn);
    },

    warehouse(frm, cdt, cdn) {
        refresh_stock_balance(frm, cdt, cdn);
    },

    from_warehouse(frm, cdt, cdn) {
        refresh_stock_balance(frm, cdt, cdn);
    }
});

function refresh_all_stock_balances(frm) {
    (frm.doc.items || []).forEach(row => {
        refresh_stock_balance(frm, row.doctype, row.name);
    });
}

function refresh_stock_balance(frm, cdt, cdn) {
    update_stock_balance(frm, cdt, cdn);

    // ERPNext fills item details asynchronously, so run once again after it settles.
    setTimeout(() => update_stock_balance(frm, cdt, cdn), 500);
}

function update_stock_balance(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    if (!row || !row.item_code) {
        frappe.model.set_value(cdt, cdn, "custom_stock_balance_qty", 0);
        return;
    }

    frappe.call({
        method: "po_wo_pr.api.setup.get_item_stock_balance",
        args: {
            item_code: row.item_code,
            warehouse: row.warehouse || row.from_warehouse || frm.doc.set_warehouse,
            company: frm.doc.company
        },
        callback(r) {
            frappe.model.set_value(cdt, cdn, "custom_stock_balance_qty", flt(r.message));
        }
    });
}
