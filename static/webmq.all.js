// json2.js start

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (!this.JSON) {
    this.JSON = {};
}

(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                   this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
.replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());
//json2.js end

//swfojbect.js start
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
//swfojbect.js end

//FABridge.js start
/*
 * The Bridge class, responsible for navigating AS instances
 */
function FABridge(target,bridgeName)
{
    this.target = target;
    this.remoteTypeCache = {};
    this.remoteInstanceCache = {};
    this.remoteFunctionCache = {};
    this.localFunctionCache = {};
    this.bridgeID = FABridge.nextBridgeID++;
    this.name = bridgeName;
    this.nextLocalFuncID = 0;
    FABridge.instances[this.name] = this;
    FABridge.idMap[this.bridgeID] = this;

    return this;
}

// type codes for packed values
FABridge.TYPE_ASINSTANCE =  1;
FABridge.TYPE_ASFUNCTION =  2;

FABridge.TYPE_JSFUNCTION =  3;
FABridge.TYPE_ANONYMOUS =   4;

FABridge.initCallbacks = {};
FABridge.userTypes = {};

FABridge.addToUserTypes = function()
{
	for (var i = 0; i < arguments.length; i++)
	{
		FABridge.userTypes[arguments[i]] = {
			'typeName': arguments[i], 
			'enriched': false
		};
	}
}

FABridge.argsToArray = function(args)
{
    var result = [];
    for (var i = 0; i < args.length; i++)
    {
        result[i] = args[i];
    }
    return result;
}

function instanceFactory(objID)
{
    this.fb_instance_id = objID;
    return this;
}

function FABridge__invokeJSFunction(args)
{  
    var funcID = args[0];
    var throughArgs = args.concat();//FABridge.argsToArray(arguments);
    throughArgs.shift();
   
    var bridge = FABridge.extractBridgeFromID(funcID);
    return bridge.invokeLocalFunction(funcID, throughArgs);
}

FABridge.addInitializationCallback = function(bridgeName, callback)
{
    var inst = FABridge.instances[bridgeName];
    if (inst != undefined)
    {
        callback.call(inst);
        return;
    }

    var callbackList = FABridge.initCallbacks[bridgeName];
    if(callbackList == null)
    {
        FABridge.initCallbacks[bridgeName] = callbackList = [];
    }

    callbackList.push(callback);
}

// updated for changes to SWFObject2
function FABridge__bridgeInitialized(bridgeName) {
    var objects = document.getElementsByTagName("object");
    var ol = objects.length;
    var activeObjects = [];
    if (ol > 0) {
		for (var i = 0; i < ol; i++) {
			if (typeof objects[i].SetVariable != "undefined") {
				activeObjects[activeObjects.length] = objects[i];
			}
		}
	}
    var embeds = document.getElementsByTagName("embed");
    var el = embeds.length;
    var activeEmbeds = [];
    if (el > 0) {
		for (var j = 0; j < el; j++) {
			if (typeof embeds[j].SetVariable != "undefined") {
            	activeEmbeds[activeEmbeds.length] = embeds[j];
            }
        }
    }
    var aol = activeObjects.length;
    var ael = activeEmbeds.length;
    var searchStr = "bridgeName="+ bridgeName;
    if ((aol == 1 && !ael) || (aol == 1 && ael == 1)) {
    	FABridge.attachBridge(activeObjects[0], bridgeName);	 
    }
    else if (ael == 1 && !aol) {
    	FABridge.attachBridge(activeEmbeds[0], bridgeName);
        }
    else {
                var flash_found = false;
		if (aol > 1) {
			for (var k = 0; k < aol; k++) {
				 var params = activeObjects[k].childNodes;
				 for (var l = 0; l < params.length; l++) {
					var param = params[l];
					if (param.nodeType == 1 && param.tagName.toLowerCase() == "param" && param["name"].toLowerCase() == "flashvars" && param["value"].indexOf(searchStr) >= 0) {
						FABridge.attachBridge(activeObjects[k], bridgeName);
                            flash_found = true;
                            break;
                        }
                    }
                if (flash_found) {
                    break;
                }
            }
        }
		if (!flash_found && ael > 1) {
			for (var m = 0; m < ael; m++) {
				var flashVars = activeEmbeds[m].attributes.getNamedItem("flashVars").nodeValue;
				if (flashVars.indexOf(searchStr) >= 0) {
					FABridge.attachBridge(activeEmbeds[m], bridgeName);
					break;
    }
            }
        }
    }
    return true;
}

// used to track multiple bridge instances, since callbacks from AS are global across the page.

FABridge.nextBridgeID = 0;
FABridge.instances = {};
FABridge.idMap = {};
FABridge.refCount = 0;

FABridge.extractBridgeFromID = function(id)
{
    var bridgeID = (id >> 16);
    return FABridge.idMap[bridgeID];
}

FABridge.attachBridge = function(instance, bridgeName)
{
    var newBridgeInstance = new FABridge(instance, bridgeName);

    FABridge[bridgeName] = newBridgeInstance;

/*  FABridge[bridgeName] = function() {
        return newBridgeInstance.root();
    }
*/
    var callbacks = FABridge.initCallbacks[bridgeName];
    if (callbacks == null)
    {
        return;
    }
    for (var i = 0; i < callbacks.length; i++)
    {
        callbacks[i].call(newBridgeInstance);
    }
    delete FABridge.initCallbacks[bridgeName]
}

// some methods can't be proxied.  You can use the explicit get,set, and call methods if necessary.

FABridge.blockedMethods =
{
    toString: true,
    get: true,
    set: true,
    call: true
};

