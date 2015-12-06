var EXCHANGE_URL = "https://localhost:8080";
var ACCEPT_URL = "https://localhost:8080";
var FORX_CONTAINER;
var FORX_ORDER_AMOUNT;
var FAKE_RATES = {
	'usd': [{rate: 1.2}, {rate: 1.3}],
	'jpy': [{rate: 0.3}, {rate: 0.7}]
}
var FORX_RATES = FAKE_RATES;
var FORX_EXCHANGE_RATE;
var FORX_COMPUTED_AMOUNT;
var FORX_AGREE_EXCHANGE_BUTTON;
var FORX_CURRENCY_SELECTOR;
var token;
var FAKE_TOKEN = 'SUPER_SECURE_TOKEN';

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
	})
	.fail(function() {
		FORX_WIDGET.hideSpinner();
		var code = FAKE_TOKEN;
		AMAZON_DOM_INTERACTOR.enterGiftCardCode(code);
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
			    	'ForX',
			    '</div>',
			    '<div id="forx-profile">',
			      '<div id="forx-profile-picture"></div>',
			      '<div id="forx-profile-name">ForX User</div>',
			    '</div>',
			    '<div id="forx-not-on-amazon">Rates will show up when you are on an Amazon checkout page.</div>',
			    '<div class="forx-hidden show-on-checkout">',
			      'Currency: ',
			      '<select id="forx-currency-selector">',
			      	'<option value="usd" selected>USD</option>',
					'<option value="jpy">JPY</option>',
			      '</select>',
			    '</div>',
			    '<div class="forx-hidden show-on-checkout">',
			      'Order amount: <span id="forx-order-amount"></span>',
			    '</div>',
			    '<div class="forx-hidden show-on-checkout">',
			      'Exchange rate: <span id="forx-exchange-rate"></span>',
			    '</div>',
			    '<div class="forx-hidden show-on-checkout">',
			      'Local amount: <span id="forx-computed-amount"></span>',
			    '</div>',
			    '<div class="forx-hidden show-on-checkout">',
			      '<button id="forx-agree-exchange">Agree</button>',
			    '</div>',
			    '<div id="forx-gift-card-code"></div>',
			    '<div id="forx-timer"></div>',
			    '<div id="forx-spinner"></div>',
			  '</div>'
			];
			var html = template.join('');
			$('body').append(html);

			// store elements we will access later
			FORX_CONTAINER = $('body #forx-container');
			FORX_ORDER_AMOUNT = FORX_CONTAINER.find('#forx-order-amount')
			FORX_EXCHANGE_RATE = FORX_CONTAINER.find('#forx-exchange-rate');
			FORX_COMPUTED_AMOUNT = FORX_CONTAINER.find('#forx-computed-amount');
			FORX_SPINNER = FORX_CONTAINER.find('#forx-spinner');

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
			currencyCode = currencyCode || FORX_WIDGET.getUserSelectedCurrency() || 'usd';

			var total = AMAZON_DOM_INTERACTOR.getOrderTotal();
			if (total === null) {
				return null;
			}

			var rates = FORX_RATES[currencyCode.toLowerCase()];
			if (typeof rates === "undefined" || rates.length === 0) {
				return null;
			}

			var rate = rates[0].rate;

			FORX_ORDER_AMOUNT.text(total);
			FORX_EXCHANGE_RATE.text(rate);
			FORX_COMPUTED_AMOUNT.text((total * rate).toFixed(2));

			unHideElement('.show-on-checkout');
			hideElement('.forx-not-on-amazon');
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

var FORX_NETWORK = (function() {
	return {
		/*
		 * Fetches a map of exchange rates from server.
		 * TODO: align with server schema
		 */
		fetchExchangeRates: function() {
			return $.post(EXCHANGE_URL, function(data) {
				FORX_RATES = data;
			})
		},
		getGiftCardCode: function(token) {
			return $.post(ACCEPT_URL, {
				token: token
			});
		},
	}
}());

FORX_WIDGET.buildInitialPage();
FORX_NETWORK.fetchExchangeRates();
// updateRateInForX();
// console.log("Total order is: " + getOrderTotal());
// enterGiftCardCode('GIFT');