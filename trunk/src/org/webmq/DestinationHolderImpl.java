package org.webmq;

import java.util.Iterator;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.webmq.command.PublishCommand;
import org.webmq.command.SubscibeCommand;
import org.webmq.session.WebPage;

public class DestinationHolderImpl implements DestinationHolder {

	private final static Log logger = LogFactory
			.getLog(DestinationHolderImpl.class);

	private ConcurrentMap<String, DomainHolder> domainHolders = new ConcurrentHashMap<String, DomainHolder>();

	private long period = 20 * 60 * 1000;

	private Timer timer;

	public void init() {
		timer = new Timer("DestinationHolderImpl.timer", true);
		timer.schedule(new TimerTask() {

			@Override
			public void run() {
				Iterator<DomainHolder> it = domainHolders.values().iterator();
				while (it.hasNext()) {
					DomainHolder holder = (DomainHolder) it.next();
					if (holder != null) {
						Iterator<Queue> queueIt = holder.queues.values()
								.iterator();
						while (queueIt.hasNext()) {
							Queue queue = (Queue) queueIt.next();
							if (queue != null && !queue.isValid()) {
								if (logger.isWarnEnabled()) {
									logger.warn("the queue:" + queue
											+ " is timeout!");
								}
								queueIt.remove();
								// holder.queues.remove(queue.getName(), queue);
							}
						}
						Iterator<Topic> topicIt = holder.topics.values()
								.iterator();
						while (topicIt.hasNext()) {
							Topic topic = (Topic) topicIt.next();
							if (topic != null && !topic.isValid()) {
								if (logger.isWarnEnabled()) {
									logger.warn("the topic:" + topic
											+ " is timeout!");
								}
								topicIt.remove();
								// holder.topics.remove(topic.getName(), topic);
							}
						}
						if (!holder.isValid()) {
							if (logger.isWarnEnabled()) {
								logger.warn("the DomainHolder:" + holder
										+ " is timeout!");
							}
							it.remove();
						}
					}
				}
			}
		}, period, period);
	}

	@Override
	public boolean publish(PublishCommand publishCommand) {
		verifyPublishCommand(publishCommand);
		DomainHolder domainHolder = getDomainHolder(publishCommand.getDomain(),
				true);
		Destination destination = getDestination(domainHolder, publishCommand
				.getDestName(), publishCommand.isQueue(), true);
		if (destination == null) {
			throw new IllegalArgumentException("the destination["
					+ publishCommand.getDestName() + "] is't existent!");
		}
		boolean success = destination.messageReceived(publishCommand);
		if (!success) {
			if (logger.isInfoEnabled()) {
				logger.info("the publishCommand[" + publishCommand
						+ "] is unsuccessful!");
			}
		}
		return success;
	}

	@Override
	public void subscibe(SubscibeCommand subscibeCommand, WebPage page) {
		if (page == null) {
			throw new IllegalArgumentException("the page is null!");
		}
		verifySubscibeCommand(subscibeCommand);
		DomainHolder domainHolder = getDomainHolder(
				subscibeCommand.getDomain(), true);
		String[] destNames = subscibeCommand.getDestNames();
		String[] destTypes = subscibeCommand.getDestTypes();
		for (int i = 0; i < destNames.length; i++) {

			String destName = destNames[i];
			String destType = destTypes[i];
			Destination destination = getDestination(domainHolder, destName,
					"queue".equals(destType), true);
			if (destination == null) {
				throw new IllegalArgumentException("the destination["
						+ destName + "] is't existent!");
			}
			destination.registerPage(page);
		}
	}

	@Override
	public void unSubscibe(SubscibeCommand subscibeCommand, WebPage page) {
		if (page == null) {
			throw new IllegalArgumentException("the page is null!");
		}
		verifySubscibeCommand(subscibeCommand);
		DomainHolder domainHolder = getDomainHolder(
				subscibeCommand.getDomain(), true);
		if (domainHolder != null) {
			String[] destNames = subscibeCommand.getDestNames();
			String[] destTypes = subscibeCommand.getDestTypes();
			for (int i = 0; i < destNames.length; i++) {
				String destName = destNames[i];
				String destType = destTypes[i];
				Destination destination = getDestination(domainHolder,
						destName, "queue".equals(destType), true);
				if (destination != null) {
					destination.unRegisterPage(page);
				}
			}
		}
	}

	private DomainHolder getDomainHolder(String domain, boolean created) {
		DomainHolder domainHolder = domainHolders.get(domain);
		if (domainHolder == null && created) {
			// ���û��
			DomainHolder newDomainHolder = new DomainHolder();
			DomainHolder oldDomainHolder = domainHolders.putIfAbsent(domain,
					newDomainHolder);
			if (oldDomainHolder != null) {
				domainHolder = oldDomainHolder;
			} else {
				domainHolder = newDomainHolder;
			}
		}
		domainHolder.critical = false;
		return domainHolder;
	}

	private Destination getDestination(DomainHolder domainHolder,
			String destName, boolean isQueue, boolean created) {
		Destination destination;
		if (!isQueue) {
			Topic topic = domainHolder.topics.get(destName);
			if (topic == null && created) {
				Topic newTopic = new Topic(destName);
				Topic oldTopic = domainHolder.topics.putIfAbsent(destName,
						newTopic);
				if (oldTopic != null) {
					topic = oldTopic;
				} else {
					topic = newTopic;
				}
			}
			destination = topic;
		} else {
			Queue queue = domainHolder.queues.get(destName);
			if (queue == null && created) {
				Queue newQueue = new Queue(destName);
				Queue oldQueue = domainHolder.queues.putIfAbsent(destName,
						newQueue);
				if (oldQueue != null) {
					queue = oldQueue;
				} else {
					queue = newQueue;
				}
			}
			destination = queue;
		}
		return destination;
	}

	private void verifySubscibeCommand(SubscibeCommand subscibeCommand) {
		if (subscibeCommand == null || subscibeCommand.getDomain() == null
				|| subscibeCommand.getDestNames() == null
				|| subscibeCommand.getDestTypes() == null) {
			throw new IllegalArgumentException();
		}
	}

	private void verifyPublishCommand(PublishCommand publishCommand) {
		if (publishCommand == null || publishCommand.getDomain() == null
				|| publishCommand.getDestName() == null
				|| publishCommand.getMessage() == null) {
			throw new IllegalArgumentException();
		}
	}

	private static class DomainHolder {
		ConcurrentMap<String, Queue> queues = new ConcurrentHashMap<String, Queue>();
		ConcurrentMap<String, Topic> topics = new ConcurrentHashMap<String, Topic>();
		boolean critical;

		public boolean isValid() {
			if (critical && queues.isEmpty() && topics.isEmpty()) {
				return false;
			}
			if (queues.isEmpty() && topics.isEmpty()) {
				this.critical = true;
			}
			return true;
		}
	}

	public long getPeriod() {
		return period;
	}

	public void setPeriod(long period) {
		this.period = period;
	}

	public void destroy() {

	}

}
