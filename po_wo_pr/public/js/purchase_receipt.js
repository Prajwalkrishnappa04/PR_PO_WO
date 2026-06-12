frappe.ui.form.on("Purchase Receipt", {
    onload_post_render(frm) {
        schedule_submitted_create_buttons(frm);
    },

    refresh(frm) {
        set_transport_section_width(frm);
        schedule_submitted_create_buttons(frm);
    },

    set_warehouse(frm) {
        update_all_stock_balances(frm);
    }
});

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
