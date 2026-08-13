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

function is_application_subject(subject) {
    // Same rule as application_status's depends_on — any project's
    // "... - Application" subject matches.
    return !!subject && subject.toLowerCase().includes("application");
}

function fill_document_records(frm) {
    // Fill document_records with the document names from the Project's Document List.
    //
    // This runs ONLY on a new entry (frm.is_new()). It never runs after the doc has
    // been saved — so if the user doesn't need a document and deletes that row, the
    // row will never be fetched again.
    if (!frm.is_new()) return;
    if (!frm.doc.project) return;
    if (!is_application_subject(frm.doc.subject)) return;

    frappe.call({
        method: "frappe.client.get",
        args: { doctype: "IRS Project", name: frm.doc.project },
        callback(r) {
            if (!r.message) return;

            const names = (r.message.document_list || [])
                .map(row => row.name1)
                .filter(Boolean);
            if (!names.length) return;

            // Document names already present — used to prevent duplicates.
            const existing = new Set(
                (frm.doc.document_records || [])
                    .map(row => (row.document_name || "").trim().toLowerCase())
                    .filter(Boolean)
            );

            let added = 0;
            names.forEach(document_name => {
                const key = document_name.trim().toLowerCase();
                if (existing.has(key)) return;
                const row = frm.add_child("document_records");
                row.document_name = document_name;
                if (frm.doc.received_date) row.receiving_date = frm.doc.received_date;
                existing.add(key);
                added++;
            });

            if (added) frm.refresh_field("document_records");
        }
    });
}

function setup_received_all_button(frm) {
    // A "Received All" button to the right of "Add Row" in the document_records grid,
    // which ticks the Received checkbox on all child rows.
    const grid = frm.fields_dict.document_records && frm.fields_dict.document_records.grid;
    if (!grid) return;

    const $btn = grid.add_custom_button(__("Received All"), () => {
        const rows = frm.doc.document_records || [];
        if (!rows.length) {
            frappe.show_alert({ message: __("No rows to mark as received"), indicator: "orange" });
            return;
        }
        rows.forEach(row => {
            frappe.model.set_value(row.doctype, row.name, "received", 1);
        });
        frm.refresh_field("document_records");
    });

    // add_custom_button prepends, so it has to be moved after Add Row.
    $btn.removeClass("hidden").insertAfter(grid.wrapper.find(".grid-add-row"));
}

function validate_unique_document_records(frm) {
    // The same Document Name must not appear twice in document_records.
    // Comparison is on trim + lowercase, so that "SSC Certificate" and
    // "  ssc certificate  " also count as duplicates.
    const seen = {};
    const messages = [];

    (frm.doc.document_records || []).forEach(row => {
        const key = (row.document_name || "").trim().toLowerCase();
        if (!key) return;
        if (seen[key]) {
            messages.push(
                __("Row #{0}: Document Name {1} is already added in row #{2}", [
                    row.idx,
                    `<b>${frappe.utils.escape_html(row.document_name)}</b>`,
                    seen[key]
                ])
            );
        } else {
            seen[key] = row.idx;
        }
    });

    if (messages.length) {
        frappe.throw({
            message: messages.join("<br>"),
            title: __("Duplicate Document Name")
        });
    }
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
    // Frappe's default Tab order follows field-definition order — so it walks the
    // entire left column first, and only then the right column. This function
    // reassigns tabindex so that Tab moves visually row-wise: all fields of one row
    // left -> right, and once that row is done, on to the next row.
    //
    // The order is determined not by field-order or column-index, but by the input's
    // on-screen position (getBoundingClientRect). So even if some field is hidden or
    // shown via depends_on, or the two columns have different field counts, the
    // sequence stays correct.
    const ROW_TOLERANCE = 12; // px — top values within this are treated as the same row

    const inputs = frm.$wrapper
        .find(".form-layout input:visible, .form-layout textarea:visible, .form-layout select:visible")
        .filter(function () {
            // Skip grids (child tables) — this function does not touch their Tab
            // behaviour.
            if ($(this).closest(".grid-body, .form-grid, .grid-row").length) return false;
            if (this.disabled || this.readOnly || this.type === "hidden") return false;
            const rect = this.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        })
        .toArray()
        .map(el => {
            const rect = el.getBoundingClientRect();
            return {
                el,
                // Page-relative, so the scroll position makes no difference.
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            };
        });

    // Group into rows: everything with roughly the same top is one row.
    inputs.sort((a, b) => a.top - b.top || a.left - b.left);

    const rows = [];
    inputs.forEach(item => {
        const row = rows[rows.length - 1];
        if (row && Math.abs(item.top - row.top) <= ROW_TOLERANCE) {
            row.items.push(item);
        } else {
            rows.push({ top: item.top, items: [item] });
        }
    });

    let tab = 1;
    rows.forEach(row => {
        row.items.sort((a, b) => a.left - b.left);
        row.items.forEach(item => {
            // Don't setAttribute if the value is the same — there's no point
            // triggering the observer for nothing.
            const next = String(tab++);
            if (item.el.getAttribute("tabindex") !== next) {
                item.el.setAttribute("tabindex", next);
            }
        });
    });
}

