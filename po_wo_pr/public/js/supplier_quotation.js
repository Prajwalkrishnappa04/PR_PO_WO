frappe.ui.form.on("Supplier Quotation", {
    refresh(frm) {
        frm.remove_custom_button("Quotation", "Create");
        setTimeout(() => {
            $(frm.wrapper).find('[data-label="Quotation"]').hide();
        }, 500);
    }
});
