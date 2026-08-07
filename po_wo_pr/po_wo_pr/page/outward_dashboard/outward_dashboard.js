frappe.pages["outward-dashboard"].on_page_load = function (wrapper) {
	$(wrapper).html(`

    
  <div class="shell">

  <div>
    <!-- TOPBAR -->
    <div class="topbar">
      <div>
        <div class="crumb">IRS · Outward Documents</div>
        <h1 class="display">Dispatch Control</h1>
      </div>
      <div class="spacer"></div>
      <div class="datebadge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Apr 2026
      </div>
    </div>

    <div class="main">

      <!-- KPI ROW -->
      <div class="kpi-row">
        <div class="kpi total">
          <div class="top">
            <span class="kicker">Total Dispatched</span>
            <span class="stamp-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></span>
          </div>
          <div class="value display">1,284</div>
          <div class="delta up">↑ 8.4% vs last month</div>
        </div>
        <div class="kpi transit">
          <div class="top">
            <span class="kicker">In Transit</span>
            <span class="stamp-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
          </div>
          <div class="value display">396</div>
          <div class="delta flat">≈ steady this week</div>
        </div>
        <div class="kpi delivered">
          <div class="top">
            <span class="kicker">Delivered</span>
            <span class="stamp-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
          </div>
          <div class="value display">807</div>
          <div class="delta up">↑ 3.1% delivery rate</div>
        </div>
        <div class="kpi draft">
          <div class="top">
            <span class="kicker">Pending Draft</span>
            <span class="stamp-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></span>
          </div>
          <div class="value display">81</div>
          <div class="delta down">↓ needs posting</div>
        </div>
      </div>

      <!-- PANELS -->
      <div class="panels">
        <!-- TREND CHART -->
       <div id="monthly-chart" style="height:300px;"></div>

        <!-- STATUS DONUT -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Status Breakdown</h2>
              <div class="sub">Current month</div>
            </div>
          </div>
          <div class="donut-wrap">
            <div class="donut">
              <div class="donut-center">
                <b class="display">1,284</b>
                <span>total docs</span>
              </div>
            </div>
            <div class="donut-legend">
              <div class="row"><span class="dot" style="background:var(--delivered)"></span>Delivered <b>62.8%</b></div>
              <div class="row"><span class="dot" style="background:var(--transit)"></span>In Transit <b>30.8%</b></div>
              <div class="row"><span class="dot" style="background:var(--stamp)"></span>Draft <b>6.4%</b></div>
            </div>
          </div>
        </div>
      </div>

      <div class="panels" style="margin-top:16px;">
        <!-- DISTRICT MANIFEST -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Districts by Volume</h2>
              <div class="sub">Gujarat · outward documents this month</div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>District</th><th>Docs</th><th style="width:40%;">Share</th><th>Avg. days</th></tr>
            </thead>
            <tbody id="district-table-body">

            </tbody>
          </table>
        </div>

        <!-- COURIER STRIP as side panel -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Courier Partners</h2>
              <div class="sub">Performance this month</div>
            </div>
          </div>
          <div id="courier-partners" class="courier-strip"></div>
        </div>
      </div>
    </div>
  </div>
</div>

    `);

	frappe.call({
		method: "po_wo_pr.po_wo_pr.page.outward_dashboard.outward_dashboard.outward_dashboard",
		callback: function (r) {
			const data = r.message;

			console.log(data);

			load_dashboard(data);
		},
	});

	function load_dashboard(data) {
		console.log(data.monthly_records);
		console.log(data.district_by_volume);
		console.log(data.courier_partner);

		let rows = "";

		data.district_by_volume.forEach((row) => {
			rows += `
            <tr>
                <td>
                    <span class="district-name">${row.district || ""}</span>
                    <span class="district-taluka">
                        ${row.taluka || ""}, ${row.townvillage || ""}
                    </span>
                </td>

                <td class="mono">${row.total}</td>

                <td class="bar-cell">
                    <div class="bar-track">
                        <div class="bar-fill" style="width:100%"></div>
                    </div>
                </td>

                <td class="mono">-</td>
            </tr>
        `;
		});

		$("#district-table-body").html(rows);

		let courier_html = "";

		data.courier_partner.forEach((row) => {
			courier_html += `
        <div class="courier-card" style="border:none;padding:0 0 14px;border-bottom:1px solid var(--line-soft);">
            <div class="name">${row.meduium}</div>
            <div class="stat-row">
                Docs handled <b>${row["Total Documents"]}</b>
            </div>
        </div>
    `;
		});

		$("#courier-partners").html(courier_html);


    const labels = data.monthly_records.map(r => r.month_name);
    const values = data.monthly_records.map(r => r.total);

      new frappe.Chart("#monthly-chart", {
      title: "Dispatch Volume",
      data: {
          labels: labels,
          datasets: [
              {
                  values: values
              }
          ]
      },
      type: "line",
      height: 280,
      colors: ["#1f3a63"]
  });
    }
};
