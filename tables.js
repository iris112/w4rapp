/*

visitor
	visitor_id BINARY(16) UNIQUE // Currently rfc4122 version 4 uuid, but will probably switch to a 8 byte uuid instead.
	site_id
	first_visit_id
	last_visit_id
	total_visits

visit
	visit_id INTEGER(10) UNSIGNED NOT NULL AUTO_INCREMENT
	visitor_id
	site_id
    config_id
    local_start_time
	first_action_id
	last_action_id
	first_action_time
	last_action_time
	total_actions
	total_time
	referrer_type
	referrer_name
	referrer_url
	referrer_keyword
	custom_k1
	custom_v1
	custom_k2
	custom_v2


visit_config is set once on visit start

visit_config
	config_id INTEGER(10) UNSIGNED NOT NULL AUTO_INCREMENT
	visit_id
	browser_name
	browser_version
	os
	resolution
	config_cookie
	location_ip
	location_browser_lang
	location_country
	location_region
	location_city
	location_latitude
	location_longitude


a visit is composed of sequential actions.
actions can be of type pageview, search, or event
pageview has a url
search has filters
event has custom data.

unique_action
	idunique_action

action
	idaction
	idvisit
	idsite
	idvisitor
	time
	name
	type

site
	site_id
	name
	url












DATA TO TRACK:

PER VISITOR:
first visit time
last visit time
total visits
	can be completely folded into visit table? very little data is tracked at the visitor level, except what is
	aggregated from visit level. Is there an expected access pattern that values this table?

PER VISIT:
starting time
ending time
starting page
ending page
total actions
referrer
device info (resolution, browser, os, ip address, location, cookies enabled, etc.)
custom data
	can get fingerprinting by hashing the device info, to use for cookies disabled.


PER ACTION:
type (pageview, search, event, download, outlink)
time (when action hits server)
ref url (previous pageview or search)
custom data (scoped to page)

PER PAGE VIEW:
page url
page title
page generation time

PER SEARCH:
terms
category
filters
page generation time

PER DOWNLOAD:
download url
	Don't need to implement now
	Subscribe to click events, and track clicks on downloads

PER OUTLINK:
destination url
	subscribe to click events, and track links directed out of site.





ACCESS PATTERNS:

Visits over time
	sort visits by entry time
	count visits that fall on each day
		display

Sort visits by X
	country
	browser

	we probably shouldn't create any indexes for these.

user behavior trends (e.g. 30 visits started on /page1, 9 went to /page2, 5 went to /page3, 12 bounced, 5 visits stopped, etc.)
	index actions by "url + action name" hash.
	?index actions by previous action?
	get pageviews with no previous action
	get count of page views with identical urls.
	sort by count
		get
			repeat until limit

	IMPROVEMENT
	create table of unique actions (pageview at url, download, outlink, event)
		insert actions as new unique actions occur
		index by some hash of the action characteristics
		automatically add new actions if their hash doesn't exist
	create table of action occurrences
		insert new entry for each action, containing the action hash (so we don't need to know the action id)
		index by hash.

	SELECT hash, count(*) FROM actions WHERE action_time >= DATE_SUB(NOW(), 30 DAYS) GROUP BY hash ORDER BY count(*) DESC LIMIT 10
	get actions with no previous action.
	loop x=0 until limit
		count actions with

unique_actions (
	unique_action_id INTEGER(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	name TEXT,
	hash INTEGER(10) UNSIGNED NOT NULL,
	type TINYINT UNSIGNED NULL,
	PRIMARY KEY(unique_action_id),
	INDEX index_type_hash (type, hash)
)

actions (
	action_id INTEGER(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	site_id INTEGER(10) UNSIGNED NOT NULL,
	visitor_id BINARY(8) NOT NULL,
	visit_id INTEGER(10) UNSIGNED NOT NULL,
	custom_k1 VARCHAR(255) DEFAULT NULL,
	custom_v1 VARCHAR(255) DEFAULT NULL,
	...
	PRIMARY KEY(action_id),
	INDEX index_visit_id(visit_id),
	INDEX index_site_id_time(site_id, time)
)

custom_data (
	data_id INTEGER(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	source_id INTEGER(10) UNSIGNED NOT NULL,
	source_type TINYINT(2) UNSIGNED NOT NULL,
	key VARCHAR(255) DEFAULT NULL,
	value VARCHAR(255) DEFAULT NULL
)

*/