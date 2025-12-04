// Copyright (c) 2025, Hybrowlabs and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Work Order Entry", {
// 	refresh(frm) {

// 	},
// });

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
        flt(row.order_quantity) * flt(row.rate)
    );

    calculate_total_amount(frm);
}

function calculate_total_amount(frm) {
    let total_amount = 0;
    (frm.doc.description || []).forEach(row => {
        total_amount += flt(row.amount);
    });

    frm.set_value("total_value", total_amount);
    calculate_grand_total(frm);
}



// ---------------- DISCOUNT LOGIC ---------------- //

function calculate_discount_value(frm) {
    if (frm._updating_discount_value) return;

    let total = flt(frm.doc.total_value);
    let percentage = flt(frm.doc.discounted_percentage_);

    frm._updating_discount_value = true;

    frappe.model.set_value(frm.doc.doctype, frm.doc.name,
        "discounted_value", total * percentage / 100
    ).then(() => {
        frm._updating_discount_value = false;
        calculate_grand_total(frm);
    });
}

function calculate_discount_percentage(frm) {
    if (frm._updating_discount_percentage) return;

    let total = flt(frm.doc.total_value);
    let value = flt(frm.doc.discounted_value);

    frm._updating_discount_percentage = true;

    frappe.model.set_value(frm.doc.doctype, frm.doc.name,
        "discounted_percentage_", total ? (value / total) * 100 : 0
    ).then(() => {
        frm._updating_discount_percentage = false;
        calculate_grand_total(frm);
    });
}



function calculate_grand_total(frm) {
    let total = flt(frm.doc.total_value);
    let discount = flt(frm.doc.discounted_value);

    frm.set_value("revised_value", total - discount);

    calculate_taxes(frm);
}

function calculate_taxes(frm) {
    if (frm._updating_taxes) return;

    frm._updating_taxes = true;

    let taxable = flt(frm.doc.revised_value);

    let cgst = taxable * flt(frm.doc.cgst_) / 100;
    let sgst = taxable * flt(frm.doc.sgst_) / 100;
    let igst = taxable * flt(frm.doc.igst_) / 100;
    let fright = flt(frm.doc.freight) || 0
    let final = taxable + cgst + sgst + igst + fright;

    frm.set_value("final_amount", final);

    frm._updating_taxes = false;
}



// ---------------- FORM TRIGGERS ---------------- //

frappe.ui.form.on("Work Order Entry", {

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
    freight(frm) {
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