FABridge.prototype =
{


// bootstrapping

    root: function()
    {
        return this.deserialize(this.target.getRoot());
    },
//clears all of the AS objects in the cache maps
    releaseASObjects: function()
    {
        return this.target.releaseASObjects();
    },
//clears a specific object in AS from the type maps
    releaseNamedASObject: function(value)
    {
        if(typeof(value) != "object")
        {
            return false;
        }
        else
        {
            var ret =  this.target.releaseNamedASObject(value.fb_instance_id);
            return ret;
        }
    },
//create a new AS Object
    create: function(className)
    {
        return this.deserialize(this.target.create(className));
    },


    // utilities

    makeID: function(token)
    {
        return (this.bridgeID << 16) + token;
    },


    // low level access to the flash object

//get a named property from an AS object
    getPropertyFromAS: function(objRef, propName)
    {
        if (FABridge.refCount > 0)
        {
            throw new Error("You are trying to call recursively into the Flash Player which is not allowed. In most cases the JavaScript setTimeout function, can be used as a workaround.");
        }
        else
        {
            FABridge.refCount++;
            retVal = this.target.getPropFromAS(objRef, propName);
            retVal = this.handleError(retVal);
            FABridge.refCount--;
            return retVal;
        }
    },
//set a named property on an AS object
    setPropertyInAS: function(objRef,propName, value)
    {
        if (FABridge.refCount > 0)
        {
            throw new Error("You are trying to call recursively into the Flash Player which is not allowed. In most cases the JavaScript setTimeout function, can be used as a workaround.");
        }
        else
        {
            FABridge.refCount++;
            retVal = this.target.setPropInAS(objRef,propName, this.serialize(value));
            retVal = this.handleError(retVal);
            FABridge.refCount--;
            return retVal;
        }
    },

//call an AS function
    callASFunction: function(funcID, args)
    {
        if (FABridge.refCount > 0)
        {
            throw new Error("You are trying to call recursively into the Flash Player which is not allowed. In most cases the JavaScript setTimeout function, can be used as a workaround.");
        }
        else
        {
            FABridge.refCount++;
            retVal = this.target.invokeASFunction(funcID, this.serialize(args));
            retVal = this.handleError(retVal);
            FABridge.refCount--;
            return retVal;
        }
    },
//call a method on an AS object
    callASMethod: function(objID, funcName, args)
    {
        if (FABridge.refCount > 0)
        {
            throw new Error("You are trying to call recursively into the Flash Player which is not allowed. In most cases the JavaScript setTimeout function, can be used as a workaround.");
        }
        else
        {
            FABridge.refCount++;
            args = this.serialize(args);
            retVal = this.target.invokeASMethod(objID, funcName, args);
            retVal = this.handleError(retVal);
            FABridge.refCount--;
            return retVal;
        }
    },

    // responders to remote calls from flash

    //callback from flash that executes a local JS function
    //used mostly when setting js functions as callbacks on events
    invokeLocalFunction: function(funcID, args)
    {
        var result;
        var func = this.localFunctionCache[funcID];

        if(func != undefined)
        {
            result = this.serialize(func.apply(null, this.deserialize(args)));
        }

        return result;
    },

    // Object Types and Proxies
	
    // accepts an object reference, returns a type object matching the obj reference.
    getTypeFromName: function(objTypeName)
    {
        return this.remoteTypeCache[objTypeName];
    },
    //create an AS proxy for the given object ID and type
    createProxy: function(objID, typeName)
    {
        var objType = this.getTypeFromName(typeName);
	        instanceFactory.prototype = objType;
	        var instance = new instanceFactory(objID);
        this.remoteInstanceCache[objID] = instance;
        return instance;
    },
    //return the proxy associated with the given object ID
    getProxy: function(objID)
    {
        return this.remoteInstanceCache[objID];
    },

    // accepts a type structure, returns a constructed type
    addTypeDataToCache: function(typeData)
    {
        newType = new ASProxy(this, typeData.name);
        var accessors = typeData.accessors;
        for (var i = 0; i < accessors.length; i++)
        {
            this.addPropertyToType(newType, accessors[i]);
        }

        var methods = typeData.methods;
        for (var i = 0; i < methods.length; i++)
        {
            if (FABridge.blockedMethods[methods[i]] == undefined)
            {
                this.addMethodToType(newType, methods[i]);
            }
        }


        this.remoteTypeCache[newType.typeName] = newType;
        return newType;
    },

    //add a property to a typename; used to define the properties that can be called on an AS proxied object
    addPropertyToType: function(ty, propName)
    {
        var c = propName.charAt(0);
        var setterName;
        var getterName;
        if(c >= "a" && c <= "z")
        {
            getterName = "get" + c.toUpperCase() + propName.substr(1);
            setterName = "set" + c.toUpperCase() + propName.substr(1);
        }
        else
        {
            getterName = "get" + propName;
            setterName = "set" + propName;
        }
        ty[setterName] = function(val)
        {
            this.bridge.setPropertyInAS(this.fb_instance_id, propName, val);
        }
        ty[getterName] = function()
        {
            return this.bridge.deserialize(this.bridge.getPropertyFromAS(this.fb_instance_id, propName));
        }
    },

    //add a method to a typename; used to define the methods that can be callefd on an AS proxied object
    addMethodToType: function(ty, methodName)
    {
        ty[methodName] = function()
        {
            return this.bridge.deserialize(this.bridge.callASMethod(this.fb_instance_id, methodName, FABridge.argsToArray(arguments)));
        }
    },

    // Function Proxies

    //returns the AS proxy for the specified function ID
    getFunctionProxy: function(funcID)
    {
        var bridge = this;
        if (this.remoteFunctionCache[funcID] == null)
        {
            this.remoteFunctionCache[funcID] = function()
            {
                bridge.callASFunction(funcID, FABridge.argsToArray(arguments));
            }
        }
        return this.remoteFunctionCache[funcID];
    },
    
    //reutrns the ID of the given function; if it doesnt exist it is created and added to the local cache
    getFunctionID: function(func)
    {
        if (func.__bridge_id__ == undefined)
        {
            func.__bridge_id__ = this.makeID(this.nextLocalFuncID++);
            this.localFunctionCache[func.__bridge_id__] = func;
        }
        return func.__bridge_id__;
    },

    // serialization / deserialization

    serialize: function(value)
    {
        var result = {};

        var t = typeof(value);
        //primitives are kept as such
        if (t == "number" || t == "string" || t == "boolean" || t == null || t == undefined)
        {
            result = value;
        }
        else if (value instanceof Array)
        {
            //arrays are serializesd recursively
            result = [];
            for (var i = 0; i < value.length; i++)
            {
                result[i] = this.serialize(value[i]);
            }
        }
        else if (t == "function")
        {
            //js functions are assigned an ID and stored in the local cache 
            result.type = FABridge.TYPE_JSFUNCTION;
            result.value = this.getFunctionID(value);
        }
        else if (value instanceof ASProxy)
        {
            result.type = FABridge.TYPE_ASINSTANCE;
            result.value = value.fb_instance_id;
        }
        else
        {
            result.type = FABridge.TYPE_ANONYMOUS;
            result.value = value;
        }

        return result;
    },

    //on deserialization we always check the return for the specific error code that is used to marshall NPE's into JS errors
    // the unpacking is done by returning the value on each pachet for objects/arrays 
    deserialize: function(packedValue)
    {

        var result;

        var t = typeof(packedValue);
        if (t == "number" || t == "string" || t == "boolean" || packedValue == null || packedValue == undefined)
        {
            result = this.handleError(packedValue);
        }
        else if (packedValue instanceof Array)
        {
            result = [];
            for (var i = 0; i < packedValue.length; i++)
            {
                result[i] = this.deserialize(packedValue[i]);
            }
        }
        else if (t == "object")
        {
            for(var i = 0; i < packedValue.newTypes.length; i++)
            {
                this.addTypeDataToCache(packedValue.newTypes[i]);
            }
            for (var aRefID in packedValue.newRefs)
            {
                this.createProxy(aRefID, packedValue.newRefs[aRefID]);
            }
            if (packedValue.type == FABridge.TYPE_PRIMITIVE)
            {
                result = packedValue.value;
            }
            else if (packedValue.type == FABridge.TYPE_ASFUNCTION)
            {
                result = this.getFunctionProxy(packedValue.value);
            }
            else if (packedValue.type == FABridge.TYPE_ASINSTANCE)
            {
                result = this.getProxy(packedValue.value);
            }
            else if (packedValue.type == FABridge.TYPE_ANONYMOUS)
            {
                result = packedValue.value;
            }
        }
        return result;
    },
    //increases the reference count for the given object
    addRef: function(obj)
    {
        this.target.incRef(obj.fb_instance_id);
    },
    //decrease the reference count for the given object and release it if needed
    release:function(obj)
    {
        this.target.releaseRef(obj.fb_instance_id);
    },

    // check the given value for the components of the hard-coded error code : __FLASHERROR
    // used to marshall NPE's into flash
    
    handleError: function(value)
    {
        if (typeof(value)=="string" && value.indexOf("__FLASHERROR")==0)
        {
            var myErrorMessage = value.split("||");
            if(FABridge.refCount > 0 )
            {
                FABridge.refCount--;
            }
            throw new Error(myErrorMessage[1]);
            return value;
        }
        else
        {
            return value;
        }   
    }
};

