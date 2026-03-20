frappe.ui.form.on("Material Request Item", {
    item_code: function(frm, cdt, cdn) {
        fetch_stock_balance(frm, cdt, cdn);
    },

    warehouse: function(frm, cdt, cdn) {
        fetch_stock_balance(frm, cdt, cdn);
    }
});

function fetch_stock_balance(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    console.log("row data ------------", row);

    if (row.item_code && row.warehouse) {
        frappe.call({
            method: "erpnext.stock.utils.get_stock_balance",
            args: {
                item_code: row.item_code,
                warehouse: row.warehouse
            },
            callback: function(r) {
                console.log("stock balance response --------", r);
                if (r.message !== undefined) {
                    frappe.model.set_value(
                        cdt,
                        cdn,
                        "custom_stock_balance_qty",
                        r.message
                    );
                }
            }
        });
    }
}