frappe.ui.form.on("Material Request", {
    refresh(frm) {
        update_all_stock_balances(frm);
        update_contact_numbers(frm);
    },

    onload(frm) {
        frm.set_query("terms", "custom_term_selection", () => {
            return {
                filters: {
                    disabled: 0
                }
            };
        });
    },

    set_warehouse(frm) {
        update_all_stock_balances(frm);
    },

    set_from_warehouse(frm) {
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

    custom_contact_person(frm) {
        update_contact_numbers(frm);
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

frappe.ui.form.on("Material Request Item", {
    item_code: function(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    },

    warehouse: function(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    },

    from_warehouse: function(frm, cdt, cdn) {
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

    if (frm.doc.docstatus === 1) return;

    if (!row || !row.item_code) {
        frappe.model.set_value(cdt, cdn, "custom_stock_balance_qty", 0);
        return;
    }

    frappe.call({
        method: "po_wo_pr.api.setup.get_item_stock_balance",
        args: {
            item_code: row.item_code,
            warehouse: row.warehouse || row.from_warehouse || frm.doc.set_warehouse || frm.doc.set_from_warehouse,
            company: frm.doc.company
        },
        callback(r) {
            frappe.model.set_value(cdt, cdn, "custom_stock_balance_qty", flt(r.message));
        }
    });
}

function update_contact_numbers(frm) {
    let rows = frm.doc.custom_contact_person || [];

    if (!rows.length) {
        frm.set_value('custom_contact_numbers', '');
        return;
    }

    let names = rows.map(r => r.contact_person).filter(Boolean);

    if (!names.length) {
        frm.set_value('custom_contact_numbers', '');
        return;
    }

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Contact person',
            filters: [['name', 'in', names]],
            fields: ['name', 'name1', 'custom_contact_number']
        },
        callback: function(r) {
            console.log('Contact person fetch result:', r.message);
            if (r.message) {
                let lines = r.message.map(
                    d => `${d.name1}: ${d.custom_contact_number || '—'}`
                );
                frm.set_value('custom_contact_numbers', lines.join('\n'));
            }
        }
    });
}