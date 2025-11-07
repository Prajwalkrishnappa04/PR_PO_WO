frappe.listview_settings['Inward Document'] = {
    onload(listview) {
        listview.page.add_action_item(__("Create Outward Action"), function () {
            let selected = listview.get_checked_items(true);
            if (!selected.length) {
                frappe.msgprint(__("Please select at least one document."));
                return;
            }
            console.log("selected:", selected)
            frappe.call({
                method: "po_wo_pr.irs.api.bulk_inward_to_outward",
                args: {
                    docnames: selected
                },
                callback: function (r) {
                    if (r.message) {
                        frappe.msgprint(__("Outward documents created successfully."));
                        listview.refresh();
                    }
                }
            });
        });
    }
};
