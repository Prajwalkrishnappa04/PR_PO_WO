frappe.listview_settings['Attendance'] = {
    onload(listview) {
        this.redirect_to_custom_report(listview);
    },
    refresh(listview) {
        this.redirect_to_custom_report(listview);
    },
    redirect_to_custom_report(listview) {
        // 1. Check if we are already on the Report view
        if (listview.view_name === 'Report') {
            console.log('Attendance Custom Report');
            frappe.set_route('query-report', 'Attendance Custom Report');
            return;
        }

        // 2. Intercept future view switches (one-time override)
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
};
