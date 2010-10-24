package org.webmq.command;

import org.webmq.Constants;

public class HeartbeatCommand extends Command {

	@Override
	public String getType() {
		return Constants.HEARTBEAT_COMMAND_TYPE;
	}

	@Override
	public void setType(String type) {
	}
}
