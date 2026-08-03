// frappe.ui.form.on("Request for Quotation", {
//     setup(frm) {
//         set_email_template_mandatory(frm);
//     },

//     onload(frm) {
//         set_email_template_mandatory(frm);
//     },

//     refresh(frm) {
//         set_email_template_mandatory(frm);

//         if (!frm.doc.name) return;

//         frappe.call({
//             method: "po_wo_pr.api.request_for_quotation_data.get_supplier_quotation_comparison",
//             args: {
//                 rfq_name: frm.doc.name
//             },
//             callback(r) {
//                 render_comparison(frm, r.message || {});
//             }
//         });
        
//         frappe.call({
//             method: "po_wo_pr.api.request_for_quotation_data.get_any_supplier_qs",
//             args: { rfq_name: frm.doc.name },
//             callback: function(r) {
//                 let has_sq = r.message && r.message != 0 ? true : false;
//                 console.log("has_sq:", has_sq);

//                 setTimeout(function() {
//                     // Exact selector based on your DOM structure
//                     let $tab = $(frm.wrapper)
//                         .find('button.nav-link[data-fieldname="custom_tab_2"]')
//                         .closest('li.nav-item');

//                     console.log("tab li found:", $tab.length); // must be 1

//                     if (!has_sq) {
//                         $tab.hide();
//                     } else {
//                         $tab.show();
//                     }
//                 }, 500);
//             }
//         });
                
//     }
    
// });

// frappe.ui.form.on("Request for Quotation Supplier", {
//     send_email(frm) {
//         set_email_template_mandatory(frm);
//     },

//     suppliers_remove(frm) {
//         set_email_template_mandatory(frm);
//     },

//     custom_print(frm, cdt, cdn) {
//         const row = locals[cdt][cdn];
//         if (!frm.doc.name || !row.supplier) return;

//         const url = frappe.urllib.get_full_url(
//             "/printview?" +
//             new URLSearchParams({
//                 doctype: frm.doc.doctype,
//                 name: frm.doc.name,
//                 format: "Maa Request for Quotation P.Format",
//                 supplier: row.supplier,
//                 letterhead: frm.doc.letter_head || "",
//                 no_letterhead: frm.doc.letter_head ? 0 : 1
//             }).toString()
//         );
//         const print_window = window.open(url, "_blank");

//         if (!print_window) {
//             frappe.msgprint(__("Please enable pop-ups"));
//         }
//     }
// });

// function set_email_template_mandatory(frm) {
//     const email_template_required = (frm.doc.suppliers || []).some(row => cint(row.send_email));

//     frm.set_df_property("email_template", "reqd", email_template_required ? 1 : 0);
// }

// function render_comparison(frm, data) {
//     const field = frm.fields_dict.custom_compare;

//     if (!field) {
//         console.warn("HTML field custom_compare not found");
//         return;
//     }

//     // Handle new data structure
//     const items = data.items || data;
//     const suppliers = data.suppliers || [];

//     // If no items, show message
//     if (!Object.keys(items).length) {
//         field.$wrapper.html(
//             "<p class='text-muted'>No items found in this Request for Quotation.</p>"
//         );
//         return;
//     }

//     // If suppliers array is empty, try to get from items' rates
//     let allSuppliers = suppliers.length ? suppliers : [];
//     if (!allSuppliers.length) {
//         let supplierSet = new Set();
//         Object.values(items).forEach(row => {
//             Object.keys(row.rates || {}).forEach(s => supplierSet.add(s));
//         });
//         allSuppliers = Array.from(supplierSet);
//     }

//     if (!allSuppliers.length) {
//         field.$wrapper.html(
//             "<p class='text-muted'>No Suppliers found for comparison.</p>"
//         );
//         return;
//     }

//     let html = `
//     <style>
//         .rfq-comparison-container {
//             margin-top: 15px;
//             overflow-x: auto;
//         }
//         .rfq-table {
//             width: 100%;
//             border-collapse: collapse;
//             min-width: 600px;
//             font-size: 13px;
//         }
//         .rfq-table th, .rfq-table td {
//             border: 1px solid #d1d8dd;
//             padding: 10px 12px;
//             text-align: right;
//         }
//         .rfq-table th {
//             background: linear-gradient(to bottom, #f7f7f7, #eaeaea);
//             font-weight: 600;
//             color: #36414c;
//             white-space: nowrap;
//         }
//         .rfq-table td.item-cell {
//             text-align: left;
//             font-weight: 500;
//             color: #1f272e;
//         }
//         .rfq-table td.uom-cell {
//             text-align: center;
//             color: #6c7680;
//         }
//         .rfq-table tbody tr:nth-child(even) {
//             background: #fafbfc;
//         }
//         .rfq-table tbody tr:hover {
//             background: #f0f4f7;
//         }
//         .best-rate {
//             background: #d4edda !important;
//             font-weight: bold;
//             color: #155724;
//         }
//         .no-quote {
//             color: #999;
//             font-style: italic;
//         }
//         .rfq-table-header {
//             display: flex;
//             align-items: center;
//             margin-bottom: 10px;
//         }
//         .rfq-table-header h5 {
//             margin: 0;
//             color: #36414c;
//         }
//         .supplier-count {
//             margin-left: 10px;
//             font-size: 12px;
//             color: #6c7680;
//         }
//     </style>

