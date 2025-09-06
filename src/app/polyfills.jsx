// Enhanced polyfills for Chrome 109 compatibility
import 'core-js/stable';
import 'whatwg-fetch';

// Additional polyfills for Chrome 109
import 'core-js/features/array/includes';
import 'core-js/features/array/find';
import 'core-js/features/array/find-index';
import 'core-js/features/object/assign';
import 'core-js/features/promise';
import 'core-js/features/string/includes';
import 'core-js/features/string/starts-with';
import 'core-js/features/string/ends-with';

// URLSearchParams polyfill for older Chrome
if (typeof URLSearchParams === 'undefined') {
  require('core-js/features/url-search-params');
}

// Intersection Observer polyfill
if (typeof IntersectionObserver === 'undefined') {
  import('intersection-observer');
}

// ResizeObserver polyfill
if (typeof ResizeObserver === 'undefined') {
  import('@juggle/resize-observer').then(module => {
    window.ResizeObserver = module.ResizeObserver;
  });
}

// CSS Custom Properties polyfill for Chrome 109
if (typeof CSS === 'undefined' || !CSS.supports || !CSS.supports('--fake-var', '0')) {
  import('css-vars-ponyfill').then(module => {
    module.default({
      // Only run on older browsers
      onlyLegacy: true,
      watch: true
    });
  });
}

// Smooth scrolling polyfill
if (!('scrollBehavior' in document.documentElement.style)) {
  import('smoothscroll-polyfill').then(module => {
    module.polyfill();
  });
}

// Element.closest() polyfill
if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// Element.matches() polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches = 
    Element.prototype.matchesSelector || 
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector || 
    Element.prototype.oMatchesSelector || 
    Element.prototype.webkitMatchesSelector ||
    function(s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s);
      var i = matches.length;
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1;
    };
}

// Custom Event polyfill
if (typeof CustomEvent !== 'function') {
  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }
  window.CustomEvent = CustomEvent;
}

// Object.entries polyfill
if (!Object.entries) {
  Object.entries = function(obj) {
    var ownProps = Object.keys(obj);
    var i = ownProps.length;
    var resArray = new Array(i);
    while (i--) {
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    }
    return resArray;
  };
}

// Object.values polyfill
if (!Object.values) {
  Object.values = function(obj) {
    var keys = Object.keys(obj);
    var values = [];
    for (var i = 0; i < keys.length; i++) {
      values.push(obj[keys[i]]);
    }
    return values;
  };
}

// Array.from polyfill
if (!Array.from) {
  Array.from = function(arrayLike, mapFn, thisArg) {
    var C = this;
    var items = Object(arrayLike);
    if (arrayLike == null) {
      throw new TypeError('Array.from requires an array-like object - not null or undefined');
    }
    var mapFunction = mapFn === undefined ? undefined : mapFn;
    var T;
    if (typeof mapFunction !== 'undefined') {
      if (typeof mapFunction !== 'function') {
        throw new TypeError('Array.from: when provided, the second argument must be a function');
      }
      if (arguments.length > 2) {
        T = thisArg;
      }
    }
    var len = parseInt(items.length);
    var A = typeof C === 'function' ? Object(new C(len)) : new Array(len);
    var k = 0;
    var kValue;
    while (k < len) {
      kValue = items[k];
      if (mapFunction) {
        A[k] = typeof T === 'undefined' ? mapFunction(kValue, k) : mapFunction.call(T, kValue, k);
      } else {
        A[k] = kValue;
      }
      k += 1;
    }
    A.length = len;
    return A;
  };
}

// Console polyfill for older browsers
if (typeof console === 'undefined') {
  window.console = {
    log: function() {},
    warn: function() {},
    error: function() {},
    info: function() {},
    debug: function() {}
  };
}

