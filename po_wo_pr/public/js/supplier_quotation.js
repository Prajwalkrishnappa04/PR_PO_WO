frappe.ui.form.on("Supplier Quotation", {
    onload(frm) {
        hide_supplier_quotation_item_gst_fields(frm);
        set_default_branch(frm);

        frm.set_query("custom_term_selection", () => {
            return {
                filters: {
                    disabled: 0
                }
            };
        });

        if (frm.is_new()) {
            frm._last_fetched_rfq = null;
            fetch_contact_details(frm);
        }
    },
    onload_post_render: function (frm) {
        if (frm.is_new()) {
            // Clear both template link and text area field
            frm.set_value('tc_name', '');
            frm.set_value('terms', '');
        }
    },
    tc_name: function (frm) {
        // If system fetches a default template during setup of new form, clear it immediately
        if (frm.is_new() && !frm.doc.__user_changed_terms) {
            frm.set_value('tc_name', '');
            frm.set_value('terms', '');
        }
    },
    terms: function (frm) {
        // Flag to allow typing if user manually enters terms before saving
        if (frm.is_new() && frm.doc.terms) {
            frm.doc.__user_changed_terms = true;
        }
    },
    valid_till(frm) {
        // ERPNext auto-fills Valid Till = Quotation Date + 1 month on new docs, at a point in
        // the form load we cannot time reliably. Clear exactly that value, whenever it lands,
        // until the user touches the field.
        if (!frm.is_new() || frm.doc.__valid_till_touched || !frm.doc.valid_till) return;
        if (frm.doc.valid_till === frappe.datetime.add_months(frm.doc.transaction_date, 1)) {
            frm.set_value("valid_till", "");
        }
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
    custom_payment_terms_template(frm) {
        if (frm.doc.custom_payment_terms_template) {
            frappe.call({
                method: "erpnext.controllers.accounts_controller.get_payment_terms",
                args: {
                    terms_template: frm.doc.custom_payment_terms_template,
                    posting_date: frm.doc.transaction_date,
                    grand_total: frm.doc.rounded_total || frm.doc.grand_total,
                    base_grand_total: frm.doc.base_rounded_total || frm.doc.base_grand_total,
                },
                callback: function (r) {
                    if (r.message && !r.exc) {
                        frm.set_value("custom_payment_schedule", r.message);
                    }
                }
            });
        } else {
            frm.set_value("custom_payment_schedule", []);
        }
    },
    refresh(frm) {
        hide_supplier_quotation_item_gst_fields(frm);
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
            hide_supplier_quotation_item_gst_fields(frm);
        }, 500);

        // Valid Till: once the user focuses the field it is theirs, never auto-clear it
        if (frm.is_new() && frm.fields_dict.valid_till) {
            frm.fields_dict.valid_till.$input
                .off("focus.keep_blank")
                .on("focus.keep_blank", () => { frm.doc.__valid_till_touched = true; });
        }

        render_rfq_comparison(frm);
    },
    items_add(frm) {
        hide_supplier_quotation_item_gst_fields(frm);
        fetch_contact_details(frm);
    },
    items_remove(frm) {
        fetch_contact_details(frm);
    }
});

frappe.ui.form.on("Supplier Quotation Item", {
    form_render(frm) {
        hide_supplier_quotation_item_gst_fields(frm);
    }
});

const SUPPLIER_QUOTATION_ITEM_GST_FIELDS = [
    "gst_details_section",
    "gst_hsn_code",
    "gst_treatment",
    "igst_rate",
    "cgst_rate",
    "sgst_rate",
    "cess_rate",
    "cess_non_advol_rate",
    "cb_gst_details",
    "igst_amount",
    "cgst_amount",
    "sgst_amount",
    "cess_amount",
    "cess_non_advol_amount",
    "is_ineligible_for_itc",
    "taxable_value"
];

function hide_supplier_quotation_item_gst_fields(frm) {
    const grid = frm?.fields_dict?.items?.grid;
    if (!grid) {
        return;
    }

    // UI-only: hide GST fields in Supplier Quotation Item grid/dialog without
    // removing data fields or changing GST calculations.
    SUPPLIER_QUOTATION_ITEM_GST_FIELDS.forEach(fieldname => {
        if (frappe.meta.get_docfield("Supplier Quotation Item", fieldname, frm.doc.name)) {
            grid.update_docfield_property(fieldname, "hidden", 1);
        }
    });

    (grid.grid_rows || []).forEach(row => {
        if (row.grid_form) {
            hide_supplier_quotation_item_gst_grid_form(row.grid_form);
        }
    });

    grid.refresh();
}

function hide_supplier_quotation_item_gst_grid_form(grid_form) {
    SUPPLIER_QUOTATION_ITEM_GST_FIELDS.forEach(fieldname => {
        const field = grid_form.fields_dict?.[fieldname];
        if (!field) {
            return;
        }

        field.df.hidden = 1;
        field.refresh();
    });
}

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

function set_default_branch(frm) {
    // The server-side `set_default_branch` hook is the authority -- it covers
    // API creation, mappers and imports. This only mirrors the same lookup into
    // the form so the user can see the branch, and override it, while drafting.
    if (!frm.is_new() || frm.doc.custom_branch) {
        return;
    }

    frappe.db.get_value("Employee", { user_id: frappe.session.user }, "branch")
        .then(r => {
            const branch = r && r.message && r.message.branch;

            // re-check: the user may have picked a branch while this was in flight
            if (branch && !frm.doc.custom_branch) {
                frm.set_value("custom_branch", branch);
            }
        });
}

