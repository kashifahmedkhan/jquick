// jQuick - http://www.codingjack.com/playground/jquick/
// © Jason McElwaine aka CodingJack - http://codecanyon.net/user/CodingJack
// License: http://creativecommons.org/licenses/by-sa/3.0/deed.en_US
// 25kb minified, http://www.codingjack.com/playground/jquick/js/jquick.min.js

;(function() {
  
	'use strict';
	if(window.jQuick) return;
	
	var browser, version,
	win = window, doc = document, nav = navigator,
	
	modern = 'addEventListener' in win,
	agent = nav.userAgent.toLowerCase(),
	query = 'getElementsByClassName' in doc,
	cancel = timeline('Cancel', 'AnimationFrame'),
	request = timeline('Request', 'AnimationFrame'),
	compute = win.getComputedStyle ? win.getComputedStyle : null,
	
	swipeThreshold = 30,
	dictionary = [],
	cached = [],
	
	engineRunning,
	length = 0,
	startTouch,
	moveTouch,
	endTouch,
	bodies,
	timer,
	touch,
	temp;
	
	if('ontouchend' in win) {
		
		touch = true;
		startTouch = 'touchstart';
		moveTouch = 'touchmove';
		endTouch = 'touchend';
		
	}
	else if(nav.msMaxTouchPoints) {
	
		touch = true;
		startTouch = 'MSPointerDown';
		moveTouch = 'MSPointerMove';
		endTouch = 'MSPointerUp';
		
	}
	
	// only use RAF if both request AND cancel are supported
	if(!request || !cancel) request = cancel = null;
	
	// jQuick wrapper
	// (selector:*, scope:HTMLElement = null)
	var jQuick = win.jQuick = function(selector, scope) {
		
		// handles multiple selectors
		return checkInstance(!checkType(selector) ? (checkSelector(selector, scope || doc) || []) : selector);
		
	};
	
	// plugin instantiation, hooks a function into into jQuick Object
	// Example: jQuick.fn('myPluginName', function() { return this.each(function() { /* plugin stuff */ }) });
	jQuick.fn = function(type, func) {
		
		Instance.prototype[type] = func;
		
	};
	
	// merge obj2 into obj1
	// (obj:Object, sets:Object)
	jQuick.extend = function(obj, sets) {
		
		for(var prop in sets) {
			
			if(sets.hasOwnProperty(prop)) {
			
				obj[prop] = sets[prop];
				
			}
			
		}
		
		return obj;
		
	};
	
	// Stop all running tweens
	// (complete:Boolean = false)
	jQuick.stopAll = function(complete) {
		
		length = 0;
		(cancel) ? cancel(engine) : clearInterval(timer);
		
		var i = dictionary.length;
		while(i--) dictionary[i].stop(complete, false, true, true);
		
		dictionary = [];
		engineRunning = false;
		
	};
	
	// set the default easing function	
	// (easing:String)
	jQuick.setEase = function(easing) {
		
		var ar = easing.toLowerCase().split('.');
		
		if(ar.length < 2) return;
		if(!PennerEasing[ar[0]]) return;
		if(!PennerEasing[ar[0]][ar[1]]) return;
		
		defaultEase = easing;
		
	};
	
	// set the default transition duration
	// (num:Int)
	jQuick.setDuration = function(num) {
	
		defaultDuration = num;
		
	};
	
	// returns 'ontouchend' in window
	jQuick.touchEnabled = touch;
	
	// if CSS3 transitions are supported, returns the transitionEnd Event name
	jQuick.transitions = function() {
		
		if(!temp) temp = doc.createElement('span').style;
		
		if('WebkitTransition' in temp) {
			
			return {property: '-webkit-transition', end: 'webkitTransitionEnd'};
			
		}
		else if('MozTransition' in temp) {
		
			return {property: '-moz-transition', end: 'transitionend'};
			
		}
		else if('MSTransition' in temp) {
		
			return {property: '-ms-transition', end: 'transitionend'};
			
		}
		else if('OTransition' in temp) {
		
			return {property: '-o-transition', end: 'otransitionend'};
			
		}
		else if('transition' in temp) {
			
			return {property: 'transition', end: 'transitionend'};
			
		}
		
		return null;

	};
	
	// returns CSS3 Transform Property
	jQuick.transforms = function() {
		
		if(!temp) temp = doc.createElement('span').style;
		
		if('WebkitTransform' in temp) {
	
			return 'WebkitTransform';
			
		}
		else if('MozTransform' in temp) {
		
			return 'MozTransform';
			
		}
		else if('msTransform' in temp) {
		
			return 'msTransform';
			
		}
		else if('OTransform' in temp) {
		
			return 'OTransform';
			
		}
		else if('transform' in temp) {
			
			return 'transform';
			
		}
		
		return null;
		
	};
	
	// returns the current browser, chrome and safari are returned separately as opposed to just returning 'webkit'
	jQuick.browser = function() {
		
		if(!browser) {
	
			browser = agent.search('firefox') !== -1 ? 'firefox' :
					  agent.search('webkit') !== -1 ? 'webkit' :
					  agent.search('opera') !== -1 ? 'opera' :
					  agent.search('msie') !== -1 ? 'msie' :
					  null;
			
			if(browser === 'webkit') browser = agent.search('chrome') !== -1 ? 'chrome' : 'safari';
			
		}
		
		return browser;
		
	};
	
	// returns the current browser version for the 5 major browsers
	jQuick.version = function() {
		
		if(typeof version === 'undefined') {
		
			var index;
			
			switch(browser) {
				
				case 'msie':
				
					version = parseInt(agent.substr(agent.indexOf('msie') + 4), 10);
				
				break;
				
				case 'safari':
				
					index = agent.indexOf('version') + 8;
					version =  parseInt(agent.substr(index, index + 4), 10);
					
				break;
				
				case 'opera':
				
					index = agent.indexOf('version') + 8;
					version =  parseInt(agent.substr(index, index + 4), 10);
				
				break;
				
				case 'chrome':
					
					index = agent.indexOf('chrome') + 7;
					version =  parseInt(agent.substr(index, index + 4), 10);
				
				break;
				
				case 'firefox':
					
					version =  parseInt(agent.substr(agent.indexOf('firefox') + 8), 10);
				
				// end switch
				
			}
			
		}
		
		return version;
		
	};
	
	// returns iOS, Android or null
	jQuick.mobile = function() {
		
		if(!touch) {
			
			return null;	
			
		}
		else {
			
			if(agent.search('iphone') !== -1 || agent.search('ipad') !== -1 || agent.search('ipod') !== -1) {
				
				return 'ios';
				
			}
			else if(agent.search('android') !== -1 || agent.search('applewebkit') !== -1) {
			
				return 'android';
				
			}
			
		}
		
		return null;
		
	};
	
	// remove empty whitespace from beginning and end of a string
	// (st:String) 
	var trim = jQuick.trim = function(st) {
		
		if(!st) return '';
		return st.replace(/^\s+|\s+$/g, '');
		
	},
	
	defaultEase = jQuick.defaultEase = 'Quint.easeOut',
	defaultDuration = jQuick.defaultDuration = 500,
	intervalSpeed = getSpeed(),
	
	ie8 = jQuick.ie8 = browser === 'msie' && version < 9;
	
	// triggers a friendly alert if less than IE8 is detected
	if(ie8 && version < 8) {
		
		// alert('Your web browser is outdated.  Visit browsehappy.com and get a new one!!');
		return;
		
	}
	
	// Core jQuick Object, Internal
	function Instance(el) {
		
		var isNull = el.cjIsNull = checkNull(el);
		this.length = typeof el.length !== 'undefined' ? el.length : !isNull ? 1 : 0;
		
		this.element = el;
		el.cjMigrate = this;
		
	}
	
	// Core jQuick Object
	Instance.prototype = {
		
		// $(document).ready();
		ready: function(func, fonts) {
		
			var $this = this.element;
			
			if($this !== doc) return;
			if(fonts && fonts.length) this.googleFonts = fonts;
			
			if(modern) {
			
				this.one('DOMContentLoaded', func);
				
			}
			else {
				
				this.element = win;
				doc.cjMigrate = null;
				
				win.cjMigrate = this;
				this.one('load', func);
				
			}
			
			return this;
			
		},
		
		// (func:Function, args:* = null)
		// if no arguments get passed, iteration integer gets passed along
		each: function(func, args) {
			
			var $this = this.element;
			if($this.cjIsNull) return this;
			
			var leg = $this.length || 0, type = typeof args, 
			hasArgs = type !== 'undefined', 
			list = [],
			i = -1;
			
			if(!leg) {
			
				$this = [$this];
				leg = 1;
				
			}
			
			while(++i < leg) list[i] = $this[i];
			i = -1;
			
			while(++i < leg) {
				
				if(hasArgs) {
						
					if(type !== 'string') {
						
						func.apply(list[i], args);
						
					}
					else {

						func.call(list[i], args);
						
					}
					
				}
				else {
				
					func.call(list[i], i);
					
				}
				
			}
			
			return this;
			
		},
		
		// this is equivelent to $(el)[0] in jQuery
		// (index:Int = 0)
		domElement: function(index) {
			
			if(this.length) {
				
				var el = this.element;
				if(el.length) return el[index || 0];
				
				return el;
				
			}
			
			return null;
			
		},
		
		// addEventListener, event names can include or be a namespace
		// (type:String, func:Function) -- last param is used internally
		on: function(type, func, one) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length && $this !== win) return this.each(filter, ['on', type, func, one]);
			
			var selectors = type.split(' '), i = selectors.length;
			
			if(i < 2) {
				
				addListener($this, type, func, one);
				
				
			}
			else {
				
				while(i--) addListener($this, selectors[i], func, one);
				
			}
			
			return this;
			
		},
		
		// removeEventListener, event names can include or be a namespace
		// (type:String = null, func:Function = null)
		off: function(type, func) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length && $this !== win) return this.each(filter, ['off', type, func]);
			
			var ns;
			if(type) ns = type.charAt(0) === '.';
			
			if(type && !ns) {
				
				var events = $this.cjEvents;
				if(!events) return this;
				
				var selectors = type.split(' '),
				leng = selectors.length,
				leg = events.length,
				names = [],
				namespace,
				selector,
				attached,
				ar = [],
				i = leg,
				index, 
				name,
				evt,
				j;
				
				while(i--) ar[i] = events[i];
				i = leg;

				while(i--) {
				
					evt = events[i];
					name = evt[0];
					j = leng;

					while(j--) {
						
						selector = selectors[j];
						namespace = selector.split('.');

						if(namespace.length > 1) {
							
							 if(namespace[1] !== evt.namespace) continue;
							 selector = namespace[0];
							 
						}

						if(selector !== name) continue;
						index = ar.indexOf(evt);
						
						if(index === -1) continue;
						if(!func || func === evt[1]) {
							
							ar.splice(index, 1);
							names[names.length] = modern ? selector : [selector, evt.callback];
							
						}
						
					}
					
				}

				if(names.length) { 
					
					while(names.length) {
						
						selector = names[0];
						names.shift();

						if(!modern) {
						
							attached = selector[1];
							selector = selector[0];
							
						}

						if(names.indexOf(selector) === -1) {
							
							removeListener($this, selector, attached);
							
						}
						
					}
					
				}

				(ar.length) ? $this.cjEvents = ar : removeParam($this, 'cjEvents');
				
			}
			else {
				
				if(ns) ns = type.substring(1, type.length);
				removeEvents(this, $this, ns);
				
			}
			
			return this;
			
		},
		
		// attach an event that gets automatically removed after it fires
		// event name can include or be a namespace
		// (type:String, func:Function)
		one: function(type, func) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length && $this !== win) return this.each(filter, ['one', type, func]);
			
			return this.on(type, func, true);
			
		},
		
		// trigger an event, event names can include or be a namespace
		// (evt:String)
		trigger: function(evt) {
		
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length && $this !== win) return this.each(filter, ['trigger', evt]);
			
			var names = evt.split(' '), i = names.length;
			while(i--) triggerEvent($this, names[i]);
			
			return this;
			
		},
		
		// check if element has a specific event listener, event name can be namespaced
		// (type:String)
		hasEventListener: function(type) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return false;
			if($this.nodeType !== 1 && $this.length && $this !== win) {
				
				return filter.apply($this[0], ['hasEventListener', type]);
				
			}
			
			var namespace = type.charAt(0) === '.', 
			events = $this.cjEvents;
			
			if(!events) return false;
			var i = events.length, evt, ns;
			
			if(!namespace) {
			
				namespace = type.split('.');
				
				if(namespace.length > 1) {
					
					type = namespace[0];
					ns = namespace[1];
					
				}
				
			}
			else {
			
				ns = type.substring(1, type.length);
				type = null;
				
			}

			while(i--) {
			
				evt = events[i];

				if(!ns) {
				
					if(evt[0] === type) return true;
					
				}
				else if(ns && type) {
				
					if(evt[0] === type && evt.namespace === ns) return true;
					
				}
				else if(evt.namespace === ns) {
					
					return true;
					
				}
				
			}

			return false;
			
		},
		
		// get all decending elements of a given element
		// (selector:String = null)
		children: function(selector) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return new Instance([]);
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['children', selector]);
			if(!$this.hasChildNodes || !$this.hasChildNodes()) return new Instance([]);
			
			var list;

			if(selector) {
			
				list = checkSelector(selector, $this);
				
			}
			else {
			
				list = filterNodes($this.childNodes);
				
			}
			
			var leg = list.length, 
			ar = [],
			i = -1,
			itm;

			while(++i < leg) {
				
				itm = list[i];
				if(itm.parentNode === $this) ar[ar.length] = itm;	
				
			}
			
			return new Instance(ar);
			
		},
		
		// similar to ':eq(index)' in jQuery
		// (index:Int)
		getChildAt: function(index) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return new Instance([]);
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['getChildAt', index]);
			
			if(!$this.hasChildNodes || !$this.hasChildNodes()) return new Instance([]);
			
			var children = $this.childNodes, ar = [], leg = children.length, child, i = -1;

			while(++i < leg) {
				
				child = children[i];
				if(!checkNull(child)) ar[ar.length] = child;
				
			}
			
			if(index < ar.length) return checkInstance(ar[index]);
			return new Instance([]);
			
		},
		
		// equivelent to $($(el)[index]) in jQuery
		// the jQuery Object is not an Array by default, this is the biggest difference between jQuick and jQuery
		// (index:Int)
		eq: function(index) {
			
			var $this = this.element;
			
			if($this.cjIsNull || typeof index === 'undefined') return new Instance([]);
			if($this.length) return checkInstance($this[index]);
			
			return this;
			
		},
		
		// convert a jQuick Object to a traditional Array
		toArray: function() {
			
			var $this = this.element, ar = [];
			if($this.cjIsNull || !$this.length) return ar;
			
			this.each(buildArray, [ar]);
			return ar;
			
		},
		
		// return the element's direct parent
		parent: function() {
			
			var $this = this.element;
			
			if($this.cjIsNull) return new Instance([]);
			if($this.nodeType !== 1 && $this.length) return filter.call($this[0], 'parent');
			
			var par = $this.parentNode;
			if(!par) return new Instance([]);
			
			return checkInstance(par);
			
		},
		
		// return a jQuick Object containing all parents
		parents: function() {
		
			var $this = this.element;
			
			if($this.cjIsNull) return new Instance([]);
			if($this.nodeType !== 1 && $this.length) return filter.call($this[0], 'parents');
			
			var par = [];

			while($this = $this.parentNode) {
			
				if($this.nodeType === 1) par[par.length] = $this;
				
			}
			
			return new Instance(par);
			
		},
		
		// find all childNodes of a given element based on a selector
		// (selector:String)
		find: function(selector) {
			
			var $this = this.element;
			
			if($this.cjIsNull || !selector) return new Instance([]);
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['find', selector]);
			if(!$this.hasChildNodes || !$this.hasChildNodes()) return new Instance([]);
			
			return checkInstance(checkSelector(selector, $this));
			
		},
		
		// return the closest parent of an element based on a selector
		// (selector:String)
		closest: function(selector) {

			if(!selector) return this.parent();
			
			return this.travel(selector, 'closest');
			
		},
		
		// return the element's previous sibling
		// (selector:String = null)
		prev: function(selector) {
			
			return this.travel(selector, 'prev');
			
		},
		
		// return the element's next sibling
		// (selector:String = null)
		next: function(selector) {
			
			return this.travel(selector, 'next');
			
		},
		
		// append an element to the current element
		// (el:jQuick)
		append: function(el) {
			
			return this.changeDom(el, 'append');
			
		},
		
		// append the current element to another
		// (el:jQuick)
		appendTo: function(el) {
			
			return this.changeDom(el, 'appendTo');
			
		},
		
		// prepend an element to the current element
		// (el:jQuick)
		prepend: function(el) {
		
			return this.changeDom(el, 'prepend');
			
		},
		
		// prepend the current element to another
		// (el:jQuick)
		prependTo: function(el) {
		
			return this.changeDom(el, 'prependTo');
			
		},
		
		// insert the current element directly before another
		// (el:jQuick)
		insertBefore: function(el) {
			
			return this.changeDom(el, 'insertBefore');
			
		},
		
		// insert the current element directly after another
		// (el:jQuick)
		insertAfter: function(el) {
			
			return this.changeDom(el, 'insertAfter');
			
		},
		
		// wrap the current element inside a new element
		// (el:String)
		wrap: function(selector) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['wrap', selector]);
			
			var el = checkInstance(checkSelector(selector));
			if(!el.length) return this;
			
			el = el.element;
			$this.parentNode.insertBefore(el, $this);
			el.appendChild($this);
			
		},
		
		// read or write TextNodes
		// (st:String = null)
		text: function(st) {
			
			var $this = this.element;
			
			if(typeof st === 'undefined') {
				
				if($this.cjIsNull) return '';
				if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['text', st]);
				
				return trim($this.innerHTML.replace(/(<([^>]+)>)/ig, ''));
				
			}
			else {
				
				if($this.cjIsNull) return this;
				if($this.length) return this.each(filter, ['text', st]);
				
				if(st) {
				
					$this.innerHTML = trim(st.replace(/(<([^>]+)>)/ig, ''));
					
				}
				else {
				
					$this.innerHTML = '';
					
				}
				
			}
			
			return this;
			
		},
		
		// read or write an element's innerHTML
		// (st:String = null)
		html: function(st) {
			
			var $this = this.element;

			if(typeof st === 'undefined') {
				
				if($this.cjIsNull) return '';
				if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['html', st]);
					
				return stripSpace(trim($this.innerHTML));
				
			}
			else {
				
				if($this.cjIsNull) return this;
				if($this.length) return this.each(filter, ['html', st]);
				
				if(!st) st = '';
				$this.innerHTML = st;
				
			}
			
			return this;
			
		},
		
		// read or write an element's width exluding margin, padding and border
		// (value:Int = null)
		width: function(value) {
			
			return this.getSize(value, 'width');
			
		},
		
		// read or write an element's height exluding margin, padding and border
		// (value:Int = null)
		height: function(value) {
			
			return this.getSize(value, 'height');
			
		},
		
		// read an element's width including padding, border and optional margin
		// (includeMargin:Boolean = false)
		outerWidth: function(includeMargin) {
			
			return this.getFullSize(includeMargin, 'width');
			
		},
		
		// read an element's height including padding, border and optional margin
		// (includeMargin:Boolean = false)
		outerHeight: function(includeMargin) {
			
			return this.getFullSize(includeMargin, 'height');
			
		},
		
		// read or write the window or an element's scrollTop position
		// (num:Int = null)
		scrollTop: function(num) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return 0;
			if($this.nodeType !== 1 && $this.length && $this !== win) {
				
				return filter.apply($this[0], ['scrollTop', num]);
				
			}
			
			if($this === win) {
				
				if(typeof num === 'undefined') {
					
					return !ie8 ? pageYOffset : doc.documentElement.scrollTop;
					
				}
				else {
					
					$this.scrollTo(0, num);
					
				}
				
			}
			else {
			
				if(typeof num === 'undefined') {
				
					return $this.scrollTop;
					
				}
				else {
				
					$this.scrollTop = num;
					
				}
				
			}
			
		},
		
		// read or write an element's CSS
		// (obj:String/Object, value:* = null)
		css: function(obj, value) {
			
			var $this = this.element;

			if(typeof obj === 'object') {
				
				if($this.cjIsNull) return this;
				if($this.length) return this.each(filter, ['css', obj, value]);
				
				var val, prop;

				for(prop in obj) {
					
					if(!obj.hasOwnProperty(prop)) continue;
					
					value = getValue($this, prop, obj[prop]);
					val = value[1];
					
					if(!value[0] || (isNaN(val) && !val)) continue;
					$this.style[prop] = val;
					
				}
				
				return this;
				
			}
			else if(typeof value !== 'undefined') {
				
				if($this.cjIsNull) return this;
				if($this.length) return this.each(filter, ['css', obj, value]);
				
				obj = cssString(obj);
				value = getValue($this, obj, value);
				var vals = value[1];
				
				if(isNaN(vals) && !vals) return this;
				if(value[0]) $this.style[obj] = vals;
				
				return this;
				
			}
			
			if($this.cjIsNull) return 0;
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['css', obj, value]);
			
			return compute ? compute($this, null).getPropertyValue(obj) : $this.currentStyle[obj];
			
		},
		
		// add a class to an HTMElement
		// (st:String)
		addClass: function(st) {
		
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['addClass', st]);
			
			var ar = st.split(' '), i = ar.length, cl;
			
			while(i--) {
				
				st = ar[i];
				cl = $this.className;
				
				if(cl) {
					
					if(cl.search(st) === -1) {
					
						$this.className = cl + ' ' + st;
						
					}
					
				}
				else {
				
					$this.className = st;
					
				}
				
			}
			
			return this;
			
		},
		
		// remove a class from an element
		// (st:String)
		removeClass: function(st) {
		
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['removeClass', st]);
			
			var cl = $this.className;
			
			if(cl) {
				
				var ar = st.split(' '), i = ar.length;
			
				while(i--) {
				
					if(cl.search(st) !== -1) $this.className = trim(cl.split(st).join(''));
					
				}
				
			}
			
			return this;
			
		},
		
		// checks if an element has the given class
		// (st:String)
		hasClass: function(st) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return false;
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['hasClass', st]);
			
			var cl = $this.className;
			if(cl) return cl.search(st) !== -1;
			
			return false;
			
		},
		
		// change the display property from none to whatever it's previous or default state was/is
		show: function() {
			
			return this.showHide('show');
			
		},
		
		// change the display property to none
		hide: function() {
			
			return this.showHide('hide');
			
		},
		
		// store random data on the jQuick Object
		// (obj:String/Object = null, value:* = null)
		data: function(obj, value) {
			
			var storage = this.storage || {};
			
			if(obj) {

				if(typeof obj === 'object') {
					
					for(var prop in obj) {
				
						if(obj.hasOwnProperty(prop)) storage[prop] = obj[prop];
						
					}
					
					this.storage = storage;
					return this;
					
				}
				else {

					if(typeof value !== 'undefined') {
					
						storage[obj] = value;
						
						this.storage = storage;
						return this;
						
					}
					else {
						
						return storage[obj];
						
					}
					
				}
				
			}

			return storage;
			
		},
		
		// remove data from the jQuick Object
		// (prop:String = null)
		removeData: function(prop) {

			if(!prop) {
			
				delete this.storage;
				
			}
			else if(this.data) {
				
				delete this.storage[prop];
				
			}
			
			return this;
			
		},
		
		// remove an element from the DOM and destroy attached events and data
		remove: function(fromEmpty) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, 'remove');
			if(!fromEmpty) this.empty();
			
			if(jQuick.transform) this.transform('stop');
			this.stop();
			
			removeEvents(this, $this);
			this.removeSwipe();
			
			removeParam($this, 'cjMigrate');
			removeParam($this, 'cjDisplay');
			removeParam($this, 'cjIsNull');
			
			$this.parentNode.removeChild($this);
			
		},
		
		// remove all childNodes from an element
		empty: function() {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, 'empty');
			
			var children = $this.getElementsByTagName('*'), 
			leg = children.length;
			
			while(leg--) filter.apply(children[leg], ['remove', true]);
			
			$this.innerHTML = '';
			return this;
			
		},
		
		// create a deep copy of the element and it's children
		clone: function() {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.nodeType !== 1 && $this.length) return filter.call($this[0], 'clone');
			
			var el = doc.createElement($this.tagName),
			instance = new Instance(el),
			events = $this.cjEvents,
			ar = $this.attributes,
			data = this.data,
			len = ar.length,
			attr,
			i;
			
			for(i = 0; i < len; i++) {
				
				attr = ar[i];
				el.setAttribute(attr.name, attr.value);
				
			}
			
			if(events) {
				
				var leg = events.length, evt;
				i = -1;
					
				while(++i < leg) {
					
					evt = events[i];
					instance.on(evt[0], evt[1]);
					
				}
				
			}
			
			if(data) {
			
				var obj = {}, prop;
				
				for(prop in data) {
				
					if(data.hasOwnProperty(prop)) obj[prop] = data[prop];
					
				}
				
				instance.storage = obj;
				
			}
			
			el.innerHTML = $this.innerHTML;
			el.cjDisplay = $this.cjDisplay;
			
			return instance;
			
		},
		
		// get the offsetLeft and offsetTop values of an element
		offset: function() {
	
			var $this = this.element;
			
			if($this.cjIsNull) return {left: 0, top: 0};
			if($this.nodeType !== 1 && $this.length) return filter.call($this[0], 'offset');
			
			var par = $this.offsetParent, x = 0, y = 0;
			
			if(par) {
			
				x = $this.offsetLeft;
				y = $this.offsetTop;

				while($this = $this.offsetParent) {
				
					x += $this.offsetLeft;
					y += $this.offsetTop;
					
				}
				
			}
			
			return {left: x, top: y};
			
		},
		
		// read or write an element attribute
		// (obj:Object/String, value:* = null);
		attr: function(obj, value) {
			
			var $this = this.element;

			if(typeof obj === 'object') {
				
				if($this.cjIsNull) return this;
				if($this.length) return this.each(filter, ['attr', obj, value]);
				
				for(var prop in obj) {
					
					if(obj.hasOwnProperty(prop)) $this.setAttribute(prop, obj[prop]);
					
				}
				
				return this;
				
			}
			else if(typeof value !== 'undefined') {
				
				if($this.cjIsNull) return this;
				if($this.length) return this.each(filter, ['attr', obj, value]);
				
				$this.setAttribute(obj, value);
				return this;
				
			}
			
			if($this.cjIsNull) return null;
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['attr', obj, value]);

			return $this.getAttribute(obj);
			
		},
		
		// remove a given attribute from an element
		// (st:String)
		removeAttr: function(st) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['removeAttr', st]);
			
			$this.removeAttribute(st);
			return this;
			
		},
		
		// get or set the value of a form element
		val: function(value) {
			
			return this.getProp('val', value);
			
		},
		
		// check what type an element is
		// (st:String)
		is: function(st) {
			
			return this.getProp('is', st);
			
		},
		
		innerCSS: function(css) {
			
			var $this = this.element;
			
			if($this.cjIsNull || $this.nodeName.toLowerCase() !== 'style') return this;
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['innerCSS', css]);
			
			if(css) {
			
				if(!ie8) {
					
					$this.innerHTML = $this.innerHTML + css;
						
				}
				else {
					
					var style = $this.styleSheet;
					style.cssText = style.cssText + css;
					
				}
				
				return this;
				
			}
			else {
			
				if(!ie8) {
					
					return $this.innerHTML;
					
				}
				else {
					
					return $this.styleSheet.cssText;
					
				}
				
			}
			
		},
		
		// animate an element
		// (to:Object, sets:Object = null)
		animate: function(to, sets) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['animate', to, sets]);
			if($this.cjTween) $this.cjTween.stop();
			
			new Tween($this, to, sets || {});	
			return this;
			
		},
		
		// simulate a tween and call a custom onUpdate function
		// (sets:Object)
		tick: function(sets) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['tick', sets]);
			if($this.cjTween) $this.cjTween.stop();
			
			new Tick($this, sets);
			return this;
			
		},
		
		// fadeIn an element
		// (sets:Object = null)
		fadeIn: function(sets) {
			
			return this.fadeIt('fadeIn', sets);
			
		},
		
		// fadeOut an element
		// (sets:Object = null)
		fadeOut: function(sets) {
			
			return this.fadeIt('fadeOut', sets);
			
		},
		
		// stop any running tweens on the element
		// stop is automatically called before an element animates, there's no animation "queue" in jQuick
		// (complete:Boolean = false, triggerCallback:Boolean = false)
		stop: function(complete, triggerCallback) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['stop', complete, triggerCallback]);
			
			var itm = $this.cjTween;
			if(!itm) return this;
			
			itm.stop(complete, triggerCallback);
			return this;
			
		},
		
		// stops all tweens of a given element and all its children
		// (complete:Boolean = false, triggerCallback:Boolean = false)
		stopAll: function(complete, triggerCallback) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['stopAll', complete, triggerCallback]);
			if(!$this.hasChildNodes || !$this.hasChildNodes()) return this;
			
			$this.stop(complete, triggerCallback);
			
			var children = $this.getElementsByTagName('*'), 
			leg = children.length;
			
			while(leg--) checkInstance(children[leg]).stop(complete, triggerCallback);
			return this;
			
		},
		
		// adds a left/right swipe even listener to an element
		// callback gets passed "left" or "right"
		// (callback:Function)
		swipe: function(callback) {
			
			if(!touch || !callback) return this;
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['swipe', callback]);
			
			$this.cjSwipe = {callback: callback};
			$this.addEventListener(startTouch, touchStart, false);
			$this.addEventListener(moveTouch, touchMove, false);
			$this.addEventListener(endTouch, touchEnd, false);
			
			return this;
			
		},
		
		// removes left/right swipe event listener from an element
		removeSwipe: function() {
			
			if(!touch) return this;
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, 'removeSwipe');
			
			$this.removeEventListener(startTouch, touchStart, false);
			$this.removeEventListener(moveTouch, touchMove, false);
			$this.removeEventListener(endTouch, touchEnd, false);
			
			delete $this.cjSwipe;
			return this;
			
		},
		
		// internal
		travel: function(selector, type) {
		
			var $this = this.element;
			
			if($this.cjIsNull) return new Instance([]);
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['travel', selector, type]);
				
			return checkInstance(checkSelector(getNode($this, selector, type), $this));
			
		},
		
		// internal
		changeDom: function(el, type) {
		
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['changeDom', el, type]);
			
			if(!checkType(el)) {
				
				if(el.cjMigrate) {
					
					el = grabElement(el.element);
					
				}
				else {
					
					if(!el.element) el = checkInstance(checkSelector(el)).domElement();
					
				}
				
			}
			
			if(checkNull(el)) return this;
			var len = el.length;
			
			if(!len) {
				
				insertElement(type, $this, el);
			
			}
			else {
				
				var ar = [], i = -1;
				
				// el can be a live NodeList so we'll copy it over to an Array just in case
				while(++i < len) ar[i] = el.eq(i).domElement();
					
				i = -1;
				while(++i < len) insertElement(type, $this, ar[i]);
				
			}
			
			return this;
			
		},
		
		// internal
		getSize: function(value, type) {
		
			var $this = this.element;
			
			if($this.length && $this !== win) {
			
				if(!value) {
					
					if($this.cjIsNull) return 0;
					if($this.nodeType !== 1) return filter.apply($this[0], ['getSize', value, type]);
					
				}
				else {
					
					if($this.cjIsNull) return this;
					return this.each(filter, ['getSize', value, type]);
					
				}	
				
			}
			
			return size(this, $this, type, value);
			
		},
		
		// internal
		getFullSize: function(margin, type) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return 0;
			if($this.nodeType !== 1 && $this.length && $this !== win) {
				
				return filter.apply($this[0], ['getFullSize', margin, type]);
				
			}
			
			return outerSize(this, $this, type, margin);
			
		},
		
		// internal
		getProp: function(type, st) {
		
			var $this = this.element;
			
			if($this.cjIsNull) return null;
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['getProp', type, st]);
			
			if(type === 'val') {
				
				if(!st) {	
				
					return $this.value;
					
				}
				else {
					
					$this.value = st;
					return this;
					
				}
				
			}
			return $this.tagName.toLowerCase() === st.toLowerCase();
			
		},
		
		// internal
		fadeIt: function(type, sets) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.nodeType !== 1 && $this.length) return filter.apply($this[0], ['fadeIt', type, sets]);
			if(!sets) sets = {};
				
			var alpha;
			sets[type] = true;
			
			if(type === 'fadeIn') {
			
				alpha = 1;
				sets.display = getDisplay(this, $this);
				
			}
			else {
			
				alpha = 0;
				
			}
			
			return this.animate({opacity: alpha}, sets);
			
		},
		
		// internal
		showHide: function(type) {
			
			var $this = this.element;
			
			if($this.cjIsNull) return this;
			if($this.length) return this.each(filter, ['showHide', type]);
			
			if(type === 'show') {

				$this.style.display = getDisplay(this, $this);
				
			}
			else {
				
				var display = compute ? compute($this, null)['display'] : $this.currentStyle['display'];
				if(display !== 'none') this.cjDisplay = display;
				
				$this.style.display = 'none';
				
			}
			
			return this;
			
		} 
		
	};
	
	function insertElement(type, $this, el) {
		
		switch(type) {
				
			case 'append':
			
				$this.appendChild(el);
			
			break;
			
			case 'appendTo':
			
				el.appendChild($this);
			
			break;
			
			case 'prepend':
			
				$this.insertBefore(el, $this.firstChild);
			
			break;
			
			case 'prependTo':
			
				el.insertBefore($this, el.firstChild);
			
			break;
			
			case 'insertBefore':
			
				el.parentNode.insertBefore($this, el);
			
			break;
			
			case 'insertAfter':
			
				el.parentNode.insertBefore($this, el.nextSibling);
			
			// end switch
			
		}
		
	}
	
	function grabElement(el) {
		
		if(!el) return [];
		if(el.length) return grabElement(el[0]);
		
		return el;
		
	}
	
	function filter(a, b, c, d) {
		
		var instance = this.cjMigrate;
		if(!instance) return jQuick(this)[a](b, c, d);
				
		return instance[a](b, c, d);
		
	}
	
	function checkInstance(el) {
		
		var instance = el.cjMigrate;
		if(!instance) return new Instance(el);
		
		return instance;
		
	}
	
	function checkNull($this) {
		
		if(checkType($this)) return false;
		
		if($this && $this.item && $this.length) {
			
			if(!$this.item(0)) return true;
			
		}
		else if(Array.isArray($this)) {
			
			if(!$this.length) return true;
			
		}
		
		return false;
		
	}
	
	function checkSelector(selector, scope) {
		
		if(selector === null) return [];
		var selectors, len;
		
		if(typeof selector === 'string') {
			
			if(selector.search('</') !== -1) {
				
				var index = selector.indexOf('>') + 1,
				st = selector.substring(0, index),
				tag = st.split(' ')[0];

				return createDomElement(
					
					st.substring(0, st.length - 1) + ' />', 
					selector.substring(index, selector.lastIndexOf('</' + tag.substring(1, tag.length)))
					
				);
				
			}
			
			if(selector.search('/>') !== -1) {
				
				if(!(/'|"/).test(selector)) {
					
					return doc.createElement(trim(selector.split('<').join('').split('/>').join('')));
					
				}
				
				return createDomElement(selector);
				
			}
			
			selectors = selector.split(',');
			len = selectors.length;
			
		}
		else {
			
			len = 1;
			
		}
		
		if(len === 1) return getItem(selector, scope);
		var el = [], i = -1;
		
		while(++i < len) {
			
			el[i] = getItem(selectors[i], scope);
			
		}
		
		return el;
		
	}
	
	function createDomElement(selector, html) {
		
		if(selector.charAt(selector.length - 3) !== ' ') {
				
			selector = selector.substring(0, selector.length - 2) + ' ' + '/>';
			
		}
		
		var splits = selector.split(' '), el = splits[0], num, str, st, i;
		el = doc.createElement(el.substring(1, el.length));
		
		splits.pop();
		splits.shift();
		splits = splits.join().split(',').join(' ');
		
		if(splits) {
			
			str = splits;
			splits = [];
			num = 0;
			
			var reg = /'|"/,
			leg = str.length,
			start = 0;
			i = -1;
			
			while(++i < leg) {
			
				if(!str.charAt(i).match(reg)) continue;
					
				if(num === 0) {
				
					num = 1;
					continue;
					
				}
				
				splits[splits.length] = trim(str.substring(start, i + 1));
				
				num = 0;
				start = i + 1;
				
			}
			
		}
		
		i = splits.length;
		
		while(i--) {
			
			st = splits[i].split('=');
			str = st[1];
			
			str = str.substring(1, str.length - 1);
			num = parseInt(str.substring(1, str.length - 1), 10);
			
			if(!isNaN(num)) str = num;
			el.setAttribute(st[0], str);
			
		}
		
		if(html) el.innerHTML = html;
		return el;
		
	}
	
	function getItem(selector, scope) {
		
		if(!scope) scope = doc;
		
		if(typeof selector === 'string') {
			
			selector = trim(selector);
			
			if(/\[|:|>|\s/.test(selector)) {
				
				return scope.querySelectorAll(selector);
				
			}
			else if(/\./.test(selector)) {
				
				if(query) {	
				
					return scope.getElementsByClassName(selector.substr(1, selector.length - 1));
					
				}
				
				return scope.querySelectorAll(selector);
				
			}
			else if(selector.search('#') !== -1) {
				
				return scope.getElementById(selector.substr(1, selector.length - 1));
				
			}
			
			return scope.getElementsByTagName(selector);
			
		}
		
		return checkType(selector) ? selector : [];
		
	}
	
	function elementSize($this, prop) {
		
		var num = $this['inner' + prop] || $this['client' + prop] || $this['natural' + prop] || $this[prop]; 
		
		return parseInt(num, 10) || 0;
		
	}
	
	function size(instance, $this, prop, value) {
	
		if(typeof value === 'undefined' || value === true) {
			
			prop = upper(prop);
			if(ie8 && $this === win) $this = doc.documentElement;
			
			var num = elementSize($this, prop);
			if($this === win || $this === doc) return num;
			
			if(!value) {
				
				if(ie8 && !num && $this.nodeName.toLowerCase() === 'img') {
					
					var display = $this.currentStyle['display'];
					$this.style.display = 'block';
					
					num = elementSize($this, prop);
					$this.style.display = display;
					
				}
				
				var padOne, padTwo;
				
				if(prop === 'Width') {
				
					padOne = 'Left';
					padTwo = 'Right';
					
				}
				else {
				
					padOne = 'Top';
					padTwo = 'Bottom';
					
				}
				
				if(compute) {
				
					num -= parseInt(compute($this, null)['padding' + padOne], 10);
					num -= parseInt(compute($this, null)['padding' + padTwo], 10);
					
				}
				else {
				
					num -= parseInt($this.currentStyle['padding' + padOne], 10) || 0;
					num -= parseInt($this.currentStyle['padding' + padTwo], 10) || 0;
					
				}
				
			}

			return num;
			
		}
		
		$this.style[prop] = parseInt(value, 10) + 'px';
		return instance;
		
	}
	
	function upper(st) {
	
		return st.charAt(0).toUpperCase() + st.substr(1, st.length - 1);
		
	}
	
	function addListener($this, type, func, one) {
		
		var events = $this.cjEvents, 
		namespace = type.split('.'),
		duplicate,
		matched,
		evt;
		
		type = namespace[0];
		
		if(modern) {
			
			if(type === 'mouseenter') {
				
				matched = true;
				type = 'mouseover';
				
			}
			else if(type === 'mouseleave') {
				
				matched = true;
				type = 'mouseout';
				
			}
			
		}
		
		evt = [type, func, one];
		
		if(events) {
			
			var i = events.length, ar = [], ev;

			while(i--) {
				
				ev = events[i];
				(ev[1] !== func) ? ar[ar.length] = ev : duplicate = true;
				
			}
			
			events = ar.length ? ar : null;
			
		}
		
		if(namespace.length > 1) evt.namespace = namespace[1];
		if(!modern) evt.callback = attachEvent($this);
		if(matched) evt.matchTarget = $this;
		
		(events) ? events[events.length] = evt : events = [evt];
		$this.cjEvents = events;
		
		if(modern) {
			
			if($this.addEventListener) $this.addEventListener(type, trigger, false);
			
		}
		else if(!duplicate && $this.attachEvent) {
			
			$this.attachEvent('on' + type, evt.callback);
			
		}
		
	}
	
	// capture currentTarget for IE8
	function attachEvent($this) {
		
		return function() {

			trigger.call($this, win.event);
			
		};
		
	}
	
	function removeListener($this, type, evt) {
		
		if(modern) {
			
			if($this.removeEventListener) $this.removeEventListener(type, trigger, false);
			
		}
		else {
		
			if($this.detachEvent) $this.detachEvent('on' + type, evt);
			
		}
		
	}
	
	function removeEvents(instance, $this, ns) {
		
		instance.removeSwipe();
		var events = $this.cjEvents;
		
		if(!events) return;
		var evt, i = events.length;
		
		while(i--) {
			
			evt = events[i];
			if(ns && evt.namespace !== ns) continue;
			instance.off(evt[0]);
			
		}
		
		removeParam($this, 'cjEvents');
		removeParam($this, 'cjEntered');
		
	}
	
	function getNode(el, selector, branch) {
		
		var type;
		
		if(selector) {
			
			if(/\./.test(selector)) {
				
				type = 'class';
				selector = selector.substr(1, selector.length - 1);
				
			}
			else if(selector.search('#') !== -1) {
				
				type = 'id';
				selector = selector.substr(1, selector.length - 1);
				
			}
			else {
				
				type = 'tag';
				
			}
			
		}
		
		return getElement(el, selector, type, branch);
		
	}
	
	function filterNodes(nodes) {
	
		var ar = [];
		
		if(!nodes || !nodes.length) return ar;
		
		var leg = nodes.length, node, i = -1;
		
		while(++i < leg) {
			
			node = nodes[i];
			if(checkType(node)) ar[ar.length] = node;
			
		}
		
		return ar;
		
	}
	
	function checkType(obj) {
		
		if(obj) return obj === win || obj === doc || obj.nodeType === 1;
		
		return false;
		
	}
	
	function getElement(el, selector, type, branch) {
		
		var obj;
		
		switch(branch) {
			
			case 'closest':
			
				obj = el.parentNode;
			
			break;
			
			case 'prev':
			
				obj = el.previousSibling;
			
			break;
			
			case 'next':
			
				obj = el.nextSibling;
			
			// end switch
			
		}
		
		if(!obj) return null;
		if(!checkType(obj)) return getElement(obj, selector, type, branch);
		if(!selector) return obj;
		
		switch(type) {
			
			case 'tag':
				
				return obj.tagName.toLowerCase() === selector ? obj : getElement(obj, selector, type, branch);
				
			break;
			
			case 'id':
			
				return obj.id === selector ? obj : getElement(obj, selector, type, branch);
			
			break;
			
			default:
				
				var cl = obj.className, found;
				
				if(cl) {
				
					var classes = cl.split(' '), i = classes.length;
					
					while(i--) {
					
						if(classes[i] !== selector) continue;
						found = true;
						break;
						
					}
					
				}
				
				return found ? obj : getElement(obj, selector, type, branch);
				
			// end switch
			
		}
		
	}
	
	function getDisplay(instance, $this) {
		
		var display;
		
		if(!(instance.cjDisplay)) {
			
			display = compute ? compute($this, null)['display'] : $this.currentStyle['display'];
			
			if(display === 'none') {
				
				if(!bodies) bodies = doc.body;
				
				var name = $this.tagName.toLowerCase(), i = cached.length, itm, found;
				
				while(i--) {
					
					itm = cached[i];
					if(itm.search(name) === -1) continue;
					
					display = itm.split('.')[1];
					found = true;
					break;
					
				}
				
				if(!found) {
				
					var el = doc.createElement(name);
					bodies.appendChild(el);
					
					display = compute ? compute(el, null)['display'] : el.currentStyle['display'];
					bodies.removeChild(el);
					
					cached[cached.length] = name + '.' + display;
					
				}
				
			}
			
		}
		else {
		
			display = instance.cjDisplay;
			removeParam(instance, 'cjDisplay');
			
		}
		
		return display;
		
	}
	
	function removeParam(el, param) {
	
		if(!ie8) {
				
			delete el[param];
			
		}
		else {
		
			el[param] = null;
			
		}
		
	}
	
	function stripSpace(st) {
	
		return st.replace(/\s+/g, ' ');
		
	}
	
	function buildArray(ar) {
	
		ar[ar.length] = checkInstance(this);
		
	}
	
	function trigger(event) {
		
		var instance = this.cjMigrate,
		events = this.cjEvents,
		name = event.type;
		
		if(!events) return;
		var i = events.length, evt, toCall;
		
		while(i--) {
		
			evt = events[i];
			if(evt[0] !== name) continue;
				
			if(evt.matchTarget) {
			
				testMouse(instance, evt.matchTarget, name, evt[1], event, evt[0] === name && evt[2]);
				continue;
				
			}
			
			if(evt[2]) instance.off(name, trigger);
			
			if(!instance.googleFonts) {
			
				evt[1].call(instance, event);
				
			}
			else {
			
				toCall = evt[1];
				
			}
			
		}
		
		if(toCall) {
			
			WebFont.load({google: {families: instance.googleFonts}, active: function() {
				
				toCall.call(instance, event);
				
			}});
			
			removeParam(instance, 'googleFonts');
			
		}
		
	}
	
	function cssString(st) {
		
		var ar = st.split('-'), leg = ar.length;
		
		if(leg > 1) {
			
			var css = '', str, i = -1;
			
			while(++i < leg) {
				
				str = ar[i];
				(i !== 0) ? css += upper(str) : css += str;	
				
			}
			
			return css;
			
		}
		
		return st;
		
	}
	
	function getValue($this, prop, value) {
	
		if(!isNaN(value)) {
					
			if(prop !== 'opacity') {
				
				if(prop !== 'zIndex') return [true, value + 'px'];
				
			}
			else if(ie8) {
				
				$this.style.filter = 'progid:DXImageTransform.Microsoft.Alpha(opacity=' + (value * 100) + ')';
				return [false];
				
			}
			
		}
		
		return [true, value];
		
	}
	
	function testMouse(instance, $this, name, callback, event, off) {
		
		if(name === 'mouseover') {
			
			if(!$this.cjEntered) callback.call(instance, event);
			
			if(!off) {
			
				$this.cjEntered = true;
				
			}
			else {
			
				instance.off(name, trigger);
				
			}
			
		}
		else {
			
			var offset = instance.offset(),
			pageX = event.pageX,
			pageY = event.pageY,
			left = offset.left,
			top = offset.top;
			
			if(pageX <= left || pageX >= left + instance.width() || pageY <= top || pageY >= top + instance.height()) {
				
				if(off) instance.off(name, trigger);
				
				$this.cjEntered = false;
				callback.call(instance, event);
				
			}
			
		}
		
	}
	
	function callEvent($this, name) {
		
		if(modern) {
			
			var evt = doc.createEvent('Event');
			
			evt.initEvent(name, true, true);
			$this.dispatchEvent(evt);
				
		}
		else {
			
			$this.fireEvent('on' + name, doc.createEventObject());
			
		}
		
	}
	
	function triggerEvent($this, name) {
		
		if(!(/\./).test(name)) {
		
			callEvent($this, name);
			return;
			
		}
		
		var events = $this.cjEvents, 
		i = events.length,
		namespace,
		type,
		evt,
		ns;
		
		if(name.charAt(0) !== '.') {
		
			namespace = name.split('.');
			type = namespace[0];
			ns = namespace[1];
			
		}
		else {
		
			ns = name;
			
		}
		
		while(i--) {
			
			evt = events[i];
			
			if(!type) {
				
				if(evt.namespace === ns) callEvent($this, evt[0]);
				
			}
			else {
				
				name = evt[0];
				if(evt.namespace === ns && type === name) callEvent($this, name);
				
			}
			
		}
		
	}
	
	function outerSize(instance, $this, size, margin) {
	
		var cornerOne, 
		cornerTwo, 
		value,
		prop3,
		prop4;
		
		if(size === 'width') {
			
			cornerOne = 'Left';
			cornerTwo = 'Right';
			
		}
		else {
			
			cornerOne = 'Top';
			cornerTwo = 'Bottom';
			
		}
		
		value = instance[size](true);
		size = upper(size);
		
		var prop1 = 'border' + cornerOne + 'Width',
		prop2 = 'border' + cornerTwo + 'Width';
		
		if(margin) {
			
			prop3 = 'margin' + cornerOne;
			prop4 = 'margin' + cornerTwo;
				
		}
		
		if(compute) {
		
			value += parseInt(compute($this, null)[prop1], 10) + 
				 	 parseInt(compute($this, null)[prop2], 10);
			
			if(margin) {
			
				value += parseInt(compute($this, null)[prop3], 10) + 
					 	 parseInt(compute($this, null)[prop4], 10); 
				
			}
			
		}
		else {
			
			value += parseInt($this.currentStyle[prop1], 10) || 0 + 
				 	 parseInt($this.currentStyle[prop2], 10) || 0;
			
			if(margin) {
			
				value += parseInt($this.currentStyle[prop3], 10) || 0 + 
					 	 parseInt($this.currentStyle[prop4], 10) || 0; 
				
			}
			
		}
		
		return value;
		
	}
	
	function touchStart(event) {
		
		var pages = event.touches ? event.touches[0] : event,
		data = this.cjSwipe;
		
		data.newPageX = null;
		data.pageX = pages.pageX;
		
	}
	
	function touchMove(event) {
		
		var data = this.cjSwipe, newPageX,
		pages = event.touches ? event.touches[0] : event;
		
		newPageX = data.newPageX = pages.pageX;
		if(Math.abs(data.pageX - newPageX) > 10) event.preventDefault();
		
	}
	
	function touchEnd() {
		
		var data = this.cjSwipe,
		newPageX = data.newPageX,
		pageX = data.pageX;
		
		if(newPageX === null || Math.abs(pageX - newPageX) < swipeThreshold) return;
			
		if(pageX > newPageX) {
			
			data.callback.call(this.cjMigrate, 'right');
			
		}
		else {
			
			data.callback.call(this.cjMigrate, 'left');
			
		}
		
	}
	
	
	// **************************************************************
	// BEGIN ANIMATION ENGINE
	// **************************************************************

	function engine() {
		
		var run = false, leg = length, itm;
		
		while(leg--) {
			
			itm = dictionary[leg];
			if(!itm) break;
			
			if(itm.cycle()) {
				
				run = true;
				
			}
			else {
				
				itm.stop(false, itm.onComplete, false, true);
				
			}
			
		}
		
		if(request) {
			
			(run) ? request(engine) : cancel(engine);
			
		}
		else {
			
			if(run) {
				
				if(!engineRunning) timer = setInterval(engine, intervalSpeed);
				
			}
			else {
				
				clearInterval(timer);
				
			}
				
		}
		
		engineRunning = run;
		
	}
	
	function Tween(obj, to, sets) {
		
		if(sets.fadeOut) {
			
			this.fadeOut = true;
			
		}
		else if(sets.fadeIn) {
		
			this.fadeIn = true;
			
		}
		
		this.obj = obj;
		this.onComplete = sets.onComplete;
		this.onCompleteParams = sets.onCompleteParams;
		
		length = dictionary.length;
		obj.cjTween = dictionary[length++] = this;
		
		if(sets.duration === 0) {
			
			this.stop();
			return;
			
		}
		
		if(!sets.delay) {
			
			animation(this, obj, to, sets);
			
		}
		else {
			
			var $this = this;
			
			this.delayed = setTimeout(function() {
			
				animation($this, obj, to, sets);
				
			}, sets.delay);
			
		}
		
	}
	
	Tween.prototype = {
		
		cycle: function() {
			
			var trans = this.transitions;
			if(!trans) return true;
			
			var rip = trans.length, moved;
			
			while(rip--) {

				if(trans[rip]()) moved = true;
				
			}
	
			return moved;
			
		},
		
		stop: function(complete, callback, popped) {
			
			var element = this.obj;
			removeParam(element, 'cjTween');
			
			if(complete) {
				
				var group = this.transitions, i, ar, prop;
				
				if(group) {
					
					i = group.length;
				
					while(i--) {
		
						ar = group[i].stored;
						prop = ar[0];
						
						if(!ie8) {
							
							element.style[prop] = ar[1];
							continue;
							
						}
							
						if(prop !== 'Opacity') {
							
							element.style[prop] = ar[1];
							
						}
						else {
							
							element.filters.item('DXImageTransform.Microsoft.Alpha').Opacity = ar[1] * 100;
							
						}
						
					}
					
				}
				
			}
			
			checkElement(this, element);
			if(callback) callback = this.onComplete;
			if(!popped) popTween(this, element, callback, this.onCompleteParams);
			
		}
		
	};
	
	function Tick(obj, sets) {
		
		if(!sets || !sets.onUpdate) return;
		
		length = dictionary.length;
		dictionary[length++] = obj.cjTween = this;
		
		var params = this.onCompleteParams = sets.onCompleteParams,
		callback = this.onComplete = sets.onUpdate,
		easing = sets.ease || defaultEase;
		
		easing = easing.toLowerCase().split('.');
		easing = PennerEasing[easing[0]][easing[1]];
		
		this.obj = obj;
		this.transitions = tick(obj, sets.duration || defaultDuration, easing, callback, params);
		
		(engineRunning) ? setTimeout(checkEngine, 10) : engine();
		
	}
	
	Tick.prototype = {
		
		cycle: function() {
			
			return this.transitions();
			
		},
		
		stop: function(complete, callback, popped, finished) {
			
			var obj = this.obj;
			
			if(!obj) return;
			removeParam(obj, 'cjTween');
			
			if(!popped) popTween(this);
			if(complete || finished) this.onComplete.apply(obj, [1, this.onCompleteParams]);
			
		}
		
	};
	
	function animation($this, obj, to, sets) {
	
		var key, i = 0, 
		tweens = [], style = obj.style,
		duration = sets.duration || defaultDuration,
		easing = (sets.ease || defaultEase).toLowerCase().split('.');
		
		easing = PennerEasing[easing[0]][easing[1]];
		style.visibility = 'visible';
			
		if(sets.fadeIn) {

			style.display = sets.display || 'block';
			style.opacity = 0;
			
		}
		
		if(ie8) {
			
			var ieAlpha = null;
			
			if('opacity' in to) {
				
				if(obj.filters.length) {
				
					try {
						ieAlpha = obj.filters.item('DXImageTransform.Microsoft.Alpha').Opacity;
					}
					catch(event) {}
					
				}
				
				if(ieAlpha === null) {
					
					style.filter = 'progid:DXImageTransform.Microsoft.Alpha(opacity=' + (sets.fadeIn ? 0 : 98) + ')';
					
				}
				
			}
			
		}
		
		for(key in to) {
			
			if(!to.hasOwnProperty(key)) continue;
			tweens[i++] = animate(obj, key, to[key], duration, easing);
			
		}
		
		$this.transitions = tweens;
		(engineRunning) ? setTimeout(checkEngine, 10) : engine();
		
	}
	
	function animate(obj, prop, value, duration, ease) {
		
		var opacity = prop === 'opacity',
		px = !opacity ? 'px' : 0,
		timed = 0,
		constant,
		finish,
		range,
		pTick,
		style,
		begin,
		then, 
		tick,
		now,
		val;
		
		if(!opacity || !ie8) {
			
			style = obj.style;
			val = style[prop];
			
			tick = val !== '' ? val : compute ? compute(obj, null)[prop] : obj.currentStyle[prop];	
			
		}
		else {
			
			style = obj.filters.item('DXImageTransform.Microsoft.Alpha');
			prop = 'Opacity';
			tick = style[prop];
			value *= 100;
			
		}
		
		tick = parseFloat(tick);
		constant = value - tick;
		range = tick < value;
		finish = value + px;
		then = Date.now();
		begin = tick;
		
		if(!opacity || ie8) {
			
			(range) ? value -= 1 : value += 1;
			
		}
		else {
			
			(range) ? value -= 0.1 : value += 0.1;
			
		}
		
		function trans() {
			
			now = Date.now();
			timed += now - then;
			tick = ease(timed, begin, constant, duration);
			then = now;
			
			if(!opacity || ie8) {
				
				tick = range ? (tick + 0.5) | 0 : (tick - 0.5) | 0;
					
			}
			else {
				
				tick = tick.toFixed(2);
				
			}

			if(tick === pTick) return true;
			
			if(range) {
				
				if(tick >= value) {
					
					style[prop] = finish;
					return false;
					
				}
				
			}
			else if(tick <= value) {
				
				style[prop] = finish;
				return false;
				
			}
			
			pTick = tick;
			style[prop] = tick + px;
			
			return true;
			
		}
		
		trans.stored = [prop, finish];
		return trans;
		
	}
	
	function tick(obj, duration, ease, callback) {
			
		var tck, timed = 0, then = Date.now(), now;
		
		return function() {
			
			now = Date.now();
			timed += now - then;
			then = now;
			
			tck = ease(timed, 0, 1, duration);
			
			if(tck < 0.98) {
				
				callback.call(obj, tck);
				return true;
				
			}
			
			return false;
			
		};
		
	}
	
	function checkElement(instance, element) {
		
		if(instance.fadeIn) {
			
			element.style.opacity = 1;
			element.style.visibility = 'visible';
			
		}
		else if(instance.fadeOut) {
			
			element.style.display = 'none';
			
		}
		
	}
	
	function checkEngine() {
	
		if(!engineRunning) engine();
		
	}
	
	function popTween($this, element, callback, params) {
		
		dictionary.splice(dictionary.indexOf($this), 1);
		
		length = dictionary.length;
		
		if(callback) callback.apply(element, [params]);
		
	}
	
	function timeline(req, st) {
		
		return win['webkit' + req + st] || win['moz' + req + st] || win['o' + req + st] || win[req + st] || null;
		
	}
	
	function getSpeed() {
	
		if(jQuick.browser() !== 'msie') {
			
			return 33.3;
			
		}
		else {
			
			return jQuick.version() >= 9 ? 16.6 : 33.3;
			
		}
		
	}
	
	if(!Array.indexOf) {
		
		Array.prototype.indexOf = function($this) {
			
			var i = this.length;
			
			while(i--) {
				
				if(this[i] === $this) return i;
				
			}
			
			return -1;
			
		};
		
	}
	
	// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/isArray
	if(!Array.isArray) {
		
		Array.isArray = function(vArg) {
		
			return Object.prototype.toString.call(vArg) === '[object Array]';
		
		};
	  
	}
	
	// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/now
	if(!Date.now) {  
    	
		Date.now = function now() {  
        	
			return +(new Date); 
			
		};
	    
	}
	
	if(ie8) {
		
		Event.prototype.preventDefault = function() {
		
			this.returnValue = false;
			
		};
		
		Event.prototype.stopPropagation = function() {
		
			this.cancelBubble = true;
			
		};
		
	}
	
	/*
	TERMS OF USE - EASING EQUATIONS
	
	Open source under the BSD License.
	
	Copyright © 2001 Robert Penner
	All rights reserved.
	
	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
	
		Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
		Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the docation and/or other materials provided with the distribution.
		Neither the name of the author nor the names of contributors may be used to endorse or promote products derived from this software without specific prior written permission.
	
	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/
	
	var PennerEasing = {
		
		linear: {
			
			easenone: function(t, b, c, d) {return c * t / d + b;},
			easein: function(t, b, c, d) {return c * t / d + b;},
			easeout: function(t, b, c, d) {return c * t / d + b;},
			easeinout: function(t, b, c, d) {return c * t / d + b;}
		
		},
		
		quint: {
			
			easeout: function(t, b, c, d) {return c * ((t = t / d - 1) * t * t * t * t + 1) + b;},
			easein: function(t, b, c, d) {return c * (t /= d) * t * t * t * t + b;},
			easeinout: function(t, b, c, d) {return ((t /= d / 2) < 1) ? c / 2 * t * t * t * t * t + b : c / 2 * ((t -= 2) * t * t * t * t + 2) + b;}
			
		},
			
		quad: {
			
			easein: function (t, b, c, d) {return c * (t /= d) * t + b;},
			easeout: function (t, b, c, d) {return -c * (t /= d) * (t - 2) + b;},
			easeinout: function (t, b, c, d) {return ((t /= d / 2) < 1) ? c / 2 * t * t + b : -c / 2 * ((--t) * (t - 2) - 1) + b;}	
			
		},
		
		quart: {
		
			easein: function(t, b, c, d) {return c * (t /= d) * t * t * t + b;},
			easeout: function(t, b, c, d) {return -c * ((t = t / d - 1) * t * t * t - 1) + b;},
			easeinout: function(t, b, c, d) {return ((t /= d / 2) < 1) ? c / 2 * t * t * t * t + b : -c / 2 * ((t -= 2) * t * t * t - 2) + b;}
			
		},
		
		cubic: {
		
			easein: function(t, b, c, d) {return c * (t /= d) * t * t + b;},
			easeout: function(t, b, c, d) {return c * ((t = t / d - 1) * t * t + 1) + b;},
			easeinout: function(t, b, c, d) {return ((t /= d / 2) < 1) ? c / 2 * t * t * t + b : c / 2 * ((t -= 2) * t * t + 2) + b;}
			
		},
		
		circ: {
		
			easein: function(t, b, c, d) {return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;},
			easeout: function(t, b, c, d) {return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;},
			easeinout: function(t, b, c, d) {return ((t /= d / 2) < 1) ? -c / 2 * (Math.sqrt(1 - t * t) - 1) + b : c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;}
			
		},
		
		sine: {
		
			easein: function(t, b, c, d) {return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;},
			easeout: function(t, b, c, d) {return c * Math.sin(t / d * (Math.PI / 2)) + b;},
			easeinout: function(t, b, c, d) {return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;}
			
		},
		
		expo: {
		
			easein: function(t, b, c, d) {return (t === 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;},
			easeout: function(t, b, c, d) {return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;},
			easeinout: function(t, b, c, d) {
				
				if(t === 0) return b;
				if(t === d) return b + c;
				if((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
				
				return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
				
			}
			
		}
		
	};
	
})();