// The root ASProxy class that facades a flash object

ASProxy = function(bridge, typeName)
{
    this.bridge = bridge;
    this.typeName = typeName;
    return this;
};
//methods available on each ASProxy object
ASProxy.prototype =
{
    get: function(propName)
    {
        return this.bridge.deserialize(this.bridge.getPropertyFromAS(this.fb_instance_id, propName));
    },

    set: function(propName, value)
    {
        this.bridge.setPropertyInAS(this.fb_instance_id, propName, value);
    },

    call: function(funcName, args)
    {
        this.bridge.callASMethod(this.fb_instance_id, funcName, args);
    }, 
    
    addRef: function() {
        this.bridge.addRef(this);
    }, 
    
    release: function() {
        this.bridge.release(this);
    }
};
//FABridge.js end

//start webmq.js
/**
 * 
 * @author xiaosong.liangxs
 */

(function() {

	if (!window.console) {
		window.console = {
			log : function() {
			},
			error : function() {
			}
		};
	}
	if (window.ActiveXObject) {// for IE
		document.documentElement.addBehavior("#default#userdata");
	}
	;
	var SessionCache = function() {
		return {
			set : function(key, value) {
				if (window.ActiveXObject) {
					/*
					 * for ie5.0+
					 */
					with (document.documentElement) {
						try {
							load(key);
							setAttribute("webmq", value);
							save(key);
						} catch (ex) {
							setAttribute("webmq", value);
							save(key);
						}
					}
				} else if (window.sessionStorage) {
					/*
					 * for firefox2.0+
					 */
					sessionStorage.setItem(key, value);
				}
			},
			get : function(key) {
				if (window.ActiveXObject) {
					with (document.documentElement) {
						try {
							load(key);
							return getAttribute("webmq");
						} catch (ex) {
							return null;
						}
					}
				} else if (window.sessionStorage) {
					return sessionStorage.getItem(key);
				} else {
					return null;
				}
			},
			remove : function(key) {
				if (window.ActiveXObject) {
					with (document.documentElement) {
						try {
							load(key);
							expires = new Date(315532799000).toUTCString();
							save(key);
						} catch (ex) {
						}
					}
				} else if (window.sessionStorage) {
					sessionStorage.removeItem(key);
				}
			}
		};
	};

	/**
	 * disable flash webSocket auto init
	 */
	window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;

	window.WEBMQ_SESSION_KEY = "__w_s_id";

	window.WEBMQ_CONNECTION_NUMBER = "__w_c_n";

	Webmq = function(hostname, port, domain) {
		if (window.WEB_MQ_ID == undefined) {
			window.WEB_MQ_ID = 0;
		}
		this.id = ++window.WEB_MQ_ID;
		this.sessionCache = new SessionCache();
		this.hostname = hostname;
		this.port = port;
		this.domain = domain;
		this.queueListeners = {};
		this.topicListeners = {};
		this.conNumber = 0;
		this.pageId;
		this.closed = false;
		if (window.HTTP_STREAMING_DISABLED == undefined) {
			window.HTTP_STREAMING_DISABLED = false;
		}

		/**
		 * 
		 */
		if (!window.WEB_SOCKET_DISABLE
				&& (window.WebSocket || (swfobject
						.hasFlashPlayerVersion("9.0.0") && location.protocol != "file:"))) {
			/*
			 * use websokcet
			 */
			this.connection = this.createWsConnection();
		} else {
			/*
			 * use httpstreaming or long polling
			 */
			this.connection = this.createUnWsConnection();
		}
	};
	// public API start
	Webmq.prototype.publish = function(destination, message, type) {
		this.checkConnection();
		var publishCommand = {
			"domain" : this.domain,
			"queue" : "queue" == type,
			"destName" : (destination),
			"message" : (message),
			"type" : "publish"
		};
		this.connection.send(publishCommand);
	};

	Webmq.prototype.close = function() {
		if (this.closed) {
			return;
		}
		var closeCommand = {
			"type" : "close"
		};
		this.connection.send(closeCommand);
		this.closed = true;
		this.connection.close();
	};

	Webmq.prototype.subscribe = function(destination, onMessage, type) {
		this.subscribes( [ destination ], [ onMessage ], [ type ]);
	};

	Webmq.prototype.subscribes = function(destinations, onMessages, types) {
		this.checkConnection();
		if (destinations && onMessages && types
				&& destinations.length == onMessages.length
				&& destinations.length == types.length) {

			var subscibeCommand = {
				"destNames" : destinations,
				"domain" : this.domain,
				"destTypes" : types,
				"type" : "subscibe"
			};
			for ( var int = 0; int < destinations.length; int++) {
				if ("queue" == types[int]) {
					this.queueListeners[destinations[int]] = onMessages[int];
				} else {
					this.topicListeners[destinations[int]] = onMessages[int];
				}
			}
			this.connection.send(subscibeCommand);
		} else {
			throw "illegal args,the expression:'destinations && onMessages && types "
					+ " && destinations.length == onMessages.length&& destinations.length == types.length "
					+ " is false'";
		}
	};

	Webmq.prototype.unSubscribe = function(destination, type) {
		this.unSubscribes( [ destination ], [ type ]);
	};
	Webmq.prototype.unSubscribes = function(destinations, types) {
		this.checkConnection();
		if (destinations && types && destinations.length == types.length) {
			var unSubscibeCommand = {
				"destNames" : destinations,
				"domain" : this.domain,
				"destTypes" : types,
				"type" : "unSubscibe"
			};
			this.connection.send(unSubscibeCommand);
			for ( var int = 0; int < destinations.length; int++) {
				if ("queue" == types[int]) {
					delete this.queueListeners[destinations[int]];
				} else {
					delete this.topicListeners[destinations[int]];
				}
			}
		} else {
			throw "illegal args,the expression:'destinations && types"
					+ " && destinations.length == types.length' "
					+ " is false'";
		}
	};
	// public API end

	// private API start

	Webmq.prototype.___getTopDomain = function(domain) {
		var ___Domains = new Array(".com.cn", ".net.cn", ".org.cn", ".gov.cn",
				".com", ".cn", ".net", ".cc", ".org", ".info", ".biz", ".tv");
		for ( var i = 0; i < ___Domains.length; i++) {
			var domainPostfix = ___Domains[i];
			if (domain.indexOf(domainPostfix) != -1) {
				domain = domain.replace(domainPostfix, "");
				domain = domain.substring(domain.lastIndexOf(".") + 1,
						domain.length);
				domain = domain + domainPostfix;
				break;
			}
		}
		return domain;
	};
	Webmq.prototype.___getSameDomain = function(hostname, port) {
		if (location.protocol != "http:") {
			return null;
		}
		var srcDomain = this.___getTopDomain(document.domain);
		var destDomain = this.___getTopDomain(hostname);
		if (srcDomain == destDomain) {
			return srcDomain;
		}
		return null;
	};

	Webmq.prototype.commandsReceived = function(messages) {
		if (!messages || messages.length == 0) {
			return;
		}
		for ( var i = 0; i < messages.length; i++) {
			var message = messages[i];
			try {
				var command = JSON.parse(message);
				if (!command || !command["type"]) {
					console.error("the message[" + message
							+ "] don't has property:'type'!");
					continue;
				}
				switch (command["type"]) {
				case "publish":
					var listener;
					if (command["queue"]) {
						listener = this.queueListeners[command["destName"]];
					} else {
						listener = this.topicListeners[command["destName"]];
					}
					if (listener && typeof (listener) == "function") {
						listener(command);
					} else {
						console.error("the message[" + message
								+ "] do't has listener.");
					}
					break;
				case "login":
					this.sessionCache.set(window.WEBMQ_SESSION_KEY,
							command.sessionId);
					this.pageId = command.pageId;
					break;
				case "hb":
					break;
				default:
					console.error("the message[" + message
							+ "] don't has listener.");
					break;
				}
			} catch (e) {
				console.error("the message[" + message + "] don't consumed!");
			}
		}

	};

	Webmq.prototype.getPageId = function() {
		this.checkConnection();
		var pageId = this.pageId;
		if (!pageId) {
			pageId = this.sessionCache.get(window.WEBMQ_SESSION_KEY);
		}
		return pageId;
	};
	Webmq.prototype.checkConnection = function() {
		if (this.closed) {
			throw "the connection is closed!";
		}
	};

	Webmq.prototype.collectDestinations = function() {
		var destNames = new Array();
		var destTypes = new Array();
		for ( var destName in this.queueListeners) {
			destNames.push(destName);
			destTypes.push("queue");
		}
		for ( var destName in this.topicListeners) {
			destNames.push(destName);
			destTypes.push("topic");
		}
		return {
			"destNames" : destNames,
			"domain" : this.domain,
			"destTypes" : destTypes,
			"type" : "subscibe"
		};
	};

	Webmq.prototype.increaseConNum = function() {
		var conNumber = this.sessionCache.get(window.WEBMQ_CONNECTION_NUMBER);
		if (conNumber) {
			conNumber = parseInt(conNumber) + 1;
		} else {
			conNumber = 1;
		}
		this.sessionCache.set(window.WEBMQ_CONNECTION_NUMBER, conNumber);
	};

	Webmq.prototype.decreaseConNum = function() {
		var conNumber = this.sessionCache.get(window.WEBMQ_CONNECTION_NUMBER);
		if (conNumber) {
			conNumber = parseInt(conNumber) - 1;
		} else {
			conNumber = 0;
		}
		this.sessionCache.set(window.WEBMQ_CONNECTION_NUMBER,
				(conNumber >= 0 ? conNumber : 0));
	};

	Webmq.prototype.createWsConnection = function() {
		console.log("use websocket to connecting to webmq server!");
		var self = this;
		if (!window.WEB_SOCKET_SWF_LOCATION) {
			// window.WEB_SOCKET_SWF_LOCATION ="./static/WebSocketMain.swf";
			// window.WEB_SOCKET_SWF_LOCATION = "http://"+this.hostname+
			// ":"+this.port+"/static?WebSocketMain.swf";
			window.WEB_SOCKET_SWF_LOCATION = "http://" + this.hostname + ":"
					+ this.port + "/static?WebSocketMainInsecure.swf";
		}
		if (WebSocket.__initialize) {
			/*
			 * use flash websokcet
			 */
			WebSocket.__initialize();
		} else {
			/*
			 * use native websokcet
			 */
		}
		// websocket
		var ws;
		var createWebSocket = function(subscibeCommand) {
			var pageId = self.getPageId();
			var newWebSocket = new WebSocket("ws://"
					+ self.hostname
					+ ":"
					+ self.port
					+ "/ls"
					+ (pageId ? (";" + pageId) : "")
					+ "?"
					+ (subscibeCommand ? "json="
							+ encodeURIComponent(JSON
									.stringify(subscibeCommand)) : ""));
			newWebSocket.onclose = function() {
				/* reconnecting websocket */
				if (!self.closed) {
					createWebSocket(self.collectDestinations());
				}
			};
			newWebSocket.onerror = function() {
				newWebSocket.close();
			};
			newWebSocket.onopen = function() {

			};
			newWebSocket.onmessage = function(e) {
				try {
					var data = JSON.parse(e.data);
					if (data && data["data"]) {
						var messages = data["data"];
						self.commandsReceived(messages);
					} else {
						console.error(e.data);
					}
				} catch (e) {
					console.error("parse error:" + e + ",the text:" + e.data);
				}

			};

			ws = newWebSocket;
		};

		var subscibeCommand = {
			"domain" : this.domain,
			"type" : "subscibe"
		};
		// open websocket
		createWebSocket(subscibeCommand);
		var connection = {
			close : function() {
				ws.close();
			},
			send : function(command) {
				var json = JSON.stringify(command);
				/*
				 * the hard code for safari,WebSocket.CONNECTING = 0;
				 * WebSocket.OPEN = 1; WebSocket.CLOSING = 2; WebSocket.CLOSED =
				 * 3;
				 * 
				 */
				if (1 == ws.readyState) {
					try {
						ws.send(json);
					} catch (e) {
						ws.close();
						console.error(e);
						throw e;
					}
				} else if (0 == ws.readyState) {
					var interval = window.setInterval(function() {
						if (1 == ws.readyState) {
							try {
								ws.send(json);
							} catch (e) {
								console.error(e);
								ws.close();
							}
							window.clearInterval(interval);
						}
					}, 500);
				} else {
					var msg = "Web Socket connection has not been established";
					console.error(msg);
					throw msg;
				}
			}
		};
		return connection;
	};

	Webmq.prototype.createUnWsConnection = function() {
		console.log("use unWebsocket to connecting to webmq server!");
		var self = this;
		// callback function prefix
		var functionNamePrefix = "___cf_";
		/*
		 * callback function started ID
		 */
		var functionId = 10;
		// longpolling connected?
		var connected = false;

		var connection = {
			close : function() {
			},
			send : function(command) {
				if (!command || !command["type"]) {
					throw "the command:" + command + " is illegal!";
				}
				if ("subscibe" == command["type"]) {
					this.sendSubscibeCommand(command);
				} else {
					this.sendHttpRequest(command);
				}
			},
			sendSubscibeCommand : function(command) {
				/**
				 * 
				 */
				if (!connected) {
					connected = true;
					var sameDomain = self.___getSameDomain(self.hostname,
							self.port);
					if (sameDomain && !window.HTTP_STREAMING_DISABLED) {
						document.domain = sameDomain;
						this.httpStreaming(command);
					} else {
						// 解决firefox在窗口刷新后还发出longpolling请求
						var userAgent = navigator.userAgent.toLowerCase();
						if (/mozilla/.test(userAgent)
								&& !/(compatible|webkit)/.test(userAgent)) {
							window.addEventListener("beforeunload", function(
									srcElement) {
								self.closed = true;
							}, false);
						}
						this.longPolling(command);
					}
				} else {
					if (self.pageId) {
						this.sendHttpRequest(command);
					} else {
						var selfConnection = this;
						var int = window.setInterval(function() {
							if (self.pageId) {
								window.clearInterval(int);
								selfConnection.sendHttpRequest(command);
							}
						}, 500);
					}
				}

			},
			sendHttpRequest : function(command) {
				var pageId = self.getPageId();
				var jsonText = JSON.stringify(command);
				var url = "http://" + self.hostname + ":" + self.port + "/s"
						+ (pageId ? ";" + pageId : "") + "?json="
						+ encodeURIComponent(jsonText);
				this.loadUrl(url, function(obj) {

				}, function(success) {
					if (!success) {
						console.error("send http request failure,the url:"
								+ url);
					}
				});
			},
			httpStreaming : function(subscibeCommand) {
				// callback function name
				var functionName = functionNamePrefix + (self.id) + "_"
						+ (++functionId);
				var generateIframeUrl = function(subscibeCommand) {
					if (!subscibeCommand) {
						subscibeCommand = self.collectDestinations();
					}
					var pageId = self.getPageId();
					var iframeUrl = "http://"
							+ self.hostname
							+ ":"
							+ self.port
							+ "/ls"
							+ (pageId ? ";" + pageId : "")
							+ "?"
							+ (subscibeCommand ? "json="
									+ encodeURIComponent(JSON
											.stringify(subscibeCommand)) : "")
							+ "&streaming=true";
					return (iframeUrl + "&funId=" + functionName + "&t=" + (new Date()
							.getTime()));
				};

				var callbackFun = function(messages) {
					try {
						self.commandsReceived(messages);
					} catch (e) {
						console.error(e);
					}
				};

				var iframeId = 'comet_iframe_' + (new Date().getTime());
				var userAgent = navigator.userAgent.toLowerCase();
				if (/msie/.test(userAgent) && !/opera/.test(userAgent)) {
					// For IE browsers
					var htmlfileCon = new ActiveXObject("htmlfile");
					htmlfileCon.open();
					htmlfileCon.write("<html>");
					htmlfileCon
							.write("<script type='text/javascript'>document.domain = '"
									+ self.___getTopDomain(document.domain)
									+ "';<\/script>");
					htmlfileCon.write("</html>");
					htmlfileCon.close();
					var innerIframe = htmlfileCon.createElement("iframe");
					innerIframe.id = iframeId;
					innerIframe.src = generateIframeUrl(subscibeCommand);
					htmlfileCon.parentWindow[functionName] = callbackFun;
					htmlfileCon.body.appendChild(innerIframe);
					window.attachEvent("onunload", function() {
						// close iframe http connection
						innerIframe.src = "";
					});
					// auto reconnect
					var int = window
							.setInterval(
									function() {
										var readyState;
										try {
											readyState = innerIframe.readyState;
										} catch (e) {
											readyState = "complete";
										}
										if (readyState == "complete"
												|| readyState == "loaded") {
											if (self.closed) {
												window.clearInterval(int);
											} else {
												innerIframe.src = generateIframeUrl(null);
											}
										}
									}, 4000);
					return;
				}

				if (/mozilla/.test(userAgent)
						&& !/(compatible|webkit)/.test(userAgent)) {
					// For Firefox browser
					var hiddenIframe = document.createElement('iframe');
					hiddenIframe.setAttribute('id', iframeId);
					with (hiddenIframe.style) {
						left = top = "-100px";
						height = width = "1px";
						visibility = "hidden";
						display = 'none';
					}
					var innerIframe = document.createElement('iframe');
					innerIframe.setAttribute('src',
							generateIframeUrl(subscibeCommand));
					hiddenIframe.appendChild(innerIframe);
					window[functionName] = callbackFun;
					document.body.appendChild(hiddenIframe);
					window.addEventListener("unload", function() {
						// close iframe http connection
						hiddenIframe.setAttribute("src", "");
					}, false);
					// auto reconnect
					var int = window
							.setInterval(
									function() {
										var readyState;
										try {
											readyState = innerIframe.contentWindow.document.readyState;
										} catch (e) {
											readyState = "complete";
										}
										if (readyState == "complete"
												|| readyState == "loaded") {
											if (self.closed) {
												window.clearInterval(int);
											} else {
												innerIframe
														.setAttribute(
																'src',
																generateIframeUrl(null));
											}
										}
									}, 2000);
					return;
				}
				if (/webkit/.test(userAgent) || /opera/.test(userAgent)) {
					// for chrome or other browsers
					var hiddenIframe = document.createElement('iframe');
					hiddenIframe.setAttribute('id', iframeId);
					hiddenIframe.setAttribute('src',
							generateIframeUrl(subscibeCommand));
					with (hiddenIframe.style) {
						position = "absolute";
						left = top = "-100px";
						height = width = "1px";
						visibility = "hidden";
					}
					window[functionName] = callbackFun;
					document.body.appendChild(hiddenIframe);
					window.addEventListener("unload", function() {
						// close iframe http connection
						hiddenIframe.setAttribute("src", "");
					}, false);
					// auto connect
					hiddenIframe.addEventListener("load", function() {
						if (!self.closed) {
							hiddenIframe.setAttribute('src',
									generateIframeUrl(null));
						}
					}, false);
					hiddenIframe.addEventListener("error", function() {
						if (!self.closed) {
							hiddenIframe.setAttribute('src',
									generateIframeUrl(null));
						}
					}, false);
					return;
				}

			},

			longPolling : function(subscibeCommand) {

				var pageId = self.getPageId();
				var connectionSelf = this;
				this.loadUrl("http://"
						+ self.hostname
						+ ":"
						+ self.port
						+ "/ls"
						+ (pageId ? ";" + pageId : "")
						+ "?"
						+ (subscibeCommand ? "json="
								+ encodeURIComponent(JSON
										.stringify(subscibeCommand)) : ""),
						function(messages) {
							try {
								self.commandsReceived(messages);
							} catch (e) {
								console.error(e);
							}
						}, function(success) {
							/**
							 * the next longpolling
							 */
							if (!self.closed) {
								var subscibeCommand;
								if (!success) {
									subscibeCommand = self
											.collectDestinations();
								}
								connectionSelf.longPolling(subscibeCommand);
							}
						});
			},
			/**
			 * url callback onload
			 */
			loadUrl : function(url, callback, onScriptTagloaded) {
				if (url.length > 3800) {
					throw "the url.length:" + url.length
							+ " is too long,the url:" + url + "";
				}
				if (url.indexOf("?") < 0) {
					url = url + "?";
				}
				var functionName = functionNamePrefix + (self.id) + "_"
						+ (++functionId);
				/**
				 * append the function name
				 */
				if (url.charAt(url.length - 1) != "&") {
					url = url + "&";
				}
				url = url + "funId=" + functionName + "&t="
						+ (new Date().getTime());

				var success = false;
				window[functionName] = function(obj) {
					success = true;
					try {
						if (!obj) {
							return;
						}
						if (callback) {
							callback(obj);
						}
					} catch (e) {
						console.error(e);
					} finally {
						// delete the function
						window[functionName] = undefined;
						try {
							delete window[functionName];
						} catch (e) {
						}
					}
				};
				var connectionSelf = this;
				var script = document.createElement("script");
				if (script.addEventListener) {
					/*
					 * for FF or other
					 */
					script.addEventListener("load", function(srcElement) {
						connectionSelf.removeScritElement(script);
						if (onScriptTagloaded
								&& typeof (onScriptTagloaded) == "function") {
							onScriptTagloaded(true);
						}
					}, false);
					script.addEventListener("error", function(srcElement) {
						connectionSelf.removeScritElement(script);
						if (onScriptTagloaded
								&& typeof (onScriptTagloaded) == "function") {
							onScriptTagloaded(false);
						}
					}, false);

				} else if (script.attachEvent) {
					/*
					 * for IE
					 */
					script
							.attachEvent(
									"onreadystatechange",
									function(event) {
										var target = event.srcElement;
										if (target.readyState == "loaded"
												|| target.readyState == "complete") {
											connectionSelf
													.removeScritElement(script);
											if (onScriptTagloaded
													&& typeof (onScriptTagloaded) == "function") {
												onScriptTagloaded(success);
											}
										}
									});
				}
				script.setAttribute("src", url);
				// script.setAttribute("charset", "UTF-8");
				script.setAttribute("type", "text/javascript");
				document.getElementsByTagName("head")[0].appendChild(script);
			},
			removeScritElement : function(script) {
				document.getElementsByTagName("head")[0].removeChild(script);
			}
		};
		return connection;
	};
	// private API end
})();

