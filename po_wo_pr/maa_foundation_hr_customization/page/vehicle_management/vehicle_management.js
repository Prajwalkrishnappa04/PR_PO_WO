const API = "po_wo_pr.maa_foundation_hr_customization.page.vehicle_management.vehicle_management.";
const START_HOUR = 6, END_HOUR = 20, STEP = 30; // 6 AM to 8 PM, minutes per cell

// Look and size, change here only
const CELL_W = 56, CELL_H = 56;            // px
const VEHICLE_COL_W = 150;

const HEAD_BG = "#1e293b", HEAD_FG = "#f8fafc";   // slate header
const LINE = "#e2e8f0", HOUR_LINE = "#94a3b8";    // soft lines, stronger on the hour
const ROW_A = "#ffffff", ROW_B = "#f1f5f9";       // zebra rows
const HOVER_BG = "#dbeafe";
const MINE_BG = "#2563eb", OTHER_BG = "#ea580c";  // blue = yours, orange = others

// one-time CSS for hover + sticky column
if (!document.getElementById("vg-style")) {
  $("<style id='vg-style'>").text(`
    .vg-free:hover { background:${HOVER_BG} !important; }
    .vg-booked:hover { filter:brightness(1.12); }
    .vg-sticky { position:sticky; left:0; z-index:2; }
  `).appendTo("head");
}

frappe.pages["vehicle-management"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper, title: "Vehicle Allocation", single_column: true,
  });
  new VehicleGrid(page);
};

class VehicleGrid {
  constructor(page) {
    this.page = page;
    this.bookings = [];
    this.date_field = page.add_field({
      fieldname: "date", label: "Date", fieldtype: "Date",
      default: frappe.datetime.get_today(),
      change: () => this.load(),
    });
    this.body = $('<div style="overflow-x:auto"></div>').appendTo(page.main);

    this.body.on("click", ".vg-free", (e) => {
      const t = $(e.currentTarget);
      this.book_dialog(t.data("vehicle"), Number(t.data("min")));
    });
    this.body.on("click", ".vg-booked", (e) => {
      this.booking_dialog($(e.currentTarget).data("booking"));
    });

    this.load();
  }

  load() {
    const date = this.date_field.get_value();
    if (!date) return;
    frappe.call({
      method: API + "get_day_data",
      args: { date },
      callback: (r) => this.render(r.message),
    });
  }

  to_min(t) {                     // "09:30:00" -> 570
    const [h, m] = t.split(":");
    return Number(h) * 60 + Number(m);
  }

  min_to_time(m) {
    const p = (n) => String(n).padStart(2, "0");
    return `${p(Math.floor(m / 60))}:${p(m % 60)}:00`;
  }

