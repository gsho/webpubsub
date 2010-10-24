package org.webmq.utils;

import java.util.List;
import java.util.Map;

import org.jboss.netty.buffer.ChannelBuffers;
import org.jboss.netty.channel.Channel;
import org.jboss.netty.channel.ChannelFuture;
import org.jboss.netty.channel.ChannelFutureListener;
import org.jboss.netty.handler.codec.http.DefaultHttpResponse;
import org.jboss.netty.handler.codec.http.HttpHeaders;
import org.jboss.netty.handler.codec.http.HttpRequest;
import org.jboss.netty.handler.codec.http.HttpResponse;
import org.jboss.netty.handler.codec.http.HttpResponseStatus;
import org.jboss.netty.handler.codec.http.HttpVersion;
import org.jboss.netty.util.CharsetUtil;

public class HttpResponseUtils {

	public static final String CONTENT_TYPE_TEXT_HTML = "text/html; charset=UTF-8";

	public static final String CONTENT_TYPE_TEXT_JAVASCRIPT = "text/javascript";

	public static final String SCRIPT_CALLBACK_NAME = "__c_b";

	public static void sendHttpResponse(Channel channel, HttpRequest req,
			HttpResponse res) {
		ChannelFuture future = channel.write(res);
		if (!HttpHeaders.isKeepAlive(req)
				|| !HttpResponseStatus.OK.equals(res.getStatus())) {
			future.addListener(ChannelFutureListener.CLOSE);
		}
	}

	public static void sendOkHttpResponse(Channel channel, HttpRequest req,
			String text) {
		DefaultHttpResponse res = new DefaultHttpResponse(HttpVersion.HTTP_1_1,
				HttpResponseStatus.OK);
		res.setContent(ChannelBuffers.wrappedBuffer(text
				.getBytes(CharsetUtil.UTF_8)));
		res.setHeader(HttpHeaders.Names.CONTENT_TYPE, CONTENT_TYPE_TEXT_HTML);
		res.setHeader(HttpHeaders.Names.CACHE_CONTROL,
				HttpHeaders.Values.NO_CACHE);
		HttpHeaders.setContentLength(res, res.getContent().readableBytes());
		sendHttpResponse(channel, req, res);
	}

	public static void sendForbiddenHttpResponse(Channel channel,
			HttpRequest req, String text) {
		DefaultHttpResponse res = new DefaultHttpResponse(HttpVersion.HTTP_1_1,
				HttpResponseStatus.FORBIDDEN);
		res.setContent(ChannelBuffers.wrappedBuffer(text
				.getBytes(CharsetUtil.UTF_8)));
		res.setHeader(HttpHeaders.Names.CONTENT_TYPE, CONTENT_TYPE_TEXT_HTML);
		HttpHeaders.setContentLength(res, res.getContent().readableBytes());
		sendHttpResponse(channel, req, res);
	}

	public static String wrapScriptTag(String script) {
		StringBuilder sb = new StringBuilder();
		sb.append("<script>").append(SCRIPT_CALLBACK_NAME).append("(");
		sb.append(script);
		sb.append(")</script>");
		return sb.toString();
	}

	public static String getParameter(Map<String, List<String>> params,
			String key) {
		List<String> values = params.get(key);
		if (values != null && !values.isEmpty()) {
			return values.get(0);
		}
		return null;
	}
}
