package org.webmq;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.webmq.command.PublishCommand;
import org.webmq.session.WebPage;

public abstract class Destination {

	private final static Log logger = LogFactory.getLog(Destination.class);

	protected String name;

	protected ConcurrentMap<String, WebPage> pages = new ConcurrentHashMap<String, WebPage>();

	private boolean critical = false;

	Destination(String name) {
		this.name = name;
	}

	public String getName() {
		return name;
	}

	public void registerPage(WebPage newPage) {
		this.critical = false;
		onRegisterPage(newPage);
		WebPage oldPage = pages.putIfAbsent(newPage.getPageId(), newPage);
		if (oldPage == null) {
			if (logger.isInfoEnabled()) {
				logger.info("the webpage:" + newPage
						+ " is register to the destination[" + toString() + "]");
			}
			newPage.registerDestination(this);
		} else {
			if (oldPage != newPage) {
				throw new IllegalStateException();
			}
		}
	}

	public void unRegisterPage(WebPage page) {
		if (page == null) {
			return;
		}
		page.unRegisterDestination(this);
		boolean success = pages.remove(page.getPageId(), page);
		if (success) {
			onUnRegisterPage(page);
		}
	}

	protected abstract void onRegisterPage(WebPage page);

	protected abstract void onUnRegisterPage(WebPage page);

	public abstract void onRegisterChannel(WebPage page);

	public abstract boolean messageReceived(PublishCommand publishCommand);

	public boolean isValid() {
		if (critical && pages.isEmpty()) {
			return false;
		}
		if (pages.isEmpty()) {
			this.critical = true;
		}
		return true;
	}

	@Override
	public String toString() {
		StringBuilder sb = new StringBuilder();
		sb.append("the destination's name[").append(getName());
		sb.append("],pages[").append(this.pages).append("],the object:");
		sb.append(super.toString());
		return sb.toString();
	}
}
