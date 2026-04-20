frappe.ui.form.on('Employee Checkin', {
    onload: function (frm) {
        lock_fields(frm);
    },
    refresh: function (frm) {
        lock_fields(frm);
    },
    validate(frm) {
        if (!frm.doc.latitude || !frm.doc.longitude) {
            frappe.throw('Please click "Fetch Location" before saving.');
        }
    }
});

function lock_fields(frm) {
    // Once the document is saved (not new), make specific fields read-only
    if (!frm.is_new()) {
        const fields = ['employee', 'time', 'log_type'];
        fields.forEach(field => {
            frm.set_df_property(field, 'read_only', 1);
            frm.toggle_enable(field, false);
        });
    }
}
