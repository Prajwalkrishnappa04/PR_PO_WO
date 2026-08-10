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
    // Project na Document List mathi document names document_records ma bharo.
    //
    // Aa FAKT navi entry ma j chale (frm.is_new()). Save thai gaya pachi kyare y
    // nahi chale — etle jo user ne koi document ni jarur na hoy ane e row delete
    // kari de, to e row pachi kyare y fetch nahi thay.
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

            // Pahela thi rahel document names — duplicate rokva mate.
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
    // document_records grid ma "Add Row" ni jamni baaju "Received All" button,
    // je badhi child rows nu Received checkbox tick kari de.
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

    // add_custom_button prepend kare che, etle Add Row pachi khasedvu pade.
    $btn.removeClass("hidden").insertAfter(grid.wrapper.find(".grid-add-row"));
}

function validate_unique_document_records(frm) {
    // document_records ma ek j Document Name be vaar na aavvu joie.
    // Comparison trim + lowercase par, jethi "SSC Certificate" ane
    // "  ssc certificate  " ne pan duplicate ganay.
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
    // Frappe no default Tab order field-definition order pramane chale — etle e aakho
    // left column pahelo firey, pachi j right column. Aa function tabindex pachho
    // assign kare che jethi Tab visual row-wise chale: ek row na badha fields
    // left -> right, e row puri thay pachi next row.
    //
    // Order field-order ke column-index thi nahi, pan input ni on-screen position
    // (getBoundingClientRect) thi nakki thay che. Etle koi field depends_on thi
    // hide/show thay, ke be column ma alag alag field count hoy, to pan sequence
    // sachi rahe.
    const ROW_TOLERANCE = 12; // px — aa andar na top values ne same row ganvi

    const inputs = frm.$wrapper
        .find(".form-layout input:visible, .form-layout textarea:visible, .form-layout select:visible")
        .filter(function () {
            // Grid (child table) ne chhodi devu — ena Tab behaviour ne aa function
            // touch nathi karto.
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
                // Page-relative, jethi scroll position no farak na pade.
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            };
        });

    // Rows ma group karo: top lagbhag same hoy e badha ek row.
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
            // Value ej hoy to setAttribute na karvu — observer ne khali-khali
            // trigger karva no koi matlab nathi.
            const next = String(tab++);
            if (item.el.getAttribute("tabindex") !== next) {
                item.el.setAttribute("tabindex", next);
            }
        });
    });
}

function watch_row_wise_tab(frm) {
    // depends_on thi field hide/show thay, section collapse thay, ke navu HTML render
    // thay tyare sequence pachhi banavvi pade. Ek j observer per form — refresh par
    // vaar vaar na banave.
    const layout = frm.$wrapper.find(".form-layout")[0];
    if (!layout) return;

    // Frappe form re-render kare tyare .form-layout node badlai jay che — etle node
    // par pan check karvo pade, nahi to observer detached node par lagelo rahi jay.
    if (frm.__row_wise_tab_node === layout) return;
    if (frm.__row_wise_tab_observer) frm.__row_wise_tab_observer.disconnect();

    let pending = null;
    const rebuild = () => {
        clearTimeout(pending);
        // Debounce — ek batch na DOM changes mate ek j vaar chale.
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
        // Parent received_date badle to fakt khaali receiving_date vala rows ma bharo.
        // Je rows ma user e already alag date set kari hoy e ne touch na karvu.
        (frm.doc.document_records || []).forEach(row => {
            if (!row.receiving_date) {
                frappe.model.set_value(row.doctype, row.name, "receiving_date", frm.doc.received_date);
            }
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

            const mc = (r.maa_code || "").toUpperCase();   // ✅ match key name here too
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