function watch_row_wise_tab(frm) {
    // The sequence must be rebuilt when depends_on hides/shows a field, a section
    // collapses, or new HTML renders. Only one observer per form — don't create it
    // over and over on refresh.
    const layout = frm.$wrapper.find(".form-layout")[0];
    if (!layout) return;

    // When Frappe re-renders the form the .form-layout node is replaced — so the node
    // must be checked too, otherwise the observer stays attached to a detached node.
    if (frm.__row_wise_tab_node === layout) return;
    if (frm.__row_wise_tab_observer) frm.__row_wise_tab_observer.disconnect();

    let pending = null;
    const rebuild = () => {
        clearTimeout(pending);
        // Debounce — runs only once for a batch of DOM changes.
        pending = setTimeout(() => set_row_wise_tab(frm), 150);
    };

    const observer = new MutationObserver(rebuild);
    observer.observe(layout, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden"]
    });

    frm.__row_wise_tab_observer = observer;
    frm.__row_wise_tab_node = layout;
}

frappe.ui.form.on("Inward Document", {
    onload_post_render(frm) {
        setTimeout(() => set_row_wise_tab(frm), 300);
        watch_row_wise_tab(frm);
    },

    received_date(frm) {
        // When the parent received_date changes, fill only rows with an empty
        // receiving_date. Don't touch rows where the user already set a different date.
        (frm.doc.document_records || []).forEach(row => {
            if (!row.receiving_date) {
                frappe.model.set_value(row.doctype, row.name, "receiving_date", frm.doc.received_date);
            }
        });
        frm.refresh_field("document_records");
    },

    document_records_add(frm, cdt, cdn) {
        // When a new row is added, set the parent's received_date on it.
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

    subject(frm) {
        fill_document_records(frm);
    },

    validate(frm) {
        validate_unique_document_records(frm);
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

udaan_maa_code(frm) {
    if (!frm.doc.udaan_maa_code) return;

    frappe.db.get_value("Udaan Student", frm.doc.udaan_maa_code,
        ["student_name", "townvillage", "application_receive_date", "phone_no", "maa_code"],  // ✅ use actual fieldname
        (r) => {
            if (!r) return;
            frm.set_value("sender", r.student_name || "");
            frm.set_value("place", r.townvillage || "");
            if (!frm.doc.date) {
                frm.set_value("date", r.application_receive_date || frappe.datetime.get_today());
            }
            frm.set_value("mob_no", r.phone_no || "");

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
        watch_row_wise_tab(frm);
        load_project_subjects(frm);
        setup_received_all_button(frm);

        // On form open: if received_date is set, fill it into rows whose receiving_date is empty.
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
