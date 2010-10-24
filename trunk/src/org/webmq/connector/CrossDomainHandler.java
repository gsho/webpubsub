package org.webmq.connector;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jboss.netty.buffer.ChannelBuffer;
import org.jboss.netty.buffer.ChannelBuffers;
import org.jboss.netty.channel.ChannelFuture;
import org.jboss.netty.channel.ChannelFutureListener;
import org.jboss.netty.channel.ChannelHandlerContext;
import org.jboss.netty.channel.ChannelStateEvent;
import org.jboss.netty.channel.MessageEvent;
import org.jboss.netty.channel.SimpleChannelUpstreamHandler;
import org.jboss.netty.util.CharsetUtil;

/**
 * 解决flash socket跨域所要的安全策略文件输出
 * 
 * @author xiaosong.liangxs
 */
public class CrossDomainHandler extends SimpleChannelUpstreamHandler {

	private final static Log logger = LogFactory
			.getLog(CrossDomainHandler.class);

	private String crossDomainText = "<?xml version=\"1.0\"?>"
			+ "<cross-domain-policy>"
			+ "<site-control permitted-cross-domain-policies=\"all\"/>"
			+ "<allow-access-from domain=\"*\" to-ports=\"*\"/>"
			+ "</cross-domain-policy>\0";

	@Override
	public void channelConnected(ChannelHandlerContext ctx, ChannelStateEvent e)
			throws Exception {
		ctx.setAttachment(Boolean.TRUE);
		super.channelConnected(ctx, e);
		if (logger.isInfoEnabled()) {
			logger
					.info(" the channel[" + ctx.getChannel()
							+ "] was connected.");
		}
	}

	@Override
	public void channelClosed(ChannelHandlerContext ctx, ChannelStateEvent e)
			throws Exception {
		if (logger.isInfoEnabled()) {
			logger.info(" the channel[" + ctx.getChannel() + "] was closed.");
		}
	}

	@Override
	public void messageReceived(ChannelHandlerContext ctx, MessageEvent e)
			throws Exception {
		Object m = e.getMessage();
		if (!(m instanceof ChannelBuffer)) {
			ctx.sendUpstream(e);
			return;
		}
		ChannelBuffer buffer = (ChannelBuffer) m;
		if (!buffer.readable()) {
			return;
		}
		Object attachment = ctx.getAttachment();
		ctx.setAttachment(null);
		if (Boolean.TRUE.equals(attachment)) {
			byte flag = buffer.getByte(0);
			// 是字符串"<policy-file-request/>\0"的首字符"<"，如果是http请求，是不会一连接上来就发出字符"<"
			if (flag == 60) {
				// 输出安全策略内容
				ChannelFuture future = ctx.getChannel().write(
						ChannelBuffers.wrappedBuffer(crossDomainText
								.getBytes(CharsetUtil.UTF_8)));
				future.addListener(ChannelFutureListener.CLOSE);
				return;
			}
		}
		ctx.sendUpstream(e);
	}

	public void setCrossDomainText(String crossDomainText) {
		this.crossDomainText = crossDomainText;
	}

}
