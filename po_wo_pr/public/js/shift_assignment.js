frappe.ui.form.on("Shift Assignment", {
    refresh(frm) {
        frm.toggle_display("custom_holiday", false);
    }
});