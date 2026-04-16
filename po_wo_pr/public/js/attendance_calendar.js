frappe.views.calendar["Attendance"] = {
	field_map: {
		start: "attendance_date",
		end: "attendance_date",
		id: "name",
		title: "title",
		allDay: "allDay",
		color: "color",
	},
	get_css_class: function (data) {
		if (data.doctype === "Holiday") return "blue"; // Standard color
		else if (data.doctype === "Attendance") {
			if (data.status === "Absent") return "danger"; // Standard class (red)
			if (data.status === "Half Day") return "yellow"; // Standard color
			if (data.status === "Present") return "success"; // Standard class (green)
			if (data.status === "On Leave") return "gray"; // Standard color
			if (data.status === "Work From Home") return "purple"; // Standard color
			return "success";
		}
	},
	options: {
		header: {
			left: "prev,next today",
			center: "title",
			right: "month",
		},
		eventAfterAllRender: function() {
			render_attendance_legend();
		}
	},
	get_events_method: "hrms.hr.doctype.attendance.attendance.get_events",
};

function render_attendance_legend() {
	if ($('.attendance-calendar-legend').length) return;
	
	const legend_html = `
		<div class="attendance-calendar-legend" style="display: flex; gap: 20px; margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #d1d8dd; flex-wrap: wrap; background-color: #f8f9fa; border-radius: 4px; clear: both;">
			<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 50%; background-color: #28a745; display: inline-block;"></span> <span style="font-weight: 500;">Present</span></div>
			<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 50%; background-color: #dc3545; display: inline-block;"></span> <span style="font-weight: 500;">Absent</span></div>
			<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 50%; background-color: #ffc107; display: inline-block;"></span> <span style="font-weight: 500;">Half Day</span></div>
			<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 50%; background-color: #6c757d; display: inline-block;"></span> <span style="font-weight: 500;">On Leave</span></div>
			<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 50%; background-color: #6f42c1; display: inline-block;"></span> <span style="font-weight: 500;">Work From Home</span></div>
			<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 14px; height: 14px; border-radius: 50%; background-color: #007bff; display: inline-block;"></span> <span style="font-weight: 500;">Holiday</span></div>
		</div>
	`;
	
	// Inject after the header
	const $header = $('.fc-toolbar');
	if ($header.length) {
		$header.after(legend_html);
	}
}
