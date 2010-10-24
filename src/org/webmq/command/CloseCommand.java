package org.webmq.command;

import org.webmq.Constants;

public class CloseCommand extends Command {

	@Override
	public String getType() {
		return Constants.CLOSE_COMMAND_TYPE;
	}

	@Override
	public void setType(String type) {

	}

}
