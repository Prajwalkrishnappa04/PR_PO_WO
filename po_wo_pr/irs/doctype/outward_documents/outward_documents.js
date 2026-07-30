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
