frappe.listview_settings['Inward Document'] = {
    onload(listview) {
        listview.page.add_action_item(__("Create Outward Action"), function () {
            let selected = listview.get_checked_items(true);

            if (!selected.length) {
                frappe.msgprint(__("Please select at least one document."));
                return;
            }

            // Open a dialog popup
            let d = new frappe.ui.Dialog({
                title: __("Create Outward Action"),
                fields: [
                    {
                        label: "Document Name",
                        fieldname: "doc_name",
                        fieldtype: "Data"
                    },
                    {
                        label: "Postal Service URL",
                        fieldname: "postal_url",
                        fieldtype: "Data"
                    },
                    {
                        label: "Postal Date",
                        fieldname: "date",
                        fieldtype: "Date"
                    }
                ],
                primary_action_label: __("Submit"),
                primary_action(values) {
                    // Call backend method here
                    frappe.call({
                        method: "po_wo_pr.irs.api.bulk_inward_to_outward",
                        args: {
                            docnames: selected,
                            extra_data: values
                        },
                        callback(r) {
                            if (r.message) {
                                frappe.msgprint(__("Outward documents created successfully."));
                                listview.refresh();
                                d.hide();
                            }
                        }
                    });
                }
            });

            d.show();
        });
    }
};
