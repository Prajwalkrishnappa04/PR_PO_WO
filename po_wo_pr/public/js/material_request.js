frappe.ui.form.on("Material Request", {
    refresh(frm) {
        update_all_stock_balances(frm);
        update_contact_numbers(frm);

        frm.add_custom_button(__('Delete Selected Items'), () => {
            let grid = frm.fields_dict['items'].grid;
            let selected_rows = grid.get_selected(); // Returns an array of row names/IDs

            if (!selected_rows.length) {
                frappe.msgprint(__('Please select at least one row from the items table first using the checkboxes.'));
                return;
            }

            frappe.confirm(__('Are you sure you want to delete {0} selected item(s)?', [selected_rows.length]), () => {
                // Filter out the selected rows from the items array
                let updated_items = (frm.doc.items || []).filter(row => !selected_rows.includes(row.name));

                // Update the table field and refresh the grid
                frm.set_value('items', updated_items);
                frm.refresh_field('items');

                frappe.show_alert({
                    message: __('Selected items removed successfully'),
                    indicator: 'green'
                });
            });
        }, __('Actions'));
    },

    onload(frm) {
        // Filter disabled term selections
        frm.set_query("custom_term_selection", () => {
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
        // If custom term selections exist, let them take priority
        if (get_selected_terms(frm).length) {
            setTimeout(() => set_terms_from_selection(frm), 300);
            return;
        }

        // Standard tc_name fallback without calling broken ERPNext API
        if (frm.doc.tc_name) {
            frappe.db.get_value("Terms and Conditions", frm.doc.tc_name, "terms", (r) => {
                if (r && r.terms) {
                    frm.set_value("terms", r.terms);
                }
            });
        } else {
            frm.set_value("terms", "");
        }
    },

    custom_contact_person(frm) {
        update_contact_numbers(frm);
    }
});

frappe.ui.form.on("Material Request Item", {
    item_code(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    },

    warehouse(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    },

    from_warehouse(frm, cdt, cdn) {
        update_stock_balance(frm, cdt, cdn);
    }
});

// Helper: Extract unique terms from custom_term_selection table
function get_selected_terms(frm) {
    const selected = (frm.doc.custom_term_selection || [])
        // Replace 'terms' with the actual link fieldname in your child doctype
        .map(row => row.terms || row.terms_and_conditions || row.tc_name)
        .filter(Boolean);

    return [...new Set(selected)];
}

// Helper: Set terms content based on selected term templates
function set_terms_from_selection(frm) {
    const templates = get_selected_terms(frm);

    if (!templates.length) {
        if (frm.doc.tc_name) {
            // Fetch single tc_name terms directly from DB to avoid 404
            frappe.db.get_value("Terms and Conditions", frm.doc.tc_name, "terms", (r) => {
                frm.set_value("terms", r ? r.terms || "" : "");
            });
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
        callback(r) {
            if (r.message) {
                let lines = r.message.map(
                    d => `${d.name1}: ${d.custom_contact_number || '—'}`
                );
                frm.set_value('custom_contact_numbers', lines.join('\n'));
            }
        }
    });
}