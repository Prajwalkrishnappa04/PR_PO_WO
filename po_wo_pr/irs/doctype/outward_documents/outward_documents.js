// Copyright (c) 2025, Hybrowlabs
// For license information, please see license.txt

function load_project_subjects(frm) {
    const field = frm.fields_dict["subject"];
    if (field && field.set_data) field.set_data([]);

    if (!frm.doc.project) return;

    frappe.call({
        method: "frappe.client.get",
        args: { doctype: "IRS Project", name: frm.doc.project },
        callback(r) {
            if (!r.message) return;
            const subjects = (r.message.subjects || [])
                .map(row => row.subject)
                .filter(Boolean);
            if (field && field.set_data) field.set_data(subjects);
            frm.refresh_field("subject");
        }
    });
}

frappe.ui.form.on("Outward Documents", {
    onload(frm) {
        if (frm.is_new()) {
            frm.set_value("date", frappe.datetime.get_today());
        }
    },

    project(frm) {
        frm.set_value("subject", "");
        load_project_subjects(frm);
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

    validate(frm) {
        if (!frm.doc.concern_person || frm.doc.mail_sent || frm.__mail_handled) return;

        frappe.validated = false;
        frm.__mail_handled = true;

        frappe.confirm(
            __("Do you want to send an email notification to the Concern Person?"),
            () => {
                frappe.call({
                    method: "po_wo_pr.irs.doctype.outward_documents.outward_documents.send_concern_person_mail",
                    args: {
                        concern_person: frm.doc.concern_person,
                        docname: frm.doc.name,
                        date: frm.doc.date,
                        project: frm.doc.project || "",
                        subject: frm.doc.subject || "",
                        doc_no: frm.doc.doc_no || ""
                    },
                    callback(r) {
                        if (!r.exc) {
                            frappe.show_alert({ message: __("Email sent successfully"), indicator: "green" });
                            frm.set_value("mail_sent", 1);
                        }
                        frm.__mail_handled = false;
                        frm.save();
                    }
                });
            },
            () => {
                frm.__mail_handled = false;
                frm.save();
            }
        );
    },

    to_branch(frm) {
        frm.set_value("concern_person", "");
        frm.set_query("concern_person", () => ({
            filters: frm.doc.to_branch ? { branch: frm.doc.to_branch } : {}
        }));
    },

    refresh(frm) {
        load_project_subjects(frm);

        frm.set_query("concern_person", () => ({
            filters: frm.doc.to_branch ? { branch: frm.doc.to_branch } : {}
        }));

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
