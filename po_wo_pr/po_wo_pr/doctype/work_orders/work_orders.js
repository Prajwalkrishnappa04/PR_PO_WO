// ---------------- CHILD TABLE CALCULATION ---------------- //

frappe.ui.form.on("Work Order Description", {
    order_quantity(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    },
    rate(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
    }
});

function calculate_amount(frm, cdt, cdn) {
    let row = frappe.get_doc(cdt, cdn);

    frappe.model.set_value(cdt, cdn, "amount",
        (row.order_quantity || 0) * (row.rate || 0)
    );

    calculate_total_amount(frm);
}

function calculate_total_amount(frm) {
    let total_amount = 0;
    (frm.doc.description || []).forEach(row => {
        total_amount += row.amount || 0;
    });

    frm.set_value("total_value", total_amount);
    calculate_grand_total(frm);
}


// ---------------- DISCOUNT LOGIC ---------------- //

function calculate_discount_value(frm) {
    if (frm._updating_discount_value) return;

    let total = frm.doc.total_value || 0;
    let percentage = frm.doc.discounted_percentage_ || 0;

    frm._updating_discount_percentage = true;
    frappe.model.set_value(frm.doc.doctype, frm.doc.name,
        "discounted_value", (total * percentage) / 100
    ).then(() => {
        frm._updating_discount_percentage = false;
        calculate_grand_total(frm);
    });
}

function calculate_discount_percentage(frm) {
    if (frm._updating_discount_percentage) return;

    let total = frm.doc.total_value || 0;
    let value = frm.doc.discounted_value || 0;

    frm._updating_discount_value = true;
    frappe.model.set_value(frm.doc.doctype, frm.doc.name,
        "discounted_percentage_", (value / total) * 100
    ).then(() => {
        frm._updating_discount_value = false;
        calculate_grand_total(frm);
    });
}


// ---------------- GRAND TOTAL (AFTER DISCOUNT) ---------------- //

function calculate_grand_total(frm) {
    let total = frm.doc.total_value || 0;
    let discount = frm.doc.discounted_value || 0;
    frm.set_value("revised_value", total - discount);

    calculate_taxes(frm);   // 👈 calculate all taxes
}


// ---------------- TAX CALCULATIONS ---------------- //

function calculate_taxes(frm) {
    let taxable = frm.doc.revised_value || 0;

    let cgst = taxable * (frm.doc.cgst_ || 0) / 100;
    let sgst = taxable * (frm.doc.sgst_ || 0) / 100;
    let igst = taxable * (frm.doc.igst_ || 0) / 100;

    frm.set_value("final_amount", taxable + cgst + sgst + igst);
}



// ---------------- FORM TRIGGERS ---------------- //

frappe.ui.form.on("Work-Orders", {

    discounted_percentage_(frm) {
        calculate_discount_value(frm);
    },

    discounted_value(frm) {
        calculate_discount_percentage(frm);
    },

    cgst_(frm) {
        calculate_taxes(frm);
    },

    sgst_(frm) {
        calculate_taxes(frm);
    },

    igst_(frm) {
        calculate_taxes(frm);
    },

    revised_value(frm) {
        calculate_taxes(frm);
    },
    refresh(frm) {
        if (!frm.doc.ref_your_qtn_date) {
            frm.set_value("ref_your_qtn_date", frappe.datetime.get_today());
        }
        frm.add_custom_button(
            "Work Inwards",
            () => {
                frappe.new_doc("Work Order Inward Entry", {
                    work_order_no: frm.doc.name
                });
            },
            "Create"
        );

    }
});

