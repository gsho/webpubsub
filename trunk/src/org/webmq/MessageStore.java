package org.webmq;

import org.webmq.command.PublishCommand;

public interface MessageStore {
	
	void store(PublishCommand publishCommand);
	
}
