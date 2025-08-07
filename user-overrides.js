
// 0815: disable tab-to-search [FF85+]
user_pref("browser.urlbar.suggest.engines", false);

// 1223: enable strict PKP (Public Key Pinning) 0=disabled, 1=allow user MiTM (default; such as your antivirus), 2=strict
user_pref("security.cert_pinning.enforcement_level", 0); 

// 5003: disable saving passwords
user_pref("signon.rememberSignons", false); 

// 5010: disable location bar suggestion types
user_pref("browser.urlbar.suggest.recentsearches", false);
user_pref("browser.urlbar.suggest.history", false);
user_pref("browser.urlbar.suggest.bookmark", false);
user_pref("browser.urlbar.suggest.openpage", false);
user_pref("browser.urlbar.suggest.topsites", false); // [FF78+]

// 5012: disable location bar autofill
user_pref("browser.urlbar.autoFill", false);

// 5013: disable browsing and download history
user_pref("places.history.enabled", false);

// 5014: disable Windows jumplist [WINDOWS] 
user_pref("browser.taskbar.lists.enabled", false);
user_pref("browser.taskbar.lists.frequent.enabled", false);
user_pref("browser.taskbar.lists.recent.enabled", false);
user_pref("browser.taskbar.lists.tasks.enabled", false);

// 5017: disable Form Autofill
user_pref("extensions.formautofill.addresses.enabled", false); // [FF55+]
user_pref("extensions.formautofill.creditCards.enabled", false); // [FF56+]
user_pref("signon.rememberSignons", false);

// 5020: disable Windows native notifications and use app notications instead [FF111+] [WINDOWS] ***/
user_pref("alerts.useSystemBackend.windows.notificationserver.enabled", false);

// 7001: disable APIs
user_pref("full-screen-api.enabled", false); 

// 7002: set default permissions 0=always ask (default), 1=allow, 2=block
user_pref("permissions.default.geo", 2);
user_pref("permissions.default.camera", 2);
user_pref("permissions.default.microphone", 2);
user_pref("permissions.default.desktop-notification", 2);
user_pref("permissions.default.xr", 2);

// 4501: enable RFP
user_pref("privacy.resistFingerprinting", true); 
user_pref("privacy.resistFingerprinting.pbmode", true); 
user_pref("privacy.resistFingerprinting.letterboxing", true); 
user_pref("privacy.resistFingerprinting.letterboxing.dimensions", ""); 
user_pref("privacy.resistFingerprinting.exemptedDomains", "*.example.invalid");
user_pref("privacy.fingerprintingProtection.overrides", "+AllTargets,-JSDateTimeUTC");
