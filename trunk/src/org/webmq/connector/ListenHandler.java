package org.webmq.connector;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.codehaus.jackson.map.ObjectMapper;
import org.jboss.netty.buffer.ChannelBuffer;
import org.jboss.netty.buffer.ChannelBuffers;
import org.jboss.netty.channel.Channel;
import org.jboss.netty.channel.ChannelHandlerContext;
import org.jboss.netty.channel.ChannelPipeline;
import org.jboss.netty.handler.codec.http.DefaultHttpChunk;
import org.jboss.netty.handler.codec.http.DefaultHttpResponse;
import org.jboss.netty.handler.codec.http.HttpChunk;
import org.jboss.netty.handler.codec.http.HttpHeaders;
import org.jboss.netty.handler.codec.http.HttpRequest;
import org.jboss.netty.handler.codec.http.HttpResponse;
import org.jboss.netty.handler.codec.http.HttpResponseStatus;
import org.jboss.netty.handler.codec.http.HttpVersion;
import org.jboss.netty.handler.codec.http.QueryStringDecoder;
import org.jboss.netty.handler.codec.http.HttpHeaders.Names;
import org.jboss.netty.handler.codec.http.websocket.DefaultWebSocketFrame;
import org.jboss.netty.handler.codec.http.websocket.WebSocketFrame;
import org.jboss.netty.handler.codec.http.websocket.WebSocketFrameDecoder;
import org.jboss.netty.handler.codec.http.websocket.WebSocketFrameEncoder;
import org.jboss.netty.util.CharsetUtil;
import org.webmq.CometType;
import org.webmq.DestinationHolder;
import org.webmq.command.LoginCommand;
import org.webmq.command.SubscibeCommand;
import org.webmq.listener.HttpStreamingMessageListener;
import org.webmq.listener.LongPollingMessageListener;
import org.webmq.listener.MessageListener;
import org.webmq.listener.WebSocketMessageListener;
import org.webmq.session.SessionManager;
import org.webmq.session.WebPage;
import org.webmq.utils.HttpResponseUtils;
import org.webmq.utils.JavaScriptUtils;

public class ListenHandler extends PageHandler {

	private static final String[] DOMAINS = new String[] { ".com.cn",
			".net.cn", ".org.cn", ".gov.cn", ".com", ".cn", ".net", ".cc",
			".org", ".info", ".biz", ".tv" };

	private final static Log logger = LogFactory.getLog(ListenHandler.class);

	private final static MessageListener webSocketMessageListener = new WebSocketMessageListener();

	private final static MessageListener longPollingMessageListener = new LongPollingMessageListener();

	private final static MessageListener httpStreamingMessageListener = new HttpStreamingMessageListener();

	private DestinationHolder destinationHolder;

	private String streamingHead = "<html><head><title></title></head><body>";

	private ObjectMapper mapper = new ObjectMapper();

	public ListenHandler(DestinationHolder destinationHolder) {
		this.destinationHolder = destinationHolder;
	}

