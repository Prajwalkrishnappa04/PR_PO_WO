frappe.ui.form.on("Payment Request", {
    grand_total(frm) {
        if (frm.doc.grand_total) {
            frm.set_value(
                "custom_amount_in_words",
                frappe.utils.money_in_words(frm.doc.grand_total)
            );
        } else {
            frm.set_value("custom_amount_in_words", "");
        }
    },

    refresh(frm) {
        if (frm.doc.grand_total) {
            frm.set_value(
                "custom_amount_in_words",
                frappe.utils.money_in_words(frm.doc.grand_total)
            );
        }
    }
});