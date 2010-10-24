package org.webmq.command;

import org.webmq.Constants;

public class PublishCommand extends Command {

	private String id;

	private String domain;

	private String destName;

	private boolean isQueue;

	private Object message;

	@Override
	public String getType() {
		return Constants.PUBLISH_COMMAND_TYPE;
	}

	@Override
	public void setType(String type) {
	}

	public String getDomain() {
		return domain;
	}

	public void setDomain(String domain) {
		this.domain = domain;
	}

	public String getDestName() {
		return destName;
	}

	public void setDestName(String destName) {
		this.destName = destName;
	}

	public boolean isQueue() {
		return isQueue;
	}

	public void setQueue(boolean isQueue) {
		this.isQueue = isQueue;
	}

	public Object getMessage() {
		return message;
	}

	public void setMessage(Object message) {
		this.message = message;
	}

	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		sb.append("domain[").append(domain).append("],");
		sb.append("destName[").append(destName).append("],");
		sb.append("isQueue[").append(isQueue).append("],");
		sb.append("message[").append(message).append("]\rn");
		return sb.toString();
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

}
