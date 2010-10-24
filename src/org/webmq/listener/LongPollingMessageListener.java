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
import org.webmq.Constants;
import org.webmq.command.Command;
import org.webmq.connector.ChannelAttachment;
import org.webmq.session.WebPage;
import org.webmq.utils.HttpResponseUtils;
import org.webmq.utils.JavaScriptUtils;

public class LongPollingMessageListener implements MessageListener {

	private final static Log logger = LogFactory
			.getLog(LongPollingMessageListener.class);

	private ObjectMapper mapper = new ObjectMapper();

	@Override
	public boolean onMessage(final WebPage page, Channel channel,
			Command[] commands) {
		if (commands == null || channel == null || page == null
				|| !channel.isConnected()) {
			return false;
		}
		ChannelAttachment att = (ChannelAttachment) channel.getPipeline()
				.getContext(Constants.WEBMQ_HANDLER_NAME).getAttachment();
		if (!att.isWritable()) {
			if (logger.isInfoEnabled()) {
				logger.info("the channel:" + channel + " is not writable!");
			}
			return false;
		}
		boolean needWrite = false;
		StringBuilder sb = new StringBuilder();

		if (att.getFunctionId() == null) {
			sb.append(HttpResponseUtils.SCRIPT_CALLBACK_NAME);
		} else {
			sb.append(att.getFunctionId());
		}
		sb.append("([");
		for (Command command : commands) {
			if (command != null) {
				try {
					sb.append("\"")
							.append(JavaScriptUtils.javaScriptEscape(mapper
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
			sb.append("]);");
		} else {
			return true;
		}

		try {
			HttpChunk writeChunk = new DefaultHttpChunk(
					ChannelBuffers.wrappedBuffer(sb.toString()
							.getBytes("UTF-8")));
			synchronized (att) {
				if (!att.isWritable()) {
					if (logger.isInfoEnabled()) {
						logger.info("the channel:" + channel
								+ " is not writable!");
					}
					return false;
				} else {
					att.setWritable(false);
				}
			}
			ChannelFuture writeFuture = channel.write(writeChunk);
			writeFuture.addListener(new ChannelFutureListener() {
				@Override
				public void operationComplete(ChannelFuture future)
						throws Exception {
					if (!future.isSuccess()) {
						if (logger.isErrorEnabled()) {
							logger.error(
									"Asynchronous write failure,the channel:"
											+ future.getChannel(),
									future.getCause());
						}
					}
				}
			});
			channel.write(HttpChunk.LAST_CHUNK);
			return true;
		} catch (Exception e) {
			if (logger.isErrorEnabled()) {
				logger.error("onMessage ", e);
			}
			return false;
		}
	}
}