  render({ vehicles, bookings }) {
    this.bookings = bookings;
    const e = frappe.utils.escape_html;
    const slots = [];
    for (let m = START_HOUR * 60; m < END_HOUR * 60; m += STEP) slots.push(m);

    const covers = (b, m) => this.to_min(b.start) <= m && m < this.to_min(b.end);
    const label = (h) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
    const th = `background:${HEAD_BG};color:${HEAD_FG};text-align:center;font-size:13px;font-weight:600;padding:10px 0;border:1px solid ${HEAD_BG};border-left:1px solid #475569;`;

    let html = `<table style="border-collapse:collapse;table-layout:fixed;width:max-content">
      <colgroup><col style="width:${VEHICLE_COL_W}px">${slots.map(() => `<col style="width:${CELL_W}px">`).join("")}</colgroup>
      <thead><tr><th class="vg-sticky" style="${th}text-align:left;padding-left:14px">Vehicle</th>`;
    for (let h = START_HOUR; h < END_HOUR; h++)
      html += `<th colspan="${60 / STEP}" style="${th}">${label(h)}</th>`;
    html += "</tr></thead><tbody>";

    vehicles.forEach((v, i) => {
      const rows = bookings.filter((b) => b.vehicle === v.name);
      const rowBg = i % 2 ? ROW_B : ROW_A;
      html += `<tr><td class="vg-sticky" style="background:${HEAD_BG};color:${HEAD_FG};font-size:14px;font-weight:600;padding:0 14px;height:${CELL_H}px;border-bottom:1px solid #334155">${e(v.license_plate)}</td>`;

      let idx = 0;
      while (idx < slots.length) {
        const m = slots[idx];
        const edge = m % 60 === 0 ? HOUR_LINE : LINE;       // stronger line on the hour
        const b = rows.find((x) => covers(x, m));

        if (b) {
          let span = 1;                                      // merge consecutive covered slots
          while (idx + span < slots.length && covers(b, slots[idx + span])) span++;
          const bg = b.is_mine ? MINE_BG : OTHER_BG;
          html += `<td class="vg-booked" colspan="${span}" data-booking="${b.name}"
            title="${e(b.driver_name || b.driver)} | ${e(b.team || "")} | ${b.start} - ${b.end}"
            style="background:${bg};color:#fff;cursor:pointer;height:${CELL_H}px;padding:4px 8px;border:1px solid #fff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:12px;line-height:1.3">
            <b>${e(b.driver_name || b.driver)}</b><br>${e(b.team || "")}</td>`;
          idx += span;
        } else {
          html += `<td class="vg-free" data-vehicle="${v.name}" data-min="${m}"
            style="background:${rowBg};cursor:pointer;height:${CELL_H}px;border:1px solid ${LINE};border-left:1px solid ${edge}"></td>`;
          idx++;
        }
      }
      html += "</tr>";
    });

    this.body.html(html + "</tbody></table>");
  }

  book_dialog(vehicle, min) {
    const d = new frappe.ui.Dialog({
      title: `Book ${vehicle}`,
      fields: [
        { fieldname: "start", fieldtype: "Time", label: "Start", reqd: 1, default: this.min_to_time(min) },
        { fieldname: "end", fieldtype: "Time", label: "End", reqd: 1, default: this.min_to_time(min + STEP) },
        { fieldname: "driver", fieldtype: "Link", options: "Driver", label: "Driver", reqd: 1 },
        { fieldname: "team", fieldtype: "Data", label: "Team" },
        { fieldname: "project", fieldtype: "Data", label: "Project" },
      ],
      primary_action_label: "Book",
      primary_action: (v) => {
        frappe.call({
          method: API + "book",
          args: { vehicle, allocation_date: this.date_field.get_value(), ...v },
          callback: () => { d.hide(); this.load(); },
        });
      },
    });
    d.show();
  }

  booking_dialog(name) {
    const b = this.bookings.find((x) => x.name === name);
    const e = frappe.utils.escape_html;
    const d = new frappe.ui.Dialog({
      title: "Booking",
      fields: [{ fieldtype: "HTML", fieldname: "info" }],
    });
    d.fields_dict.info.$wrapper.html(
      `<p><b>Vehicle:</b> ${e(b.vehicle)}<br>
          <b>Driver:</b> ${e(b.driver_name || b.driver)}<br>
          <b>Time:</b> ${b.start} - ${b.end}<br>
          <b>Booked by:</b> ${e(b.employee_name || b.employee)}<br>
          <b>Team:</b> ${e(b.team || "-")} | <b>Project:</b> ${e(b.project || "-")}</p>`
    );

    if (b.is_mine) {
      d.set_primary_action("Delete", () => {
        frappe.confirm("Delete this booking?", () => {
          d.hide();                      // hide first, don't wait for server
          frappe.call({
            method: API + "delete_booking", args: { name },
            callback: () => this.load(),
          });
        });
      });
      d.set_secondary_action_label("Transfer");
      d.set_secondary_action(() => {
        frappe.prompt(
          [{ fieldname: "code", fieldtype: "Data", label: "Employee Code", reqd: 1 }],
          ({ code }) => {
            d.hide();                    // same fix for transfer
            frappe.call({
              method: API + "transfer", args: { name, new_employee: code },
              callback: () => this.load(),
            });
          },
          "Transfer booking", "Transfer"
        );
      });
    }
    d.show();
  }
}