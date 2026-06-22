frappe.ui.form.on("Material Request", {
    refresh(frm) {
        update_all_stock_balances(frm);
    },

    set_warehouse(frm) {
        update_all_stock_balances(frm);
    },

    set_from_warehouse(frm) {
        update_all_stock_balances(frm);
    }
});

frappe.ui.form.on("Material Request Item", {
    item_code: function(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    },

    warehouse: function(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    },

    from_warehouse: function(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    }
});

function update_all_stock_balances(frm) {
    (frm.doc.items || []).forEach(row => {
        update_stock_balance(frm, row.doctype, row.name);
    });
}

function update_stock_balance(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    if (!frm.is_new() && !row.name.startsWith("new-")) return;

    if (!row || !row.item_code) {
        frappe.model.set_value(cdt, cdn, "custom_stock_balance_qty", 0);
        return;
    }

    frappe.call({
        method: "po_wo_pr.api.setup.get_item_stock_balance",
        args: {
            item_code: row.item_code,
            warehouse: row.warehouse || row.from_warehouse || frm.doc.set_warehouse || frm.doc.set_from_warehouse,
            company: frm.doc.company
        },
        callback(r) {
            frappe.model.set_value(cdt, cdn, "custom_stock_balance_qty", flt(r.message));
        }
    });
}
