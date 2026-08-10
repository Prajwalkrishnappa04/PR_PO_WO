// Copyright (c) 2026, Hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicle Customization", {
	refresh(frm) {
		calculate_fuel_amount(frm);
	},

	fuel_qty(frm) {
		calculate_fuel_amount(frm);
	},

	price(frm) {
		calculate_fuel_amount(frm);
	}
});

function calculate_fuel_amount(frm) {
	let fuel_qty = flt(frm.doc.fuel_qty);
	let price = flt(frm.doc.price);

	frm.set_value("fuel_amount", fuel_qty * price);
}
