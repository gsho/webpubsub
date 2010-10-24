package org.webmq.connector;

import java.util.HashMap;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.codehaus.jackson.JsonNode;
import org.codehaus.jackson.map.ObjectMapper;
import org.jboss.netty.buffer.ChannelBuffers;
import org.jboss.netty.channel.Channel;
import org.jboss.netty.channel.ChannelHandlerContext;
import org.jboss.netty.handler.codec.http.DefaultHttpResponse;
import org.jboss.netty.handler.codec.http.HttpHeaders;
import org.jboss.netty.handler.codec.http.HttpRequest;
import org.jboss.netty.handler.codec.http.HttpResponse;
import org.jboss.netty.handler.codec.http.HttpResponseStatus;
import org.jboss.netty.handler.codec.http.HttpVersion;
import org.jboss.netty.handler.codec.http.QueryStringDecoder;
import org.jboss.netty.util.CharsetUtil;
import org.webmq.Constants;
import org.webmq.DestinationHolder;
import org.webmq.command.CloseCommand;
import org.webmq.command.Command;
import org.webmq.command.PublishCommand;
import org.webmq.command.SubscibeCommand;
import org.webmq.session.WebPage;
import org.webmq.utils.HttpResponseUtils;
import org.webmq.utils.JavaScriptUtils;

public class CommandHandler extends PageHandler {

	private final static Log logger = LogFactory.getLog(CommandHandler.class);

	private ObjectMapper mapper = new ObjectMapper();

	private DestinationHolder destinationHolder;

	private Map<String, Class<? extends Command>> commandMapping = new HashMap<String, Class<? extends Command>>();

	public CommandHandler(DestinationHolder destinationHolder) {
		this.destinationHolder = destinationHolder;
	}

	public void init() {
		commandMapping
				.put(Constants.PUBLISH_COMMAND_TYPE, PublishCommand.class);
		commandMapping.put(Constants.SUBSCIBE_COMMAND_TYPE,
				SubscibeCommand.class);
		commandMapping.put(Constants.CLOSE_COMMAND_TYPE, CloseCommand.class);
	}

	@Override
	public void handle(ChannelHandlerContext ctx, HttpRequest req) {
		Channel channel = ctx.getChannel();
		// uri的格式:/s?json=jsonText&funId=functionId
		QueryStringDecoder decoder = new QueryStringDecoder(req.getUri());
		String jsonText = HttpResponseUtils.getParameter(decoder
				.getParameters(), "json");
		String functionId = JavaScriptUtils.javaScriptEscape(HttpResponseUtils
				.getParameter(decoder.getParameters(), "funId"));
		WebPage page = getPage(req, false);
		boolean success = dealCommand(jsonText, page);
		HttpResponse response = new DefaultHttpResponse(HttpVersion.HTTP_1_1,
				HttpResponseStatus.OK);
		String text;
		if (success) {
			text = functionId != null ? functionId + "(\"ok\");" : "ok!";
		} else {
			text = functionId != null ? functionId + "(\"fail\");" : "fail!";
		}
		response.setHeader(HttpHeaders.Names.CONTENT_TYPE,
				functionId == null ? HttpResponseUtils.CONTENT_TYPE_TEXT_HTML
						: HttpResponseUtils.CONTENT_TYPE_TEXT_JAVASCRIPT);
		response.setContent(ChannelBuffers.wrappedBuffer(text
				.getBytes(CharsetUtil.UTF_8)));
		response.setHeader(HttpHeaders.Names.CACHE_CONTROL,
				HttpHeaders.Values.NO_CACHE);
		response.setHeader(HttpHeaders.Names.CONNECTION,
				HttpHeaders.Values.KEEP_ALIVE);
		// response.setHeader("Keep-Alive", "timeout=180, max=1000");
		HttpHeaders.setContentLength(response, response.getContent()
				.readableBytes());
		HttpResponseUtils.sendHttpResponse(channel, req, response);
	}

	public boolean dealCommand(String jsonText, WebPage page) {
		if (jsonText != null && !jsonText.trim().equals("")) {
			try {
				JsonNode jsonNode = mapper.readTree(jsonText);
				String type = null;
				if (jsonNode.get("type") != null) {
					type = jsonNode.get("type").getTextValue();
				} else {
					throw new IllegalArgumentException(
							"the command's type is null!");
				}
				if (commandMapping.get(type) == null) {
					throw new IllegalArgumentException("the command's type:"
							+ type + " is't has mapping!");
				}
				Command command = mapper.treeToValue(jsonNode, commandMapping
						.get(type));
				if (command instanceof PublishCommand) {
					return destinationHolder.publish((PublishCommand) command);
				}
				if (command instanceof SubscibeCommand) {
					if (Constants.SUBSCIBE_COMMAND_TYPE.equals(command
							.getType())) {
						destinationHolder.subscibe((SubscibeCommand) command,
								page);
					} else {
						destinationHolder.unSubscibe((SubscibeCommand) command,
								page);
					}
				}
				if (command instanceof CloseCommand) {
					if (page != null) {
						page.invalidate();
					}
				}
				return true;
			} catch (Exception e) {
				if (logger.isErrorEnabled()) {
					logger.error("can't deal with jsonText:" + jsonText, e);
				}
				return false;
			}
		}
		return false;
	}

}
