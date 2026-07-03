// Copyright (c) 2025, Hybrowlabs and contributors
// For license information, please see license.txt

function load_project_subjects(frm) {
    const field = frm.fields_dict["subject"];
    frm.set_df_property("subject", "options", "");
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
            frm.set_df_property("subject", "options", subjects.join("\n"));
            if (field && field.set_data) field.set_data(subjects);
            frm.refresh_field("subject");
        }
    });
}

frappe.ui.form.on("Inward Document", {
    taluka(frm) {
        frm.set_value("place", "");
        frm.set_value("district", "");
        frm.set_value("state", "");
        frm.set_query("place", () => ({
            filters: frm.doc.taluka ? { taluka: frm.doc.taluka } : {}
        }));
    },

    place(frm) {
        if (frm.doc.place) {
            frappe.db.get_value("Town Village", frm.doc.place, ["taluka", "district", "state"], (r) => {
                if (r) {
                    // Set taluka directly to avoid triggering taluka's change event (which clears place)
                    frm.doc.taluka = r.taluka || "";
                    frm.refresh_field("taluka");
                    frm.set_value("district", r.district || "");
                    frm.set_value("state", r.state || "");
                }
            });
        } else {
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
            ["student_name", "townvillage", "application_receive_date", "phone_no"],
            (r) => {
                if (!r) return;
                frm.set_value("sender", r.student_name || "");
                frm.set_value("place", r.townvillage || "");
                frm.set_value("date", r.application_receive_date || frappe.datetime.get_today());
                frm.set_value("mob_no", r.phone_no || "");
            }
        );
    },


    application_status(frm) {
        frm.refresh();
    },

    refresh(frm) {
        load_project_subjects(frm);

        frm.set_query("maa_code", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_student"
        }));
        frm.set_query("concern_person", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_branch_employee"
        }));
        frm.set_query("handover_to", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_branch_employee"
        }));

        frm.set_query("place", () => ({
            filters: frm.doc.taluka ? { taluka: frm.doc.taluka } : {}
        }));

        if (frm.is_new() || frm.doc.application_status !== "Accept" || frm.is_dirty()) return;

        frm.add_custom_button("Add Student Entry", () => {
            if (frm.doc.maa_code) {
                frappe.set_route("Form", "Student", frm.doc.maa_code);
                return;
            }
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
                                fieldname: "maa_branch",
                                label: "Maa Branch",
                                fieldtype: "Link",
                                options: "Maa Branches",
                                reqd: 1
                            },
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
                                reqd: 1
                            }
                        ],

                        primary_action_label: "Submit",
                        primary_action(values) {
                            frappe.call({
                                method: "po_wo_pr.irs.doctype.inward_document.inward_document.create_student_and_set_maa_code",
                                args: {
                                    student_name: frm.doc.sender,
                                    gender: values.gender,
                                    interview_place: values.interview_place,
                                    maa_branch: values.maa_branch,
                                    application_receive_date: frm.doc.date
                                },
                                callback(res) {
                                    if (!res.exc && res.message) {
                                        d.hide();
                                        frappe.model.set_value(frm.doctype, frm.docname, "maa_code", res.message);
                                        frm.save().then(() => {
                                            frappe.msgprint(__("Student Entry Created"));
                                        });
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