	@Override
	public void handle(ChannelHandlerContext ctx, HttpRequest req) {
		Channel channel = ctx.getChannel();
		// uri的格式:/ls?json=jsonText&funId=functionId
		QueryStringDecoder decoder = new QueryStringDecoder(req.getUri());
		String jsonText = HttpResponseUtils.getParameter(decoder
				.getParameters(), "json");
		String functionId = HttpResponseUtils.getParameter(decoder
				.getParameters(), "funId");
		boolean httpStreaming = ("true".equalsIgnoreCase(HttpResponseUtils
				.getParameter(decoder.getParameters(), "streaming")) && getTopDomain(req) != null);

		SubscibeCommand command = null;
		if (jsonText != null && !jsonText.trim().equals("")) {
			try {
				jsonText = URLDecoder.decode(jsonText, "utf-8");
				command = mapper.readValue(jsonText, SubscibeCommand.class);
			} catch (Exception e) {
				HttpResponseUtils.sendForbiddenHttpResponse(channel, req,
						"You are Forbidden!");
				if (logger.isErrorEnabled()) {
					logger.error("IOException:", e);
				}
			}
		}
		WebPage page = getPage(req, true);
		//
		CometType cometType;
		if (supportWebSocket(req)) {
			// 使用websocket,效率最高
			cometType = CometType.WebSocket;
		} else if (httpStreaming) {
			// 支持http streaming
			cometType = CometType.HttpStreaming;
		} else {
			// 使用long polling,主要用来解决跨域的问题,
			// 效率不如http streaming方式
			cometType = CometType.LongPolling;
		}

		Object att = ctx.getAttachment();
		ChannelAttachment cAttachment;
		if (att != null && (att instanceof ChannelAttachment)) {
			cAttachment = (ChannelAttachment) ctx.getAttachment();
		} else {
			cAttachment = new ChannelAttachment();
			cAttachment.setPage(page);
			ctx.setAttachment(cAttachment);
		}
		cAttachment.setCometType(cometType);
		cAttachment.setWritable(true);
		cAttachment.setFunctionId(JavaScriptUtils.javaScriptEscape(functionId));

		switch (cometType) {
		case WebSocket:
			handleWebSocket(req, channel, page, cAttachment);
			break;
		case HttpStreaming:
			handleHttpStreaming(req, channel, page, cAttachment);
			break;
		case LongPolling:
			handleLongPolling(req, channel, page, cAttachment);
			break;
		default:
			throw new IllegalStateException();
		}
		page.setNew(false);
		try {
			// 把channel注册到session中
			page.registerChannel(channel, cometType);
			if (command != null && command.getDestNames() != null
					&& command.getDestNames().length > 0) {
				// 有destination要注册
				subscibeDestinations(command, page);
			}
		} catch (Exception e) {
			if (logger.isErrorEnabled()) {
				logger.error("", e);
			}
		}
	}

	private void subscibeDestinations(SubscibeCommand command, WebPage page) {
		if (command.getDestTypes() == null) {
			String[] destTypes = new String[command.getDestNames().length];
			for (int i = 0; i < destTypes.length; i++) {
				destTypes[i] = "queue";
			}
			command.setDestTypes(destTypes);
		}
		// 把当前session加到订阅中心去
		destinationHolder.subscibe(command, page);
	}

	private void handleWebSocket(HttpRequest req, Channel channel,
			WebPage page, ChannelAttachment cAttachment) {
		// Create the WebSocket handshake response.
		HttpResponse response = buildWebSocketRes(req);
		// res.addHeader(name, value)
		WebSocketFrame cookieFrame = null;
		if (page.isNew()) {
			setP3pHeaderForIE(response);
			setResponseCookie(page.getSessionId(), response);
			LoginCommand loginCommand = new LoginCommand();
			loginCommand.setPageId(page.getPageId());
			loginCommand.setSessionId(page.getSessionId());
			String json = transformToJson(loginCommand);
			StringBuilder sb = new StringBuilder();
			sb.append("{\"data\":[\"");
			sb.append(JavaScriptUtils.javaScriptEscape(json));
			sb.append("\"]}");
			cookieFrame = new DefaultWebSocketFrame(sb.toString());
		}
		// Upgrade the connection and send the handshake
		ChannelPipeline pipeline = channel.getPipeline();
		pipeline.replace("decoder", "wsdecoder", new WebSocketFrameDecoder());
		channel.write(response);
		pipeline.replace("encoder", "wsencoder", new WebSocketFrameEncoder());
		if (cookieFrame != null) {
			channel.write(cookieFrame);
		}
		cAttachment.setMessageListener(webSocketMessageListener);
	}

	private void handleHttpStreaming(HttpRequest req, Channel channel,
			WebPage page, ChannelAttachment cAttachment) {

		HttpResponse response = buildStreamingHeadRes();
		String loginScript = null;

		if (page.isNew()) {
			setP3pHeaderForIE(response);
			setResponseCookie(page.getSessionId(), response);
			LoginCommand loginCommand = new LoginCommand();
			loginCommand.setPageId(page.getPageId());
			loginCommand.setSessionId(page.getSessionId());
			String json = JavaScriptUtils
					.javaScriptEscape(transformToJson(loginCommand));
			StringBuilder sb = new StringBuilder();
			sb.append("<script>")
					.append(HttpResponseUtils.SCRIPT_CALLBACK_NAME)
					.append("([");
			sb.append("\"").append(json).append("\"]);").append("</script>");
			loginScript = sb.toString();
		}
		channel.write(response);
		StringBuilder chunkScript = new StringBuilder(streamingHead);
		chunkScript.append("<script>");
		chunkScript.append("document.domain='" + getTopDomain(req) + "';");
		chunkScript.append("function ").append(
				HttpResponseUtils.SCRIPT_CALLBACK_NAME).append(
				"(msg){if(parent&&parent.").append(cAttachment.getFunctionId())
				.append("){ parent.").append(cAttachment.getFunctionId())
				.append("(msg);} else {alert('no callback function!');}}")
				.append("</script>");
		HttpChunk chunk = new DefaultHttpChunk(ChannelBuffers.copiedBuffer(
				chunkScript + (loginScript != null ? loginScript : ""),
				CharsetUtil.UTF_8));
		channel.write(chunk);
		cAttachment.setMessageListener(httpStreamingMessageListener);
	}

