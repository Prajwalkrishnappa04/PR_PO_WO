frappe.query_reports["Pending Inward Documents"] = {
    filters: [],

    onload: function(report) {
        $("<style>")
            .text(`
                .query-report .dt-cell__content {
                    text-align: center !important;
                }
            `)
            .appendTo("head");
    },

    formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (column.fieldname === "whatsapp") {
            if (!data || !data.mobile_no) {
                return "";
            }

            let mobile = String(data.mobile_no).replace(/\D/g, "");

            if (mobile.length === 10) {
                mobile = "91" + mobile;
            }

            let message =`Dear ${data.sender},
			The following documents are pending:
			${data.pending_doc_str}
			Please submit the pending documents.
			Maa Foundation, Bhavnagar`;

			let url =
				"https://wa.me/" +
				mobile +
				"?text=" +
				encodeURIComponent(message);

            return `
                <a href="${url}"
                    target="_blank"
                    title="Send WhatsApp message"
                    style="font-size: 30px; color: #25D366;">
                    <i class="fa fa-whatsapp"></i>
                </a>
            `;
        }

        return value;
    }
};