//webmq.js end

// web_socket.js start 

(function() {

	if (window.WebSocket)
		return;

	var console = window.console;
	if (!console)
		console = {
			log : function() {
			},
			error : function() {
			}
		};

	if (!swfobject.hasFlashPlayerVersion("9.0.0")) {
		console.error("Flash Player is not installed.");
		return;
	}
	if (location.protocol == "file:") {
		console.error("WARNING: web-socket-js doesn't work in file:///... URL "
				+ "unless you set Flash Security Settings properly. "
				+ "Open the page via Web server i.e. http://...");
	}

	WebSocket = function(url, protocol, proxyHost, proxyPort, headers) {
		var self = this;
		self.readyState = WebSocket.CONNECTING;
		self.bufferedAmount = 0;
		// Uses setTimeout() to make sure __createFlash() runs after the caller
		// sets ws.onopen etc.
		// Otherwise, when onopen fires immediately, onopen is called before it
		// is set.
		setTimeout(function() {
			WebSocket.__addTask(function() {
				self
						.__createFlash(url, protocol, proxyHost, proxyPort,
								headers);
			});
		}, 1);
	};

	WebSocket.prototype.__createFlash = function(url, protocol, proxyHost,
			proxyPort, headers) {
		var self = this;
		self.__flash = WebSocket.__flash.create(url, protocol, proxyHost
				|| null, proxyPort || 0, headers || null);

		self.__flash.addEventListener("open", function(fe) {
			try {
				self.readyState = self.__flash.getReadyState();
				if (self.__timer)
					clearInterval(self.__timer);
				if (window.opera) {
					// Workaround for weird behavior of Opera which sometimes
					// drops events.
					self.__timer = setInterval(function() {
						self.__handleMessages();
					}, 500);
				}
				if (self.onopen)
					self.onopen();
			} catch (e) {
				console.error(e.toString());
			}
		});

		self.__flash.addEventListener("close", function(fe) {
			try {
				self.readyState = self.__flash.getReadyState();
				if (self.__timer)
					clearInterval(self.__timer);
				if (self.onclose)
					self.onclose();
			} catch (e) {
				console.error(e.toString());
			}
		});

		self.__flash.addEventListener("message", function() {
			try {
				self.__handleMessages();
			} catch (e) {
				console.error(e.toString());
			}
		});

		self.__flash.addEventListener("error", function(fe) {
			try {
				if (self.__timer)
					clearInterval(self.__timer);
				if (self.onerror)
					self.onerror();
			} catch (e) {
				console.error(e.toString());
			}
		});

		self.__flash.addEventListener("stateChange", function(fe) {
			try {
				self.readyState = self.__flash.getReadyState();
				self.bufferedAmount = fe.getBufferedAmount();
			} catch (e) {
				console.error(e.toString());
			}
		});

		// console.log("[WebSocket] Flash object is ready");
	};

	WebSocket.prototype.send = function(data) {
		if (this.__flash) {
			this.readyState = this.__flash.getReadyState();
		}
		if (!this.__flash || this.readyState == WebSocket.CONNECTING) {
			throw "INVALID_STATE_ERR: Web Socket connection has not been established";
		}
		// We use encodeURIComponent() here, because FABridge doesn't work if
		// the argument includes some characters. We don't use escape() here
		// because of this:
		// https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
		// But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
		// preserve all Unicode characters either e.g. "\uffff" in Firefox.
		var result = this.__flash.send(encodeURIComponent(data));
		if (result < 0) { // success
			return true;
		} else {
			this.bufferedAmount = result;
			return false;
		}
	};

	WebSocket.prototype.close = function() {
		if (!this.__flash)
			return;
		this.readyState = this.__flash.getReadyState();
		if (this.readyState != WebSocket.OPEN)
			return;
		this.__flash.close();
		// Sets/calls them manually here because Flash WebSocketConnection.close
		// cannot fire events
		// which causes weird error:
		// > You are trying to call recursively into the Flash Player which is
		// not allowed.
		this.readyState = WebSocket.CLOSED;
		if (this.__timer)
			clearInterval(this.__timer);
		if (this.onclose)
			this.onclose();
	};

	/**
	 * Implementation of
	 * {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
	 * 
	 * @param {string}
	 *            type
	 * @param {function}
	 *            listener
	 * @param {boolean}
	 *            useCapture !NB Not implemented yet
	 * @return void
	 */
	WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
		if (!('__events' in this)) {
			this.__events = {};
		}
		if (!(type in this.__events)) {
			this.__events[type] = [];
			if ('function' == typeof this['on' + type]) {
				this.__events[type].defaultHandler = this['on' + type];
				this['on' + type] = this.__createEventHandler(this, type);
			}
		}
		this.__events[type].push(listener);
	};

	/**
	 * Implementation of
	 * {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
	 * 
	 * @param {string}
	 *            type
	 * @param {function}
	 *            listener
	 * @param {boolean}
	 *            useCapture NB! Not implemented yet
	 * @return void
	 */
	WebSocket.prototype.removeEventListener = function(type, listener,
			useCapture) {
		if (!('__events' in this)) {
			this.__events = {};
		}
		if (!(type in this.__events))
			return;
		for ( var i = this.__events.length; i > -1; --i) {
			if (listener === this.__events[type][i]) {
				this.__events[type].splice(i, 1);
				break;
			}
		}
	};

	/**
	 * Implementation of
	 * {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
	 * 
	 * @param {WebSocketEvent}
	 *            event
	 * @return void
	 */
	WebSocket.prototype.dispatchEvent = function(event) {
		if (!('__events' in this))
			throw 'UNSPECIFIED_EVENT_TYPE_ERR';
		if (!(event.type in this.__events))
			throw 'UNSPECIFIED_EVENT_TYPE_ERR';

		for ( var i = 0, l = this.__events[event.type].length; i < l; ++i) {
			this.__events[event.type][i](event);
			if (event.cancelBubble)
				break;
		}

		if (false !== event.returnValue
				&& 'function' == typeof this.__events[event.type].defaultHandler) {
			this.__events[event.type].defaultHandler(event);
		}
	};

	WebSocket.prototype.__handleMessages = function() {
		// Gets data using readSocketData() instead of getting it from event
		// object
		// of Flash event. This is to make sure to keep message order.
		// It seems sometimes Flash events don't arrive in the same order as
		// they are sent.
		var arr = this.__flash.readSocketData();
		for ( var i = 0; i < arr.length; i++) {
			var data = decodeURIComponent(arr[i]);
			try {
				if (this.onmessage) {
					var e;
					if (window.MessageEvent) {
						e = document.createEvent("MessageEvent");
						e.initMessageEvent("message", false, false, data, null,
								null, window, null);
					} else { // IE
						e = {
							data : data
						};
					}
					this.onmessage(e);
				}
			} catch (e) {
				console.error(e.toString());
			}
		}
	};

	/**
	 * @param {object}
	 *            object
	 * @param {string}
	 *            type
	 */
	WebSocket.prototype.__createEventHandler = function(object, type) {
		return function(data) {
			var event = new WebSocketEvent();
			event.initEvent(type, true, true);
			event.target = event.currentTarget = object;
			for ( var key in data) {
				event[key] = data[key];
			}
			object.dispatchEvent(event, arguments);
		};
	};

	/**
	 * Basic implementation of
	 * {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-interface">DOM 2 EventInterface</a>}
	 * 
	 * @class
	 * @constructor
	 */
	function WebSocketEvent() {
	}

	/**
	 * 
	 * @type boolean
	 */
	WebSocketEvent.prototype.cancelable = true;

	/**
	 * 
	 * @type boolean
	 */
	WebSocketEvent.prototype.cancelBubble = false;

	/**
	 * 
	 * @return void
	 */
	WebSocketEvent.prototype.preventDefault = function() {
		if (this.cancelable) {
			this.returnValue = false;
		}
	};

	/**
	 * 
	 * @return void
	 */
	WebSocketEvent.prototype.stopPropagation = function() {
		this.cancelBubble = true;
	};

	/**
	 * 
	 * @param {string}
	 *            eventTypeArg
	 * @param {boolean}
	 *            canBubbleArg
	 * @param {boolean}
	 *            cancelableArg
	 * @return void
	 */
	WebSocketEvent.prototype.initEvent = function(eventTypeArg, canBubbleArg,
			cancelableArg) {
		this.type = eventTypeArg;
		this.cancelable = cancelableArg;
		this.timeStamp = new Date();
	};

	WebSocket.CONNECTING = 0;
	WebSocket.OPEN = 1;
	WebSocket.CLOSING = 2;
	WebSocket.CLOSED = 3;

	WebSocket.__tasks = [];

	WebSocket.__initialize = function() {
		if (WebSocket.__swfLocation) {
			// For backword compatibility.
			window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
		}
		if (!window.WEB_SOCKET_SWF_LOCATION) {
			console
					.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
			return;
		}
		var container = document.createElement("div");
		container.id = "webSocketContainer";
		// Hides Flash box. We cannot use display: none or visibility: hidden
		// because it prevents
		// Flash from loading at least in IE. So we move it out of the screen at
		// (-100, -100).
		// But this even doesn't work with Flash Lite (e.g. in Droid
		// Incredible). So with Flash
		// Lite, we put it at (0, 0). This shows 1x1 box visible at left-top
		// corner but this is
		// the best we can do as far as we know now.
		container.style.position = "absolute";
		if (WebSocket.__isFlashLite()) {
			container.style.left = "0px";
			container.style.top = "0px";
		} else {
			container.style.left = "-100px";
			container.style.top = "-100px";
		}
		var holder = document.createElement("div");
		holder.id = "webSocketFlash";
		container.appendChild(holder);
		document.body.appendChild(container);
		// See this article for hasPriority:
		// http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
		swfobject.embedSWF(WEB_SOCKET_SWF_LOCATION, "webSocketFlash",
				"1" /* width */, "1" /* height */,
				"9.0.0" /* SWF version */, null, {
					bridgeName : "webSocket"
				}, {
					hasPriority : true,
					allowScriptAccess : "always"
				}, null, function(e) {
					if (!e.success)
						console.error("[WebSocket] swfobject.embedSWF failed");
				});
		FABridge.addInitializationCallback("webSocket", function() {
			try {
				// console.log("[WebSocket] FABridge initializad");
				WebSocket.__flash = FABridge.webSocket.root();
				WebSocket.__flash.setCallerUrl(location.href);
				WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
				for ( var i = 0; i < WebSocket.__tasks.length; ++i) {
					WebSocket.__tasks[i]();
				}
				WebSocket.__tasks = [];
			} catch (e) {
				console.error("[WebSocket] " + e.toString());
			}
		});
	};

	WebSocket.__addTask = function(task) {
		if (WebSocket.__flash) {
			task();
		} else {
			WebSocket.__tasks.push(task);
		}
	};

	WebSocket.__isFlashLite = function() {
		if (!window.navigator || !window.navigator.mimeTypes)
			return false;
		var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
		if (!mimeType || !mimeType.enabledPlugin
				|| !mimeType.enabledPlugin.filename)
			return false;
		return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true
				: false;
	};

	// called from Flash
	window.webSocketLog = function(message) {
		console.log(decodeURIComponent(message));
	};

	// called from Flash
	window.webSocketError = function(message) {
		console.error(decodeURIComponent(message));
	};

	if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
		if (window.addEventListener) {
			window.addEventListener("load", WebSocket.__initialize, false);
		} else {
			window.attachEvent("onload", WebSocket.__initialize);
		}
	}

})();

//web_socket.js end