var EXCHANGE_URL = "https://localhost:8080";
var ACCEPT_URL = "https://localhost:8080";
var FORX_CONTAINER;
var FORX_ORDER_AMOUNT;
var FAKE_RATES = {
	'sgd': {rate: 1.2, datetime: new Date()},
	'jpy': {rate: 9.7, datetime: new Date()}
};
var FORX_RATES = {};
var FORX_RATES_DATETIME;
var FORX_EXCHANGE_RATE;
var FORX_EXCHANGE_RATE_TIME;
var FORX_COMPUTED_AMOUNT;
var FORX_AGREE_EXCHANGE_BUTTON;
var FORX_CURRENCY_SELECTOR;
var FORX_GIFT_CARD_CODE;
var FORX_TIMER;
var FORX_TIMER_EXPIRED;
var token;
var FAKE_TOKEN = 'SUPER_SECURE_TOKEN';
var SECONDS_TO_EXPIRE = 15;

/*
 * Event listeners
 */
/*
 * Set up a listener that periodically checks if the order total is available,
 * and if so, pdate the ForX widget with the rates.
 * We really should use the mutation api, but hey this is a hackathon and I'm too lazy to learn it :P
 */
var LISTEN_INTERVAL = 1000; /* ms */
var setUpListenerForOrderTotal = function() {
	var timeoutId = null;
	var listener = function() {
		var total = AMAZON_DOM_INTERACTOR.getOrderTotal();
		if (total === null) {
			timeoutId = window.setTimeout(listener, LISTEN_INTERVAL);
		} else {
			if (timeoutId !== null) {
				// window.clearTimeout(timeoutId);
				// we don't clear timeout because the user can change the params,
				// and we want to update the widget when it does.
			}
			FORX_WIDGET.updateRateInForX();
		}
	};

	timetoutId = window.setTimeout(listener);
}

var agreeExchange = function(evt) {
	FORX_WIDGET.showSpinner();
	FORX_NETWORK.getGiftCardCode()
	.done(function(data) {
		FORX_WIDGET.hideSpinner();
		var code = data['code'];
		AMAZON_DOM_INTERACTOR.enterGiftCardCode(code);
		FORX_WIDGET.showGiftCode(code);
		FORX_WIDGET.showTimer();
	})
	.fail(function() {
		FORX_WIDGET.hideSpinner();
		var code = FAKE_TOKEN;
		AMAZON_DOM_INTERACTOR.enterGiftCardCode(code);
		FORX_WIDGET.showGiftCode(code);
		FORX_WIDGET.showTimer();
	})
};

/*
 * Helper methods
 */
var FORX_HIDDEN_CLASS = 'forx-hidden';
var hideElement = function(sel) { $(sel).addClass(FORX_HIDDEN_CLASS); }
var unHideElement = function(sel) { $(sel).removeClass(FORX_HIDDEN_CLASS); }

