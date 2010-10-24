package org.webmq.connector;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.Set;
import java.util.UUID;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.jboss.netty.handler.codec.http.Cookie;
import org.jboss.netty.handler.codec.http.CookieDecoder;
import org.jboss.netty.handler.codec.http.CookieEncoder;
import org.jboss.netty.handler.codec.http.HttpHeaders;
import org.jboss.netty.handler.codec.http.HttpRequest;
import org.jboss.netty.handler.codec.http.HttpResponse;
import org.webmq.session.Session;
import org.webmq.session.SessionManager;
import org.webmq.session.WebPage;

public abstract class PageHandler implements RequestHandler {

	private final static Log logger = LogFactory.getLog(PageHandler.class);

	static final String WEBMQ_SESSION_KEY = "w_s_k";

	protected SessionManager sessionManager;

	private CookieDecoder cookieDecoder = new CookieDecoder();

	protected WebPage getPage(HttpRequest httpRequest, boolean created) {
		String pageId = getPageIdFromUri(httpRequest);
		String sessionId = null;
		if (pageId != null) {
			int index = pageId.indexOf("|");
			if (index > 0) {
				sessionId = pageId.substring(0, index);
			} else {
				sessionId = pageId;
			}
		} else {
			sessionId = getSessionIdFromCookie(httpRequest);
		}
		Session session = sessionManager.getSession(sessionId);
		if (session == null) {
			if (created) {
				session = createSession(httpRequest);
			} else {
				return null;
			}
		}
		WebPage page = session.getPage(pageId);
		if (page == null) {
			if (created) {
				page = createPage(session, httpRequest);
			}
		}
		return page;
	}

	private Session createSession(HttpRequest req) {

		String sessionId = generateSessionId(req);
		Session newSession = new Session(sessionId);
		Session oldSession = sessionManager.putSession(sessionId, newSession);
		if (oldSession != null) {
			if (logger.isErrorEnabled()) {
				logger.error("impossibly run here!");
			}
			return oldSession;
		} else {
			if (logger.isInfoEnabled()) {
				logger.info("create new session:" + newSession);
			}
			return newSession;
		}
	}

	private WebPage createPage(Session session, HttpRequest req) {
		String pageId = session.getSessionId() + "|" + session.nextPageId();
		WebPage newPage = new WebPage(pageId, session);
		WebPage oldPage = session.putPage(pageId, newPage);
		if (oldPage != null) {
			if (logger.isErrorEnabled()) {
				logger.error("impossibly run here!");
			}
			return oldPage;
		} else {
			if (logger.isInfoEnabled()) {
				logger.info("create new page:" + newPage);
			}
			return newPage;
		}
	}

	protected void setP3pHeaderForIE(HttpResponse response) {
		response
				.setHeader(
						"P3P",
						"CP=CURa ADMa DEVa PSAo PSDo OUR BUS UNI PUR INT DEM STA PRE COM NAV OTC NOI DSP COR");
	}

	protected void setResponseCookie(String sessionId, HttpResponse response) {
		CookieEncoder cookieEncoder = new CookieEncoder(true);
		cookieEncoder.addCookie(WEBMQ_SESSION_KEY, sessionId);
		response
				.addHeader(HttpHeaders.Names.SET_COOKIE, cookieEncoder.encode());
	}

	private String generateSessionId(HttpRequest req) {
		return UUID.randomUUID().toString();
	}

	public SessionManager getSessionManager() {
		return sessionManager;
	}

	public void setSessionManager(SessionManager pageManager) {
		this.sessionManager = pageManager;
	}

	/**
	 * @param req
	 * @return
	 */
	private String getPageIdFromUri(HttpRequest req) {
		String uri = req.getUri();
		int beginIndex = uri.indexOf(";");
		if (beginIndex < 0 || beginIndex == (uri.length() - 1)) {
			return null;
		}
		int endInex = uri.indexOf("?");
		if (endInex < 0) {
			endInex = uri.length();
		}
		try {
			return URLDecoder.decode(uri.substring(beginIndex + 1, endInex),
					"utf-8");
		} catch (UnsupportedEncodingException e) {
			if (logger.isErrorEnabled()) {
				logger.error(e);
			}
		}
		return null;
	}

	private String getSessionIdFromCookie(HttpRequest req) {
		String cookieValue = req.getHeader(HttpHeaders.Names.COOKIE);
		if (cookieValue == null || cookieValue.trim().equals("")) {
			return null;
		}
		Set<Cookie> cookies = cookieDecoder.decode(cookieValue);
		if (cookies != null && !cookies.isEmpty()) {
			for (Cookie cookie : cookies) {
				if (WEBMQ_SESSION_KEY.equals(cookie.getName())) {
					return cookie.getValue();
				}
			}
		}
		return null;
	}
}
