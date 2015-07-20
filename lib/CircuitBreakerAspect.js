'use strict';
var Promise = Promise || require('bluebird');

var CircuitBreaker = require('circuit-breaker-js');

module.exports = CircuitBreakerAspect;

function CircuitBreakerAspect(options, fallback) {
	options = options || {};
	options.timeoutDuration = options.timeoutDuration || 3000;
	var breaker = new CircuitBreaker(options);
	var isFallback = typeof(fallback) === 'function';
	this.pre = function (opts) {
		var newFunction = function () {
			var args = Array.prototype.slice.call(arguments);
			return new Promise(function (resolve, reject) {
				breaker.run(
					function (success, failure) {
						Promise.method(opts.originalFunction)
							.apply(undefined, args)
							.timeout(options.timeoutDuration)
							.then(function(res){
								resolve(res);
								success();
							})
							.catch(function(err){
								reject(err);
								failure();
							});
					},
					function(){
						if(isFallback){
							resolve(fallback.apply(undefined, args));
						}else{
							reject(new Error("Circuit breaker is open"));
						}
					}
				);

			});
		};

		return Promise.resolve({newFunction: newFunction});
	}
}




//function CircuitBreakerAspect(options, fallback) {
//	var breaker = new CircuitBreaker(function(){}, options);
//	var isFallback = typeof(fallback) === 'function';
//	this.pre = function (opts) {
//		breaker.setFunction(opts.originalFunction);
//		return Promise.resolve({newFunction: breaker.invoke.bind(breaker)});
//	}
//}