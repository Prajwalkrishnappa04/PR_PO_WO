app_name = "po_wo_pr"
app_title = "Po Wo Pr"
app_publisher = "Hybrowlabs"
app_description = "none"
app_email = "hybrowlabs@mail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "po_wo_pr",
# 		"logo": "/assets/po_wo_pr/logo.png",
# 		"title": "Po Wo Pr",
# 		"route": "/po_wo_pr",
# 		"has_permission": "po_wo_pr.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/po_wo_pr/css/po_wo_pr.css"
# app_include_js = "/assets/po_wo_pr/js/po_wo_pr.js"

# include js, css files in header of web template
# web_include_css = "/assets/po_wo_pr/css/po_wo_pr.css"
# web_include_js = "/assets/po_wo_pr/js/po_wo_pr.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "po_wo_pr/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}
doctype_list_js = {
    "Inward Document": "public/js/inward_list.js"
}

# include js in doctype views
doctype_js = {
    "Purchase Order" : "public/js/purchase_order.js",
    "Item" : "public/js/item_master.js",
    "Request for Quotation": "public/js/request_quotation.js",
    "Employee": "public/js/employee.js",
    "Cost Center":"public/js/cost_center.js",
    "Shift Assignment":"public/js/shift_assignment.js",
    "Material Request":"public/js/material_request.js",
    "Attendance": "public/js/attendance.js"
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
doctype_calendar_js = {"Attendance" : "public/js/attendance_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "po_wo_pr/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "po_wo_pr.utils.jinja_methods",
# 	"filters": "po_wo_pr.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "po_wo_pr.install.before_install"
# after_install = "po_wo_pr.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "po_wo_pr.uninstall.before_uninstall"
# after_uninstall = "po_wo_pr.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "po_wo_pr.utils.before_app_install"
# after_app_install = "po_wo_pr.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "po_wo_pr.utils.before_app_uninstall"
# after_app_uninstall = "po_wo_pr.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "po_wo_pr.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
	"Employee": "po_wo_pr.overrides.custom_employee_class.CustomEmployee"
}

# Document Events
# ---------------
# Hook on# Document Events
# ---------------

doc_events = {
	"Loan": {
		"on_submit": "po_wo_pr.api.setup.update_employee_loan_balance",
		"on_cancel": "po_wo_pr.api.setup.update_employee_loan_balance",
		"on_update_after_submit": "po_wo_pr.api.setup.update_employee_loan_balance"
	},
	"Loan Repayment": {
		"on_submit": "po_wo_pr.api.setup.update_employee_loan_balance",
		"on_cancel": "po_wo_pr.api.setup.update_employee_loan_balance"
	}
}

# Scheduled Tasks
# ---------------
# scheduler_events = {
#     "cron": {
#         "* * * * *": [
#             "po_wo_pr.api.get_biomatric_data_every_minute.import_today_biometric_data"
#         ]
#     }
# }


# scheduler_events = {
# 	"all": [
# 		"po_wo_pr.tasks.all"
# 	],
# 	"daily": [
# 		"po_wo_pr.tasks.daily"
# 	],
# 	"hourly": [
# 		"po_wo_pr.tasks.hourly"
# 	],
# 	"weekly": [
# 		"po_wo_pr.tasks.weekly"
# 	],
# 	"monthly": [
# 		"po_wo_pr.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "po_wo_pr.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "po_wo_pr.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "po_wo_pr.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["po_wo_pr.utils.before_request"]
# after_request = ["po_wo_pr.utils.after_request"]

# Job Events
# ----------
# before_job = ["po_wo_pr.utils.before_job"]
# after_job = ["po_wo_pr.utils.after_job"]

# User Data Protection
# --------------------
fixtures = [
    {
        "doctype": "Property Setter",
        "filters": {
            "name":["in",[
                # "Employee-custom_shift_issuer-hidden",
            # "Employee-shift_request_approver-hidden","Employee-custom_attendance_exception-hidden",
            # "Employee-custom_allow_mobile_checkin-hidden","Employee-department-hidden","Item-item_code-hidden","Employee-main-field_order",
            # "Employee-micr_code-hidden","Employee-iban-hidden","Employee-ctc-hidden","Employee-custom_esic_number-hidden","Employee Education-main-field_order",
            # "Employee External Work History-main-field_order","Employee-custom_educational_details-hidden","Employee-lft-hidden","Employee-rgt-hidden",
            # "Employee-old_parent-hidden","Employee Internal Work History-department-hidden","Material Request Item-gst_hsn_code-hidden","Material Request Item-conversion_factor-req",
            # "Material Request Item-conversion_factor-hidden","Material Request-scan_barcode-hidden","Material Request Item-manufacture_details-hidden","Material Request Item-accounting_details_section-hidden"
            # "Material Request Item-accounting_dimensions_section-collapsible", "Material Request Item-rate-hidden","Supplier Quotation-quotation_number-label","Supplier Quotation Item-gst_hsn_code-hidden",
            # "Supplier Quotation Item-gst_hsn_code-hidden","Supplier Quotation Item-conversion_factor-reqd","Supplier Quotation Item-conversion_factor-hidden","Supplier Quotation Item-item_weight_details-hidden",
            # "Supplier Quotation Item-manufacture_details-hidden","Purchase Order-scan_barcode-hidden","Purchase Order-discount_section-collapsible","Purchase Order-shipping_rule-hidden"
            # ,"Purchase Order-incoterm-hidden","Supplier Quotation-ignore_pricing_rule-hidden","Employee External Work History-company_name-label","Employee External Work History-contact-label",
            # "Purchase Receipt-incoterm-hidden","Purchase Invoice-incoterm-hidden","Supplier Quotation-incoterm-hidden","Purchase Receipt-shipping_col-hidden","Supplier Quotation-column_break_34-hidden",
            # "Purchase Invoice-column_break_58-hidden","Purchase Receipt-scan_barcode-hidden","Purchase Invoice-scan_barcode-hidden","Purchase Receipt-main-field_order","Purchase Receipt-shipping_rule-hidden",
            # "Purchase Receipt-raw_material_details-hidden","Purchase Invoice-shipping_rule-hidden","Purchase Invoice-main-field_order","Purchase Invoice-raw_materials_supplied-hidden","Supplier Quotation-shipping_rule-hidden",
            # "Material Request-set_from_warehouse-default","Quotation-scan_barcode-hidden","Quotation-incoterm-hidden","Item-gst_hsn_code-default","Supplier Quotation-place_of_supply-hidden",
            # "Supplier Quotation-accounting_dimensions_section-hidden","Purchase Order-place_of_supply-hidden","Purchase Order-scan_barcode-hidden","Material Request Item-accounting_dimensions_section-hidden",
            # "Purchase Order-ignore_pricing_rule-hidden","Material Request Item-actual_qty-hidden","Material Request Item-projected_qty-hidden","Material Request Item-min_order_qty-hidden","Material Request Item-accounting_details_section-hidden",
            # "Material Request Item-page_break-hidden","Request for Quotation Item-section_break_24-hidden","Purchase Order Item-manufacture_details-hidden","Supplier Quotation Item-ad_sec_break-hidden","Supplier Quotation Item-section_break_44-hidden",
            # "Material Request-set_from_warehouse-default","Material Request-tc_name-default","Request for Quotation Item-image_view-hidden","Request for Quotation Item-section_break_23-hidden","Request for Quotation Item-warehouse-default",
            # "Request for Quotation-incoterm-hidden","Request for Quotation-tc_name-default","Supplier Quotation-main-field_order","Supplier Quotation-named_place-hidden","Purchase Order-set_warehouse-default","Purchase Order-main-field_order","Purchase Order-tc_name-default",
            # "Purchase Order Item-warehouse-default","Purchase Receipt Item-warehouse-default","Purchase Receipt Item-manufacture_details-hidden","Purchase Receipt-place_of_supply-hidden","Purchase Receipt-apply_putaway_rule-hidden","Purchase Receipt-is_subcontracted-hidden",
            # "Purchase Invoice-place_of_supply-hidden","Purchase Invoice-tc_name-default","Purchase Invoice-set_warehouse-default","Purchase Order-tc_name-default","Purchase Order-payment_terms_template-default","Purchase Invoice-tc_name-default","Purchase Invoice-payment_terms_template-default",
            # "Expense Claim-department-hidden","Expense Claim-main-field_order",
            # "Material Request Item-stock_uom-hidden",
            # "Material Request Item-stock_uom-reqd",
            # "Request for Quotation Item-stock_uom-reqd",
            # "Request for Quotation Item-stock_uom-hidden",
            # "Supplier Quotation Item-stock_uom-reqd",
            # "Supplier Quotation Item-stock_uom-hidden",
            # "Purchase Receipt Item-stock_uom-reqd",
            # "Purchase Receipt Item-stock_uom-hidden"
            "Supplier Quotation Item-base_amount-hidden",
            "Supplier Quotation Item-base_rate-hidden",
            "Purchase Order Item-stock_uom-hidden",
            "Purchase Order Item-base_rate-hidden",
            "Purchase Order Item-base_amount-hidden",
            "Purchase Receipt Item-base_amount-hidden",
            "Purchase Receipt Item-base_rate-hidden"
            ]]
        }
    },
    {
        "dt": "Custom Field",
        "filters": [
            ["name", "in", [
                "Employee-custom_project","Employee-custom_insurance_policy_","Employee Education-custom_clevel","Employee External Work History-custom_nature_of_work",
                "Employee Internal Work History-custom_work_description","Request for Quotation-custom_tab_2","Request for Quotation-custom_compare","Attendance-custom_half_day_type",
                "Employee-custom_total_loan_balance","Employee-custom_reporting_manager","Employee-custom_reporting_manager_name","Employee-custom_office_document","Employee-custom_academic_documents_list",
                "Material Request-custom_maa_project","Employee-custom_personal_document","Employee-custom_maa_foundation_experience","Employee-custom_loan","Employee-custom_loan_amount","Employee-custom_paid_amount",
                "Employee-custom_remaining_amount","Material Request-custom_person_responsible","Material Request-custom_for","Purchase Order Item-custom_gst_included","Expense Claim-custom_maa_project","Attendance-custom_work_hours",
                
                
            ]
            ]
        ]
    }
]

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"po_wo_pr.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

