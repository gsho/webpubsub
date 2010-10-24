package org.webmq;

import org.webmq.command.PublishCommand;

public interface ConsumeListener {

	void onComplete(PublishCommand publishCommand, boolean success,
			Throwable cause);

}
