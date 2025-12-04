frappe.ui.form.on("Purchase Order", {
    refresh(frm) {
        frm.add_custom_button(
            "Work Order Entry",
            () => {
                frappe.new_doc("Work Order Entry", {
                    purchase_order: frm.doc.name
                });
            },
            "Create"
        );
    },
    transaction_date(frm) {
        if (frm.doc.transaction_date) {
            let tran = frappe.datetime.str_to_obj(frm.doc.transaction_date);
            let week_later = frappe.datetime.add_days(tran, 7);
            frm.set_value("schedule_date", frappe.datetime.obj_to_str(week_later));
        }
    },
    onload(frm) {
        if (frm.doc.transaction_date && !frm.doc.schedule_date) {
            let tran = frappe.datetime.str_to_obj(frm.doc.transaction_date);
            let week_later = frappe.datetime.add_days(tran, 7);
            frm.set_value("schedule_date", frappe.datetime.obj_to_str(week_later));
        }
    }
});
