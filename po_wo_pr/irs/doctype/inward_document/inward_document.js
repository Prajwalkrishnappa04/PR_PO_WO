// Copyright (c) 2025, Hybrowlabs and contributors
// For license information, please see license.txt

function load_project_subjects(frm) {
    if (!frm.doc.project) {
        frm.set_df_property("subject", "options", "");
        frm.refresh_field("subject");
        return;
    }
    frappe.db.get_doc("IRS Project", frm.doc.project).then(doc => {
        let options = [""].concat((doc.subjects || []).map(r => r.subject));
        frm.set_df_property("subject", "options", options.join("\n"));
        frm.refresh_field("subject");
    });
}

frappe.ui.form.on("Inward Document", {
    place(frm) {
        if (frm.doc.place) {
            frappe.db.get_value("Town Village", frm.doc.place, ["taluka", "district", "state"], (r) => {
                if (r) {
                    frm.set_value("taluka", r.taluka || "");
                    frm.set_value("district", r.district || "");
                    frm.set_value("state", r.state || "");
                }
            });
        } else {
            frm.set_value("taluka", "");
            frm.set_value("district", "");
            frm.set_value("state", "");
        }
    },

    project(frm) {
        frm.set_value("subject", "");
        load_project_subjects(frm);
    },

    maa_code(frm) {
        if (!frm.doc.maa_code) return;
        frappe.db.get_value("Student", frm.doc.maa_code,
            ["student_name", "townvillage", "application_receive_date"],
            (r) => {
                if (!r) return;
                frm.set_value("sender", r.student_name || "");
                frm.set_value("place", r.townvillage || "");
                frm.set_value("date", r.application_receive_date || "");
            }
        );
    },

    concern_person(frm) {
        frm.set_value("handover_to", frm.doc.concern_person);
    },

    application_status(frm) {
        frm.refresh();
    },

    refresh(frm) {
        load_project_subjects(frm);

        frm.set_query("concern_person", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_branch_employee"
        }));
        frm.set_query("handover_to", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_branch_employee"
        }));

        if (frm.doc.application_status !== "Accept") return;

        frm.add_custom_button("Add Student Entry", () => {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Employee",
                    filters: { user_id: frappe.session.user },
                    fieldname: ["branch"]
                },
                callback(r) {
                    let employee_branch = r.message?.branch;

                    let d = new frappe.ui.Dialog({
                        title: "Add Interview Details",
                        fields: [
                            {
                                fieldname: "gender",
                                label: "Gender",
                                fieldtype: "Select",
                                options: ["Male", "Female", "Other"],
                                reqd: 1
                            },
                            {
                                fieldname: "interview_place",
                                label: "Interview Place",
                                fieldtype: "Link",
                                options: "Interview Place",
                                reqd: 1,
                                get_query() {
                                    return {
                                        filters: {
                                            maa_branch: employee_branch
                                        }
                                    };
                                }
                            }
                        ],

                        primary_action_label: "Submit",
                        primary_action(values) {
                            frappe.call({
                                method: "frappe.client.insert",
                                args: {
                                    doc: {
                                        doctype: "Student",
                                        student_name: frm.doc.sender,
                                        gender: values.gender,
                                        interview_place: values.interview_place,
                                        maa_branch: employee_branch,
                                        application_receive_date: frm.doc.date
                                    }
                                },
                                callback(res) {
                                    if (!res.exc) {
                                        frm.set_value("maa_code", res.message.name);
                                        frm.save();
                                        frappe.msgprint("Student Entry Created");
                                        d.hide();
                                    }
                                }
                            });
                        }
                    });

                    d.show();
                }
            });
        });
    }
});
