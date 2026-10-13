frappe.listview_settings['Material Request'] = {
    refresh: function (listview) {
        // Use add_menu_item or standard bulk action handling if you want it under Actions
        // Or check selection state dynamically
    },

    // This event fires whenever checkboxes are ticked/unticked in the list view
    on_row_checked: function (listview) {
        let selected_docs = listview.get_checked_items();

        // You can toggle button visibility or custom menu items here
        if (selected_docs.length > 0) {
            // Ensure the action is available when items are checked
            if (!listview.page.wrapper.find('.custom-delete-action').length) {
                listview.page.add_action_item(__('Cancel & Delete'), function () {
                    let docs = listview.get_checked_items();
                    if (!docs.length) return;

                    frappe.confirm(
                        __('Are you sure you want to cancel and permanently delete {0} selected Material Request(s)?', [docs.length]),
                        function () {
                            let names = docs.map(d => d.name);
                            frappe.call({
                                method: "po_wo_pr.irs.api.cancel_and_delete_docs",
                                args: {
                                    doctype: "Material Request",
                                    items: JSON.stringify(names)
                                },
                                callback: function (r) {
                                    if (!r.exc) {
                                        listview.refresh();
                                        frappe.show_alert({
                                            message: __('Successfully processed selected records'),
                                            indicator: 'green'
                                        });
                                    }
                                }
                            });
                        }
                    );
                }).addClass('custom-delete-action');
            }
        }
    }
};