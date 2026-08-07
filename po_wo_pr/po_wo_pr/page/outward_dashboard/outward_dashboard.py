import frappe
from frappe import _

@frappe.whitelist()
def outward_dashboard():
    monthly_records = frappe.db.sql("""
    SELECT
        m.month_name,
        COUNT(d.name) AS total
    FROM (
        SELECT 4 AS month_no, 'April' AS month_name
        UNION ALL SELECT 5, 'May'
        UNION ALL SELECT 6, 'June'
        UNION ALL SELECT 7, 'July'
        UNION ALL SELECT 8, 'August'
        UNION ALL SELECT 9, 'September'
        UNION ALL SELECT 10, 'October'
        UNION ALL SELECT 11, 'November'
        UNION ALL SELECT 12, 'December'
        UNION ALL SELECT 1, 'January'
        UNION ALL SELECT 2, 'February'
        UNION ALL SELECT 3, 'March'
    ) m
    LEFT JOIN `tabOutward Documents` d
        ON MONTH(d.creation) = m.month_no
    AND d.creation >= '2026-04-01'
    AND d.creation < '2027-04-01'
    GROUP BY m.month_no, m.month_name
    ORDER BY FIELD(
        m.month_name,
        'April','May','June','July','August','September',
        'October','November','December','January','February','March'
    );
        """,as_dict=True)

    district_by_volume = frappe.db.sql("""
        SELECT
        d.district,
        t.taluka,
        tv.townvillage,
        COUNT(*) AS total
    FROM `tabOutward Documents` od
    LEFT JOIN `tabDistrict` d
        ON od.district = d.name
    LEFT JOIN `tabTaluka` t
        ON od.taluka = t.name
    LEFT JOIN `tabTown Village` tv
        ON od.place = tv.name
    WHERE od.creation >= MAKEDATE(
            IF(MONTH(CURDATE()) >= 4, YEAR(CURDATE()), YEAR(CURDATE()) - 1),
            91
          )
      AND od.creation < DATE_ADD(
            MAKEDATE(
                IF(MONTH(CURDATE()) >= 4, YEAR(CURDATE()), YEAR(CURDATE()) - 1),
                91
            ),
            INTERVAL 1 YEAR
          )
    GROUP BY d.district, t.taluka, tv.townvillage
    ORDER BY total DESC
    """,as_dict=True)


    courier_partner = frappe.db.sql("""
        SELECT meduium, count(*) as `Total Documents` FROM `tabOutward Documents` GROUP BY meduium;
        """,as_dict=True)

    return {
        "monthly_records": monthly_records,
        "district_by_volume": district_by_volume,
        "courier_partner": courier_partner,
    }