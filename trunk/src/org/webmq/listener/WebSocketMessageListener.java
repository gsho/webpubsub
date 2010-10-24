package org.webmq.listener;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.codehaus.jackson.map.ObjectMapper;
import org.jboss.netty.channel.Channel;
import org.jboss.netty.channel.ChannelFuture;
import org.jboss.netty.channel.ChannelFutureListener;
import org.jboss.netty.handler.codec.http.websocket.DefaultWebSocketFrame;
import org.jboss.netty.handler.codec.http.websocket.WebSocketFrame;
import org.webmq.command.Command;
import org.webmq.session.WebPage;
import org.webmq.utils.JavaScriptUtils;

public class WebSocketMessageListener implements MessageListener {

	private final static Log logger = LogFactory
			.getLog(WebSocketMessageListener.class);

	private ObjectMapper mapper = new ObjectMapper();

	@Override
	public boolean onMessage(final WebPage page, Channel channel,
			Command[] commands) {
		if (commands == null || channel == null || !channel.isConnected()
				|| page == null) {
			return false;
		}
		boolean needWrite = false;
		StringBuilder sb = new StringBuilder();
		sb.append("{\"data\":[");
		for (Command command : commands) {
			if (command != null) {
				try {
					sb.append("\"").append(
							JavaScriptUtils.javaScriptEscape(mapper
									.writeValueAsString(command)))
							.append("\",");
					needWrite = true;
				} catch (Exception e) {
					if (logger.isErrorEnabled()) {
						logger.error("", e);
					}
				}
			}
		}
		if (needWrite) {
			sb.deleteCharAt(sb.length() - 1);
			sb.append("]}");
		} else {
			return true;
		}
		WebSocketFrame webSocketFrame = new DefaultWebSocketFrame(sb.toString());
		boolean success = true;
		try {
			ChannelFuture writeFuture = channel.write(webSocketFrame);
			writeFuture.addListener(new ChannelFutureListener() {
				@Override
				public void operationComplete(ChannelFuture future)
						throws Exception {
					if (!future.isSuccess()) {
						if (logger.isErrorEnabled()) {
							logger.error(
									"Asynchronous write failure,the channel:"
											+ future.getChannel(), future
											.getCause());
						}
					}
				}
			});

		} catch (Exception e) {
			success = false;
			if (logger.isErrorEnabled()) {
				logger.error("onMessage ", e);
			}

		}
		return success;
	}
}
