frappe.ui.form.on("Purchase Order", {
    refresh(frm) {
        frm.add_custom_button(
            "Work-Orders",
            () => {
                frappe.new_doc("Work-Orders", {
                    purchase_order: frm.doc.name
                });
            },
            "Create"
        );
    }
});
