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

# include js in doctype views
doctype_js = {
    "Purchase Order" : "public/js/purchase_order.js"
    }
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

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

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

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

