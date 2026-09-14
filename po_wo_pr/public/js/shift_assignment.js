frappe.ui.form.on("Shift Assignment", {
    refresh(frm) {
        frm.toggle_display("custom_holiday", false);

        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Manage Locations'), function () {
                open_manage_locations_dialog(frm);
            }, __('Actions'));
        }
    }
});

function open_manage_locations_dialog(frm) {
    // Map existing child table rows
    let existing_locations = (frm.doc.custom_multiple_shift_location || []).map(row => {
        return {
            name: row.name,
            location: row.location,
            is_active: row.is_active
        };
    });

    let dialog = new frappe.ui.Dialog({
        title: __('Manage Shift Locations'),
        size: 'large',
        fields: [
            {
                label: __('Allow Multiple Shift Location'),
                fieldname: 'custom_allow_multiple_shift_location',
                fieldtype: 'Check',
                default: frm.doc.custom_allow_multiple_shift_location || 0
            },
            {
                fieldtype: 'Section Break'
            },
            {
                label: __('Locations'),
                fieldname: 'locations',
                fieldtype: 'Table',
                cannot_add_rows: false,
                in_place_edit: true,
                data: existing_locations,
                fields: [
                    {
                        fieldtype: 'Data',
                        fieldname: 'name',
                        label: __('Name'),
                        hidden: 1
                    },
                    {
                        fieldtype: 'Link',
                        fieldname: 'location',
                        label: __('Location'),
                        options: 'Shift Location',
                        in_list_view: 1,
                        reqd: 1
                    },
                    {
                        fieldtype: 'Check',
                        fieldname: 'is_active',
                        label: __('Is Active'),
                        default: 0,
                        in_list_view: 1
                    }
                ]
            }
        ],
        primary_action_label: __('Update Locations'),
        primary_action: function (values) {
            let locations = values.locations || [];

            frappe.call({
                method: 'po_wo_pr.irs.api.update_shift_locations',
                args: {
                    parent_doc: frm.doc.name,
                    allow_multiple_shift_location: values.custom_allow_multiple_shift_location ? 1 : 0,
                    locations: JSON.stringify(locations)
                },
                freeze: true,
                freeze_message: __('Updating Locations...'),
                callback: function (r) {
                    if (!r.exc) {
                        dialog.hide();
                        frappe.show_alert({
                            message: __('Shift locations updated successfully!'),
                            indicator: 'green'
                        });
                        frm.reload_doc();
                    }
                }
            });
        }
    });

    dialog.show();
}