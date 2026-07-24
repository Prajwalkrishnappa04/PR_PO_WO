frappe.provide("frappe.dashboards.chart_sources");

frappe.dashboards.chart_sources["Branchwise Attendance Rate"] = {
    method:
        "po_wo_pr.maa_foundation_hr_customization.dashboard_chart_source.branchwise_attendance_rate.branchwise_attendance_rate.get_branch_attendance_chart"
};