frappe.pages['inward-dashboard'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Inward Document Dashboard",
		single_column: true
	});

	new InwardDashboard(page);
};

class InwardDashboard {
	constructor(page) {
		this.page = page;

		// Project Filter
		this.project = this.page.add_field({
			label: __("Project"),
			fieldname: "project",
			fieldtype: "Link",
			options: "IRS Project",
			change: () => {
				this.load_subjects();
				this.load_subject_pie_chart();
				this.refresh();
			}
		});

		// Subject Filter
		this.subject = this.page.add_field({
			label: __("Subject"),
			fieldname: "subject",
			fieldtype: "Select",
			options: [""],
			change: () => this.refresh()
		});

		// Month Filter (dropdown of month names)
		this.month = this.page.add_field({
			label: __("Month"),
			fieldname: "month",
			fieldtype: "Select",
			options: [
				"", "January", "February", "March", "April", "May", "June",
				"July", "August", "September", "October", "November", "December"
			],
			change: () => this.refresh()
		});

		// Academic Year Filter
		this.academic_year = this.page.add_field({
			label: __("Academic Year"),
			fieldname: "academic_year",
			fieldtype: "Link",
			options: "Academic Year",
			change: () => this.refresh()
		});

		this.body = $(`
			<div class="inward-dashboard">
				<div class="cards-row" style="display:flex;gap:16px;margin-bottom:20px;"></div>

				<div class="charts-row" style="display:flex;flex-wrap:wrap;gap:24px;">

					<div class="chart-box" id="status-chart" style="width:45%;"></div>

					<div class="chart-box" id="workflow-chart" style="width:45%;"></div>

					<div class="chart-box" id="medium-chart" style="width:45%;"></div>
					<div class="chart-box" id="rejection-chart" style="width:45%;"></div>
					<div class="chart-box" id="missing-docs-chart" style="width:45%;"></div>

					<div class="chart-box" id="location-chart" style="width:45%;">
						<select id="location-level" style="margin-bottom:10px;">
							<option value="district">District</option>
							<option value="taluka">Taluka</option>
							<option value="state">State</option>
						</select>
					</div>

					<div class="chart-box" id="trend-chart" style="width:94%;"></div>

					<div class="chart-box" id="subject-pie-chart" style="width:45%;"></div>

				</div>
			</div>
		`).appendTo(this.page.body);

		this.body.find("#location-level").on("change", (e) => {
			this.load_location_chart(e.target.value);
		});

		this.refresh();
	}

	load_subjects() {
		const project = this.project.get_value();

		this.subject.df.options = [""];
		this.subject.set_value("");
		this.subject.refresh();

		if (!project) {
			return;
		}

		frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "IRS Project",
				name: project
			}
		}).then(r => {

			if (!r.message) return;

			let options = [""];

			(r.message.subjects || []).forEach(row => {
				if (row.subject) {
					options.push(row.subject);
				}
			});

			this.subject.df.options = options;
			this.subject.refresh();
		});
	}

	load_rejection_chart() {
		this.call("get_rejection_reason_summary").then(data => {
			this.render_bar("rejection-chart", "By Reason of Rejection", data);
		});
	}
	load_missing_docs_chart() {
		this.call("get_missing_documents_summary").then(data => {
			this.render_bar("missing-docs-chart", "Missing / Not Received Documents", data);
		});
	}
	refresh() {
		this.load_cards();
		this.load_status_chart();
		this.load_workflow_chart();
		this.load_subject_pie_chart();
		this.load_medium_chart();
		this.load_location_chart(this.body.find("#location-level").val() || "district");
		this.load_trend_chart();
		this.load_rejection_chart();
		this.load_missing_docs_chart();
	}

	call(method, args = {}) {
		args.project = this.project.get_value();
		args.subject = this.subject.get_value();
		args.month = this.month.get_value();
		args.academic_year = this.academic_year.get_value();

		return frappe.call({
			method: "po_wo_pr.po_wo_pr.page.inward_dashboard.inward_dashboard." + method,
			args: args
		}).then(r => r.message);
	}

	load_cards() {
		this.call("get_number_cards").then(data => {
			const cards = [
				{ label: "Total", value: data.total, color: "#5e64ff" },
				{ label: "Pending", value: data.pending, color: "#ffa00a" },
				{ label: "Accepted", value: data.approved, color: "#28a745" },
				{ label: "Rejected", value: data.rejected, color: "#e03131" },
				{ label: "Repeat Rejected", value: data.repeat_rejected, color: "#9c1f1f" }
			];

			this.body.find(".cards-row").html(
				cards.map(card => `
                <div style="flex:1;padding:16px;border-radius:8px;background:${card.color}15;border-left:4px solid ${card.color};">
                    <div style="font-size:24px;font-weight:600;">${card.value || 0}</div>
                    <div style="color:#666;">${card.label}</div>
                </div>
            `).join("")
			);
		});
	}

	load_status_chart() {
		this.call("get_status_summary").then(data => {
			this.render_bar("status-chart", "By Status", data);
		});
	}

	load_workflow_chart() {
		this.call("get_application_status_summary").then(data => {
			this.render_bar("workflow-chart", "By Application Status (Accept / Reject / Repeat Reject)", data);
		});
	}

	load_medium_chart() {
		this.call("get_medium_summary").then(data => {
			this.render_bar("medium-chart", "By Medium", data);
		});
	}

	load_location_chart(level) {
		this.call("get_location_summary", {
			level: level
		}).then(data => {
			this.render_bar(
				"location-chart",
				`By ${frappe.utils.to_title_case(level)}`,
				data
			);
		});
	}

	load_subject_pie_chart() {
		const project = this.project.get_value();

		const wrapper = this.body.find("#subject-pie-chart")[0];

		// Clear chart when no project is selected
		if (!project) {
			$(wrapper).empty();
			return;
		}

		this.call("get_subject_summary").then(data => {
			$(wrapper).empty();

			const container = $("<div class='chart-container'></div>")
				.appendTo(wrapper)[0];

			new frappe.Chart(container, {
				title: "Applications by Subject",
				data: {
					labels: data.map(d => d.label),
					datasets: [{
						values: data.map(d => d.count)
					}]
				},
				type: "pie",
				height: 300
			});
		});
	}

	load_trend_chart() {
		this.call("get_monthly_trend", {
			months: 6
		}).then(data => {

			const wrapper = this.body.find("#trend-chart")[0];
			$(wrapper).find(".chart-container").remove();

			const container = $("<div class='chart-container'></div>")
				.appendTo(wrapper)[0];

			new frappe.Chart(container, {
				title: "Monthly Trend",
				data: {
					labels: data.map(d => d.label),
					datasets: [{
						name: "Documents",
						values: data.map(d => d.count)
					}]
				},
				type: "line",
				height: 220,
				colors: ["#5e64ff"]
			});
		});
	}

	render_bar(box_id, title, data) {
		const wrapper = this.body.find(`#${box_id}`)[0];

		$(wrapper).find(".chart-container").remove();

		const container = $("<div class='chart-container'></div>")
			.appendTo(wrapper)[0];

		new frappe.Chart(container, {
			title: title,
			data: {
				labels: data.map(d => d.label || "Unknown"),
				datasets: [{
					name: "Count",
					values: data.map(d => d.count)
				}]
			},
			type: "bar",
			height: 220,
			colors: ["#5e64ff"]
		});
	}
}