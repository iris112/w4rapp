/*!
* Some code borrowed from Piwik.
*
* @license http://piwik.org/free-software/bsd/ Simplified BSD (also in js/LICENSE.txt)
 */

if (typeof _rfq !== 'object') {
	_rfq = [];
}

/*
 * Lightweight JSONP fetcher
 * Copyright 2010-2012 Erik Karlsson. All rights reserved.
 * BSD licensed
 */


/*
 * Usage:
 *
 * JSONP.get( 'someUrl.php', {param1:'123', param2:'456'}, function(data){
 * //do something with data, which is the JSON object you should retrieve from someUrl.php
 * });
 */
var rfJSONP = (function(){
  var counter = 0, head, window = this, config = {};
  function load(url, pfnError) {
    var script = document.createElement('script'),
      done = false;
    script.src = url;
    script.async = true;

    var errorHandler = pfnError || config.error;
    if ( typeof errorHandler === 'function' ) {
      script.onerror = function(ex){
        errorHandler({url: url, event: ex});
      };
    }

    script.onload = script.onreadystatechange = function() {
      if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
        done = true;
        script.onload = script.onreadystatechange = null;
        if ( script && script.parentNode ) {
          script.parentNode.removeChild( script );
        }
      }
    };

    if ( !head ) {
      head = document.getElementsByTagName('head')[0];
    }
    head.appendChild( script );
  }
  function encode(str) {
    return encodeURIComponent(str);
  }
  function jsonp(url, params, callback, callbackName) {
    var query = (url||'').indexOf('?') === -1 ? '?' : '&', key;

    callbackName = (callbackName||config['callbackName']||'callback');
    var uniqueName = callbackName + "_json" + (++counter);

    params = params || {};
    for ( key in params ) {
      if ( params.hasOwnProperty(key) ) {
        query += encode(key) + "=" + encode(params[key]) + "&";
      }
    }

    window[ uniqueName ] = function(data){
      callback(data);
      try {
        delete window[ uniqueName ];
      } catch (e) {}
      window[ uniqueName ] = null;
    };

    load(url + query + callbackName + '=' + uniqueName);
    return uniqueName;
  }
  function setDefaults(obj){
    config = obj;
  }
  return {
    get:jsonp,
    init:setDefaults
  };
}());

