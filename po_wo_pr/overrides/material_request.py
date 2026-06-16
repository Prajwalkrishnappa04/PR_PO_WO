import frappe

from erpnext.stock.doctype.material_request.material_request import (
	make_purchase_order as erpnext_make_purchase_order,
)


MR_ITEM_REQUIRED_BY_FIELD = "schedule_date"
PO_ITEM_REQUIRED_BY_FIELD = "schedule_date"


def _get_required_by_from_material_request_item(material_request_item):
	if not material_request_item:
		return None

	if not frappe.get_meta("Material Request Item").has_field(MR_ITEM_REQUIRED_BY_FIELD):
		return None

	return frappe.db.get_value(
		"Material Request Item",
		material_request_item,
		MR_ITEM_REQUIRED_BY_FIELD,
	)


def set_purchase_order_item_required_by(target_doc):
	if not target_doc or not frappe.get_meta("Purchase Order Item").has_field(PO_ITEM_REQUIRED_BY_FIELD):
		return target_doc

	for item in target_doc.get("items", []):
		required_by = _get_required_by_from_material_request_item(item.get("material_request_item"))

		# Keep ERPNext's mapped/default value when the linked MR Item has no date.
		if required_by:
			item.set(PO_ITEM_REQUIRED_BY_FIELD, required_by)

	return target_doc


@frappe.whitelist()
def make_purchase_order(source_name, target_doc=None, args=None):
	"""Create Purchase Order from Material Request with item Required By from MR Item.

	ERPNext maps the document first; this app then re-applies the item-level
	required date from the linked Material Request Item so the standard
	Material Request > Create > Purchase Order flow keeps row-wise dates.
	"""
	target_doc = erpnext_make_purchase_order(source_name, target_doc=target_doc, args=args)
	return set_purchase_order_item_required_by(target_doc)