//     <div class="rfq-comparison-container">
//         <div class="rfq-table-header">
//             <h5>Supplier Quotation Comparison</h5>
//             <span class="supplier-count">(${allSuppliers.length} Suppliers)</span>
//         </div>
//         <table class="rfq-table">
//             <thead>
//                 <tr>
//                     <th style="text-align: left;">Item</th>
//                     <th style="text-align: center;">UOM</th>
//                     ${allSuppliers.map(s => `<th>${frappe.utils.escape_html(s)}</th>`).join("")}
//                 </tr>
//             </thead>
//             <tbody>
//     `;

//     for (let itemCode of Object.keys(items)) {
//         const item = items[itemCode];
//         let numericRates = Object.values(item.rates || {}).filter(r => typeof r === "number" && r > 0);
//         let minRate = numericRates.length ? Math.min(...numericRates) : null;

//         html += `<tr>
//             <td class="item-cell">${frappe.utils.escape_html(item.item_name || itemCode)}</td>
//             <td class="uom-cell">${item.uom || "-"}</td>
//             ${allSuppliers.map(s => {
//             let rate = item.rates ? item.rates[s] : undefined;
//             let hasRate = rate !== undefined && rate !== null;
//             let isBest = hasRate && rate === minRate && minRate !== null;
//             let cls = isBest ? "best-rate" : (hasRate ? "" : "no-quote");
//             let displayValue = hasRate ? frappe.format(rate, { fieldtype: "Currency" }) : "-";
//             return `<td class="${cls}">${displayValue}</td>`;
//         }).join("")}
//         </tr>`;
//     }

//     html += "</tbody></table></div>";

//     field.$wrapper.html(html);
// }




frappe.ui.form.on("Request for Quotation", {
    setup(frm) {
        set_email_template_mandatory(frm);
    },

    onload(frm) {
        set_email_template_mandatory(frm);

        frm.set_query("terms", "custom_term_selection", () => {
            return {
                filters: {
                    disabled: 0
                }
            };
        });
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

    refresh(frm) {
        set_email_template_mandatory(frm);

        if (!frm.doc.name) return;

        frappe.call({
            method: "po_wo_pr.api.request_for_quotation_data.get_supplier_quotation_comparison",
            args: {
                rfq_name: frm.doc.name
            },
            callback(r) {
                render_comparison(frm, r.message || {});
            }
        });
        
        frappe.call({
            method: "po_wo_pr.api.request_for_quotation_data.get_any_supplier_qs",
            args: { rfq_name: frm.doc.name },
            callback: function(r) {
                let has_sq = r.message && r.message != 0 ? true : false;
                console.log("has_sq:", has_sq);

                setTimeout(function() {
                    // Exact selector based on your DOM structure
                    let $tab = $(frm.wrapper)
                        .find('button.nav-link[data-fieldname="custom_tab_2"]')
                        .closest('li.nav-item');

                    console.log("tab li found:", $tab.length); // must be 1

                    if (!has_sq) {
                        $tab.hide();
                    } else {
                        $tab.show();
                    }
                }, 500);
            }
        });
                
    }
    
});

frappe.ui.form.on("Request for Quotation Supplier", {
    send_email(frm) {
        set_email_template_mandatory(frm);
    },

    suppliers_remove(frm) {
        set_email_template_mandatory(frm);
    },

    custom_print(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!frm.doc.name || !row.supplier) return;
    
        const url = frappe.urllib.get_full_url(
            "/printview?" +
            new URLSearchParams({
                doctype: frm.doc.doctype,
                name: frm.doc.name,
                format: "MF RFQ P.Format",
                supplier: row.supplier,
                letterhead: frm.doc.letter_head || "",
                no_letterhead: frm.doc.letter_head ? 0 : 1
            }).toString()
        );
        const print_window = window.open(url, "_blank");
    
        if (!print_window) {
            frappe.msgprint(__("Please enable pop-ups"));
        }
    }
});

