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

function set_row_wise_tab(frm) {
    // By default Frappe's Tab order follows the field-definition order, which walks the
    // whole left column and only then the right column. This re-assigns tabindex so Tab
    // moves left field -> right field -> next row (row-wise), section by section.
    let tab = 1;

    frm.$wrapper.find(".form-section").each(function () {
        const columns = [];

        $(this).find(".form-column").each(function () {
            const inputs = $(this)
                .find("input:visible, textarea:visible, select:visible")
                .filter(function () {
                    return !this.disabled && this.type !== "hidden";
                })
                .toArray();
            columns.push(inputs);
        });

        const max_rows = Math.max(0, ...columns.map(c => c.length));
        for (let r = 0; r < max_rows; r++) {
            for (let c = 0; c < columns.length; c++) {
                if (columns[c][r]) columns[c][r].setAttribute("tabindex", tab++);
            }
        }
    });
}

frappe.ui.form.on("Outward Documents", {
    onload(frm) {
        if (frm.is_new()) {
            frm.set_value("date", frappe.datetime.get_today());
        }
    },

    onload_post_render(frm) {
        setTimeout(() => set_row_wise_tab(frm), 300);
    },

    inter_office(frm) {
        // to / to_branch / concern_person toggle via depends_on, so the visible inputs
        // change and the tabindex sequence has to be rebuilt.
        setTimeout(() => set_row_wise_tab(frm), 300);
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
        if (!frm.doc.concern_person || frm.doc.mail_sent || frm.__mail_handled || frm.__skip_mail) return;

        frappe.validated = false;
        frm.__mail_handled = true;

        frappe.confirm(
            __("Do you want to send an email notification to the Concern Person?"),
            () => {
                // Yes
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
                // No or X — save without sending, skip dialog on the re-triggered save
                frm.__mail_handled = false;
                frm.__skip_mail = true;
                frm.save().then(() => {
                    frm.__skip_mail = false;
                });
            }
        );
    },

    to_branch(frm) {
        frm.set_value("concern_person", "");
        frm.set_query("concern_person", () => ({
            filters: frm.doc.to_branch ? { branch: frm.doc.to_branch } : {}
        }));
        setTimeout(() => set_row_wise_tab(frm), 300);
    },

    refresh(frm) {
        setTimeout(() => set_row_wise_tab(frm), 300);
        load_project_subjects(frm);

        frm.set_query("concern_person", () => ({
            filters: frm.doc.to_branch ? { branch: frm.doc.to_branch } : {}
        }));

        frm.set_query("place", () => ({
            query: "po_wo_pr.irs.doctype.outward_documents.outward_documents.search_town_village"
        }));

        frm.add_custom_button("Track Order", () => {
            if (!frm.doc.doc_no) {
                frappe.msgprint("Please enter tracking number");
                return;
            }
            if (!frm.doc.url) {
                frappe.msgprint("Please select a Courier");
                return;
            }

            // The courier's link is resolved on the server, so open the tab now, while we
            // are still inside the click, or the popup blocker eats it. It gets the URL
            // once the call returns.
            const tab = window.open("", "_blank");

            frappe.call({
                method: "po_wo_pr.irs.doctype.outward_documents.outward_documents.get_tracking_url",
                args: { doc_no: frm.doc.doc_no, courier: frm.doc.url },
                freeze: true,
                freeze_message: __("Getting tracking link..."),
                callback(r) {
                    if (!r.message) {
                        if (tab) tab.close();
                        return;
                    }
                    if (tab) {
                        tab.location = r.message;
                    } else {
                        // Popup was blocked; fall back to this tab.
                        window.open(r.message, "_blank");
                    }
                },
                error() {
                    if (tab) tab.close();
                }
            });
        });
    }
});
