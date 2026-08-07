frappe.pages['inward-dashboard'].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Inward Document Dashboard',
		single_column: true
	});

	new InwardDashboard(page);
};

class InwardDashboard {
	constructor(page) {
		this.page = page;
		this.body = $(`
			<div class="inward-dashboard">
				<div class="cards-row" style="display:flex; gap:16px; margin-bottom:20px;"></div>
				<div class="charts-row" style="display:flex; flex-wrap:wrap; gap:24px;">
					<div class="chart-box" id="status-chart" style="width:45%;"></div>
					<div class="chart-box" id="workflow-chart" style="width:45%;"></div>
					<div class="chart-box" id="medium-chart" style="width:45%;"></div>
					<div class="chart-box" id="location-chart" style="width:45%;">
						<select id="location-level" style="margin-bottom:8px;">
							<option value="district">District</option>
							<option value="taluka">Taluka</option>
							<option value="state">State</option>
						</select>
					</div>
					<div class="chart-box" id="trend-chart" style="width:94%;"></div>
				</div>
			</div>
		`).appendTo(this.page.body);

		this.load_cards();
		this.load_status_chart();
		this.load_workflow_chart();
		this.load_medium_chart();
		this.load_location_chart('district');
		this.load_trend_chart();

		this.body.find('#location-level').on('change', (e) => {
			this.load_location_chart(e.target.value);
		});
	}

	call(method, args = {}) {
		return frappe.call({
			method: `po_wo_pr.po_wo_pr.page.inward_dashboard.inward_dashboard.${method}`,
			args
		}).then(r => r.message);
	}

	load_cards() {
		this.call('get_number_cards').then(data => {
			const cards = [
				{ label: 'Total', value: data.total, color: '#5e64ff' },
				{ label: 'Pending', value: data.pending, color: '#ffa00a' },
				{ label: 'Approved', value: data.approved, color: '#28a745' },
				{ label: 'Rejected', value: data.rejected, color: '#e03131' }
			];
			const html = cards.map(c => `
				<div style="flex:1; padding:16px; border-radius:8px; background:${c.color}15; border-left:4px solid ${c.color};">
					<div style="font-size:24px; font-weight:600;">${c.value || 0}</div>
					<div style="color:#666;">${c.label}</div>
				</div>
			`).join('');
			this.body.find('.cards-row').html(html);
		});
	}

	load_status_chart() {
		this.call('get_status_summary').then(data => this.render_bar('status-chart', 'By Status', data));
	}

	load_workflow_chart() {
		this.call('get_workflow_summary').then(data => this.render_bar('workflow-chart', 'By Workflow State', data));
	}

	load_medium_chart() {
		this.call('get_medium_summary').then(data => this.render_bar('medium-chart', 'By Medium', data));
	}

	load_location_chart(level) {
		this.call('get_location_summary', { level }).then(data => {
			this.render_bar('location-chart', `By ${level.charAt(0).toUpperCase() + level.slice(1)}`, data, true);
		});
	}

	load_trend_chart() {
		this.call('get_monthly_trend', { months: 6 }).then(data => {
			const wrapper = this.body.find('#trend-chart')[0];
			$(wrapper).find('.chart-container').remove();
			const container = $('<div class="chart-container"></div>').appendTo(wrapper)[0];
			new frappe.Chart(container, {
				title: 'Monthly Trend',
				data: {
					labels: data.map(d => d.label),
					datasets: [{ name: 'Documents', values: data.map(d => d.count) }]
				},
				type: 'line',
				height: 220,
				colors: ['#5e64ff']
			});
		});
	}

	render_bar(box_id, title, data, keep_select) {
		const wrapper = this.body.find(`#${box_id}`)[0];
		$(wrapper).find('.chart-container').remove();
		const container = $('<div class="chart-container"></div>').appendTo(wrapper)[0];
		new frappe.Chart(container, {
			title,
			data: {
				labels: data.map(d => d.label || 'Unknown'),
				datasets: [{ name: 'Count', values: data.map(d => d.count) }]
			},
			type: 'bar',
			height: 220,
			colors: ['#5e64ff']
		});
	}
}