var FORX_WIDGET = (function() {
	return {
		/*
		 * Constructs the html needed to build our ForX widget and injects it onto the page
		 */

		buildInitialPage: function() {
			var template = [
			  '<div id="forx-container">',
			    '<div id="forx-title">',
			    	'<img src="https://dl.dropboxusercontent.com/u/98123609/logo.png" width="100px"/>',
			    '</div>',
			    '<div id="forx-profile">',
			      '<div id="forx-profile-picture">',
			      	'<img width="150" src="https://dl.dropboxusercontent.com/u/104915413/forx.jpg" />',
			      '</div>',
			      '<div id="forx-profile-name">Jake</div>',
			    '</div>',
			    '<div id="forx-not-on-amazon">Rates will show up when you are on an Amazon checkout page.</div>',
			    '<p class="forx-hidden show-on-checkout">',
			      'Currency: ',
			      '<select id="forx-currency-selector">',
			      	'<option value="sgd" selected>SGD</option>',
					'<option value="jpy">JPY</option>',
			      '</select>',
			    '</p>',
			    '<p class="forx-hidden show-on-checkout">',
			      'Order amount: <span id="forx-order-amount"></span>',
			    '</p>',
			    '<p class="forx-hidden show-on-checkout">',
			      'Exchange rate: <span id="forx-exchange-rate"></span> ',
				'<span id="forx-exchange-rate-time-parent" class="forx-hidden show-on-checkout">',
			      'as of <span id="forx-exchange-rate-time"></span> EST',
			    '</span>',
			    '</p>',
			    '<p class="forx-hidden show-on-checkout">',
			      'Local amount: <span id="forx-computed-amount"></span>',
			    '</p>',
			    '<div id="forx-agree-exchange-parent" class="forx-hidden show-on-checkout">',
			      '<button id="forx-agree-exchange">Agree</button>',
			    '</div>',
			    '<div class="forx-hidden">',
			    	'Your gift card code is <span id="forx-gift-card-code"></span>',
			    '</div>',
			    '<div class="forx-hidden">',
			    	'You have <span id="forx-timer">' + SECONDS_TO_EXPIRE + '</span> seconds to use this code.',
			    '</div>',
			    '<div id="forx-timer-expired" class="forx-hidden">The code has expired, please refresh the page.',
			    '</div>',
			    '<div id="forx-spinner"></div>',
			    '<div id="forx-success-gift-card-code" class="hidden">Successfully applied code.</div>',
			  '</div>'
			];
			var html = template.join('');
			$('body').append(html);

			// store elements we will access later
			FORX_CONTAINER = $('body #forx-container');
			FORX_ORDER_AMOUNT = FORX_CONTAINER.find('#forx-order-amount')
			FORX_EXCHANGE_RATE = FORX_CONTAINER.find('#forx-exchange-rate');
			FORX_EXCHANGE_RATE_TIME = FORX_CONTAINER.find('#forx-exchange-rate-time');
			FORX_COMPUTED_AMOUNT = FORX_CONTAINER.find('#forx-computed-amount');
			FORX_SPINNER = FORX_CONTAINER.find('#forx-spinner');
			FORX_GIFT_CARD_CODE = FORX_CONTAINER.find('#forx-gift-card-code');
			FORX_TIMER = FORX_CONTAINER.find('#forx-timer');
			FORX_TIMER_EXPIRED = FORX_CONTAINER.find('#forx-timer-expired');

			// add change listener to currency selector
			FORX_CURRENCY_SELECTOR = FORX_CONTAINER.find('#forx-currency-selector');
			FORX_CURRENCY_SELECTOR.change(function() {
				FORX_WIDGET.updateRateInForX($(this).val());
			});

			// add click listener to the agree button
			FORX_AGREE_EXCHANGE_BUTTON = FORX_CONTAINER.find('#forx-agree-exchange');
			FORX_AGREE_EXCHANGE_BUTTON.click(agreeExchange);

			// amazon uses some JS to change pages, and the order total doesnt show up until you select
			// your shipping address and payment method, so we do a hacky way to only make the calls
			// to get the rates when the user is at the step where the order total is available
			setUpListenerForOrderTotal();
		},
		showSpinner: function() { FORX_SPINNER.text('Loading...'); },
		hideSpinner: function() { FORX_SPINNER.text(''); },
		getUserSelectedCurrency: function() {
			return FORX_CURRENCY_SELECTOR.val();
		},
		/*
		 * Updates the fields in ForX widget with the
		 *   1. Order amount
		 *   2. Exchange rate
		 *   3. Local amount
		 */
		updateRateInForX: function(currencyCode) {
			currencyCode = currencyCode || FORX_WIDGET.getUserSelectedCurrency() || 'sgd';

			FORX_NETWORK.fetchOneExchangeRate(currencyCode, function() {
				console.log('callbacked');

				var total = AMAZON_DOM_INTERACTOR.getOrderTotal();
				if (total === null) {
					return null;
				}

				var rates = FORX_RATES[currencyCode.toLowerCase()];
				if (typeof rates === "undefined" || rates.length === 0) {
					return null;
				}

				// var rate = rates[0].rate;
				var rateData = FORX_RATES[currencyCode];
				var rate = rateData.rate;
				FORX_ORDER_AMOUNT.text(total);
				FORX_EXCHANGE_RATE.text(rate);
				FORX_COMPUTED_AMOUNT.text((total * rate).toFixed(2));
				FORX_EXCHANGE_RATE_TIME.text(rateData.datetime.toTimeString().slice(0, 5));

				unHideElement('.show-on-checkout');
				hideElement('#forx-not-on-amazon');

			});
		},
		showGiftCode: function(code) {
			FORX_GIFT_CARD_CODE.text(code);
			unHideElement(FORX_GIFT_CARD_CODE.parent());
			FORX_AGREE_EXCHANGE_BUTTON.attr('disabled', true);
			FORX_CURRENCY_SELECTOR.attr('disabled', true);
		},
		showTimer: function(code) {
			var secondsLeft = SECONDS_TO_EXPIRE;
			var intervalId = null;
			console.log(FORX_TIMER);
			var timer = (function() {
				intervalId = window.setInterval(function() {
					if (secondsLeft <= 0) {
						window.clearInterval(intervalId);
						FORX_WIDGET.timerExpired();
					} else {
						secondsLeft -= 1;
						FORX_TIMER.text(secondsLeft);
					}
				}, 1000);
			}());
			unHideElement(FORX_TIMER.parent());
		},
		timerExpired: function() {
			hideElement(FORX_TIMER.parent());
			hideElement(FORX_GIFT_CARD_CODE.parent());
			unHideElement(FORX_TIMER_EXPIRED);
		}
	}
}());
/*
 * Main object to interact Amazon's page
 */
