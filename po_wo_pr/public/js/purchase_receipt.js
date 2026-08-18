frappe.ui.form.on("Purchase Receipt", {
    onload(frm) {
        frm.set_query("terms", "custom_term_selection", () => {
            return {
                filters: {
                    disabled: 0
                }
            };
        });

        if (frm.is_new()) {
            frm._last_fetched_po = null;
            fetch_contact_details(frm);
        }
    },

    onload_post_render(frm) {
        schedule_submitted_create_buttons(frm);
    },

    refresh(frm) {
        set_transport_section_width(frm);
        schedule_submitted_create_buttons(frm);
        bind_modal_autoexpand();
    },

    set_warehouse(frm) {
        update_all_stock_balances(frm);
    },

    custom_term_selection(frm) {
        set_terms_from_selection(frm);
    },

    tc_name(frm) {
        // Term Selection wins over the single Terms Template
        if (get_selected_terms(frm).length) {
            setTimeout(() => set_terms_from_selection(frm), 300);
        }
    },

    items_add(frm) {
        fetch_contact_details(frm);
    },

    items_remove(frm) {
        fetch_contact_details(frm);
    }
});

function get_selected_terms(frm) {
    const selected = (frm.doc.custom_term_selection || [])
        .map(row => row.terms)
        .filter(Boolean);

    // keep the order of selection, drop duplicates
    return [...new Set(selected)];
}

function set_terms_from_selection(frm) {
    const templates = get_selected_terms(frm);

    if (!templates.length) {
        if (frm.doc.tc_name) {
            // fall back to the single Terms Template, if one is set
            frm.trigger("tc_name");
        } else {
            frm.set_value("terms", "");
        }
        return;
    }

    frappe.call({
        method: "po_wo_pr.api.setup.get_combined_terms",
        args: {
            templates: templates,
            doc: frm.doc
        },
        callback(r) {
            frm.set_value("terms", r.message || "");
        }
    });
}

frappe.ui.form.on("Purchase Receipt Item", {
    item_code(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    },

    warehouse(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    }
});

function update_all_stock_balances(frm) {
    (frm.doc.items || []).forEach(row => {
        update_stock_balance(frm, row.doctype, row.name);
    });
}

function update_stock_balance(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    if (!row || !row.item_code) {
        frappe.model.set_value(cdt, cdn, "stock_balance", 0);
        return;
    }

    frappe.call({
        method: "po_wo_pr.api.setup.get_item_stock_balance",
        args: {
            item_code: row.item_code,
            warehouse: row.warehouse || frm.doc.set_warehouse,
            company: frm.doc.company
        },
        callback(r) {
            frappe.model.set_value(cdt, cdn, "stock_balance", flt(r.message));
        }
    });
}

function set_transport_section_width(frm) {
    const style_id = "po-wo-pr-purchase-receipt-transport-style";

    if (!$(`#${style_id}`).length) {
        $("head").append(`
            <style id="${style_id}">
                .po-wo-pr-compact-transport .section-body {
                    max-width: 1040px;
                }
            </style>
        `);
    }

    $(frm.wrapper)
        .find('.form-section[data-fieldname="custom_transport"]')
        .addClass("po-wo-pr-compact-transport");
}

function schedule_submitted_create_buttons(frm) {
    [0, 300, 800, 1500].forEach(delay => {
        setTimeout(() => {
            add_missing_submitted_create_buttons(frm);
        }, delay);
    });
}

function add_missing_submitted_create_buttons(frm) {
    if (frm.doc.docstatus !== 1 || frm.doc.status === "Closed") {
        return;
    }

    add_create_button_if_missing(frm, "Purchase Return", () => {
        make_purchase_return(frm);
    });

    add_create_button_if_missing(frm, "Make Stock Entry", () => {
        frappe.model.open_mapped_doc({
            method: "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_stock_entry",
            frm: frm
        });
    });

    if (flt(frm.doc.per_billed) < 100) {
        add_create_button_if_missing(frm, "Purchase Invoice", () => {
            frappe.model.open_mapped_doc({
                method: "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_invoice",
                frm: frm
            });
        });
    }

    add_create_button_if_missing(frm, "Retention Stock Entry", () => {
        frappe.call({
            method: "erpnext.stock.doctype.stock_entry.stock_entry.move_sample_to_retention_warehouse",
            args: {
                company: frm.doc.company,
                items: frm.doc.items
            },
            callback(r) {
                if (r.message) {
                    const doc = frappe.model.sync(r.message)[0];
                    frappe.set_route("Form", doc.doctype, doc.name);
                } else {
                    frappe.msgprint(
                        __("Purchase Receipt doesn't have any Item for which Retain Sample is enabled.")
                    );
                }
            }
        });
    });

    frm.page.set_inner_btn_group_as_primary(__("Create"));
}

