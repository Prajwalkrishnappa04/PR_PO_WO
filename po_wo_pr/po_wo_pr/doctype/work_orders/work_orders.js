frappe.ui.form.on("Work Order Description", {
    order_quantity(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    },
    rate(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    }
});

function calculate_amount(frm, cdt, cdn) {
    let row = frappe.get_doc(cdt, cdn);

    row.amount = (row.order_quantity || 0) * (row.rate || 0);

    frm.refresh_field("description");
}

frappe.ui.form.on("Work Orders", {
    refresh(frm) {

    },
});
