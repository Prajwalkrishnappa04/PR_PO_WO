frappe.ui.form.on("Purchase Order", {
    refresh(frm) {
        frm.trigger("update_combined_data");
    },

    custom_po_prefix(frm) {
        frm.trigger("update_combined_data");
    },

    custom_po_type(frm) {
        frm.trigger("update_combined_data");
    },

    custom_number(frm) {
        frm.trigger("update_combined_data");
    },

    update_combined_data(frm) {
        const date = frm.doc.custom_po_prefix || "";
        const number = frm.doc.custom_po_type || "";
        const select = frm.doc.custom_number || "";

        // Example format
        const combined = [date, number, select].filter(Boolean).join(" | ");
        console.log(combined)

        frm.set_value("custom_po_number", combined);
    }
});
