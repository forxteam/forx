var EXCHANGE_URL = "https://localhost:8080";
var ACCEPT_URL = "https://localhost:8080";
var FORX_CONTAINER;
var FORX_ORDER_AMOUNT;
var FORX_EXCHANGE_RATE;
var FORX_COMPUTED_AMOUNT;
var FORX_AGREE_EXCHANGE_BUTTON;
var token;
var FAKE_TOKEN = 'SUPER_SECURE_TOKEN';

var buildInitialPage = function() {
	var template = [
	  '<div id="forx-container">',
	    '<div id="forx-title">',
	    	'ForX',
	    '</div>',
	    '<div id="forx-profile">',
	      '<div id="forx-profile-picture"></div>',
	      '<div id="forx-profile-name">ForX User</div>',
	    '</div>',
	    '<div id="forx-not-on-amazon">Go to an Amazon checkout page</div>',
	    '<div class="">',
	      'Order amount: <span id="forx-order-amount"></span>',
	    '</div>',
	    '<div class="">',
	      'Exchange rate: <span id="forx-exchange-rate"></span>',
	    '</div>',
	    '<div class="">',
	      'Local amount: <span id="forx-computed-amount"></span>',
	    '</div>',
	    '<div class="">',
	      '<button id="forx-agree-exchange">Agree</button>',
	    '</div>',
	    '<div id="forx-gift-card-code"></div>',
	    '<div id="forx-timer"></div>',
	    '<div id="forx-spinner"></div>',
	  '</div>'
	];
	var html = template.join('');
	$('body').append(html);

	FORX_CONTAINER = $('body #forx-container');
	FORX_ORDER_AMOUNT = FORX_CONTAINER.find('#forx-order-amount')
	FORX_EXCHANGE_RATE = FORX_CONTAINER.find('#forx-exchange-rate');
	FORX_COMPUTED_AMOUNT = FORX_CONTAINER.find('#forx-computed-amount');
	FORX_AGREE_EXCHANGE_BUTTON = FORX_CONTAINER.find('#forx-agree-exchange');
	FORX_AGREE_EXCHANGE_BUTTON.click(agreeExchange);
	FORX_SPINNER = FORX_CONTAINER.find('#forx-spinner');
}

var agreeExchange = function(evt) {
	showSpinner();
	getGiftCardCode()
	.done(function(data) {
		hideSpinner();
		var code = data['code'];
		enterGiftCardCode(code);
	})
	.fail(function() {
		hideSpinner();
		var code = FAKE_TOKEN;
		enterGiftCardCode(code);
	})
	// add lockin styles?
};

var getGiftCardCode = function(token) {
	return $.post(ACCEPT_URL, {
		token: token
	});
};

var showSpinner = function() {
	FORX_SPINNER.text('Loading...');
};

var hideSpinner = function() {
	FORX_SPINNER.text('');
}

var updateRateInForX = function() {
	var total = getOrderTotal();
	if (total === null) {
		return null;
	}
	console.log(total);

	getExchangeRate(total, 'USD')
	.done(function(data) {
		token = data['token'];
		var exchangeRate = parseFloat(data['exchangeRate']);
		FORX_ORDER_AMOUNT.text(total);
		FORX_EXCHANGE_RATE.text(exchangeRate);
		FORX_COMPUTED_AMOUNT.text(total * exchangeRate);
	})
	.fail(function() {
		token = 'SUPER_SECURE_TOKEN';
		var exchangeRate = 1.20; // fake data
		FORX_ORDER_AMOUNT.text(total);
		FORX_EXCHANGE_RATE.text(exchangeRate);
		console.log(exchangeRate);
		FORX_COMPUTED_AMOUNT.text((total * exchangeRate).toFixed(2));
	})
}

var getExchangeRate = function(amount, toCurrency) {
	return $.post(
		EXCHANGE_URL, {
			amount: amount,
			toCurrency: toCurrency
		})
}

/*
 * Read the DOM and get the subtotal
 * returns a Float
 */
var getOrderTotal = function() {
	var orderTd = $('#subtotals table tbody tr:last-child td:last-child');
	if (orderTd.length === 0) {
		return null;
	}

	var dirtyAmount = orderTd[0].innerText;
	var MONEY_RE = /\d+\.\d+/;
	var matches = dirtyAmount.match(MONEY_RE);
	if (matches.length <= 0) {
		return null;
	}

	return parseFloat(matches[0]);
}

var enterGiftCardCode = function(giftCardCode) {
	if (typeof giftCardCode === "undefined" || giftCardCode === null) {
		return false;
	}
	var giftCardInput = $('#payment form input[type="text"].pmts-claim-code');
	if (giftCardInput.length === 0) {
		return false;
	}

	giftCardInput.val(giftCardCode);
	return true;
}

buildInitialPage();
updateRateInForX();
// console.log("Total order is: " + getOrderTotal());
// enterGiftCardCode('GIFT');