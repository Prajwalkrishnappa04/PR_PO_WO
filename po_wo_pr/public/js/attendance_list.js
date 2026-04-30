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
        this.redirect_to_custom_report(listview);
    },
    refresh: function(listview) {
        this.redirect_to_custom_report(listview);
    },
    redirect_to_custom_report: function(listview) {
        const redirect = () => {
            const route = frappe.get_route();
            if (route[0] === 'List' && route[1] === 'Attendance' && route[2] === 'Report') {
                console.log('Redirecting to Attendance Custom Report...');
                frappe.set_route('query-report', 'Attendance Custom Report');
            }
        };

        // 1. Initial check (if landed directly on Report view)
        redirect();

        // 2. Intercept sidebar view switches (interceptor for UI actions)
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

        // 3. Catch direct URL changes or other navigation methods (Router Hook)
        if (!window.attendance_route_listener_set) {
            frappe.router.on('change', () => {
                redirect();
            });
            window.attendance_route_listener_set = true;
        }
    }
});
