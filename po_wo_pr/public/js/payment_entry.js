frappe.ui.form.on("Payment Entry", {
	refresh(frm) {
		set_branch_query(frm);
	},
	onload(frm) {
		set_branch_query(frm);
	},
	custom_bank_city(frm) {
		frm.set_value("custom_branch", null);
		set_branch_query(frm);
	}
});

function set_branch_query(frm) {
	frm.set_query("custom_branch", () => {
		if (!frm.doc.custom_bank_city) {
			return {};
		}

		return {
			filters: {
				custom_bank_city: frm.doc.custom_bank_city
			}
		};
	});
}
