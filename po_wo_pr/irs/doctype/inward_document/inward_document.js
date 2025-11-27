// Copyright (c) 2025, Hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Inward Document", {
    refresh(frm) {
        frm.add_custom_button("Add Student Entry", () => {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Employee",
                    filters: { user_id: frappe.session.user },
                    fieldname: ["custom_maa_branch"]
                },
                callback(r) {

                    let employee_branch = r.message?.custom_maa_branch;

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
