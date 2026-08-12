frappe.query_reports["Pending Inward Documents"] = {
    filters: [],

    formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname === "whatsapp") {
            if (!data || !data.mobile_no) {
                return "";
            }

            let mobile = String(data.mobile_no).replace(/\D/g, "");

            // If mobile is a 10-digit Indian number
            if (mobile.length === 10) {
                mobile = "91" + mobile;
            }

            let message =`Dear ${data.sender},
			The following documents are pending:
			${data.pending_doc_str}
			Please submit the pending documents.
			Maa Foundatio, Bhavnagar`;

			let url =
				"https://wa.me/" +
				mobile +
				"?text=" +
				encodeURIComponent(message);

            return `
                <a href="${url}"
                   target="_blank"
                   title="Send WhatsApp message"
                   style="font-size: 20px;">
                    <i class="fa fa-whatsapp"></i>
                </a>
            `;
        }

        return value;
    }
};