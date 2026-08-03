frappe.ui.form.on("Purchase Invoice", {
    onload(frm) {
        frm.set_query("terms", "custom_term_selection", () => {
            return {
                filters: {
                    disabled: 0
                }
            };
        });
    },

    refresh(frm) {
        refresh_all_stock_balances(frm);
    },

    set_warehouse(frm) {
        refresh_all_stock_balances(frm);
    },

    custom_term_selection(frm) {
        set_terms_from_selection(frm);
    },

    tc_name(frm) {
        // Term Selection wins over the single Terms Template
        if (get_selected_terms(frm).length) {
            setTimeout(() => set_terms_from_selection(frm), 300);
        }
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

frappe.ui.form.on("Purchase Invoice Item", {
    item_code(frm, cdt, cdn) {
        refresh_stock_balance(frm, cdt, cdn);
    },

    warehouse(frm, cdt, cdn) {
        refresh_stock_balance(frm, cdt, cdn);
    },

    from_warehouse(frm, cdt, cdn) {
        refresh_stock_balance(frm, cdt, cdn);
    }
});

function refresh_all_stock_balances(frm) {
    (frm.doc.items || []).forEach(row => {
        refresh_stock_balance(frm, row.doctype, row.name);
    });
}

function refresh_stock_balance(frm, cdt, cdn) {
    update_stock_balance(frm, cdt, cdn);

    // ERPNext fills item details asynchronously, so run once again after it settles.
    setTimeout(() => update_stock_balance(frm, cdt, cdn), 500);
}

function update_stock_balance(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    if (!row || !row.item_code) {
        frappe.model.set_value(cdt, cdn, "custom_stock_balance_qty", 0);
        return;
    }

    frappe.call({
        method: "po_wo_pr.api.setup.get_item_stock_balance",
        args: {
            item_code: row.item_code,
            warehouse: row.warehouse || row.from_warehouse || frm.doc.set_warehouse,
            company: frm.doc.company
        },
        callback(r) {
            frappe.model.set_value(cdt, cdn, "custom_stock_balance_qty", flt(r.message));
        }
    });
}
