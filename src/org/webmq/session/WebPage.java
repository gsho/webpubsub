package org.webmq.session;

import java.util.Collection;
import java.util.Iterator;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jboss.netty.channel.Channel;
import org.webmq.CometType;
import org.webmq.Constants;
import org.webmq.Destination;
import org.webmq.command.Command;
import org.webmq.connector.ChannelAttachment;

public class WebPage {

	private final static Log logger = LogFactory.getLog(WebPage.class);
	// 最大待输出到前端的队列的最大值
	private static final int MAX_PENDING_QUEUE_SIZE = 20;
	// 主要是连接暂时断开的消息buffered
	private Queue<Command> buffered = new ConcurrentLinkedQueue<Command>();
	//
	private String pageId;
	// 该webpage打开的tcp连接
	private volatile AtomicReference<Channel> channel = new AtomicReference<Channel>();
	// 感兴趣destination
	private Collection<Destination> destinations = new CopyOnWriteArrayList<Destination>();
	// 是否第一次创建的
	private boolean isNew = true;
	//
	private volatile long lastAccessTime = System.currentTimeMillis();
	//
	private Session session;

	public WebPage(String pageId, Session session) {
		this.pageId = pageId;
		this.session = session;
	}

	public boolean registerChannel(Channel channel, CometType cometType) {
		updateAccessTime();
		Channel srcChannel = this.channel.get();
		if (srcChannel != channel) {
			// 在并发情况下，同一个连接会难加两次吗，不太可能 ，因为一个tcp连接只给一个线程控制
			// channel.getCloseFuture().addListener(new ChannelFutureListener()
			// {
			// @Override
			// public void operationComplete(ChannelFuture future)
			// throws Exception {
			//
			// }
			// });
			this.channel.compareAndSet(srcChannel, channel);
			if (srcChannel != null) {
				if (logger.isInfoEnabled()) {
					logger.info("the webpage use new channel:" + channel
							+ " instead of old channel:" + srcChannel);
				}
				// 这里不关闭，由于统一 的http连接超时管理器去关闭
				// srcChannel.close();
			}
		}
		Iterator<Destination> it = destinations.iterator();
		while (it.hasNext()) {
			Destination destination = it.next();
			if (destination != null) {
				destination.onRegisterChannel(this);
			}
		}
		if (!buffered.isEmpty()) {
			// 这个操作可能不是线程安全的,但后面会对commands的元素做null判断的
			Command[] commands = new Command[buffered.size()];
			for (int i = 0; i < commands.length; i++) {
				commands[i] = buffered.poll();
			}
			messageReceived(commands, true);
		}
		return true;
	}

	private void updateAccessTime() {
		this.lastAccessTime = System.currentTimeMillis();
	}

	public boolean unRegisterChannel(Channel channel) {
		return true;
	}

	public boolean isNew() {
		return isNew;
	}

	public void setNew(boolean isNew) {
		this.isNew = isNew;
	}

	public void invalidate() {
		Channel channel = this.channel.get();
		if (channel != null) {
			channel.close();
		}
		session.removePage(this);
		Iterator<Destination> it = destinations.iterator();
		while (it.hasNext()) {
			Destination destination = it.next();
			destination.unRegisterPage(this);
		}
		destinations.clear();
		buffered.clear();
	}

	/**
	 * @param commands
	 *            其中的元素必须都是发到queue或topic ,不能有参半的情况
	 * @param buffered
	 * @return
	 */
	public boolean messageReceived(Command[] commands, boolean buffered) {

		if (commands == null || commands.length == 0) {
			return true;
		}
		Channel channel = this.channel.get();
		if (!isValid()) {
			invalidate();
			return false;
		}
		if (channel == null || !channel.isConnected()) {
			return false;
		}
		boolean success = consumeMessages(commands, channel);
		if (success) {
			return success;
		} else {
			if (logger.isWarnEnabled()) {
				logger.warn("can't consumer command's size:" + commands.length
						+ ",the pageId:" + this.pageId);
			}
		}
		if (!buffered) {
			return false;
		} else {
			return offerToBuffered(commands);
		}
	}

	private boolean consumeMessages(Command[] commands, Channel channel) {
		if (!channel.isConnected()) {
			return false;
		}
		Object att = channel.getPipeline()
				.getContext(Constants.WEBMQ_HANDLER_NAME).getAttachment();
		if (att != null && att instanceof ChannelAttachment) {
			ChannelAttachment ca = (ChannelAttachment) att;
			boolean success = ca.getMessageListener().onMessage(this, channel,
					commands);
			if (success) {
				updateAccessTime();
			}
			return success;
		} else {
			return false;
		}

	}

	private boolean offerToBuffered(Command[] commands) {
		if (buffered.size() + commands.length > MAX_PENDING_QUEUE_SIZE) {
			if (logger.isWarnEnabled()) {
				logger.warn("pendingQueue is too big,discard the message's length:"
						+ commands.length);
			}
			return false;
		} else {
			for (Command command : commands) {
				buffered.offer(command);
			}
			return true;
		}
	}

	public void registerDestination(Destination destination) {
		if (destination == null) {
			return;
		}
		updateAccessTime();
		boolean success = destinations.add(destination);
		if (!success) {
			if (logger.isErrorEnabled()) {
				logger.error("oh shit!");
			}
		}
	}

	public void unRegisterDestination(Destination destination) {
		if (destination == null) {
			return;
		}
		destinations.remove(destination);
	}

	public boolean isValid() {
		Channel srcChannel = this.channel.get();
		if (srcChannel != null && srcChannel.isConnected()) {
			return true;
		}
		if ((System.currentTimeMillis() - this.lastAccessTime) > Constants.WEB_PAGE_MAX_IDLE_TIME) {
			return false;
		} else {
			return true;
		}
	}

	public String getPageId() {
		return pageId;
	}

	public String getSessionId() {
		return this.session.getSessionId();
	}

	public void heartbeat() {
		if (!isValid()) {
			invalidate();
		} else {
			long now = System.currentTimeMillis();
			if ((now - this.lastAccessTime) < Constants.HEARTBEAT_INTEVAL) {
				return;
			}
			Channel channel = this.channel.get();
			if (channel != null && channel.isConnected()) {
				ChannelAttachment att = (ChannelAttachment) channel
						.getPipeline().getContext(Constants.WEBMQ_HANDLER_NAME)
						.getAttachment();
				att.getMessageListener().onMessage(this, channel,
						new Command[] { Constants.HEARTBEAT_COMMAND });
			}

		}
	}
}
