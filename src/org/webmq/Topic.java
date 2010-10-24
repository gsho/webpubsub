package org.webmq;

import java.util.Iterator;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.webmq.command.PublishCommand;
import org.webmq.session.WebPage;

public class Topic extends Destination {

	private final static Log logger = LogFactory.getLog(Topic.class);

	public Topic(String name) {
		super(name);
	}

	@Override
	public boolean messageReceived(PublishCommand publishCommand) {

		if (pages.isEmpty()) {
			if (logger.isWarnEnabled()) {
				logger.warn("the topic[" + getName() + "]'s sessions is empty!");
			}
		} else {
			if (logger.isInfoEnabled()) {
				logger.info("the topic[" + getName() + "]'s pages.size():"
						+ pages.size());
			}
			Iterator<Map.Entry<String, WebPage>> it = pages.entrySet()
					.iterator();
			while (it.hasNext()) {
				Map.Entry<String, WebPage> entry = it.next();
				if (entry != null) {
					WebPage page = entry.getValue();
					if (page == null) {
						continue;
					}
					page.messageReceived(
							new PublishCommand[] { publishCommand }, true);
				}
			}
		}
		return true;
	}

	@Override
	public void onRegisterPage(WebPage session) {
	}

	@Override
	public void onUnRegisterPage(WebPage session) {
	}

	@Override
	public void onRegisterChannel(WebPage session) {
	}
}
