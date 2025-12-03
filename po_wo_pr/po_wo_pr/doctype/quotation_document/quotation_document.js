// Copyright (c) 2025, Hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Quotation Document", {
    refresh(frm) {
        show_preview(frm);
    },
    attach_file(frm) {
        show_preview(frm);
    }
});

function show_preview(frm) {
    const fieldname = "attach_file";
    const file_url = frm.doc[fieldname];
    frm.get_field("preview_html").$wrapper.empty();

    if (!file_url) return;
    let ext = file_url.split('.').pop().toLowerCase();

    let wrapper = frm.get_field("preview_html").$wrapper;
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
        wrapper.html(`<img src="${file_url}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px;" />`);
    }

    else if (ext === "pdf") {
        wrapper.html(`
            <embed src="${file_url}" type="application/pdf" width="100%" height="500px" />
        `);
    }
    else {
        wrapper.html(`
            <a href="${file_url}" target="_blank">${file_url}</a>
        `);
    }
}