function set_email_template_mandatory(frm) {
    const email_template_required = (frm.doc.suppliers || []).some(row => cint(row.send_email));

    frm.set_df_property("email_template", "reqd", email_template_required ? 1 : 0);
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

// function render_comparison(frm, data) {
//     const field = frm.fields_dict.custom_compare;

//     if (!field) {
//         console.warn("HTML field custom_compare not found");
//         return;
//     }

//     // Handle new data structure
//     const items = data.items || data;
//     const suppliers = data.suppliers || [];

//     // If no items, show message
//     if (!Object.keys(items).length) {
//         field.$wrapper.html(
//             "<p class='text-muted'>No items found in this Request for Quotation.</p>"
//         );
//         return;
//     }

//     // If suppliers array is empty, try to get from items' rates
//     let allSuppliers = suppliers.length ? suppliers : [];
//     if (!allSuppliers.length) {
//         let supplierSet = new Set();
//         Object.values(items).forEach(row => {
//             Object.keys(row.rates || {}).forEach(s => supplierSet.add(s));
//         });
//         allSuppliers = Array.from(supplierSet);
//     }

//     if (!allSuppliers.length) {
//         field.$wrapper.html(
//             "<p class='text-muted'>No Suppliers found for comparison.</p>"
//         );
//         return;
//     }

//     let html = `
//     <style>
//         .rfq-comparison-container {
//             margin-top: 15px;
//             overflow-x: auto;
//         }
//         .rfq-table {
//             width: 100%;
//             border-collapse: collapse;
//             min-width: 600px;
//             font-size: 13px;
//         }
//         .rfq-table th, .rfq-table td {
//             border: 1px solid #d1d8dd;
//             padding: 10px 12px;
//             text-align: right;
//         }
//         .rfq-table th {
//             background: linear-gradient(to bottom, #f7f7f7, #eaeaea);
//             font-weight: 600;
//             color: #36414c;
//             white-space: nowrap;
//         }
//         .rfq-table td.item-cell {
//             text-align: left;
//             font-weight: 500;
//             color: #1f272e;
//         }
//         .rfq-table td.uom-cell {
//             text-align: center;
//             color: #6c7680;
//         }
//         .rfq-table tbody tr:nth-child(even) {
//             background: #fafbfc;
//         }
//         .rfq-table tbody tr:hover {
//             background: #f0f4f7;
//         }
//         .best-rate {
//             background: #d4edda !important;
//             font-weight: bold;
//             color: #155724;
//         }
//         .no-quote {
//             color: #999;
//             font-style: italic;
//         }
//         .rfq-table-header {
//             display: flex;
//             align-items: center;
//             margin-bottom: 10px;
//         }
//         .rfq-table-header h5 {
//             margin: 0;
//             color: #36414c;
//         }
//         .supplier-count {
//             margin-left: 10px;
//             font-size: 12px;
//             color: #6c7680;
//         }
//     </style>

//     <div class="rfq-comparison-container">
//         <div class="rfq-table-header">
//             <h5>Supplier Quotation Comparison</h5>
//             <span class="supplier-count">(${allSuppliers.length} Suppliers)</span>
//         </div>
//         <table class="rfq-table">
//             <thead>
//                 <tr>
//                     <th style="text-align: left;">Item</th>
//                     <th style="text-align: center;">UOM</th>
//                     ${allSuppliers.map(s => `<th>${frappe.utils.escape_html(s)}</th>`).join("")}
//                 </tr>
//             </thead>
//             <tbody>
//     `;

//     for (let itemCode of Object.keys(items)) {
//         const item = items[itemCode];
//         let numericRates = Object.values(item.rates || {}).filter(r => typeof r === "number" && r > 0);
//         let minRate = numericRates.length ? Math.min(...numericRates) : null;

//         html += `<tr>
//             <td class="item-cell">${frappe.utils.escape_html(item.item_name || itemCode)}</td>
//             <td class="uom-cell">${item.uom || "-"}</td>
//             ${allSuppliers.map(s => {
//             let rate = item.rates ? item.rates[s] : undefined;
//             let hasRate = rate !== undefined && rate !== null;
//             let isBest = hasRate && rate === minRate && minRate !== null;
//             let cls = isBest ? "best-rate" : (hasRate ? "" : "no-quote");
//             let displayValue = hasRate ? frappe.format(rate, { fieldtype: "Currency" }) : "-";
//             return `<td class="${cls}">${displayValue}</td>`;
//         }).join("")}
//         </tr>`;
//     }

//     html += "</tbody></table></div>";

//     field.$wrapper.html(html);
// }



function adapt_rfq_data_to_po_shape(data) {
    const items = data.items || data;
    const suppliers = data.suppliers || [];

    const adaptedItems = {};

    Object.keys(items).forEach(itemKey => {
        const row = items[itemKey];
        const rates = row.rates || {};

        const supplierMap = {};
        Object.keys(rates).forEach(supplier => {
            const rate = Number(rates[supplier] || 0);
            supplierMap[supplier] = {
                rate: rate,
                discount_percentage: 0,
                discount_amount: 0,
                amount: 0
            };
        });

        adaptedItems[itemKey] = {
            item_name: row.item_name || itemKey,
            item_code: row.item_code || itemKey,
            qty: row.qty || "-",
            uom: row.uom || "-",
            suppliers: supplierMap
        };
    });

    const supplierSet = new Set(suppliers);
    Object.values(adaptedItems).forEach(item => {
        Object.keys(item.suppliers).forEach(s => supplierSet.add(s));
    });

    return {
        items: adaptedItems,
        suppliers: Array.from(supplierSet)
    };
}

function render_comparison(frm, data) {
    const field = frm.fields_dict.custom_compare;

    if (!field) {
        console.warn("HTML field custom_compare not found");
        return;
    }

    const adapted = adapt_rfq_data_to_po_shape(data);
    const items = adapted.items;
    const allSuppliers = adapted.suppliers;

    if (!Object.keys(items).length) {
        field.$wrapper.html(
            "<p class='text-muted'>No items found in this Request for Quotation.</p>"
        );
        return;
    }

    if (!allSuppliers.length) {
        field.$wrapper.html(
            "<p class='text-muted'>No Suppliers found for comparison.</p>"
        );
        return;
    }

    const bestRateByItem = {};
    Object.keys(items).forEach(itemKey => {
        const supplierData = items[itemKey].suppliers || {};
        const numericRates = Object.values(supplierData)
            .map(s => s.rate)
            .filter(r => typeof r === "number" && r > 0);
        bestRateByItem[itemKey] = numericRates.length ? Math.min(...numericRates) : null;
    });

    let html = `
        <style>
            .rfq-comparison-container {
                margin-top: 15px;
                overflow-x: auto;
            }

            .rfq-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 820px;
                font-size: 13px;
            }

            .rfq-table th,
            .rfq-table td {
                border: 1px solid #d1d8dd;
                padding: 8px 10px;
                text-align: left;
                white-space: nowrap;
                vertical-align: middle;
            }

            .rfq-table th {
                background: #f7f7f7;
                font-weight: 600;
                color: #36414c;
                text-align: center;
            }

            .rfq-table td.item-cell {
                text-align: left;
                font-weight: 500;
                color: #1f272e;
            }

            .rfq-table td.supplier-cell {
                text-align: left;
                color: #36414c;
            }

            .rfq-table td.uom-cell,
            .rfq-table td.qty-cell,
            .rfq-table td.no-cell {
                text-align: center;
                color: #36414c;
            }

            .rfq-table td.rate-cell,
            .rfq-table td.discount-cell,
            .rfq-table td.amount-cell {
                text-align: right;
            }

            .rfq-table tbody tr:nth-child(even) {
                background: #fafbfc;
            }

            .rfq-table tbody tr:hover {
                background: #f0f4f7;
            }

            .no-quote {
                color: #999;
                font-style: italic;
                text-align: center !important;
            }

            .rfq-table-header {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }

            .rfq-table-header h5 {
                margin: 0;
                color: #36414c;
            }

            .supplier-count {
                margin-left: 10px;
                font-size: 12px;
                color: #6c7680;
            }

            .rfq-item-start td {
                border-top: 2px solid #c7d0d9;
            }

            .rfq-best-rate {
                background: #d4edda !important;
                font-weight: bold;
                color: #155724;
            }
        </style>

        <div class="rfq-comparison-container">
            <div class="rfq-table-header">
                <h5>Supplier Quotation Comparison</h5>
                <span class="supplier-count">(${allSuppliers.length} Supplier)</span>
            </div>

            <table class="rfq-table">
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
        const bestRate = bestRateByItem[itemKey];

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
                rowClasses.push("rfq-item-start");
            }

            if (rate > 0 && bestRate !== null && rate === bestRate) {
                rowClasses.push("rfq-best-rate");
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