(function() {
	var RealFind = function RealFind() {

	};

	var RF_PAGEVIEW = 1,
		RF_OUTLINK = 2,
		RF_DOWNLOAD = 3,
		RF_EVENT = 4,
		RF_SEARCH = 5,
    RF_LISTING = 6,
    RF_BLOG = 7;

	var rfWindow = window,
		rfDocument = document,
		rfNavigator = navigator,
		rfScreen = screen,
		rfEncode = encodeURIComponent,
		rfDecode = decodeURIComponent;

	var linkTrackingInstalled = false;

	var locationArray = urlFixup(rfDocument.domain, rfWindow.location.href, getReferrer()),
		rfDomain = domainFixup(locationArray[0]),
		rfLocation = locationArray[1],

		configReferrer = locationArray[2],

		configTitle = rfDocument.title,

		configTrackerUrl = '',

		// Extensions to be treated as download links
		configDownloadExtensions = '7z|aac|apk|ar[cj]|as[fx]|avi|bin|csv|deb|dmg|docx?|exe|flv|gif|gz|gzip|hqx|jar|jpe?g|js|mp(2|3|4|e?g)|mov(ie)?|ms[ip]|od[bfgpst]|og[gv]|pdf|phps|png|pptx?|qtm?|ra[mr]?|rpm|sea|sit|tar|t?bz2?|tgz|torrent|txt|wav|wm[av]|wpd||xlsx?|xml|z|zip',

		// Hosts or alias(es) to not treat as outlinks
		configHostsAlias = [rfDomain],

		// HTML anchor element classes to not track
		configIgnoreClasses = [],

		// HTML anchor element classes to treat as downloads
		configDownloadClasses = [],

		// HTML anchor element classes to treat at outlinks
		configLinkClasses = [],

		configCookiesDisabled = !hasCookies(),

		configCookieDomain = rfDomain,

		configCookiePath = '/',

		configCookieSecure = false,

    configReturning = false,

    configCustomVars = [],

    configCategory = false;

	var lastButton, lastTarget, browserFeatures = {};

	//var C = {},
	var cPrefix = '__rf_',
		cVisitor = 'visitor',
	//	cCurrent = 'current',
	//	cSession = 'session',
		cTraffic = 'traffic';
	//	cCustom = 'custom';

	var hasLoaded = false,
		onLoadHandlers = [],
    apiReady = false,
    apiLoading = false,
    apiHandlers = [];

	detectBrowserFeatures();

	addReadyListener();

	var siteAccount = '';
	var userId = '';

	var tracker = {
		setSiteAccount: function setSiteAccount(accStr) {
			siteAccount = accStr;
		},
		setTrackerUrl: function setTrackerUrl(url) {
			configTrackerUrl = url;
		},
		setUserId: function setUserId(id) {
			userId = id;
		},
    setCategory: function setCategory(name) {
      configCategory = name;
    },
    setCustomVar: function setCustomVar(key, value, index) {
      if (!index) index = 1;
      configCustomVars[index] = {key:key, value:value};
    },
		trackPageview: function trackPageview(customTitle, customData) {
			var query = getQueryString();

			query += '&tty=' + RF_PAGEVIEW + '&tna=' + rfEncode(customTitle||configTitle) +
				'&tval=' + rfEncode(purify(rfLocation))
				+ '&tref=' + rfEncode(purify(configReferrer));

			getImage(query);
		},
		trackLink: function trackLink(sourceUrl, linkType, customData) {
			var query = getQueryString();

			query += '&tty=' + linkType +
				'&tval=' + rfEncode(purify(sourceUrl)) +
				'&tref=' + rfEncode(purify(rfLocation));

			getImage(query);
		},
		trackEvent: function trackEvent(category, action, name, value) {
			var query = getQueryString();

			query += '&tty=' + RF_EVENT +
				'&ecat=' + rfEncode(category) +
				'&eact=' + rfEncode(action) +
				(isDefined(name) ? '&enam=' + rfEncode(name) : '') +
				(isDefined(value) ? '&eval=' + rfEncode(value) : '');

			getImage(query);
		},
		trackSearch: function trackSearch(keyword, category, resultsCount) {

		},
    trackListing: function trackListing(id) {
      var query = getQueryString();

      query += '&tty=' + RF_LISTING + '&tval=' + id +
        '&tloc=' + rfEncode(purify(rfLocation)) +
        '&tref=' + rfEncode(purify(configReferrer));

      getImage(query);
    },
    trackBlog: function trackBlog(customTitle, tags) {
      var query = getQueryString();

      query += '&tty=' + RF_BLOG + '&tna=' + rfEncode(customTitle||configTitle) +
        '&tval=' + rfEncode(purify(rfLocation)) + '&tref=' + rfEncode(purify(configReferrer));

      if (tags) {
        tags = tags.length ? tags.join(',') : tags.toString();

        query += '&ttag=' + tags;
      }

      getImage(query);
    },
		enableLinkTracking: function enableLinkTracking(enable) {
			addClickListeners(enable);
		},
    getApi: function getApi(callback) {
      apiHandlers.push(callback);

      if (apiReady) {
        setTimeout(onApiLoad, 0);
      }
      else {
        setTimeout(loadApi, 0);
      }
    }
	};

  var visitor = {};

  var api = {
    getVisitor: function getVisitor() {
      return visitor;
    }
  };

	handleQueue();

  function loadApi() {
    if (apiReady || apiLoading) {
      return;
    }

    apiLoading = true;

    if (!configCookiesDisabled) {
      var ck = getVisitorCookie();
      if (ck) {
        visitor.id = ck[0];
        visitor.first = new Date(parseInt(ck[1]));
        visitor.last = new Date(parseInt(ck[2]));
        visitor.count = parseInt(ck[3]);
        visitor.returning = visitor.count > 1;

        return onApiLoad();
      }
    }

    var url = configTrackerUrl.replace('im.gif', 'visitor');
    var query = getQueryString();
    url = url + (url.indexOf('?') < 0 ? '?' : '&') + query;

    rfJSONP.get(url, null, function(response) {
      visitor = response;
      onApiLoad();
    });
  }

  function onApiLoad() {
    apiLoading = false;
    apiReady = true;

    for (var i=0; i<apiHandlers.length; i++) {
      apiHandlers[i](api);
    }

    apiHandlers = [];
  }

	function purify(url) {
		return url;
	}

	function parseUrl(url) {
		var a = rfDocument.createElement('a');
		a.href = url;

		return {
			hostname: a.hostname,
			path: a.pathname,
			query: a.search,
			hash: a.hash,
			port: a.port
		};
	}

	/*
	 * Get page referrer
	 */
	function getReferrer() {
		var referrer = '';

		try {
			referrer = rfWindow.top.document.referrer;
		} catch (e) {
			if (rfWindow.parent) {
				try {
					referrer = rfWindow.parent.document.referrer;
				} catch (e2) {
					referrer = '';
				}
			}
		}

		if (referrer === '') {
			referrer = rfDocument.referrer;
		}

		return referrer;
	}

	function isDefined(val) {
		return typeof val !== 'undefined';
	}

	function isFunction(val) {
		return typeof val === 'function';
	}

	/*
	 * Fix-up domain
	 */
	function domainFixup(domain, keepPort) {
		domain = domain.replace(/^\w+:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

		if (!keepPort) {
			domain = domain.replace(/:.*$/, '');
		}

		var dl = domain.length;

		// remove trailing '.'
		if (domain.charAt(--dl) === '.') {
			domain = domain.slice(0, dl);
		}

		// remove leading '*'
		if (domain.slice(0, 2) === '*.') {
			domain = domain.slice(1);
		}

		return domain;
	}

	/*
	 * Is the host local? (i.e., not an outlink)
	 */
	function isSiteHostName(hostName) {
		var i,
			alias,
			offset;

		hostName = domainFixup(hostName.toLowerCase());

		for (i = 0; i < configHostsAlias.length; i++) {
			alias = domainFixup(configHostsAlias[i].toLowerCase());

			if (hostName === alias) {
				return true;
			}

			if (alias.slice(0, 1) === '.') {
				if (hostName === alias.slice(1)) {
					return true;
				}

				offset = hostName.length - alias.length;

				if ((offset > 0) && (hostName.slice(offset) === alias)) {
					return true;
				}
			}
		}

		return false;
	}

	/*
	 * Cross-browser helper function to add event handler
	 */
	function addEventListener(element, eventType, eventHandler, useCapture) {
		if (element.addEventListener) {
			element.addEventListener(eventType, eventHandler, useCapture);

			return true;
		}

		if (element.attachEvent) {
			return element.attachEvent('on' + eventType, eventHandler);
		}

		element['on' + eventType] = eventHandler;
	}

	/*
	 * Handler for onload event
	 */
	function loadHandler() {
		var i;

		if (!hasLoaded) {
			hasLoaded = true;
			for (i = 0; i < onLoadHandlers.length; i++) {
				onLoadHandlers[i]();
			}
		}

		return true;
	}

	/*
	 * Add onload or DOM ready handler
	 */
	function addReadyListener() {
		var _timer;

		if (rfDocument.addEventListener) {
			addEventListener(rfDocument, 'DOMContentLoaded', function ready() {
				rfDocument.removeEventListener('DOMContentLoaded', ready, false);
				loadHandler();
			});
		} else if (rfDocument.attachEvent) {
			rfDocument.attachEvent('onreadystatechange', function ready() {
				if (rfDocument.readyState === 'complete') {
					rfDocument.detachEvent('onreadystatechange', ready);
					loadHandler();
				}
			});

			if (rfDocument.documentElement.doScroll && rfWindow === rfWindow.top) {
				(function ready() {
					if (!hasLoaded) {
						try {
							rfDocument.documentElement.doScroll('left');
						} catch (error) {
							setTimeout(ready, 0);

							return;
						}
						loadHandler();
					}
				}());
			}
		}

		// sniff for older WebKit versions
		if ((new RegExp('WebKit')).test(rfNavigator.userAgent)) {
			_timer = setInterval(function () {
				if (hasLoaded || /loaded|complete/.test(rfDocument.readyState)) {
					clearInterval(_timer);
					loadHandler();
				}
			}, 10);
		}

		// fallback
		addEventListener(rfWindow, 'load', loadHandler, false);
	}

	function getClassesRegExp(configClasses, defaultClass) {
		var i,
			classesRegExp = '(^| )(rf[_-]' + defaultClass;

		if (configClasses) {
			for (i = 0; i < configClasses.length; i++) {
				classesRegExp += '|' + configClasses[i];
			}
		}

		classesRegExp += ')( |$)';

		return new RegExp(classesRegExp);
	}

	function getLinkType(className, href, isInLink) {
		// does class indicate whether it is an (explicit/forced) outlink or a download?
		var downloadPattern = getClassesRegExp(configDownloadClasses, 'download'),
			linkPattern = getClassesRegExp(configLinkClasses, 'link'),

		// does file extension indicate that it is a download?
			downloadExtensionsPattern = new RegExp('\\.(' + configDownloadExtensions + ')([?&#]|$)', 'i');

		// optimization of the if..elseif..else construct below
		return linkPattern.test(className) ? 'link' : (downloadPattern.test(className) || downloadExtensionsPattern.test(href) ? RF_DOWNLOAD : (isInLink ? 0 : RF_OUTLINK));
	}

	function processClick(sourceElement) {
		var parentElement,
			tag,
			linkType;

		parentElement = sourceElement.parentNode;
		while (parentElement !== null &&
			/* buggy IE5.5 */
			isDefined(parentElement)) {
			tag = sourceElement.tagName.toUpperCase();
			if (tag === 'A' || tag === 'AREA') {
				break;
			}
			sourceElement = parentElement;
			parentElement = sourceElement.parentNode;
		}

		if (isDefined(sourceElement.href)) {
			// browsers, such as Safari, don't downcase hostname and href
			var originalSourceHostName = sourceElement.hostname || getHostName(sourceElement.href),
				sourceHostName = originalSourceHostName.toLowerCase(),
				sourceHref = sourceElement.href.replace(originalSourceHostName, sourceHostName),
				scriptProtocol = new RegExp('^(javascript|vbscript|jscript|mocha|livescript|ecmascript|mailto):', 'i');

			// ignore script pseudo-protocol links
			if (!scriptProtocol.test(sourceHref)) {
				// track outlinks and all downloads
				linkType = getLinkType(sourceElement.className, sourceHref, isSiteHostName(sourceHostName));

				if (linkType) {
					// urldecode %xx
					sourceHref = rfDecode(sourceHref);
					tracker.trackLink(sourceHref, linkType);
				}
			}
		}
	}

	/*
	 * Handle click event
	 */
	function clickHandler(evt) {
		var button,
			target;

		evt = evt || windowAlias.event;
		button = evt.which || evt.button;
		target = evt.target || evt.srcElement;

		// Using evt.type (added in IE4), we avoid defining separate handlers for mouseup and mousedown.
		if (evt.type === 'click') {
			if (target) {
				processClick(target);
			}
		} else if (evt.type === 'mousedown') {
			if ((button === 1 || button === 2) && target) {
				lastButton = button;
				lastTarget = target;
			} else {
				lastButton = lastTarget = null;
			}
		} else if (evt.type === 'mouseup') {
			if (button === lastButton && target === lastTarget) {
				processClick(target);
			}
			lastButton = lastTarget = null;
		}
	}

	/*
	 * Add click listener to a DOM element
	 */
	function addClickListener(element, enable) {
		if (enable) {
			// for simplicity and performance, we ignore drag events
			addEventListener(element, 'mouseup', clickHandler, false);
			addEventListener(element, 'mousedown', clickHandler, false);
		} else {
			addEventListener(element, 'click', clickHandler, false);
		}
	}

	/*
	 * Add click handlers to anchor and AREA elements, except those to be ignored
	 */
	function addClickListeners(enable) {
		if (!linkTrackingInstalled) {
			linkTrackingInstalled = true;

			// iterate through anchor elements with href and AREA elements

			var i,
				ignorePattern = getClassesRegExp(configIgnoreClasses, 'ignore'),
				linkElements = rfDocument.links;

			if (linkElements) {
				for (i = 0; i < linkElements.length; i++) {
					if (!ignorePattern.test(linkElements[i].className)) {
						addClickListener(linkElements[i], enable);
					}
				}
			}
		}
	}

	/*
	 * Browser features (plugins, resolution, cookies)
	 */
	function detectBrowserFeatures() {
		var i,
			mimeType,
			pluginMap = {
				// document types
				pdf: 'application/pdf',

				// media players
				qt: 'video/quicktime',
				realp: 'audio/x-pn-realaudio-plugin',
				wma: 'application/x-mplayer2',

				// interactive multimedia
				dir: 'application/x-director',
				fla: 'application/x-shockwave-flash',

				// RIA
				java: 'application/x-java-vm',
				gears: 'application/x-googlegears',
				ag: 'application/x-silverlight'
			},
			devicePixelRatio = (new RegExp('Mac OS X.*Safari/')).test(rfNavigator.userAgent) ? rfWindow.devicePixelRatio || 1 : 1;

		if (!((new RegExp('MSIE')).test(rfNavigator.userAgent))) {
			// general plugin detection
			if (rfNavigator.mimeTypes && rfNavigator.mimeTypes.length) {
				for (i in pluginMap) {
					if (Object.prototype.hasOwnProperty.call(pluginMap, i)) {
						mimeType = rfNavigator.mimeTypes[pluginMap[i]];
						browserFeatures[i] = (mimeType && mimeType.enabledPlugin) ? '1' : '0';
					}
				}
			}

			// Safari and Opera
			// IE6/IE7 navigator.javaEnabled can't be aliased, so test directly
			if (typeof navigator.javaEnabled !== 'unknown' &&
				isDefined(rfNavigator.javaEnabled) &&
				rfNavigator.javaEnabled()) {
				browserFeatures.java = '1';
			}

			// Firefox
			if (isFunction(rfWindow.GearsFactory)) {
				browserFeatures.gears = '1';
			}

			// other browser features
			browserFeatures.cookie = configCookiesDisabled ? '0' : '1';
		}

		// screen resolution
		// - only Apple reports screen.* in device-independent-pixels (dips)
		// - devicePixelRatio is always 2 on MacOSX+Retina regardless of resolution set in Display Preferences
		browserFeatures.res = rfScreen.width * devicePixelRatio + 'x' + rfScreen.height * devicePixelRatio;
	}

	/*
	 * Get cookie name with prefix and domain hash
	 */
	function getCookieName(baseName) {
		return cPrefix + baseName + '.' + siteAccount;
	}

	/*
	 * Does browser have cookies enabled (for this site)?
	 */
	function hasCookies() {
		if (configCookiesDisabled) {
			return false;
		}

		if (!isDefined(rfNavigator.cookieEnabled)) {
			var testCookieName = getCookieName('testcookie');
			setCookie(testCookieName, '1');

			return getCookie(testCookieName) === '1';
		}

		return !!rfNavigator.cookieEnabled;
	}

	/*
	 * Set cookie value
	 */
	function setCookie(cookieName, value, msToExpire) {
		if (configCookiesDisabled) {
			return;
		}

		var expiryDate;

		// relative time to expire in milliseconds
		if (msToExpire) {
			expiryDate = new Date();
			expiryDate.setTime(expiryDate.getTime() + msToExpire);
		}

		rfDocument.cookie = cookieName + '=' + rfEncode(value) +
			(msToExpire ? ';expires=' + expiryDate.toUTCString() : '') +
			(configCookiePath ? ';path=' + configCookiePath : '') +
			(configCookieDomain ? ';domain=' + configCookieDomain : '') +
			(configCookieSecure ? ';secure' : '');
	}

	/*
	 * Get cookie value
	 */
	function getCookie(cookieName) {
		if (configCookiesDisabled) {
			return 0;
		}

		var cookiePattern = new RegExp('(^|;)[ ]*' + cookieName + '=([^;]*)'),
			cookieMatch = cookiePattern.exec(rfDocument.cookie);

		return cookieMatch ? rfDecode(cookieMatch[2]) : 0;
	}

	function getVisitorCookie() {
		var cookieStr = getCookie(getCookieName(cVisitor));

		if (!cookieStr)
			return false;

		var arr = cookieStr.split('.');

		arr.id = arr[0];
		arr.first = arr[1];
		arr.last = arr[2];
		arr.count = arr[3];

		return arr;
	}

	function saveVisitorCookie(id, firstVisitTs, currentTs, totalVisits) {
		var value = id+'.'+firstVisitTs+'.'+currentTs+'.'+totalVisits;

		var date = new Date();
		date.setFullYear(date.getFullYear()+2);

		setCookie(getCookieName(cVisitor), value, date.getTime());
	}

	function getTrafficCookie() {
		return getCookie(getCookieName(cTraffic));
	}

	function saveTrafficCookie(url) {
		var date = new Date();
		date.setMonth(date.getMonth()+6);

		setCookie(getCookieName(cTraffic), url, date.getTime());
	}

	function uuid() {
		// For now use a 4 byte int (8 byte hex string).
		return randomString(8);


		// Create an rfc4122 version 4 compliant string (8-4-4-4-12).
		// 'y' should be one of (8, 9, a, b)
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16| 0,
				v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}

	function randomString(length) {
		var r,
			str = '';

		for( var i=0; i<length; i++ ) {
			r = Math.random()*16|0;
			str += r.toString(16);
		}

		return str;
	}

	/*
	 * Extract parameter from URL
	 */
	function getParameter(url, name) {
		var regexSearch = "[\\?&#]" + name + "=([^&#]*)";
		var regex = new RegExp(regexSearch);
		var results = regex.exec(url);
		return results ? rfDecode(results[1]) : '';
	}

	/*
	 * Fix-up URL when page rendered from search engine cache or translated page
	 */
	function urlFixup(hostName, href, referrer) {
		if (hostName === 'translate.googleusercontent.com') { // Google
			if (referrer === '') {
				referrer = href;
			}

			href = getParameter(href, 'u');
			hostName = getHostName(href);
		} else if (hostName === 'cc.bingj.com' || // Bing
			hostName === 'webcache.googleusercontent.com' || // Google
			hostName.slice(0, 5) === '74.6.') { // Yahoo (via Inktomi 74.6.0.0/16)
			href = rfDocument.links[0].href;
			hostName = getHostName(href);
		}

		return [hostName, href, referrer];
	}

	/*
	 * Extract hostname from URL
	 */
	function getHostName(url) {
		// scheme : // [username [: password] @] hostame [: port] [/ [path] [? query] [# fragment]]
		var e = new RegExp('^(?:(?:https?|ftp):)/*(?:[^@]+@)?([^:/#]+)'),
			matches = e.exec(url);

		return matches ? matches[1] : url;
	}

	function parseQueryString(url) {
		var qs = url.split('?')[1];
		var query = {};

		if (!qs) return query;

		var a = qs.split('&');
		var part, key, value;

		for (var i= 0, len= a.length; i<len; i++) {
			part = a[i].split('=');
			key = decodeURIComponent(part[0]);
			if (!key) continue;

			value = decodeURIComponent(part[1]);
			query[key] = value;
		}

		return query;
	}

	function getQueryString() {
		var qs = '';

		var visitor = getVisitorCookie(),
			traffic = getTrafficCookie();
		//	visitA = parseCookieValue(C.current),
		//	visit = {start:visitA[0], views:visitA[1]};

		var now = new Date();

    configReturning = true;

		if (!visitor) {
			visitor = {
				id: uuid(),
				first: now.getTime(),
				last: now.getTime(),
				count: 1
			};

      configReturning = false;

			saveVisitorCookie(visitor.id, visitor.first, visitor.last, visitor.count);
		}
    else {
      var last = new Date(parseInt(visitor.last));

      // Visits last thirty minutes.
      if (now.getTime() - last > 1800000) {
        visitor.count = parseInt(visitor.count) + 1;
      }
      visitor.last = now.getTime();

      saveVisitorCookie(visitor.id, visitor.first, visitor.last, visitor.count);
    }

		var ref = rfDocument.referrer || '';
		ref = (ref && !isSiteHostName(ref)) ? ref : 'direct';

		if (!traffic || traffic === 'direct') {// || (ref !== 'direct' && traffic !== ref) ) {
			traffic = ref;

			saveTrafficCookie(traffic);
		}

		var pageQuery = parseQueryString(rfLocation);

		qs += 'si=' + rfEncode(siteAccount) +
			'&h=' + now.getHours() + '&m=' + now.getMinutes() + '&s=' + now.getSeconds() +
			'&idv=' + rfEncode(visitor.id) +
			'&fts=' + rfEncode(visitor.first) + '&lts=' + rfEncode(visitor.last) +
		//	'&vc=' + rfEncode(visitor.count) + '&pc=' + rfEncode(visit.views) +
		//	'&cur=' + rfEncode(visit.start) +
			'&traf=' + rfEncode(purify(traffic)) +
		//	'&ses=' + rfEncode(C.session) +
		//	'&cust=' + rfEncode(C.custom||'') +
			'&uc=' + randomString(6);

    if (configCategory) {
      qs += '&cat='+configCategory;
    }

    for (var i= 0, len=configCustomVars.length; i<len; i++) {
      var o = configCustomVars[i];
      if (o && o.key && o.value) {
        qs += '&k'+i+'='+ o.key+
          '&v'+i+'='+ o.value;
      }
    }

		for( var p in browserFeatures ) {
			if (Object.prototype.hasOwnProperty.call(browserFeatures, p)) {
				qs += '&'+p+'='+browserFeatures[p];
			}
		}

		if (pageQuery['rf_src']) qs += '&csrc='+pageQuery['rf_src'];
		if (pageQuery['rf_mdm']) qs += '&cmdm='+pageQuery['rf_mdm'];
		if (pageQuery['rf_nm']) qs += '&cnm='+pageQuery['rf_nm'];

		if (userId) qs+= '&user='+userId;
        else if (pageQuery['rf_id']) qs += '&user='+pageQuery['rf_id'];

		return qs;
	}

	function apply() {
		var i, f, parameterArray;

		for( i=0; i<arguments.length; i++ ) {
			parameterArray = arguments[i];
			f = parameterArray.shift();

			if (typeof f === 'string') {
				tracker[f].apply(tracker, parameterArray);
			}
			else {
				f.apply(tracker, parameterArray);
			}
		}
	}

	function handleQueue() {
		var i, len;

		// setSiteAccount first.
		for( i=0, len=_rfq.length; i<len; i++ ) {
			if (_rfq[i][0] === 'setSiteAccount') {
				apply(_rfq[i]);
				delete _rfq[i];
			}
		}

		for( i=0, len=_rfq.length; i<len; i++ ) {
			if (_rfq[i]) {
				apply(_rfq[i]);
			}
		}

		_rfq = {
			push:apply
		};
	}

	function getImage(query) {
		var url = configTrackerUrl;

		var image = new Image(1, 1);

		image.onload = function() {

		};

		url = url + (url.indexOf('?') < 0 ? '?' : '&') + query;

		image.src = url;
	}
})();