// Pulls contact persons from the Request for
// Quotation the first item row came from. Runs once per RFQ -- the guard
// keeps repeated items_add events from re-fetching the same values.
function fetch_contact_details(frm) {
    if (!frm.doc.items || !frm.doc.items.length) return;
    let rfq_name = frm.doc.items[0].request_for_quotation;
    if (!rfq_name) return;
    if (frm._last_fetched_rfq === rfq_name) return;
    frm._last_fetched_rfq = rfq_name;

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "MR Contact Person",
            parent: "Request for Quotation",
            filters: {
                parent: rfq_name,
                parenttype: "Request for Quotation"
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
}

// Supplier Quotation Comparison tab: same layout as the one on Request for Quotation
function render_rfq_comparison(frm) {
    const field = frm.fields_dict.custom_compare;
    if (!field) return;

    const $tab = $(frm.wrapper)
        .find('button.nav-link[data-fieldname="custom_tab_compare"]')
        .closest("li.nav-item");

    // No RFQ behind this quotation: nothing to compare, hide the tab
    const has_rfq = (frm.doc.items || []).some(row => row.request_for_quotation);
    if (!has_rfq || frm.is_new()) {
        $tab.hide();
        return;
    }

    frappe.call({
        method: "po_wo_pr.api.supplier_quotation_data.get_rfq_comparison_for_supplier_quotation",
        args: { sq_name: frm.doc.name },
        callback(r) {
            const blocks = r.message || [];
            if (!blocks.length) {
                $tab.hide();
                return;
            }
            $tab.show();
            field.$wrapper.html(build_rfq_comparison_html(blocks));
        }
    });
}

function build_rfq_comparison_html(blocks) {
    const esc = frappe.utils.escape_html;
    const currency = v => frappe.format(v, { fieldtype: "Currency" });

    let html = `
        <style>
            .sqc-container { margin-top: 15px; overflow-x: auto; }
            .sqc-table { width: 100%; border-collapse: collapse; min-width: 820px; font-size: 13px; }
            .sqc-table th, .sqc-table td { border: 1px solid #d1d8dd; padding: 8px 10px; text-align: left; white-space: nowrap; vertical-align: middle; }
            .sqc-table th { background: #f7f7f7; font-weight: 600; color: #36414c; text-align: center; }
            .sqc-table td.item-cell { font-weight: 500; color: #1f272e; }
            .sqc-table td.uom-cell, .sqc-table td.qty-cell, .sqc-table td.no-cell { text-align: center; color: #36414c; }
            .sqc-table td.rate-cell, .sqc-table td.discount-cell, .sqc-table td.amount-cell { text-align: right; }
            .sqc-table tbody tr:nth-child(even) { background: #fafbfc; }
            .sqc-table tbody tr:hover { background: #f0f4f7; }
            .sqc-table .no-quote { color: #999; font-style: italic; text-align: center !important; }
            .sqc-header { display: flex; align-items: center; margin-bottom: 10px; }
            .sqc-header h5 { margin: 0; color: #36414c; }
            .sqc-count { margin-left: 10px; font-size: 12px; color: #6c7680; }
            .sqc-item-start td { border-top: 2px solid #c7d0d9; }
            .sqc-best-rate { background: #d4edda !important; font-weight: bold; color: #155724; }
        </style>
    `;

    blocks.forEach(block => {
        const suppliers = block.suppliers || [];
        const itemKeys = Object.keys(block.items || {});

        html += `
            <div class="sqc-container">
                <div class="sqc-header">
                    <h5>Supplier Quotation Comparison - ${esc(block.rfq)}</h5>
                    <span class="sqc-count">(${suppliers.length} Supplier)</span>
                </div>
        `;

        if (!itemKeys.length || !suppliers.length) {
            html += `<p class="text-muted">No items or suppliers found in ${esc(block.rfq)}.</p></div>`;
            return;
        }

        html += `
            <table class="sqc-table">
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

        itemKeys.forEach((key, itemIndex) => {
            const item = block.items[key];
            const rates = suppliers
                .map(s => Number((item.suppliers[s] || {}).rate || 0))
                .filter(r => r > 0);
            const bestRate = rates.length ? Math.min(...rates) : null;

            suppliers.forEach((supplier, idx) => {
                const d = item.suppliers[supplier] || {};
                const rate = Number(d.rate || 0);
                const amount = Number(d.amount || 0);
                const pct = Number(d.discount_percentage || 0);
                const disc = Number(d.discount_amount || 0);
                const discountDisplay = pct > 0 ? `${pct}%` : disc > 0 ? currency(disc) : "-";

                const classes = [];
                if (idx === 0) classes.push("sqc-item-start");
                if (rate > 0 && bestRate !== null && rate === bestRate) classes.push("sqc-best-rate");

                html += `<tr class="${classes.join(" ")}">`;
                if (idx === 0) {
                    html += `
                        <td class="no-cell" rowspan="${suppliers.length}">${itemIndex + 1}</td>
                        <td class="item-cell" rowspan="${suppliers.length}">${esc(item.item_name || item.item_code || key)}</td>
                        <td class="qty-cell" rowspan="${suppliers.length}">${item.qty || "-"}</td>
                        <td class="uom-cell" rowspan="${suppliers.length}">${esc(item.uom || "-")}</td>
                    `;
                }
                html += `
                    <td class="supplier-cell">${esc(supplier)}</td>
                    <td class="${rate ? "rate-cell" : "no-quote"}">${rate ? currency(rate) : "-"}</td>
                    <td class="${discountDisplay !== "-" ? "discount-cell" : "no-quote"}">${discountDisplay}</td>
                    <td class="${amount ? "amount-cell" : "no-quote"}">${amount ? currency(amount) : "-"}</td>
                </tr>`;
            });
        });

        html += `</tbody></table></div>`;
    });

    return html;
}