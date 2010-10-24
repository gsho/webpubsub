package org.webmq.connector;

import org.jboss.netty.channel.ChannelHandlerContext;
import org.jboss.netty.handler.codec.http.HttpRequest;

public interface RequestHandler {

	void handle(ChannelHandlerContext ctx, HttpRequest req);

}
