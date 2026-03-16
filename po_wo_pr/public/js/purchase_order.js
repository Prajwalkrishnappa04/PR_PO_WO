frappe.ui.form.on("Purchase Order", {
    refresh(frm) {
        frm.add_custom_button(
            "Work Order Entry",
            () => {
                frappe.new_doc("Work Order Entry", {
                    purchase_order: frm.doc.name
                });
            },
            "Create"
        );
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
