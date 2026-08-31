frappe.listview_settings["Purchase Order"] = {
	onload(listview) {
		// Only show these actions to users who can actually submit workflow transitions
		if (frappe.user.has_role(["Purchase Manager", "System Manager"])) {
			listview.page.add_action_item(__("Reject"), () =>
				handle_workflow_action(listview, {
					action: "Reject",
					required_state: "Pending Approval",
					confirm_msg: "Are you sure you want to reject {0} selected Purchase Order(s)?",
					progress_title: "Rejecting Purchase Orders",
					success_msg: "{0} Purchase Order(s) rejected successfully.",
					error_title: "Reject Completed with Errors",
					invalid_title: "Cannot Reject",
					invalid_msg: "Only Purchase Orders in Pending Approval can be rejected.",
				})
			);

			listview.page.add_action_item(__("Cancel"), () =>
				handle_workflow_action(listview, {
					action: "Cancel",
					required_state: "Approved",
					confirm_msg: "Are you sure you want to cancel {0} selected Purchase Order(s)?",
					progress_title: "Cancelling Purchase Orders",
					success_msg: "{0} Purchase Order(s) cancelled successfully.",
					error_title: "Cancel Completed with Errors",
					invalid_title: "Cannot Cancel",
					invalid_msg: "Only Purchase Orders in Approved state can be cancelled.",
				})
			);
		}
	},
};

async function handle_workflow_action(listview, opts) {
	const {
		action,
		required_state,
		confirm_msg,
		progress_title,
		success_msg,
		error_title,
		invalid_title,
		invalid_msg,
	} = opts;

	const selected = listview.get_checked_items();

	if (!selected || selected.length === 0) {
		frappe.msgprint(__("Please select at least one Purchase Order."));
		return;
	}

	// Fetch every selected doc once, in parallel, and reuse it for both
	// validation and the workflow call. Guard against individual fetch
	// failures (deleted doc, permission error, etc.) so one bad row
	// doesn't blow up the whole handler.
	const fetches = await Promise.all(
		selected.map(async (row) => {
			try {
				const doc = await frappe.db.get_doc("Purchase Order", row.name);
				return { name: row.name, doc, error: null };
			} catch (error) {
				return { name: row.name, doc: null, error };
			}
		})
	);

	const fetch_failed = fetches.filter((f) => f.error);
	if (fetch_failed.length > 0) {
		frappe.msgprint({
			title: __("Could Not Load Some Purchase Orders"),
			message: fetch_failed.map((f) => f.name).join("<br>"),
			indicator: "red",
		});
		return;
	}

	// Validate workflow state
	const invalid = fetches.filter((f) => f.doc.workflow_state !== required_state);

	if (invalid.length > 0) {
		frappe.msgprint({
			title: __(invalid_title),
			message:
				__(invalid_msg) +
				"<br><br>" +
				invalid
					.map((f) => `${f.name} (${f.doc.workflow_state || __("No Workflow State")})`)
					.join("<br>"),
			indicator: "red",
		});
		return;
	}

	frappe.confirm(__(confirm_msg, [selected.length]), async function () {
		frappe.show_progress(__(progress_title), 0, fetches.length);

		let success = 0;
		const failed = [];

		// Sequential on purpose: apply_workflow triggers doc-level hooks and
		// notifications server-side, so we avoid hammering the server with
		// a burst of parallel writes on large selections.
		for (const { name, doc } of fetches) {
			try {
				await frappe.xcall("frappe.model.workflow.apply_workflow", {
					doc,
					action,
				});
				success++;
			} catch (error) {
				failed.push(name);
				console.error(`Failed to ${action.toLowerCase()} Purchase Order:`, name, error);
			} finally {
				frappe.show_progress(__(progress_title), success + failed.length, fetches.length);
			}
		}

		frappe.hide_progress();

		if (failed.length > 0) {
			frappe.msgprint({
				title: __(error_title),
				message:
					__("Successfully processed: {0}", [success]) +
					"<br>" +
					__("Failed: {0}", [failed.length]) +
					"<br><br>" +
					failed.join("<br>"),
				indicator: "orange",
			});
		} else {
			frappe.show_alert({
				message: __(success_msg, [success]),
				indicator: "green",
			});
		}

		listview.refresh();
	});
}