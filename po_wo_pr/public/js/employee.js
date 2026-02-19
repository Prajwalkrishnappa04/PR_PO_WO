frappe.ui.form.on('Employee', {
    refresh(frm) {
        const today = frappe.datetime.get_today();

        (frm.doc.internal_work_history || []).forEach(row => {
            if (row.to_date !== today) {
                frappe.model.set_value(row.doctype, row.name, 'to_date', today);
            }
        });
        frm.refresh_field('internal_work_history');

        calculate_experience(frm);

        if (!frm.is_new()) {
            frappe.call({
                method: 'po_wo_pr.overrides.custom_employee_class.update_employee_loan_data',
                args: {
                    employee: frm.doc.name
                },
                callback: function (r) {
                    if (r.message) {
                        // Update values directly on frm.doc to avoid marking form dirty
                        // Backend already saves via frappe.db.set_value
                        Object.assign(frm.doc, r.message);
                        frm.refresh_fields();
                    }
                }
            });
        }
    },

    date_of_joining(frm) {
        calculate_experience(frm);
    }
});

function calculate_experience(frm) {
    if (frm.doc.date_of_joining) {
        let doj = moment(frm.doc.date_of_joining);
        let today = moment();

        let years = today.diff(doj, 'years');
        doj.add(years, 'years');

        let months = today.diff(doj, 'months');
        doj.add(months, 'months');

        let days = today.diff(doj, 'days');

        let experience_str = `${years}year ${months}month, ${days}days`;
        frm.set_value('custom_maa_foundation_experience', experience_str);
    }
}
