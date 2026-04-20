frappe.ui.form.on('Attendance', {
    refresh: function(frm) {
        if (frm.doc.working_hours && !frm.doc.custom_work_hours) {
            frm.set_value('custom_work_hours', format_decimal_to_time(frm.doc.working_hours));
        }
    },
    working_hours: function(frm) {
        if (frm.doc.working_hours) {
            frm.set_value('custom_work_hours', format_decimal_to_time(frm.doc.working_hours));
        } else {
            frm.set_value('custom_work_hours', '');
        }
    },
    in_time: function(frm) {
        if (frm.doc.in_time) {
            let time = frm.doc.in_time.split(" ")[1];
            frm.set_value('custom_exact_in_time', time);
        } else {
            frm.set_value('custom_exact_in_time', '');
        }
    },
    out_time: function(frm) {
        if (frm.doc.out_time) {
            let time = frm.doc.out_time.split(" ")[1];
            frm.set_value('custom_exact_out_time', time);
        } else {
            frm.set_value('custom_exact_out_time', '');
        }
    }
});

function format_decimal_to_time(decimal_hours) {
    if (!decimal_hours) return "00:00:00";
    let hours = Math.floor(decimal_hours);
    let minutes = Math.floor((decimal_hours - hours) * 60);
    let seconds = Math.round((((decimal_hours - hours) * 60) - minutes) * 60);
    
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}
