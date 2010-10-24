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
	Webmq.prototype.publish = function(destination, message, queue) {
		this.checkConnection();
		var publishCommand = {
			"domain" : this.domain,
			"queue" : queue,
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
