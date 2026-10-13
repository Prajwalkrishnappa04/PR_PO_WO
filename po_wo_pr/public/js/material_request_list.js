frappe.listview_settings['Material Request'] = {
    onload: function (listview) {
        listview.page.add_action_item(__('Cancel & Delete Selected'), function () {
            let selected_items = listview.get_checked_items();

            if (selected_items.length === 0) {
                frappe.msgprint(__('Please select at least one Material Request.'));
                return;
            }

            frappe.confirm(
                __('Are you sure you want to cancel and permanently delete {0} selected Material Request(s)?', [selected_items.length]),
                function () {
                    let names = selected_items.map(doc => doc.name);

                    frappe.call({
                        method: 'po_wo_pr.irs.api.cancel_and_delete_docs',
                        args: {
                            doctype: 'Material Request',
                            items: JSON.stringify(names)
                        },
                        freeze: true,
                        freeze_message: __('Cancelling and deleting Material Requests...'),
                        callback: function (r) {
                            if (r.message) {
                                let res = r.message;

                                if (res.success_count > 0) {
                                    frappe.show_alert({
                                        message: __('Successfully processed {0} Material Request(s).', [res.success_count]),
                                        indicator: 'green'
                                    });
                                }

                                if (res.failed_items && res.failed_items.length > 0) {
                                    frappe.msgprint({
                                        title: __('Partial Failure'),
                                        indicator: 'red',
                                        message: __('Could not delete: <br>') + res.failed_items.map(f => f.name + ': ' + f.error).join('<br>')
                                    });
                                }

                                listview.refresh();
                            }
                        }
                    });
                }
            );
        });
    }
};