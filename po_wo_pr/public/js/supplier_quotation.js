frappe.ui.form.on("Supplier Quotation", {
    refresh(frm) {
        frm.remove_custom_button("Quotation", "Create");

        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(
                "Work Order Entry",
                () => make_work_order_entry(frm),
                "Create"
            );
            frm.page.set_inner_btn_group_as_primary("Create");
        }

        setTimeout(() => {
            $(frm.wrapper).find('[data-label="Quotation"]').hide();
        }, 500);
    }
});

function make_work_order_entry(frm) {
    frappe.model.with_doctype("Work Order Entry", () => {
        const source = frm.doc;
        const target = frappe.model.get_new_doc("Work Order Entry");
        const first_item = (source.items || []).find(row => row.item_group) || {};
        const tax_values = get_work_order_tax_values(source);

        target.supplier_name = source.supplier;
        target.wo_date = frappe.datetime.get_today();
        target.ref_your_qtn_date = source.transaction_date;
        target["for"] = source.custom_for || source.title || source.quotation_number || source.name;
        target.terms_of_payment = get_payment_term(source);
        target.item_group = first_item.item_group;
        target.total_value = flt(source.total);
        target.discounted_percentage_ = flt(source.additional_discount_percentage);
        target.discounted_value = flt(source.discount_amount);
        target.revised_value = flt(source.net_total);
        target.cgst_ = tax_values.cgst;
        target.sgst_ = tax_values.sgst;
        target.igst_ = tax_values.igst;
        target.freight = tax_values.freight;
        target.final_amount = flt(source.grand_total || source.rounded_total);

        (source.items || []).forEach(source_row => {
            const target_row = frappe.model.add_child(
                target,
                "Work Order Description",
                "description"
            );

            target_row.item_code = source_row.item_code;
            target_row.item_name = source_row.item_name;
            target_row.item_group = source_row.item_group;
            target_row.description = source_row.description || source_row.item_name;
            target_row.uom = source_row.uom || source_row.stock_uom;
            target_row.order_quantity = flt(source_row.qty);
            target_row.rate = flt(source_row.rate);
            target_row.amount = flt(source_row.amount);
        });

        frappe.set_route("Form", "Work Order Entry", target.name);
    });
}

function get_payment_term(source) {
    if (source.payment_schedule && source.payment_schedule.length) {
        return source.payment_schedule[0].payment_term;
    }

    return null;
}

function get_work_order_tax_values(source) {
    const tax_values = {
        cgst: 0,
        sgst: 0,
        igst: 0,
        freight: 0
    };

    (source.taxes || []).forEach(row => {
        const label = [
            row.account_head,
            row.description,
            row.cost_center
        ].join(" ").toLowerCase();

        if (label.includes("cgst")) {
            tax_values.cgst = flt(row.rate);
        } else if (label.includes("sgst")) {
            tax_values.sgst = flt(row.rate);
        } else if (label.includes("igst")) {
            tax_values.igst = flt(row.rate);
        } else if (
            label.includes("freight")
            || label.includes("transport")
            || label.includes("packing")
        ) {
            tax_values.freight += flt(
                row.tax_amount_after_discount_amount || row.tax_amount
            );
        }
    });

    return tax_values;
}
