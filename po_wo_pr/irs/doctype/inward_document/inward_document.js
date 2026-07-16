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

function set_vidhya_project(frm) {
    // "Vidhya" is the project_name (title); the project Link value must be the record's
    // name/id. Resolve it via a server method (IRS Project read is restricted to System
    // Manager, so a client-side get_value returns empty for other users).
    frappe.call({
        method: "po_wo_pr.irs.doctype.inward_document.inward_document.get_project_by_name",
        args: { project_name: "Vidhya" },
        callback: (res) => {
            if (!res.message) return;
            frm.set_value("project", res.message).then(() => {
                // project() clears subject and loads its options async; wait for that to
                // finish (after_ajax), then ensure the option exists and set it so the
                // autocomplete both stores and displays the value.
                frappe.after_ajax(() => {
                    const target = "Vidya - Application";
                    const field = frm.fields_dict["subject"];
                    const opts = (frm.get_field("subject").df.options || "")
                        .split("\n").filter(Boolean);
                    if (!opts.includes(target)) opts.push(target);
                    frm.set_df_property("subject", "options", opts.join("\n"));
                    if (field && field.set_data) field.set_data(opts);
                    frm.set_value("subject", target).then(() => frm.refresh_field("subject"));
                });
            });
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

frappe.ui.form.on("Inward Document", {
    onload_post_render(frm) {
        setTimeout(() => set_row_wise_tab(frm), 300);
    },

    received_date(frm) {
        // Parent received_date badle to badhi child rows ni receiving_date same karo.
        (frm.doc.document_records || []).forEach(row => {
            frappe.model.set_value(row.doctype, row.name, "receiving_date", frm.doc.received_date);
        });
        frm.refresh_field("document_records");
    },

    document_records_add(frm, cdt, cdn) {
        // Navi row add thay to parent no received_date ema set karo.
        if (frm.doc.received_date) {
            frappe.model.set_value(cdt, cdn, "receiving_date", frm.doc.received_date);
        }
    },

    taluka(frm) {
        frm.set_value("place", "");
        frm.set_value("district", "");
        frm.set_value("state", "");
        frm.set_query("place", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_town_village",
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
            ["student_name", "townvillage", "application_receive_date", "phone_no", "maa_code"],
            (r) => {
                if (!r) return;
                frm.set_value("sender", r.student_name || "");
                frm.set_value("place", r.townvillage || "");
                if (!frm.doc.date) {
                    frm.set_value("date", r.application_receive_date || frappe.datetime.get_today());
                }
                frm.set_value("mob_no", r.phone_no || "");

                // maa_code is a Link to Student and stores the Student's name, which can
                // differ from its maa_code value. So check the prefix on the Student's
                // actual maa_code, not on the link value.
                const mc = (r.maa_code || "").toUpperCase();
                if (mc.startsWith("MFBH") || mc.startsWith("MFVA")) {
                    set_vidhya_project(frm);
                }
            }
        );
    },


    application_status(frm) {
        frm.refresh();
    },

    refresh(frm) {
        setTimeout(() => set_row_wise_tab(frm), 300);
        load_project_subjects(frm);

        // Form kholta: received_date hoy to je rows ni receiving_date khaali che ema bharo.
        if (frm.doc.received_date) {
            (frm.doc.document_records || []).forEach(row => {
                if (!row.receiving_date) {
                    frappe.model.set_value(row.doctype, row.name, "receiving_date", frm.doc.received_date);
                }
            });
        }

        frm.set_query("concern_person", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_branch_employee"
        }));
        frm.set_query("handover_to", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_branch_employee"
        }));

        frm.set_query("place", () => ({
            query: "po_wo_pr.irs.doctype.inward_document.inward_document.search_town_village",
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
