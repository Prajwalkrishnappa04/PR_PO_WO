frappe.listview_settings['Material Request'] = {
    refresh: function (listview) {
        // Add the action item to the Actions dropdown menu on list view load
        listview.page.add_action_item(__('Cancel & Delete'), function () {
            let selected_docs = listview.get_checked_items();

            if (!selected_docs || selected_docs.length === 0) {
                frappe.msgprint({
                    title: __('No Selection'),
                    indicator: 'orange',
                    message: __('Please select at least one Material Request from the list view checkboxes first.')
                });
                return;
            }

            frappe.confirm(
                __('Are you sure you want to cancel and permanently delete {0} selected Material Request(s)?', [selected_docs.length]),
                function () {
                    let names = selected_docs.map(d => d.name);

                    frappe.call({
                        method: "po_wo_pr.irs.api.cancel_and_delete_docs",
                        args: {
                            doctype: "Material Request",
                            items: JSON.stringify(names)
                        },
                        callback: function (r) {
                            if (!r.exc) {
                                listview.refresh();
                                let res = r.message || {};

                                if (res.failed_items && res.failed_items.length > 0) {
                                    frappe.msgprint({
                                        title: __('Partial Success'),
                                        indicator: 'orange',
                                        message: __('Successfully processed records, but some failed.')
                                    });
                                } else {
                                    frappe.show_alert({
                                        message: __('Successfully cancelled and deleted selected records'),
                                        indicator: 'green'
                                    });
                                }
                            }
                        }
                    });
                }
            );
        });
    }
};