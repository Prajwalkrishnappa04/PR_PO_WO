frappe.listview_settings['Inward Outward Transit'] = {
    onload: function (listview) {
        listview.page.add_action_item(__('Receive Selected'), function () {
            let selected_docs = listview.get_checked_items();
            if (selected_docs.length === 0) {
                frappe.msgprint(__('Please select transit records to receive.'));
                return;
            }

            let dialog = new frappe.ui.Dialog({
                title: __('Receive Transit Items'),
                fields: [
                    {
                        label: __('Date of Receiving'),
                        fieldname: 'receiving_date',
                        fieldtype: 'Date',
                        reqd: 1,
                        default: frappe.datetime.get_today()
                    }
                ],
                primary_action_label: __('Receive'),
                primary_action: function (values) {
                    frappe.call({
                        method: 'po_wo_pr.irs.api.receive_transit_to_inward',
                        args: {
                            transit_names: selected_docs.map(d => d.name),
                            receiving_date: values.receiving_date
                        },
                        freeze: true,
                        freeze_message: __('Processing transit items...'),
                        callback: function (r) {
                            if (!r.exc) {
                                dialog.hide();
                                frappe.show_alert({
                                    message: __('Inward Document(s) created successfully.'),
                                    indicator: 'green'
                                });
                                listview.refresh();
                            }
                        }
                    });
                }
            });

            dialog.show();
        });
    }
};