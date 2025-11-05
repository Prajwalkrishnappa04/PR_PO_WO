// Copyright (c) 2025, Hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Work Order Inward Entry", {
    supplier_name(frm) {
        frm.set_query("work_order_no", () => {
            return {
                filters: {
                    supplier_name: frm.doc.supplier_name
                }
            };
        });
    },
    work_order_no(frm) {
        if (frm.doc.work_order_no) {
            frappe.db.get_value("Work-Orders", frm.doc.work_order_no, "supplier_name", (r) => {
                if (r && r.supplier_name) {
                    frm.set_value("supplier_name", r.supplier_name);
                }
            });
        }
    },
    refresh(frm) {

    },
});
