console.log('Attendance List JS loaded');

const redirect_attendance_report = () => {
    const route = frappe.get_route();
    if (route[0] === 'List' && route[1] === 'Attendance' && route[2] === 'Report') {
        console.log('Redirecting to Attendance Custom Report...');
        frappe.set_route('query-report', 'Attendance Custom Report');
    }
};

// Catch direct navigation or route changes immediately
frappe.router.on('change', () => {
    redirect_attendance_report();
});

// Also check immediately upon script load
$(document).ready(() => {
    redirect_attendance_report();
});

if (!frappe.listview_settings['Attendance']) {
    frappe.listview_settings['Attendance'] = {};
}

// Preserve existing onload if any (e.g. from HRMS)
const old_attendance_onload = frappe.listview_settings['Attendance'].onload;

Object.assign(frappe.listview_settings['Attendance'], {
    onload: function(listview) {
        if (old_attendance_onload) {
            old_attendance_onload.call(this, listview);
        }
        redirect_attendance_report();
        this.setup_redirect_interceptor(listview);
    },
    refresh: function(listview) {
        redirect_attendance_report();
    },
    setup_redirect_interceptor: function(listview) {
        // Intercept sidebar view switches (interceptor for UI actions)
        if (!listview.set_view_overridden) {
            const original_set_view = listview.set_view;
            listview.set_view = function (view) {
                if (view === 'Report') {
                    frappe.set_route('query-report', 'Attendance Custom Report');
                    return;
                }
                return original_set_view.call(this, view);
            };
            listview.set_view_overridden = true;
        }
    }
});
