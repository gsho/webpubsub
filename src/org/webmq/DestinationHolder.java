package org.webmq;

import org.webmq.command.PublishCommand;
import org.webmq.command.SubscibeCommand;
import org.webmq.session.WebPage;

public interface DestinationHolder {

	void subscibe(SubscibeCommand subscibeCommand, WebPage page);

	void unSubscibe(SubscibeCommand subscibeCommand, WebPage page);

	boolean publish(PublishCommand publishCommand);

}
