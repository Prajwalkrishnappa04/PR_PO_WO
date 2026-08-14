frappe.ui.form.on("Leave Application", {
    make_dashboard: function (frm) {
        let leave_details;
        let lwps;

        if (frm.doc.employee) {
            frappe.call({
                method: "po_wo_pr.overrides.leave_application.get_leave_details",
                async: false,
                args: {
                    employee: frm.doc.employee,
                    date: frm.doc.from_date || frm.doc.posting_date,
                },
                callback: function (r) {
                    if (!r.exc && r.message["leave_allocation"]) {
                        leave_details = r.message["leave_allocation"];
                    }
                    lwps = r.message["lwps"];
                },
            });

            $("div").remove(".form-dashboard-section.custom");

            // build the table directly in JS instead of a server template
            let rows = "";
            for (const [key, value] of Object.entries(leave_details || {})) {
                let color = cint(value["remaining_leaves"]) > 0 ? "green" : "red";
                rows += `<tr>
                    <td>${key}</td>
                    <td class="text-right">${value["total_leaves"]}</td>
                    <td class="text-right">${value["expired_leaves"]}</td>
                    <td class="text-right">${value["leaves_taken"]}</td>
                    <td class="text-right">${value["half_days_taken"] || 0}</td>
                    <td class="text-right">${value["leaves_pending_approval"]}</td>
                    <td class="text-right" style="color:${color}">${value["remaining_leaves"]}</td>
                </tr>`;
            }

            let html = leave_details && Object.keys(leave_details).length
                ? `<table class="table table-bordered small">
                    <thead><tr>
                        <th>${__("Leave Type")}</th>
                        <th class="text-right">${__("Total Allocated Leaves")}</th>
                        <th class="text-right">${__("Expired Leaves")}</th>
                        <th class="text-right">${__("Used Leaves")}</th>
                        <th class="text-right">${__("Half Days")}</th>
                        <th class="text-right">${__("Leaves Pending Approval")}</th>
                        <th class="text-right">${__("Available Leaves")}</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                   </table>`
                : `<p style="margin-top:30px;">${__("No leaves have been allocated.")}</p>`;

            frm.dashboard.add_section(html, __("Allocated Leaves"));
            frm.dashboard.show();

            let allowed_leave_types = Object.keys(leave_details || {});
            allowed_leave_types = allowed_leave_types.concat(lwps);

            frm.set_query("leave_type", function () {
                return {
                    filters: [["leave_type_name", "in", allowed_leave_types]],
                };
            });
        }
    },
});