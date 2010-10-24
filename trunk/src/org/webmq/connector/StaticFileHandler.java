package org.webmq.connector;

import java.io.File;
import java.io.RandomAccessFile;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jboss.netty.channel.Channel;
import org.jboss.netty.channel.ChannelFuture;
import org.jboss.netty.channel.ChannelFutureProgressListener;
import org.jboss.netty.channel.ChannelHandlerContext;
import org.jboss.netty.channel.DefaultFileRegion;
import org.jboss.netty.channel.FileRegion;
import org.jboss.netty.handler.codec.http.DefaultHttpResponse;
import org.jboss.netty.handler.codec.http.HttpHeaders;
import org.jboss.netty.handler.codec.http.HttpRequest;
import org.jboss.netty.handler.codec.http.HttpResponse;
import org.jboss.netty.handler.codec.http.HttpResponseStatus;
import org.jboss.netty.handler.codec.http.HttpVersion;
import org.webmq.utils.HttpResponseUtils;

/**
 * 解决flash socket跨域所要的安全策略文件输出
 * 
 * @author xiaosong.liangxs
 */
public class StaticFileHandler implements RequestHandler {

	private final static Log logger = LogFactory
			.getLog(StaticFileHandler.class);

	private String staticFileRoot;

	@Override
	public void handle(ChannelHandlerContext ctx, HttpRequest req) {
		if (staticFileRoot == null) {
			throw new IllegalStateException("the staticFileRoot is null!");
		}
		Channel channel = ctx.getChannel();
		String uri = req.getUri();
		int index = uri.indexOf('?');
		if (index > 0) {
			String fileName = uri.substring(index + 1, uri.length());
			String staticFile = staticFileRoot + fileName;
			try {
				File file = new File(staticFile);
				long lastModified = file.lastModified();
				DateFormat gmtFormat = new SimpleDateFormat(
						"EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.ENGLISH);
				long modifiedSince = getModifiedSince(req, gmtFormat);
				long etag = getEtag(req);
				if ((modifiedSince > 0 && (modifiedSince >= lastModified))
						|| (etag > 0 && (etag >= lastModified))) {
					if (logger.isInfoEnabled()) {
						logger.info("the modifiedSince:" + modifiedSince
								+ ",etag:" + etag + ",lastModified:"
								+ lastModified + ",the fileName:" + fileName);
					}
					HttpResponse response = new DefaultHttpResponse(
							HttpVersion.HTTP_1_1,
							HttpResponseStatus.NOT_MODIFIED);
					response.setHeader(HttpHeaders.Names.CONNECTION,
							HttpHeaders.Values.KEEP_ALIVE);
					response.setHeader(HttpHeaders.Names.DATE,
							gmtFormat.format(new Date()));
					response.setHeader(HttpHeaders.Names.ETAG, lastModified);
					channel.write(response);
				} else {
					HttpResponse response = new DefaultHttpResponse(
							HttpVersion.HTTP_1_1, HttpResponseStatus.OK);
					response.setHeader(HttpHeaders.Names.CONNECTION,
							HttpHeaders.Values.KEEP_ALIVE);
					if (uri.endsWith(".swf")) {
						response.setHeader(HttpHeaders.Names.CONTENT_TYPE,
								"application/x-shockwave-flash");
					}
					if (uri.endsWith(".js")) {
						response.setHeader(HttpHeaders.Names.CONTENT_TYPE,
								"text/javascript");
					}
					RandomAccessFile raf = new RandomAccessFile(file, "r");
					long length = raf.length();
					response.setHeader(HttpHeaders.Names.LAST_MODIFIED,
							gmtFormat.format(new Date(lastModified)));
					response.setHeader(HttpHeaders.Names.DATE,
							gmtFormat.format(new Date()));
					response.setHeader(HttpHeaders.Names.ETAG, lastModified);
					HttpHeaders.setContentLength(response, length);
					channel.write(response);
					final FileRegion region = new DefaultFileRegion(
							raf.getChannel(), 0, length);
					ChannelFuture writeFuture = channel.write(region);
					writeFuture
							.addListener(new ChannelFutureProgressListener() {
								public void operationComplete(
										ChannelFuture future) {
									region.releaseExternalResources();
								}

								public void operationProgressed(
										ChannelFuture future, long amount,
										long current, long total) {

								}
							});
				}
				return;
			} catch (Exception e) {
				if (logger.isErrorEnabled()) {
					logger.error("can't read the file:" + staticFile + "!", e);
				}
			}
		}
		HttpResponseUtils.sendForbiddenHttpResponse(channel, req,
				"File Not Found!");
	}

	private long getEtag(HttpRequest req) {
		String etag = req.getHeader(HttpHeaders.Names.IF_NONE_MATCH);
		if (etag != null) {
			try {
				return Long.valueOf(etag);
			} catch (Exception e) {
				return -1;
			}
		}
		return -1;
	}

	private long getModifiedSince(HttpRequest req, DateFormat gmt) {
		String modifiedStr = req.getHeader(HttpHeaders.Names.IF_MODIFIED_SINCE);
		if (modifiedStr == null) {
			return -1;
		} else {
			try {
				long lMofifyTime = gmt.parse(modifiedStr).getTime();
				return lMofifyTime;
			} catch (ParseException e) {
				if (logger.isErrorEnabled()) {
					logger.error(e);
				}
				return -1;
			}
		}
	}

	public String getStaticFileRoot() {
		return staticFileRoot;
	}

	public void setStaticFileRoot(String staticFileRoot) {
		if (staticFileRoot == null || staticFileRoot.trim().equals("")) {
			throw new IllegalArgumentException();
		}
		if (!staticFileRoot.endsWith("/")) {
			staticFileRoot = staticFileRoot + "/";
		}
		this.staticFileRoot = staticFileRoot;
	}

}
