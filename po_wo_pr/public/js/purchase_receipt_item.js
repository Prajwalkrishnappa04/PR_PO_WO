frappe.ui.form.on('Purchase Receipt Item', {
    // Triggers when accepted/received quantity is changed
    qty: function (frm, cdt, cdn) {
        update_remaining_qty(cdt, cdn);
    },

    // Triggers when custom total quantity is changed
    custom_total_quantity: function (frm, cdt, cdn) {
        update_remaining_qty(cdt, cdn);
    },

    // Triggers when a new row is added
    items_add: function (frm, cdt, cdn) {
        update_remaining_qty(cdt, cdn);
    }
});

function update_remaining_qty(cdt, cdn) {
    let row = locals[cdt][cdn];

    let total_qty = flt(row.custom_total_quantity);
    let accepted_qty = flt(row.qty); // In Purchase Receipt, 'qty' is the accepted quantity

    // Formula: Remaining = Total - Accepted
    let remaining_qty = total_qty - accepted_qty;

    // Set value directly in the child table row
    frappe.model.set_value(cdt, cdn, 'custom_remaining_quantity', remaining_qty >= 0 ? remaining_qty : 0);
}