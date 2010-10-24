package org.webmq;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.webmq.command.PublishCommand;
import org.webmq.session.WebPage;

public class Queue extends Destination {

	private final static Log logger = LogFactory.getLog(Queue.class);

	private static final int MAX_PENDING_QUEUE_SIZE = 20;

	private volatile String previousSessionId;

	private java.util.Queue<PublishCommand> buffered = new ConcurrentLinkedQueue<PublishCommand>();

	public Queue(String name) {
		super(name);
	}

	@Override
	public boolean messageReceived(PublishCommand publishCommand) {
		if (pages.isEmpty()) {
			if (logger.isWarnEnabled()) {
				logger.warn("the queue[" + getName() + "]'s page is empty!");
			}

			return storeItem(publishCommand);
		}
		if (logger.isInfoEnabled()) {
			logger.info("the queue[" + getName() + "]'s pages.size():"
					+ pages.size());
		}
		WebPage page = getPreviousPage();
		if (page != null) {
			boolean success = page.messageReceived(
					new PublishCommand[] { publishCommand }, false);
			if (success) {
				return success;
			}
		}
		Iterator<Map.Entry<String, WebPage>> it = pages.entrySet().iterator();
		while (it.hasNext()) {
			Map.Entry<String, WebPage> entry = it.next();
			page = entry.getValue();
			boolean success = page.messageReceived(
					new PublishCommand[] { publishCommand }, false);
			if (success) {
				previousSessionId = page.getSessionId();
				return success;
			}
		}
		return storeItem(publishCommand);
	}

	private boolean storeItem(PublishCommand publishCommand) {
		if (buffered.size() > MAX_PENDING_QUEUE_SIZE) {
			if (logger.isWarnEnabled()) {
				logger.warn("pendingQueue is too big,discard the last message:"
						+ publishCommand);
			}
			return false;
		} else {
			return buffered.offer(publishCommand);
		}
	}

	private WebPage getPreviousPage() {
		if (previousSessionId != null) {
			WebPage page = pages.get(previousSessionId);
			if (page != null) {
				return page;
			}
		}
		return null;
	}

	@Override
	public void onRegisterPage(WebPage page) {
		notifyConsumeMessages(page);
	}

	@Override
	public void onUnRegisterPage(WebPage page) {
	}

	@Override
	public void onRegisterChannel(WebPage page) {
		notifyConsumeMessages(page);
	}

	private void notifyConsumeMessages(WebPage page) {
		if (!buffered.isEmpty()) {
			PublishCommand[] publishCommands = new PublishCommand[buffered
					.size()];
			for (int i = 0; i < publishCommands.length; i++) {
				publishCommands[i] = buffered.poll();
			}
			boolean success = page.messageReceived(publishCommands, false);
			if (!success) {
				for (PublishCommand publishCommand : publishCommands) {
					buffered.offer(publishCommand);
				}
			}
		}
	}

}
