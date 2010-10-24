package org.webmq.session;

import java.util.Iterator;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

public class Session {

	private final static Log logger = LogFactory.getLog(Session.class);

	private String sessionId;

	private AtomicInteger atomicInteger = new AtomicInteger();

	private boolean critical;

	private ConcurrentMap<String, WebPage> pages = new ConcurrentHashMap<String, WebPage>(
			5);

	public Session(String sessionId) {
		this.sessionId = sessionId;
	}

	public WebPage getPage(String pageId) {
		if (pageId == null) {
			return null;
		}
		return pages.get(pageId);
	}

	public WebPage putPage(String pageId, WebPage newPage) {
		critical = false;
		return pages.putIfAbsent(pageId, newPage);
	}

	public WebPage removePage(WebPage page) {
		if (page == null) {
			return page;
		}
		boolean sucess = pages.remove(page.getPageId(), page);
		if (sucess) {
			return page;
		} else {
			return null;
		}
	}

	public String getSessionId() {
		return sessionId;
	}

	public void setSessionId(String sessionId) {
		this.sessionId = sessionId;
	}

	public String nextPageId() {
		return String.valueOf(atomicInteger.incrementAndGet());
	}

	public boolean isValid() {
		if (critical && pages.isEmpty()) {
			return false;
		}
		if (pages.isEmpty()) {
			this.critical = true;
		}
		return true;
	}

	public void heartbeat() {
		Iterator<WebPage> it = pages.values().iterator();
		while (it.hasNext()) {
			try {
				WebPage page = (WebPage) it.next();
				page.heartbeat();
			} catch (Exception e) {
				if (logger.isWarnEnabled()) {
					logger.warn("the heartbeat error:" + e);
				}
			}
		}
	}

	public void invalidate() {
		Iterator<WebPage> it = pages.values().iterator();
		while (it.hasNext()) {
			WebPage page = it.next();
			page.invalidate();
		}
	}
}
