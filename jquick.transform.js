// jQuick CSS3 Transform Plugin - http://www.codingjack.com/playground/jquick/
// © Jason McElwaine aka CodingJack - http://codecanyon.net/user/CodingJack
// License: http://creativecommons.org/licenses/by-sa/3.0/deed.en_US
// 4kb minified, http://www.codingjack.com/playground/jquick/js/jquick.transform.min.js

;(function($) {
	
	'use strict';
	
	var css = $.transitions(),
	transformProp,
	skeleton,
	
	comma = /,/g,
	dollar = /{}/g,
	reg = /[A-Z]/g,
	regT = / cj-tween/g,
	trim = /^\s+|\s+$/g,
	regP = new RegExp('{props}'),
	regE = new RegExp('{easing}'),
	regD = new RegExp('{duration}'),
	gotcha = /(auto|inherit|rgb|%|#)/,
	
	// credit: http://matthewlein.com/ceaser/
	ceaserEasing = {
		
		linear: {
			
			easenone: "0.250, 0.250, 0.750, 0.750",
			easein: "0.420, 0.000, 1.000, 1.000",
			easeout: "0.000, 0.000, 0.580, 1.000",
			easeinout: "0.420, 0.000, 0.580, 1.000"
			
		},
		
		quint: {
			
			easein: "0.755, 0.050, 0.855, 0.060",
			easeout: "0.230, 1.000, 0.320, 1.000",
			easeinout: "0.860, 0.000, 0.070, 1.000"
			
		},
		
		quad: {
			
			easein: "0.550, 0.085, 0.680, 0.530",
			easeout: "0.250, 0.460, 0.450, 0.940",
			easeinout: "0.455, 0.030, 0.515, 0.955"
			
		},
		
		quart: {
			
			easein: "0.895, 0.030, 0.685, 0.220",
			easeout: "0.165, 0.840, 0.440, 1.000",
			easeinout: "0.770, 0.000, 0.175, 1.000"
			
		},
		
		cubic: {
			
			easein: "0.550, 0.055, 0.675, 0.190",
			easeout: "0.215, 0.610, 0.355, 1.000",
			easeinout: "0.645, 0.045, 0.355, 1.000"
			
		},
		
		circ: {
			
			easein: "0.600, 0.040, 0.980, 0.335",
			easeout: "0.075, 0.820, 0.165, 1.000",
			easeinout: "0.785, 0.135, 0.150, 0.860"
			
		},
		
		sine: {
			
			easein: "0.470, 0.000, 0.745, 0.715",
			easeout: "0.390, 0.575, 0.565, 1.000",
			easeinout: "0.445, 0.050, 0.550, 0.950"
			
		},
		
		expo: {
		
			easein: "0.950, 0.050, 0.795, 0.035",
			easeout: "0.190, 1.000, 0.220, 1.000",
			easeinout: "1.000, 0.000, 0.000, 1.000"
			
		}
		
	};
	
	if(css) {
	
		var pre = css.property, sheet = document.createElement('style');
		transformProp = $.transforms();
		css = css.end;

		sheet.type = 'text/css';
		sheet.innerHTML = '.cj-tween{' + pre + '-property:none !important;}';
		document.getElementsByTagName('head')[0].appendChild(sheet);
		
		skeleton = pre + '-property:{props};' + pre + '-duration:{duration}s;' + pre + '-timing-function:cubic-bezier({easing});';
		
	}
	
	function Transform(obj, to, sets) {
	
		this.onComplete = sets.onComplete;
		this.onCompleteParams = sets.onCompleteParams;
		
		if(sets.duration === 0) {

			this.stop();
			return;
			
		}
		
		var $this = this,
		apply = function() {animate($this, obj, to, sets);};
		
		obj.style.visibility = 'visible';
		obj.cjTransform = this;
		
		if(!sets.delay) {
			
			this.delayed = setTimeout(apply, 30);
			
		}
		else {
			
			this.delayed = setTimeout(apply, sets.delay > 30 ? sets.delay : 30);
			
		}
		
	}
	
	Transform.prototype.stop = function(callback) {
		
		var element = this.obj;
		
		if(!element) {
			
			clearTimeout(this.delayed);	
			if(callback) this.onComplete.apply(element, [this.onCompleteParams]);
		
			return;
			
		}
		
		delete element.cjTransform;
		
		element.removeEventListener(css, cssEnded, false);  
		element.className += " cj-tween";
		element.setAttribute("style", element.getAttribute("style").split(this.moves).join(";").split(";;").join(";"));
		
		if(callback) this.onComplete.call(element, this.onCompleteParams);
		
	};
	
	function animate($this, obj, to, sets) {
		
		$this.obj = obj;
		
		var j,
		key,
		str,
		cur,
		orig,
		bgPos,
		i = 0,
		total,  
		finder,
		moving,
		replaced,
		values = [], 
		tweens = [], 
		current = obj.getAttribute('style'),
		duration = sets.duration || jQuick.defaultDuration,
		easing = (sets.ease || jQuick.defaultEase).toLowerCase().split('.'); 
		
		for(key in to) {
			
			if(!to.hasOwnProperty(key)) continue;
			
			str = key;
			finder = str.match(reg);
			
			if(finder) {
				
				j = finder.length;
					
				while(j--) {
					
					cur = finder[j];
					str = str.replace(new RegExp(cur, 'g'), '-' + cur.toLowerCase());
					
				}
				
				if(str === 'ms-transform') str = '-ms-transform';
				
			}
			
			cur = orig = to[key];
			bgPos = key === "backgroundPosition";
			
			if(!gotcha.test(cur) && key !== "opacity" && key.search(transformProp) === -1 && !bgPos) {
				
				cur += "px;";
				
			}
			else if(!bgPos) {
				
				cur += ";";
				
			}
			else {
			
				var x = orig.x, y = orig.y, isX = isNaN(x), isY = isNaN(y);
				
				if(!isX && !isY) {
				
					x += "px";
					y += "px";
					
				}
				else {
				
					var val = obj.style.backgroundPosition,
					tick = (val !== "") ? val.split(" ") : window.getComputedStyle(obj, null).backgroundPosition.split(" ");
					
					(!isX) ? x += "px" : x = tick[0];
					(!isY) ? y += "px" : y = tick[1];
					
				}

				cur = x + " " + y + ";";
				
			}
			
			values[i] = str + ':' + cur.replace(comma, "{}");
			tweens[i++] = str;
			
			if(!current) continue;
			finder = current.search(str);
			
			if(finder !== -1) {
				
				total = current.length - 1;
				j = finder - 1;
				
				while(++j < total) {
					
					if(current[j] === ';') break;
					
				}
				
				current = current.split(current.substring(finder, j + 1)).join('');
				
			}
			
		}
		
		$this.moves = moving = skeleton.replace(regP, tweens.toString()).replace(regD, (duration * 0.001).toFixed(2)).replace(regE, ceaserEasing[easing[0]][easing[1]]);
		
		replaced = values.toString();
		replaced = replaced.replace(comma, '');
		replaced = replaced.replace(dollar, ',');
		
		obj.className = obj.className.replace(regT, '');
		obj.addEventListener(css, cssEnded, false);  
		obj.setAttribute('style', current.replace(trim, '') + moving + replaced);
		
	}
	
	function cssEnded(event) {
		
		var $this = this.cjTransform;
		
		if($this && event.target === event.currentTarget) $this.stop($this.onComplete);
		
	}
	
	function transform(type, to, sets) {
		
		if(type === 'animate') {
				
			if(this.cjTransform) this.cjTransform.stop();
			if(!sets) sets = {};
			
			if('transform' in to) {
					
				to[transformProp] = to.transform;
				delete to.transform;
				
			}
			
			new Transform(this, to, sets);	
			
		}
		else if(type === 'stop' && this.cjTransform) {
			
			this.cjTransform.stop(to);
			
		}
		
	}
	
	$.fn('transform', function(type, to, sets) {
		
		if(transformProp) {

			return this.each(transform, [type, to, sets]);
			
		}
		else {
		
			return this;
			
		}
		
	});
	
	
})(jQuick);