	private String getTopDomain(HttpRequest req) {
		String host = req.getHeader("Host");
		if (host == null || host.equals("")) {
			return null;
		}
		int index = host.indexOf(":");
		if (index > 0) {
			host = host.substring(0, index);
		}
		for (String domain : DOMAINS) {
			if (host.endsWith(domain)) {
				String temp = host
						.substring(0, host.length() - domain.length());
				int lastDot = temp.lastIndexOf(".");
				if (lastDot > 0) {
					return temp.substring(lastDot + 1, temp.length()) + domain;
				} else {
					return host;
				}
			}
		}
		return host;
	}

	private void handleLongPolling(HttpRequest req, Channel channel,
			WebPage page, ChannelAttachment cAttachment) {
		HttpResponse response = buildLongPollingRes();
		HttpChunk loginChunk = null;
		if (page.isNew()) {
			setP3pHeaderForIE(response);
			setResponseCookie(page.getSessionId(), response);
			LoginCommand loginCommand = new LoginCommand();
			loginCommand.setPageId(page.getPageId());
			loginCommand.setSessionId(page.getSessionId());
			String json = transformToJson(loginCommand);
			StringBuilder sb = new StringBuilder();
			if (cAttachment.getFunctionId() == null) {
				sb.append(HttpResponseUtils.SCRIPT_CALLBACK_NAME);
			} else {
				sb.append(JavaScriptUtils.javaScriptEscape(cAttachment
						.getFunctionId()));
			}
			sb.append("([\"");
			sb.append(JavaScriptUtils.javaScriptEscape(json));
			sb.append("\"]);");
			try {
				loginChunk = new DefaultHttpChunk(ChannelBuffers
						.wrappedBuffer(sb.toString().getBytes("UTF-8")));

			} catch (UnsupportedEncodingException e) {
				if (logger.isErrorEnabled()) {
					logger.error(e);
				}
			}

		}
		// 先把http头写出
		channel.write(response);
		if (loginChunk != null) {
			channel.write(loginChunk);
			channel.write(HttpChunk.LAST_CHUNK);
			cAttachment.setWritable(false);
		}
		cAttachment.setMessageListener(longPollingMessageListener);
	}

