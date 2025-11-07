// Copyright (c) 2025, Hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Outward Documents", {
    refresh(frm) {
        frm.add_custom_button("Track Order", () => {
            if (!frm.doc.doc_no) {
                frappe.msgprint("Please enter tracking number");
                return;
            }

            let url = `${frm.doc.url}${frm.doc.doc_no}`;
            window.open(url, "_blank");
        });
        if (frm.is_new()) {
            frm.set_df_property("url", "reqd", true);
            frm.set_df_property("url", "read_only", false);
        } else {
            // After save do not allow editing
            frm.set_df_property("url", "reqd", false);
            frm.set_df_property("url", "read_only", true);
        }
    }

});