function add_create_button_if_missing(frm, label, action) {
    const translated_label = __(label);

    if (!frm.custom_buttons || !frm.custom_buttons[translated_label]) {
        frm.add_custom_button(translated_label, action, __("Create"));
    }
}

function make_purchase_return(frm) {
    const has_rejected_items = (frm.doc.items || []).some(item => flt(item.rejected_qty) > 0);

    if (!has_rejected_items) {
        open_purchase_return(frm);
        return;
    }

    frappe.prompt(
        [
            {
                label: __("Return Qty from Rejected Warehouse"),
                fieldtype: "Check",
                fieldname: "return_for_rejected_warehouse",
                default: 1
            }
        ],
        values => {
            if (values.return_for_rejected_warehouse) {
                frappe.call({
                    method: "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_return_against_rejected_warehouse",
                    args: {
                        source_name: frm.doc.name
                    },
                    callback(r) {
                        if (r.message) {
                            frappe.model.sync(r.message);
                            frappe.set_route("Form", r.message.doctype, r.message.name);
                        }
                    }
                });
            } else {
                open_purchase_return(frm);
            }
        },
        __("Return Qty"),
        __("Make Return Entry")
    );
}

function open_purchase_return(frm) {
    frappe.model.open_mapped_doc({
        method: "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_return",
        frm: frm
    });
}

function bind_modal_autoexpand() {
    $(document).off("shown.bs.modal.autoexpand").on("shown.bs.modal.autoexpand", ".modal", function () {
        setTimeout(() => {
            const modal = $(this);

            // Auto-expand
            const expandBtn = modal.find('button[data-fieldname="option_toggle_button"]');
            if (expandBtn.length) expandBtn.trigger("click");

            setTimeout(() => {
                const emailTemplateInput = modal.find('input[data-fieldname="email_template"]');
                if (emailTemplateInput.length) {
                    // Set value and trigger input to load awesomplete list
                    emailTemplateInput.val("Rejected item");
                    emailTemplateInput.trigger("input");

                    setTimeout(() => {
                        // Find the exact <div role="option"> with title="Rejected item" and click it
                        const option = modal.find('ul[role="listbox"] div[role="option"] p[title="Rejected item"]');
                        if (option.length) {
                            option.trigger("click");
                        }
                    }, 500); // wait for awesomplete list to populate
                }
            }, 400); // wait for expand to finish
        }, 300);
    });
}

function fetch_contact_details(frm) {
    if (!frm.doc.items || !frm.doc.items.length) return;

    let po_name = frm.doc.items[0].purchase_order;
    if (!po_name) return;
    if (frm._last_fetched_po === po_name) return;
    frm._last_fetched_po = po_name;

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "MR Contact Person",
            parent: "Purchase Order",
            filters: {
                parent: po_name,
                parenttype: "Purchase Order"
            },
            fields: ["contact_person"],
            limit_page_length: 0
        },
        callback: function (r) {
            if (r.message && r.message.length) {
                frm.clear_table("custom_contact_personss");
                r.message.forEach(function (row) {
                    let child = frm.add_child("custom_contact_personss");
                    child.contact_person = row.contact_person;
                });
                frm.refresh_field("custom_contact_personss");
            }
        }
    });

    frappe.db.get_value("Purchase Order", po_name, [
        "custom_contact_numbers"
    ]).then(r => {
        if (r.message && r.message.custom_contact_numbers) {
            frm.set_value("custom_contact_numbers", r.message.custom_contact_numbers);
        }
    });
}