package org.webmq;

import org.webmq.command.HeartbeatCommand;

public abstract class Constants {
	public static final String WEBMQ_HANDLER_NAME = "handler";
	public static final String SUBSCIBE_COMMAND_TYPE = "subscibe";
	public static final String UNSUBSCIBE_COMMAND_TYPE = "unSubscibe";
	public static final String LOGIN_COMMAND_TYPE = "login";
	public static final String CLOSE_COMMAND_TYPE = "close";
	public static final String HEARTBEAT_COMMAND_TYPE = "hb";
	public static final String PUBLISH_COMMAND_TYPE = "publish";
	public static final long WEB_PAGE_MAX_IDLE_TIME = 1000 * 10;
	public static final HeartbeatCommand HEARTBEAT_COMMAND = new HeartbeatCommand();
	public static final long HEARTBEAT_INTEVAL = 1000 * 60 * 5;
	

}
