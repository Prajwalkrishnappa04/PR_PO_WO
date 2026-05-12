frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        frm.remove_custom_button("Landed Cost Voucher", "Create");
        setTimeout(() => {
            $(frm.wrapper).find('[data-label="Landed%20Cost%20Voucher"]').hide();
        }, 500);
    }
});
