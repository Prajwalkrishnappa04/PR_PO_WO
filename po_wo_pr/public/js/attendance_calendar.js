frappe.views.calendar["Attendance"] = {
	field_map: {
		start: "attendance_date",
		end: "attendance_date",
		id: "name",
		title: "title",
		allDay: "allDay",
	},

	get_css_class: function (data) {
		if (data.doctype === "Holiday") return "info";

		if (data.doctype === "Attendance") {
			if (data.status === "Absent") return "danger";
			if (data.status === "Half Day") return "warning";
			if (data.status === "Present") return "success";
			if (data.status === "On Leave") return "secondary";
			if (data.status === "Work From Home") return "primary";
			return "success";
		}
	},

	options: {
		header: {
			left: "prev,next today",
			center: "title",
			right: "month",
		},

		eventAfterAllRender: function () {
			render_attendance_legend();
		}
	},

	get_events_method: "hrms.hr.doctype.attendance.attendance.get_events",
};


function render_attendance_legend() {
	// prevent duplicate legend
	if ($('.attendance-calendar-legend').length) return;

	const legend_html = `
		<div class="attendance-calendar-legend"
			style="display:flex;gap:20px;margin-bottom:15px;padding:10px;border-bottom:1px solid #d1d8dd;flex-wrap:wrap;background-color:#f8f9fa;border-radius:4px;clear:both;">

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#28a745;"></span>
				<span style="font-weight:500;">Present</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#dc3545;"></span>
				<span style="font-weight:500;">Absent</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#ffc107;"></span>
				<span style="font-weight:500;">Half Day</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#6c757d;"></span>
				<span style="font-weight:500;">On Leave</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#007bff;"></span>
				<span style="font-weight:500;">Work From Home</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#17a2b8;"></span>
				<span style="font-weight:500;">Holiday</span>
			</div>

		</div>
	`;

	// inject legend below calendar header
	const $header = $('.fc-toolbar');
	if ($header.length) {
		$header.after(legend_html);
	}
}