frappe.ui.form.on('Employee', {
      onload_post_render(frm) {
                apply_exit_tab_visibility(frm);

    },
    refresh(frm) {
                apply_exit_tab_visibility(frm);
                refresh_employee_bank_status(frm);

                let today = frappe.datetime.get_today();
                let updated = false;
                
                (frm.doc.internal_work_history || []).forEach(row => {
                    if (!row.to_date) {   // Only set if empty
                        row.to_date = today;
                        updated = true;
                    }
                });
                
                if (updated) {
                    frm.refresh_field('internal_work_history');
                }

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
    bank_name: refresh_employee_bank_status,
    bank_ac_no: refresh_employee_bank_status,
    ifsc_code: refresh_employee_bank_status,
    employee_name: refresh_employee_bank_status,
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

function refresh_employee_bank_status(frm) {
    const details = () => ({
        bank_name: (frm.doc.bank_name || '').trim(),
        bank_ac_no: (frm.doc.bank_ac_no || '').trim(),
        ifsc_code: (frm.doc.ifsc_code || '').trim()
    });
    const identity = () => JSON.stringify([frm.doc.name, frm.doc.employee_name, details()]);
    const requested_identity = identity();
    const request = (frm.__bank_status_request || 0) + 1;
    frm.__bank_status_request = request;
    const is_current = () => frm.__bank_status_request === request && identity() === requested_identity;
    const render = (message, account) => {
        // Use the existing Bank Details section, not a persisted custom field.
        const section = frm.fields_dict.bank_details_section;
        if (!section || !section.wrapper) return;
        const wrapper = $(section.wrapper);
        wrapper.find('.employee-bank-account-status').remove();
        const status = $('<div class="employee-bank-account-status small text-muted mb-3" role="status"></div>');
        status.text(message);
        if (account) {
            status.append(' ');
            $('<a></a>')
                .text(__('View Bank Account'))
                .attr('href', frappe.utils.get_form_link('Bank Account', account))
                .appendTo(status);
        }
        const body = wrapper.find('.section-body').first();
        status.insertBefore(body.length ? body : wrapper.children().first());
    };
    if (Object.values(details()).some(value => !value)) {
        render(__('Bank Account: fill Bank Name, Bank A/C No. and IFSC Code to create on save.'));
        return;
    }
    if (frm.is_new()) {
        render(__('Bank Account: save this Employee to create or find the account.'));
        return;
    }
    render(__('Bank Account: checking saved bank details…'));
    frappe.call({
        method: 'po_wo_pr.api.employee_bank_account.get_employee_bank_account_status',
        args: {employee: frm.doc.name},
        callback(r) {
            if (!is_current()) return;
            const status = r.message;
            if (!status) {
                render(__('Bank Account: status unavailable.'));
                return;
            }
            if (status.employee !== frm.doc.name || Object.entries(details()).some(([key, value]) => status.saved[key] !== value)) {
                render(__('Bank Account: bank details changed; save to create or find the matching account.'));
                return;
            }
            if (status.state === 'exists') {
                render(status.bank_account
                    ? __('Bank Account: already exists for these bank details.')
                    : __('Bank Account: already exists; you do not have access to view it.'), status.bank_account);
            } else if (status.state === 'bank_missing') {
                render(__('Bank Account: Bank Name must exactly match an existing Bank master. No account created.'));
            } else if (status.state === 'incomplete') {
                render(__('Bank Account: complete the bank details and save.'));
            } else {
                render(__('Bank Account: not created. Save with Bank Account create permission, or ask an authorized user.'));
            }
        },
        error() {
            if (is_current()) render(__('Bank Account: unable to read status. Check your access and refresh.'));
        }
    });
}

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
function apply_exit_tab_visibility(frm) {
    frappe.call({
        method: 'po_wo_pr.overrides.custom_employee_class.check_hr_role',
        callback: function (r) {
            const is_hr = r.message;  // true or false from server

            // ✅ Official Frappe API — most reliable way to hide/show a tab
            frm.set_df_property("exit", "hidden", is_hr ? 0 : 1);
            frm.refresh_field("exit");
        }
    });
}