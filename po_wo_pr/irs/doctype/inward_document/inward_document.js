// Copyright (c) 2025, Hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Inward Document", {
    refresh(frm) {
        set_horizontal_tab_order(frm);
    }
});
