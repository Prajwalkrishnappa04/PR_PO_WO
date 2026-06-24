console.log("Custom Attendance Calendar Load Attempt (v8)...");

const setup_custom_attendance_calendar = () => {
	console.log("Applying Custom Attendance Calendar Configuration (v8)");

	frappe.views.calendar["Attendance"] = Object.assign(
		frappe.views.calendar["Attendance"] || {},
		{
			field_map: {
				start: "attendance_date",
				end: "attendance_date",
				id: "name",
				title: "title",
				allDay: "allDay"
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

			options: Object.assign(
				(frappe.views.calendar["Attendance"] || {}).options || {},
				{
					editable: false,

					header: {
						left: "next today",
						center: "title",
						right: "month",
					},

					// ✅ FIX: Proper date parsing so events don't stack on today
					eventRender: function (event, element) {

						if (event.start && typeof event.start === "string") {
							event.start = frappe.datetime.str_to_obj(event.start);
						}
						if (event.end && typeof event.end === "string") {
							event.end = frappe.datetime.str_to_obj(event.end);
						}

						// color logic (unchanged)
						if (event.className) {
							element.removeClass("red yellow green gray purple blue");

							if (Array.isArray(event.className)) {
								event.className.forEach(cls => element.addClass(cls));
							} else {
								element.addClass(event.className);
							}
						}
					},

					eventAfterAllRender: function () {
						render_attendance_legend();
						inject_attendance_styles();
						hide_default_legend();
					}
				}
			),

			get_events_method: "hrms.hr.doctype.attendance.attendance.get_events",
		}
	);

	console.log("Configuration Applied Successfully (v8)");
};


// Apply immediately
setup_custom_attendance_calendar();


// Re-apply on page change
$(document).on('page-change', function () {
	if (frappe.get_route()[0] === 'List' && frappe.get_route()[1] === 'Attendance') {
		setup_custom_attendance_calendar();
	}
});


// ✅ Custom legend (unchanged)
function render_attendance_legend() {
	if ($('.attendance-calendar-legend').length) return;

	const legend_html = `
		<div class="attendance-calendar-legend"
			style="display:flex;gap:20px;margin-bottom:15px;padding:10px;border-bottom:1px solid #d1d8dd;flex-wrap:wrap;background-color:#f8f9fa;border-radius:4px;clear:both;">

			<div><span style="background:#28a745;width:14px;height:14px;border-radius:50%;display:inline-block;"></span> Present</div>
			<div><span style="background:#dc3545;width:14px;height:14px;border-radius:50%;display:inline-block;"></span> Absent</div>
			<div><span style="background:#ffc107;width:14px;height:14px;border-radius:50%;display:inline-block;"></span> Half Day</div>
			<div><span style="background:#6c757d;width:14px;height:14px;border-radius:50%;display:inline-block;"></span> On Leave</div>
			<div><span style="background:#6f42c1;width:14px;height:14px;border-radius:50%;display:inline-block;"></span> Work From Home</div>
			<div><span style="background:#007bff;width:14px;height:14px;border-radius:50%;display:inline-block;"></span> Holiday</div>
		</div>
	`;

	const $header = $('.fc-toolbar');
	if ($header.length) {
		$header.after(legend_html);
	}
}


// ✅ Hide default legend
function hide_default_legend() {
	$('.calendar-legend').hide();
}


// ✅ Inject styles
function inject_attendance_styles() {
	if ($('#attendance-calendar-styles').length) return;

	const style_html = `
		<style id="attendance-calendar-styles">

		/* EVENT COLORS */
		.fc .fc-event.red { background:#dc3545 !important; border-color:#dc3545 !important; color:#fff !important; }
		.fc .fc-event.green { background:#28a745 !important; border-color:#28a745 !important; color:#fff !important; }
		.fc .fc-event.yellow { background:#ffc107 !important; border-color:#ffc107 !important; color:#000 !important; }
		.fc .fc-event.gray { background:#6c757d !important; border-color:#6c757d !important; color:#fff !important; }
		.fc .fc-event.purple { background:#6f42c1 !important; border-color:#6f42c1 !important; color:#fff !important; }
		.fc .fc-event.blue { background:#007bff !important; border-color:#007bff !important; color:#fff !important; }

		/* HEADER */
		.fc-toolbar {
			background:#007bff !important;
			color:#fff !important;
			padding:8px 12px;
			border-radius:6px;
		}

		.fc-toolbar h2 {
			color:#fff !important;
			font-weight:600;
		}

		.fc-button {
			background:#0056b3 !important;
			border:none !important;
			color:#fff !important;
		}

		.fc-button:hover {
			background:#004494 !important;
		}

		/* DAY HEADER */
		.fc-day-header {
			background:#f1f3f5 !important;
			font-weight:600;
		}

		</style>
	`;

	$('head').append(style_html);
}