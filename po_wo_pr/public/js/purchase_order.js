frappe.ui.form.on("Purchase Order Item", {
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code || !frm.doc.supplier) return;
        frappe.call({
            method: "po_wo_pr.api.setup.get_last_ordered_rate",
            args: { item_code: row.item_code, supplier: frm.doc.supplier },
            callback(r) {
                frappe.model.set_value(cdt, cdn, "custom_last_ordered_rate", r.message || 0);
            }
        });
    }
});

function render_po_comparison(frm, data) {
    const field = frm.fields_dict.custom_custom_table;

    if (!field) {
        console.warn("HTML field custom_custom_table not found");
        return;
    }

    const items = data.items || {};
    const supplierSet = new Set(data.suppliers || []);

    Object.values(items).forEach(item => {
        Object.keys(item.suppliers || {}).forEach(supplier => supplierSet.add(supplier));
    });

    const allSuppliers = Array.from(supplierSet);

    if (!Object.keys(items).length) {
        field.$wrapper.html(
            "<p class='text-muted'>No items found in this Purchase Order.</p>"
        );
        return;
    }

    if (!allSuppliers.length) {
        field.$wrapper.html(
            "<p class='text-muted'>No supplier found for comparison.</p>"
        );
        return;
    }

    let html = `
        <style>
            .po-comparison-container {
                margin-top: 15px;
                overflow-x: auto;
            }

            .po-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 820px;
                font-size: 13px;
            }

            .po-table th,
            .po-table td {
                border: 1px solid #d1d8dd;
                padding: 8px 10px;
                text-align: left;
                white-space: nowrap;
                vertical-align: middle;
            }

            .po-table th {
                background: #f7f7f7;
                font-weight: 600;
                color: #36414c;
                text-align: center;
            }

            .po-table td.item-cell {
                text-align: left;
                font-weight: 500;
                color: #1f272e;
            }

            .po-table td.supplier-cell {
                text-align: left;
                color: #36414c;
            }

            .po-table td.uom-cell,
            .po-table td.qty-cell,
            .po-table td.no-cell {
                text-align: center;
                color: #36414c;
            }

            .po-table td.rate-cell,
            .po-table td.discount-cell,
            .po-table td.amount-cell {
                text-align: right;
            }

            .po-table tbody tr:nth-child(even) {
                background: #fafbfc;
            }

            .po-table tbody tr:hover {
                background: #f0f4f7;
            }

            .no-quote {
                color: #999;
                font-style: italic;
                text-align: center !important;
            }

            .po-table-header {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }

            .po-table-header h5 {
                margin: 0;
                color: #36414c;
            }

            .supplier-count {
                margin-left: 10px;
                font-size: 12px;
                color: #6c7680;
            }

            .po-item-start td {
                border-top: 2px solid #c7d0d9;
            }

            .po-selected-supplier {
                background: #eef8f1;
                font-weight: 600;
            }
        </style>

        <div class="po-comparison-container">
            <div class="po-table-header">
                <h5>Purchase Order Item Comparison</h5>
                <span class="supplier-count">(${allSuppliers.length} Supplier)</span>
            </div>

            <table class="po-table">
                <thead>
                    <tr>
                        <th style="width: 55px;">No.</th>
                        <th style="text-align:left; min-width: 220px;">Item Name</th>
                        <th style="width: 80px;">Qty</th>
                        <th style="width: 90px;">UOM</th>
                        <th style="text-align:left; min-width: 180px;">Supplier</th>
                        <th style="width: 120px;">Rate</th>
                        <th style="width: 110px;">Discount</th>
                        <th style="width: 130px;">Amount</th>
                    </tr>
                </thead>

                <tbody>
    `;

    Object.keys(items).forEach((itemKey, itemIndex) => {
        const item = items[itemKey];
        const supplierRows = allSuppliers.length ? allSuppliers : ["-"];
        const rowspan = supplierRows.length;

        supplierRows.forEach((supplier, supplierIndex) => {
            let supplierData = item.suppliers ? item.suppliers[supplier] : null;
            let rate = supplierData ? Number(supplierData.rate || 0) : 0;
            let discountPercentage = supplierData ? Number(supplierData.discount_percentage || 0) : 0;
            let discountAmount = supplierData ? Number(supplierData.discount_amount || 0) : 0;
            let amount = supplierData ? Number(supplierData.amount || 0) : 0;
            let discountDisplay = "-";
            let rowClasses = [];

            if (discountPercentage > 0) {
                discountDisplay = `${discountPercentage}%`;
            } else if (discountAmount > 0) {
                discountDisplay = frappe.format(discountAmount, {
                    fieldtype: "Currency"
                });
            }

            if (supplierIndex === 0) {
                rowClasses.push("po-item-start");
            }

            if (supplier === frm.doc.supplier) {
                rowClasses.push("po-selected-supplier");
            }

            html += `
                <tr class="${rowClasses.join(" ")}">
            `;

            if (supplierIndex === 0) {
                html += `
                    <td class="no-cell" rowspan="${rowspan}">
                        ${itemIndex + 1}
                    </td>

                    <td class="item-cell" rowspan="${rowspan}">
                        ${frappe.utils.escape_html(item.item_name || item.item_code || itemKey)}
                    </td>

                    <td class="qty-cell" rowspan="${rowspan}">
                        ${item.qty || "-"}
                    </td>

                    <td class="uom-cell" rowspan="${rowspan}">
                        ${item.uom || "-"}
                    </td>
                `;
            }

            html += `
                    <td class="supplier-cell">
                        ${supplier !== "-" ? frappe.utils.escape_html(supplier) : "-"}
                    </td>

                    <td class="${rate ? "rate-cell" : "no-quote"}">
                        ${rate ? frappe.format(rate, { fieldtype: "Currency" }) : "-"}
                    </td>

                    <td class="${discountDisplay !== "-" ? "discount-cell" : "no-quote"}">
                        ${discountDisplay}
                    </td>

                    <td class="${amount ? "amount-cell" : "no-quote"}">
                        ${amount ? frappe.format(amount, { fieldtype: "Currency" }) : "-"}
                    </td>
                </tr>
            `;
        });
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    field.$wrapper.html(html);
}
frappe.ui.form.on("Purchase Order", {
    refresh(frm) {
        if (!frm.is_new()) {
            frappe.call({
                method: "po_wo_pr.api.setup.get_purchase_order_rfq_supplier_comparison",
                args: {
                    po_name: frm.doc.name
                },
                callback(r) {
                    render_po_comparison(frm, r.message || {});
                }
            });
        }
    },
    transaction_date(frm) {
        if (frm.doc.transaction_date) {
            let tran = frappe.datetime.str_to_obj(frm.doc.transaction_date);
            let week_later = frappe.datetime.add_days(tran, 7);
            frm.set_value("schedule_date", frappe.datetime.obj_to_str(week_later));
        }
    },
    onload(frm) {
        if (frm.doc.transaction_date && !frm.doc.schedule_date) {
            let tran = frappe.datetime.str_to_obj(frm.doc.transaction_date);
            let week_later = frappe.datetime.add_days(tran, 7);
            frm.set_value("schedule_date", frappe.datetime.obj_to_str(week_later));
        }
    },
    cost_center(frm) {
        if (!frm.doc.cost_center) {
            frm.allowed_gl_codes = [];
            frm.set_value("custom_gl_code", "");
            set_gl_code_filter(frm);
            return;
        }

        frappe.db.get_doc("Cost Center", frm.doc.cost_center).then(doc => {
            let gl_list = (doc.custom_cost_center_details || [])
                .map(row => row.gl_name)
                .filter(Boolean);

            gl_list = [...new Set(gl_list)];
            frm.allowed_gl_codes = gl_list;

            if (frm.doc.custom_gl_code && !gl_list.includes(frm.doc.custom_gl_code)) {
                frm.set_value("custom_gl_code", "");
            }

            set_gl_code_filter(frm);
        });
    }
});

function set_gl_code_filter(frm) {
    frm.set_query("custom_gl_code", function () {
        if (!frm.allowed_gl_codes || !frm.allowed_gl_codes.length) {
            return {
                filters: [
                    ["Account", "name", "=", ""]
                ]
            };
        }

        return {
            filters: [
                ["Account", "name", "in", frm.allowed_gl_codes]
            ]
        };
    });
}
