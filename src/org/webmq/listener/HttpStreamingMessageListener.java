package org.webmq.listener;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.codehaus.jackson.map.ObjectMapper;
import org.jboss.netty.buffer.ChannelBuffers;
import org.jboss.netty.channel.Channel;
import org.jboss.netty.channel.ChannelFuture;
import org.jboss.netty.channel.ChannelFutureListener;
import org.jboss.netty.handler.codec.http.DefaultHttpChunk;
import org.jboss.netty.handler.codec.http.HttpChunk;
import org.webmq.command.Command;
import org.webmq.session.WebPage;
import org.webmq.utils.HttpResponseUtils;
import org.webmq.utils.JavaScriptUtils;

public class HttpStreamingMessageListener implements MessageListener {

	private final static Log logger = LogFactory
			.getLog(HttpStreamingMessageListener.class);

	private ObjectMapper mapper = new ObjectMapper();

	@Override
	public boolean onMessage(final WebPage page, Channel channel,
			final Command[] commands) {

		if (commands == null || channel == null || page == null
				|| !channel.isConnected()) {
			return false;
		}

		boolean needWrite = false;
		StringBuilder sb = new StringBuilder();
		sb.append("<script>");
		sb.append(HttpResponseUtils.SCRIPT_CALLBACK_NAME);
		sb.append("([");
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
			sb.append("]);").append("</script>");
		} else {
			return true;
		}
		HttpChunk writeChunk = new DefaultHttpChunk(ChannelBuffers
				.wrappedBuffer(sb.toString().getBytes()));
		try {
			ChannelFuture writeFuture = channel.write(writeChunk);
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
			return true;
		} catch (Exception e) {
			if (logger.isErrorEnabled()) {
				logger.error("onMessage ", e);
			}
			return false;
		}
	}
}
