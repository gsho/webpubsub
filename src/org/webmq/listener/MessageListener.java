package org.webmq.listener;

import org.jboss.netty.channel.Channel;
import org.webmq.command.Command;
import org.webmq.session.WebPage;

public interface MessageListener {

	public boolean onMessage(WebPage session, Channel channel,
			Command[] commands);

}
