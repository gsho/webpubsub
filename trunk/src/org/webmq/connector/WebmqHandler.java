package org.webmq.connector;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jboss.netty.channel.ChannelHandlerContext;
import org.jboss.netty.channel.ChannelStateEvent;
import org.jboss.netty.channel.ExceptionEvent;
import org.jboss.netty.channel.MessageEvent;
import org.jboss.netty.channel.SimpleChannelUpstreamHandler;
import org.jboss.netty.handler.codec.http.HttpMethod;
import org.jboss.netty.handler.codec.http.HttpRequest;
import org.jboss.netty.handler.codec.http.websocket.WebSocketFrame;
import org.webmq.DestinationHolderImpl;
import org.webmq.session.SessionManagerImpl;
import org.webmq.utils.HttpResponseUtils;

public class WebmqHandler extends SimpleChannelUpstreamHandler {

	private final static Log logger = LogFactory.getLog(WebmqHandler.class);

	private Map<String, RequestHandler> handlers;

	private DestinationHolderImpl destinationHolder;

	private CommandHandler commandHandler;

	private SessionManagerImpl sessionManager;

	private String staticFileRoot;

	public void init() {
		DestinationHolderImpl destinationHolderImpl = new DestinationHolderImpl();
		destinationHolderImpl.init();
		this.destinationHolder = destinationHolderImpl;
		handlers = new HashMap<String, RequestHandler>(5);
		this.sessionManager = new SessionManagerImpl();
		sessionManager.init();
		ListenHandler listenHandler = new ListenHandler(destinationHolder);
		listenHandler.setSessionManager(sessionManager);
		handlers.put("/ls/", listenHandler);
		handlers.put("/ls", listenHandler);
		CommandHandler commandHandler = new CommandHandler(destinationHolder);
		commandHandler.setSessionManager(sessionManager);
		commandHandler.init();
		this.commandHandler = commandHandler;
		handlers.put("/s/", commandHandler);
		handlers.put("/s", commandHandler);
		if (staticFileRoot != null && !staticFileRoot.trim().equals("")) {
			StaticFileHandler staticFileHandler = new StaticFileHandler();
			staticFileHandler.setStaticFileRoot(staticFileRoot);
			handlers.put("/static/", staticFileHandler);
			handlers.put("/static", staticFileHandler);
		}
	}

	@Override
	public void messageReceived(ChannelHandlerContext ctx, MessageEvent e)
			throws Exception {
		Object msg = e.getMessage();
		if (msg instanceof HttpRequest) {
			handleHttpRequest(ctx, (HttpRequest) msg);
		} else if (msg instanceof WebSocketFrame) {
			handleWebSocketFrame(ctx, (WebSocketFrame) msg);
		} else {
			throw new IllegalArgumentException();
		}
	}

	private void handleWebSocketFrame(ChannelHandlerContext ctx,
			WebSocketFrame frame) {
		Object att = ctx.getAttachment();
		ChannelAttachment channelAttachment = null;
		if (att != null && att instanceof ChannelAttachment) {
			channelAttachment = (ChannelAttachment) att;
		} else {
			return;
		}
		if (frame.isText()) {
			String content = frame.getTextData();
			try {
				commandHandler
						.dealCommand(content, channelAttachment.getPage());
			} catch (Exception e) {
				if (logger.isErrorEnabled()) {
					logger.error("", e);
				}
			}
		} else {
			if (logger.isErrorEnabled()) {
				logger.error("the binary is't supported now!");
			}
		}
	}

	private void handleHttpRequest(ChannelHandlerContext ctx, HttpRequest req)
			throws IOException {
		if (req.getMethod() != HttpMethod.GET) {
			HttpResponseUtils.sendForbiddenHttpResponse(ctx.getChannel(), req,
					"You are Forbidden!");
			return;
		}
		String uri = req.getUri();
		if (logger.isDebugEnabled()) {
			logger.debug("the request's uri:" + uri);
		}
		int index = uri.indexOf("?");
		if (index > 0) {
			uri = uri.substring(0, index);
		}
		index = uri.indexOf(";");
		if (index > 0) {
			uri = uri.substring(0, index);
		}
		RequestHandler handler = handlers.get(uri);
		if (handler != null) {
			try {
				handler.handle(ctx, req);
			} catch (Exception e) {
				HttpResponseUtils.sendForbiddenHttpResponse(ctx.getChannel(),
						req, "You are Forbidden!");
				if (logger.isErrorEnabled()) {
					logger.error("handle uri:" + req.getUri() + ",exception:",
							e);
				}
			}
		} else {
			HttpResponseUtils.sendForbiddenHttpResponse(ctx.getChannel(), req,
					"You are Forbidden!");
			if (logger.isErrorEnabled()) {
				logger.error(" can't find handler by uri:" + uri);
			}
		}
	}

	@Override
	public void exceptionCaught(ChannelHandlerContext ctx, ExceptionEvent e)
			throws Exception {
		Throwable throwable = e.getCause();
		if (logger.isWarnEnabled()) {
			logger.warn(" the channel[" + ctx.getChannel()
					+ "] caught exception:", throwable);
		}
		e.getChannel().close();
	}

	@Override
	public void channelClosed(ChannelHandlerContext ctx, ChannelStateEvent e)
			throws Exception {
		if (logger.isInfoEnabled()) {
			logger.info(" the channel[" + ctx.getChannel() + "] was closed.");
		}
	}

	@Override
	public void channelConnected(ChannelHandlerContext ctx, ChannelStateEvent e)
			throws Exception {
		if (logger.isInfoEnabled()) {
			logger.info(" the channel[" + ctx.getChannel() + "] was connected.");
		}
	}

	public void destroy() {
		try {
			sessionManager.destroy();
		} catch (Exception e) {
			if (logger.isErrorEnabled()) {
				logger.error(e);
			}
		}
		try {
			destinationHolder.destroy();
		} catch (Exception e) {
			if (logger.isErrorEnabled()) {
				logger.error(e);
			}
		}
	}

	public String getStaticFileRoot() {
		return staticFileRoot;
	}

	public void setStaticFileRoot(String staticFileRoot) {
		this.staticFileRoot = staticFileRoot;
	}
}
