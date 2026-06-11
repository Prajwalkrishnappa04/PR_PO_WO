frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        set_transport_section_width(frm);

        frm.remove_custom_button("Landed Cost Voucher", "Create");
        setTimeout(() => {
            $(frm.wrapper).find('[data-label="Landed%20Cost%20Voucher"]').hide();
        }, 500);
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

    frm.wrapper
        .find('.form-section[data-fieldname="custom_transport"]')
        .addClass("po-wo-pr-compact-transport");
}
