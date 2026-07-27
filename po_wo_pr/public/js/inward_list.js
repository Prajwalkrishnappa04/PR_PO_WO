frappe.listview_settings['Inward Document'] = {
    // Color the Application Status column (Accept=green, Reject=red, Pending=orange).
    // Keep this in the SAME object as onload — a second
    // `frappe.listview_settings['Inward Document'] = {...}` would overwrite it.
    formatters: {
        application_status(value) {
            if (!value) return "";
            const color = {
                "Accept": "green",
                "Reject": "red",
                "Repeat Reject": "red",
                "Pending": "orange",
            }[value] || "gray";
            return `<span class="indicator-pill ${color} filterable ellipsis"
                data-filter="application_status,=,${value}">
                <span class="ellipsis">${__(value)}</span>
            </span>`;
        },
    },

    onload(listview) {
        if (frappe.session.user !== "Administrator") {
            frappe.db.get_value("Employee", { user_id: frappe.session.user }, "name").then(r => {
                if (r.message && r.message.name) {
                    listview.filter_area.add([
                        ["Inward Document", "concern_person", "=", r.message.name]
                    ]);
                }
            });
        }

        listview.page.add_action_item(__("Create Outward Action"), function () {
            let selected = listview.get_checked_items(true);

            if (!selected.length) {
                frappe.msgprint(__("Please select at least one document."));
                return;
            }

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
                        fieldtype: "Data",
                        default: "https://trackcourier.io/track-and-trace/tirupati-courier/",
                    },
                    {
                        label: "Postal Date",
                        fieldname: "date",
                        fieldtype: "Date"
                    }
                ],
                primary_action_label: __("Submit"),
                primary_action(values) {
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
