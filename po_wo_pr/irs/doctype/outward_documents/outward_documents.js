// Copyright (c) 2025, Hybrowlabs
// For license information, please see license.txt


frappe.ui.form.on("Outward Documents", {
    refresh(frm) {
        frm.add_custom_button("Track Order", () => {
            if (!frm.doc.doc_no) {
                frappe.msgprint("Please enter tracking number");
                return;
            }
            window.open(`${frm.doc.url}${frm.doc.doc_no}`, "_blank");
        });

        // URL field editable rules
        if (frm.is_new()) {
            frm.set_df_property("url", "reqd", true);
            frm.set_df_property("url", "read_only", false);
        } else {
            frm.set_df_property("url", "reqd", false);
            frm.set_df_property("url", "read_only", true);
        }
    }
});
