frappe.listview_settings["Purchase Order"] = {
	onload(listview) {
		// Reject selected Purchase Orders
		listview.page.add_action_item(__("Reject"), async function () {
			const selected = listview.get_checked_items();

			if (!selected || selected.length === 0) {
				frappe.msgprint(__("Please select at least one Purchase Order."));
				return;
			}

			// Check that all selected documents are Pending Approval
			const invalid = [];

			for (const row of selected) {
				const doc = await frappe.db.get_doc("Purchase Order", row.name);

				if (doc.workflow_state !== "Pending Approval") {
					invalid.push(
						`${row.name} (${doc.workflow_state || "No Workflow State"})`
					);
				}
			}

			if (invalid.length > 0) {
				frappe.msgprint({
					title: __("Cannot Reject"),
					message:
						__("Only Purchase Orders in Pending Approval can be rejected.") +
						"<br><br>" +
						invalid.join("<br>"),
					indicator: "red",
				});
				return;
			}

			// Confirmation
			frappe.confirm(
				__(
					"Are you sure you want to reject {0} selected Purchase Order(s)?",
					[selected.length]
				),
				async function () {
					frappe.show_progress(
						__("Rejecting Purchase Orders"),
						0,
						selected.length
					);

					let success = 0;
					let failed = [];

					for (const row of selected) {
						try {
							const doc = await frappe.db.get_doc(
								"Purchase Order",
								row.name
							);

							await frappe.xcall(
								"frappe.model.workflow.apply_workflow",
								{
									doc: doc,
									action: "Reject",
								}
							);

							success++;

							frappe.show_progress(
								__("Rejecting Purchase Orders"),
								success,
								selected.length
							);
						} catch (error) {
							failed.push(row.name);
							console.error(
								"Failed to reject Purchase Order:",
								row.name,
								error
							);
						}
					}

					frappe.hide_progress();

					if (failed.length > 0) {
						frappe.msgprint({
							title: __("Reject Completed with Errors"),
							message:
								__("Successfully rejected: {0}", [success]) +
								"<br>" +
								__("Failed: {0}", [failed.length]) +
								"<br><br>" +
								failed.join("<br>"),
							indicator: "orange",
						});
					} else {
						frappe.show_alert({
							message: __(
								"{0} Purchase Order(s) rejected successfully.",
								[success]
							),
							indicator: "green",
						});
					}

					listview.refresh();
				}
			);
		});

		// Cancel selected Purchase Orders
		listview.page.add_action_item(__("Cancel"), async function () {
			const selected = listview.get_checked_items();

			if (!selected || selected.length === 0) {
				frappe.msgprint(__("Please select at least one Purchase Order."));
				return;
			}

			// Check that all selected documents are Approved
			const invalid = [];

			for (const row of selected) {
				const doc = await frappe.db.get_doc("Purchase Order", row.name);

				if (doc.workflow_state !== "Approved") {
					invalid.push(
						`${row.name} (${doc.workflow_state || "No Workflow State"})`
					);
				}
			}

			if (invalid.length > 0) {
				frappe.msgprint({
					title: __("Cannot Cancel"),
					message:
						__("Only Purchase Orders in Approved state can be cancelled.") +
						"<br><br>" +
						invalid.join("<br>"),
					indicator: "red",
				});
				return;
			}

			// Confirmation
			frappe.confirm(
				__(
					"Are you sure you want to cancel {0} selected Purchase Order(s)?",
					[selected.length]
				),
				async function () {
					frappe.show_progress(
						__("Cancelling Purchase Orders"),
						0,
						selected.length
					);

					let success = 0;
					let failed = [];

					for (const row of selected) {
						try {
							const doc = await frappe.db.get_doc(
								"Purchase Order",
								row.name
							);

							await frappe.xcall(
								"frappe.model.workflow.apply_workflow",
								{
									doc: doc,
									action: "Cancel",
								}
							);

							success++;

							frappe.show_progress(
								__("Cancelling Purchase Orders"),
								success,
								selected.length
							);
						} catch (error) {
							failed.push(row.name);
							console.error(
								"Failed to cancel Purchase Order:",
								row.name,
								error
							);
						}
					}

					frappe.hide_progress();

					if (failed.length > 0) {
						frappe.msgprint({
							title: __("Cancel Completed with Errors"),
							message:
								__("Successfully cancelled: {0}", [success]) +
								"<br>" +
								__("Failed: {0}", [failed.length]) +
								"<br><br>" +
								failed.join("<br>"),
							indicator: "orange",
						});
					} else {
						frappe.show_alert({
							message: __(
								"{0} Purchase Order(s) cancelled successfully.",
								[success]
							),
							indicator: "green",
						});
					}

					listview.refresh();
				}
			);
		});
	},
};