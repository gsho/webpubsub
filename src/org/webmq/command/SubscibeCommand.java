package org.webmq.command;

public class SubscibeCommand extends Command {

	private String type;

	private String domain;

	private String[] destNames;

	private String[] destTypes;

	public String[] getDestNames() {
		return destNames;
	}

	public void setDestNames(String[] destNames) {
		this.destNames = destNames;
	}

	public String getDomain() {
		return domain;
	}

	public void setDomain(String domain) {
		this.domain = domain;
	}

	public String[] getDestTypes() {
		return destTypes;
	}

	public void setDestTypes(String[] destTypes) {
		this.destTypes = destTypes;
	}

	public String getType() {
		return this.type;
	}

	public void setType(String type) {
		this.type = type;
	}

}
