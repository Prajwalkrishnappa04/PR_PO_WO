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

        calculate_experience(frm);
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
