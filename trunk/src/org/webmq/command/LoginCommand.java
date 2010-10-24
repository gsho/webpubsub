package org.webmq.command;

import org.webmq.Constants;

public class LoginCommand extends Command {

	private String sessionId;

	private String pageId;

	@Override
	public String getType() {
		return Constants.LOGIN_COMMAND_TYPE;
	}

	@Override
	public void setType(String type) {

	}

	public String getPageId() {
		return pageId;
	}

	public void setPageId(String pageId) {
		this.pageId = pageId;
	}

	public String getSessionId() {
		return sessionId;
	}

	public void setSessionId(String sessionId) {
		this.sessionId = sessionId;
	}

}
