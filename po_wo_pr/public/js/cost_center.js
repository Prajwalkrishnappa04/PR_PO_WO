frappe.ui.form.on("Cost Center", {
    setup(frm) {
        frm.quick_entry = false;
    }
});

frappe.ui.form.on("Cost center Details", {
    maa_cost_center(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (row.maa_cost_center) {
            frappe.db.get_value("Cost Center", row.maa_cost_center, "cost_center_name")
                .then(r => {
                    if (r.message) {
                        frappe.model.set_value(cdt, cdn, "cost_center_description", r.message.cost_center_name || "");
                    }
                });
        } else {
            frappe.model.set_value(cdt, cdn, "cost_center_description", "");
        }
    },

    gl_name(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.gl_name) {
        frappe.db.get_value("Account", row.gl_name, ["account_name", "account_number"])
            .then(r => {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "gl_description", r.message.account_name || "");
                    frappe.model.set_value(cdt, cdn, "gl_account_no", r.message.account_number || "");
                }
            });
    } else {
        frappe.model.set_value(cdt, cdn, "gl_description", "");
        frappe.model.set_value(cdt, cdn, "account_number", "");
    }
}
});