var AMAZON_DOM_INTERACTOR = (function() {
	return {
		enterGiftCardCode: function(giftCardCode) {
			if (typeof giftCardCode === "undefined" || giftCardCode === null) {
				return false;
			}
			var giftCardInput = $('#payment form input[type="text"].pmts-claim-code');
			if (giftCardInput.length === 0) {
				giftCareInput = $('form#form-add-giftcard-promotion input[type=text][name=claimcode]');
				if (giftCardInput.length === 0) {
					return false;
				}
			}

			giftCardInput.val(giftCardCode);
			return true;
		},
		/*
		 * Read the DOM and get the subtotal
		 * returns a Float
		 */
		getOrderTotal: function() {
			var orderTd = $('#subtotals table tbody tr:last-child td:last-child');
			if (orderTd.length === 0) {
				return null;
			}

			var dirtyAmount = orderTd[0].innerText;
			var MONEY_RE = /\d+\.\d+/;
			var matches = dirtyAmount.match(MONEY_RE);
			if (matches == null || matches.length <= 0) {
				return null;
			}

			return parseFloat(matches[0]);
		}
	}
}());

var DONE_FETCH = true;
var FORX_NETWORK = (function() {
	return {
		fetchOneExchangeRate: function(to, callback) {
			var port = chrome.runtime.connect({name: "FETCH_EXCHANGE_RATES"});
			port.postMessage({
				type: "FETCH_EXCHANGE_RATES",
				email: 'email',
				from: 'usd',
				to: to
			});
			port.onMessage.addListener(function(msg) {
				if (msg.serverResponseType === "ONE_RATE") {
					var rate = msg.data['CurRate' + to.toUpperCase()] || '0.88';
					FORX_RATES[to] = {
						rate: parseFloat(rate).toFixed(2),
						datetime: new Date()
					}
					console.log(FORX_RATES['sgd'].rate);
					callback()
				}
			});
		},
		// this was used when i thought the endpoint returned ALL exchange rates supported,
		// but ended up being an endpoint we have to specify we want the currency to convert INTO
		fetchExchangeRates: function() {
			if (FORX_RATES === null) {
				if (DONE_FETCH === true) {
					DONE_FETCH = false;
					var port = chrome.runtime.connect({name: "FETCH_EXCHANGE_RATES"});
					port.postMessage({
						type: "FETCH_EXCHANGE_RATES",
						email: 'email',
						from: from,
						to: to
					});
					port.onMessage.addListener(function(msg) {
						if (msg.serverResponseType === "RATES") {
							console.log(msg.data);
							FORX_RATES = msg.data;
							FORX_RATES_DATETIME = new Date();
							DONE_FETCH = true;
						}
					})
					console.log('sending message');	
					chrome.runtime.sendMessage({type: "FETCH_EXCHANGE_RATES"}, function(response) {
						// response is the object hat is sent back
					})		
				}
			}
		},
		getGiftCardCode: function(token) {
			return $.post(ACCEPT_URL, {
				token: token
			});
		},
	}
}());

FORX_WIDGET.buildInitialPage();
// updateRateInForX();
// console.log("Total order is: " + getOrderTotal());
// enterGiftCardCode('GIFT');