frappe.ui.form.on('Employee', {
    refresh(frm) {

        const today = frappe.datetime.get_today();

        (frm.doc.internal_work_history || []).forEach(row => {
            if (row.to_date !== today) {
                frappe.model.set_value(
                    row.doctype,
                    row.name,
                    'to_date',
                    today
                );
            }
        });

    }
});
