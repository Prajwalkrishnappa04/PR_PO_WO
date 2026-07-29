// Keeps `custom_ref_enquiry_no` in sync with the `custom_our_enquiry_ref` multiselect
// while the user picks, mirroring po_wo_pr.overrides.enquiry_ref.build_ref_enquiry_no()
// which recomputes the same text on save.
const ENQUIRY_REF_PARENTS = [
    "Request for Quotation",
    "Supplier Quotation",
    "Purchase Order",
    "Purchase Receipt",
    "Purchase Invoice",
];

// one handler covers every parent form that embeds this child table
frappe.ui.form.on("RFQ Enquiry Reference", {
    enquiry_reference_no(frm) {
        build_ref_enquiry_no(frm);
    },
});

ENQUIRY_REF_PARENTS.forEach((doctype) => {
    frappe.ui.form.on(doctype, {
        // picking a chip in the multiselect fires the parent fieldname handler,
        // not the child's enquiry_reference_no -- so rebuild here too
        custom_our_enquiry_ref(frm) {
            build_ref_enquiry_no(frm);
        },
        custom_our_enquiry_ref_add(frm) {
            build_ref_enquiry_no(frm);
        },
        custom_our_enquiry_ref_remove(frm) {
            build_ref_enquiry_no(frm);
        },
    });
});

async function build_ref_enquiry_no(frm) {
    if (!frm.fields_dict.custom_ref_enquiry_no) return;

    const lines = [];

    for (const row of frm.doc.custom_our_enquiry_ref || []) {
        if (!row.enquiry_reference_no) continue;

        const r = await frappe.db.get_value(
            "Enquiry Reference No",
            row.enquiry_reference_no,
            ["person_name", "mobile_no"]
        );
        const person = (r && r.message) || {};
        const name = person.person_name || row.enquiry_reference_no;

        lines.push(`${name} : ${person.mobile_no || ""}`.trim());
    }

    frm.set_value("custom_ref_enquiry_no", lines.join("\n"));
}
