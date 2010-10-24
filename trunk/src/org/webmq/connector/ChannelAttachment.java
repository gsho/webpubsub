package org.webmq.connector;

import org.webmq.CometType;
import org.webmq.listener.MessageListener;
import org.webmq.session.WebPage;

public class ChannelAttachment {

	private boolean writable;

	private WebPage page;

	private String functionId;

	private volatile MessageListener messageListener;

	private CometType cometType;

	public boolean isWritable() {
		return writable;
	}

	public void setWritable(boolean writable) {
		this.writable = writable;
	}

	public void setPage(WebPage page) {
		this.page = page;
	}

	public WebPage getPage() {
		return page;
	}

	public String getFunctionId() {
		return functionId;
	}

	public void setFunctionId(String functionId) {
		this.functionId = functionId;
	}

	public MessageListener getMessageListener() {
		return messageListener;
	}

	public void setMessageListener(MessageListener messageListener) {
		this.messageListener = messageListener;
	}

	public void setCometType(CometType cometType) {
		this.cometType = cometType;
	}

	public CometType getCometType() {
		return cometType;
	}
}
