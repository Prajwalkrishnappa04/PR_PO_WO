frappe.ui.form.on("Item", {
    setup(frm) {
        frm.quick_entry = false;
    },
    before_save(frm) {
        if (!frm.doc.gst_hsn_code) {
            frm.set_value("gst_hsn_code", "010129");
        }
    },
    after_save(frm) {
        console.log("Item saved");
        if (!frm.doc.item_code) {
            frm.set_value("item_code", frm.doc.name);
            frm.save();
        }
    }
});
