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

frappe.ui.form.on("Outward Documents", {
    onload(frm) {
        if (frm.is_new()) {
            frm.set_value("date", frappe.datetime.get_today());
        }
    },

    onload_post_render(frm) {
        setTimeout(() => set_row_wise_tab(frm), 300);
        watch_row_wise_tab(frm);
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
    },

    refresh(frm) {
        setTimeout(() => set_row_wise_tab(frm), 300);
        watch_row_wise_tab(frm);
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
