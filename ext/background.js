var RATES_URL = "http://www.multidom.net/forxtest/main/getrates/";
var DEFAULT_DATA = {"Result":"1","Date":"2015\/12\/06 13:14:58","ipIni":"65.206.95.146","UserEmail":"email","TransKey":"73FLStbJohEhs","TransID":"67","CurrencyID":"1","CurrencyFrom":"usd","CurrencyTo":"","CurRateUSD":"0.00","CurRateSGD":"2.00"}
chrome.runtime.onConnect.addListener(function(port) {
	port.onMessage.addListener(function(msg) {
		if (msg.type = "FETCH_EXCHANGE_RATES") {
			console.log('fetching');
			$.post(RATES_URL, {
				'UserEmail': msg.email,
				'Amount': 5.00,  // server doesnt read this
				'CurrencyFrom': msg.from,
				'CurrencyTo': msg.to,
			})
			.done(function(data) {
				console.log("SUCCESS");
				port.postMessage({
					serverResponseType: "ONE_RATE",
					data: JSON.parse(data)
				});
			})
			.fail(function(data) {
				console.log("FAIL");
				port.postMessage({
					serverResponseType: "ONE_RATE",
					data: DEFAULT_DATA
				});
			})
		}
	})
})