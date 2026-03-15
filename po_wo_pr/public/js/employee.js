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
    custom_same_as_current(frm){
        if(frm.doc.custom_same_as_current){
            frm.set_value("permanent_address",frm.doc.current_address)
            frm.set_value("custom_permanent_area",frm.doc.custom_current_area)
            frm.set_value("custom_permanent_pincode",frm.doc.custom_current_pincode)
            frm.set_value("custom_permanent_state",frm.doc.custom_current_state)
        }
        else{
            frm.set_value("permanent_address",null)
            frm.set_value("custom_permanent_area",null)
            frm.set_value("custom_permanent_pincode",null)
            frm.set_value("custom_permanent_state",null)
        }
    }
,
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


frappe.ui.form.on('Employee External Work History', {

    custom_from_datee: function(frm, cdt, cdn) {
        calculate_external_experience(frm, cdt, cdn);
         calculate_total_external_experience(frm);
    },

    custom_to_datee: function(frm, cdt, cdn) {
        calculate_external_experience(frm, cdt, cdn);
         calculate_total_external_experience(frm);
    }

});


frappe.ui.form.on('Employee Internal Work History', {

    from_date: function(frm, cdt, cdn) {
        calculate_internal_experience(frm, cdt, cdn);
        calculate_total_internal_experience(frm);

    },

    to_date: function(frm, cdt, cdn) {
        calculate_internal_experience(frm, cdt, cdn);
                calculate_total_internal_experience(frm);

    }

});

function calculate_external_experience(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    if (row.custom_from_datee && row.custom_to_datee) {

        let from_date = moment(row.custom_from_datee);
        let to_date = moment(row.custom_to_datee);

        let years = to_date.diff(from_date, 'years');
        from_date.add(years, 'years');

        let months = to_date.diff(from_date, 'months');
        from_date.add(months, 'months');

        let experience = years + (months / 12);

        frappe.model.set_value(
            cdt,
            cdn,
            'total_experience',
            experience.toFixed(2) + " years"
        );
    }
}

function calculate_internal_experience(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    if (row.from_date && row.to_date) {

        let from_date = moment(row.from_date);
        let to_date = moment(row.to_date);

        let years = to_date.diff(from_date, 'years');
        from_date.add(years, 'years');

        let months = to_date.diff(from_date, 'months');
        from_date.add(months, 'months');

        let experience = years + (months / 12);

        frappe.model.set_value(
            cdt,
            cdn,
            'custom_total_experience',
            experience.toFixed(2) + " years"
        );
    }
}

function calculate_total_external_experience(frm) {

    let total = 0;

    (frm.doc.external_work_history || []).forEach(row => {

        if (row.total_experience) {

            let exp = parseFloat(row.total_experience);

            if (!isNaN(exp)) {
                total += exp;
            }
        }

    });

    frm.set_value("custom_total_external_work_experience", total.toFixed(2) + " years");
}


function calculate_total_internal_experience(frm) {

    let total = 0;

    (frm.doc.internal_work_history || []).forEach(row => {

        if (row.custom_total_experience) {

            let exp = parseFloat(row.custom_total_experience);

            if (!isNaN(exp)) {
                total += exp;
            }
        }

    });

    frm.set_value("custom_total_internal_work_history", total.toFixed(2) + " years");
}