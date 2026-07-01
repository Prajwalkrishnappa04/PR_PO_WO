// Copyright (c) 2025, Hybrowlabs
// For license information, please see license.txt


frappe.ui.form.on("Outward Documents", {
    onload(frm) {
        if (frm.is_new()) {
            frm.set_value("date", frappe.datetime.get_today());
        }
    },

    inward(frm) {
        if (!frm.doc.inward) return;
        frappe.db.get_value("Inward Document", frm.doc.inward,
            ["date", "place", "taluka", "district", "state", "project", "medium", "subject", "mob_no", "maa_code"],
            (r) => {
                if (!r) return;
                frm.set_value("date", r.date || "");
                frm.set_value("place", r.place || "");
                frm.set_value("taluka", r.taluka || "");
                frm.set_value("district", r.district || "");
                frm.set_value("state", r.state || "");
                frm.set_value("project", r.project || "");
                frm.set_value("meduium", r.medium || "");
                frm.set_value("subject", r.subject || "");
                frm.set_value("mob_no", r.mob_no || "");
                frm.set_value("maa_code", r.maa_code || "");
            }
        );
    },

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
