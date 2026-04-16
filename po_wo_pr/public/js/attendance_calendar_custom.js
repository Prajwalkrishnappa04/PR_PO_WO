console.log("Custom Attendance Calendar Load Attempt (v3)...");

const setup_custom_attendance_calendar = () => {
	console.log("Applying Custom Attendance Calendar Configuration (v3)");
	
	// Clear any existing configuration first
	delete frappe.views.calendar["Attendance"];

	frappe.views.calendar["Attendance"] = {
		field_map: {
			start: "attendance_date",
			end: "attendance_date",
			id: "name",
			title: "employee_name", // Changed from "title" to "employee_name" to ensure standard field is used
		},

		get_css_class: function (data) {
			if (data.doctype === "Holiday") return "blue";

			if (data.doctype === "Attendance") {
				if (data.status === "Absent") return "red";
				if (data.status === "Half Day") return "yellow";
				if (data.status === "Present") return "green";
				if (data.status === "On Leave") return "gray";
				if (data.status === "Work From Home") return "purple";
				return "green";
			}
		},

		options: {
			editable: false, // Prevent dragging and changing the date
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
	console.log("Configuration Applied Successfully (v3)");
};

// Apply immediately
setup_custom_attendance_calendar();

// Re-apply on every page change to ensure it wins against core scripts
$(document).on('page-change', function() {
	if (frappe.get_route()[0] === 'List' && frappe.get_route()[1] === 'Attendance') {
		setup_custom_attendance_calendar();
	}
});

function render_attendance_legend() {
	if ($('.attendance-calendar-legend').length) return;

	const legend_html = `
		<div class="attendance-calendar-legend"
			style="display:flex;gap:20px;margin-bottom:15px;padding:10px;border-bottom:1px solid #d1d8dd;flex-wrap:wrap;background-color:#f8f9fa;border-radius:4px;clear:both;">

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#28a745;display:inline-block;"></span>
				<span style="font-weight:500;">Present</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#dc3545;display:inline-block;"></span>
				<span style="font-weight:500;">Absent</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#ffc107;display:inline-block;"></span>
				<span style="font-weight:500;">Half Day</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#6c757d;display:inline-block;"></span>
				<span style="font-weight:500;">On Leave</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#6f42c1;display:inline-block;"></span>
				<span style="font-weight:500;">Work From Home</span>
			</div>

			<div style="display:flex;align-items:center;gap:8px;">
				<span style="width:14px;height:14px;border-radius:50%;background:#007bff;display:inline-block;"></span>
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
