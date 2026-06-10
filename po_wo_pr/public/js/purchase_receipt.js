frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        set_transport_section_width(frm);

        frm.remove_custom_button("Landed Cost Voucher", "Create");
        setTimeout(() => {
            $(frm.wrapper).find('[data-label="Landed%20Cost%20Voucher"]').hide();
        }, 500);
    }
});

function set_transport_section_width(frm) {
    const style_id = "po-wo-pr-purchase-receipt-transport-style";

    if (!$(`#${style_id}`).length) {
        $("head").append(`
            <style id="${style_id}">
                .po-wo-pr-compact-transport .section-body {
                    max-width: 1040px;
                }
            </style>
        `);
    }

    frm.wrapper
        .find('.form-section[data-fieldname="custom_transport"]')
        .addClass("po-wo-pr-compact-transport");
}
