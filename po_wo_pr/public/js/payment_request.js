frappe.ui.form.on("Payment Request", {
    refresh(frm) {
        set_amount_in_words(frm);
    },

    grand_total(frm) {
        set_amount_in_words(frm);
    }
});

function set_amount_in_words(frm) {
    if (!frm.doc.grand_total) {
        frm.set_value("custom_amount_in_words", "");
        return;
    }

    const words = numberToWords(frm.doc.grand_total);
    const currency = frm.doc.currency || frappe.boot.sysdefaults.currency || "USD";

    frm.set_value("custom_amount_in_words", `${currency} ${words} Only`);
}

function numberToWords(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    num = num.toString().split('.');
    let n = num[0];
    let cents = num[1] ? num[1].substring(0, 2) : '00';

    if ((n = n.toString()).length > 9) return 'overflow';
    let str = '';
    let digits = ('000000000' + n).substr(-9);

    let billions = Number(digits.substr(0, 3));
    let millions = Number(digits.substr(3, 3));
    let thousands = Number(digits.substr(6, 3));

    if (billions) str += (a[billions] || b[Math.floor(billions / 10)] + ' ' + a[billions % 10]) + 'Billion ';
    if (millions) str += (a[millions] || b[Math.floor(millions / 10)] + ' ' + a[millions % 10]) + 'Million ';
    if (thousands) str += (a[thousands] || b[Math.floor(thousands / 10)] + ' ' + a[thousands % 10]) + 'Thousand ';

    let hundred = Number(digits.substr(6, 3)) % 1000;
    if (hundred) {
        let h = Math.floor(hundred / 100);
        let remainder = hundred % 100;
        if (h) str += a[h] + 'Hundred ';
        if (remainder) str += (a[remainder] || b[Math.floor(remainder / 10)] + ' ' + a[remainder % 10]);
    }

    if (cents > 0) {
        str += `and ${cents}/100`;
    }

    return str.trim();
}

frappe.ui.form.on("Payment Request", {
    onload(frm) {
        set_gl_code_filter(frm);
    },

    refresh(frm) {
        set_gl_code_filter(frm);
    },

    cost_center(frm) {
        if (!frm.doc.cost_center) {
            frm.allowed_gl_codes = [];
            frm.set_value("custom_gl_code", "");
            set_gl_code_filter(frm);
            return;
        }

        frappe.db.get_doc("Cost Center", frm.doc.cost_center).then(doc => {
            let gl_list = (doc.custom_cost_center_details || [])
                .map(row => row.gl_name)
                .filter(Boolean);

            gl_list = [...new Set(gl_list)];

            frm.allowed_gl_codes = gl_list;

            if (
                frm.doc.custom_gl_code &&
                !gl_list.includes(frm.doc.custom_gl_code)
            ) {
                frm.set_value("custom_gl_code", "");
            }

            set_gl_code_filter(frm);
        });
    }
});


function set_gl_code_filter(frm) {
    frm.set_query("custom_gl_code", function () {

        if (
            !frm.allowed_gl_codes ||
            !frm.allowed_gl_codes.length
        ) {
            return {
                filters: [
                    ["Account", "name", "=", ""]
                ]
            };
        }

        return {
            filters: [
                ["Account", "name", "in", frm.allowed_gl_codes]
            ]
        };
    });
}