	private String transformToJson(Object obj) {
		try {
			return mapper.writeValueAsString(obj);
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}

	private HttpResponse buildWebSocketRes(HttpRequest req) {

		HttpResponse res = new DefaultHttpResponse(HttpVersion.HTTP_1_1,
				new HttpResponseStatus(101, "Web Socket Protocol Handshake"));
		res.setHeader(HttpHeaders.Names.UPGRADE, HttpHeaders.Values.WEBSOCKET);
		res.setHeader(HttpHeaders.Names.CONNECTION, HttpHeaders.Values.UPGRADE);
		if (req.containsHeader(HttpHeaders.Names.SEC_WEBSOCKET_KEY1)
				&& req.containsHeader(HttpHeaders.Names.SEC_WEBSOCKET_KEY2)) {
			// New handshake method with a challenge:
			res.addHeader(HttpHeaders.Names.SEC_WEBSOCKET_ORIGIN, req
					.getHeader(HttpHeaders.Names.ORIGIN));
			res.addHeader(HttpHeaders.Names.SEC_WEBSOCKET_LOCATION,
					getWebSocketLocation(req));
			String protocol = req
					.getHeader(HttpHeaders.Names.SEC_WEBSOCKET_PROTOCOL);
			if (protocol != null) {
				res.addHeader(HttpHeaders.Names.SEC_WEBSOCKET_PROTOCOL,
						protocol);
			}
			// Calculate the answer of the challenge.
			String key1 = req.getHeader(HttpHeaders.Names.SEC_WEBSOCKET_KEY1);
			String key2 = req.getHeader(HttpHeaders.Names.SEC_WEBSOCKET_KEY2);
			int a = (int) (Long.parseLong(key1.replaceAll("[^0-9]", "")) / key1
					.replaceAll("[^ ]", "").length());
			int b = (int) (Long.parseLong(key2.replaceAll("[^0-9]", "")) / key2
					.replaceAll("[^ ]", "").length());
			long c = req.getContent().readLong();
			ChannelBuffer input = ChannelBuffers.buffer(16);
			input.writeInt(a);
			input.writeInt(b);
			input.writeLong(c);
			MessageDigest md5 = null;
			try {
				md5 = MessageDigest.getInstance("MD5");
			} catch (NoSuchAlgorithmException e) {
				throw new RuntimeException(e);
			}
			ChannelBuffer output = ChannelBuffers.wrappedBuffer(md5
					.digest(input.array()));
			res.setContent(output);
		} else {
			// Old handshake method with no challenge:
			res.addHeader(HttpHeaders.Names.WEBSOCKET_ORIGIN, req
					.getHeader(HttpHeaders.Names.ORIGIN));
			res.addHeader(HttpHeaders.Names.WEBSOCKET_LOCATION,
					getWebSocketLocation(req));
			String protocol = req
					.getHeader(HttpHeaders.Names.WEBSOCKET_PROTOCOL);
			if (protocol != null) {
				res.addHeader(HttpHeaders.Names.WEBSOCKET_PROTOCOL, protocol);
			}
		}

		res.setHeader("Sec-WebSocket-Origin", req.getHeader(Names.ORIGIN));
		// res.setHeader("Sec-WebSocket-Location", getWebSocketLocation(req));
		String protocol = req.getHeader("Sec-WebSocket-Protocol");
		if (protocol != null) {
			res.setHeader("Sec-WebSocket-Protocol", protocol);
		}
		return res;
	}

	private HttpResponse buildLongPollingRes() {
		HttpResponse response = new DefaultHttpResponse(HttpVersion.HTTP_1_1,
				HttpResponseStatus.OK);
		response.setHeader(HttpHeaders.Names.CACHE_CONTROL,
				HttpHeaders.Values.NO_CACHE);
		response.setHeader(HttpHeaders.Names.CONTENT_TYPE,
				HttpResponseUtils.CONTENT_TYPE_TEXT_JAVASCRIPT);
		response.setHeader(HttpHeaders.Names.TRANSFER_ENCODING,
				HttpHeaders.Values.CHUNKED);
		response.setHeader(HttpHeaders.Names.CONNECTION,
				HttpHeaders.Values.KEEP_ALIVE);
		// response.setHeader("Keep-Alive", "timeout=600, max=1000");
		return response;
	}

	private HttpResponse buildStreamingHeadRes() {
		HttpResponse response = new DefaultHttpResponse(HttpVersion.HTTP_1_1,
				HttpResponseStatus.OK);
		response.setHeader(HttpHeaders.Names.CACHE_CONTROL,
				HttpHeaders.Values.NO_CACHE);
		response.setHeader(HttpHeaders.Names.CONTENT_TYPE,
				HttpResponseUtils.CONTENT_TYPE_TEXT_HTML);
		response.setHeader(HttpHeaders.Names.TRANSFER_ENCODING,
				HttpHeaders.Values.CHUNKED);
		response.setHeader(HttpHeaders.Names.CONNECTION,
				HttpHeaders.Values.KEEP_ALIVE);
		return response;
	}

	private boolean supportWebSocket(HttpRequest req) {
		return (HttpHeaders.Values.UPGRADE.equalsIgnoreCase(req
				.getHeader(HttpHeaders.Names.CONNECTION)) && HttpHeaders.Values.WEBSOCKET
				.equalsIgnoreCase(req.getHeader(HttpHeaders.Names.UPGRADE)));
	}

	private String getWebSocketLocation(HttpRequest req) {
		return "ws://" + req.getHeader(HttpHeaders.Names.HOST) + req.getUri();
	}

	public SessionManager getSessionManager() {
		return sessionManager;
	}

	public void setSessionManager(SessionManager sessionManager) {
		this.sessionManager = sessionManager;
	}
}
