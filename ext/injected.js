// probably not needed now that we have content scripts so forx autoloads
chrome.browserAction.onClicked.addListener(function(tab) {
	  // No tabs or host permissions needed!
	  chrome.tabs.insertCSS(null, {file: "styles.css"});
	  chrome.tabs.executeScript(null, {file: "jquery-2.1.4.min.js"});
	  chrome.tabs.executeScript(null, {file: "content_scripts.js"});
	});