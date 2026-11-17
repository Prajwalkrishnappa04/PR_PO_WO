"""Backfill transit_record / transit_status on Outward Documents that already have a transit.

Outward Documents only started mirroring their Inward Outward Transit's status
once the fields were added, so transits created before that need a one-off copy.
"""

import frappe


def execute():
	if not frappe.db.has_column("Outward Documents", "transit_status"):
		return

	transits = frappe.get_all(
		"Inward Outward Transit",
		filters={"outward_reference": ["is", "set"]},
		fields=["name", "outward_reference", "status"],
		order_by="creation asc",
	)

	for t in transits:
		frappe.db.set_value(
			"Outward Documents",
			t.outward_reference,
			{"transit_record": t.name, "transit_status": t.status},
			update_modified=False,
		)

	frappe.db.commit()
	print("backfill_outward_transit_status: updated %d record(s)." % len(transits))
