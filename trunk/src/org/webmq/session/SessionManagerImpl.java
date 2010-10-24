package org.webmq.session;

import java.util.Iterator;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

public class SessionManagerImpl implements SessionManager {

	private final static Log logger = LogFactory
			.getLog(SessionManagerImpl.class);

	private ConcurrentMap<String, Session> sessions = new ConcurrentHashMap<String, Session>(
			10000);
	// 检查失效的session
	private long period = 4 * 60 * 1000;
	//
	private int multiple = 5;
	//
	private Timer timer;

	public void init() {
		timer = new Timer("SessionManagerImpl.timer", true);
		timer.schedule(new TimerTask() {

			private long counter = 1L;

			@Override
			public void run() {
				boolean isHealthExamine = ((counter % multiple) == 0);
				Iterator<Session> it = sessions.values().iterator();
				while (it.hasNext()) {
					Session sesson = it.next();
					boolean removed = false;
					if (isHealthExamine) {
						if (sesson != null && !sesson.isValid()) {
							if (logger.isWarnEnabled()) {
								logger.warn("the session:" + sesson
										+ " is timeout!");
							}
							sesson.invalidate();
							it.remove();
							removed = true;
						}
					}
					if (!removed) {
						// 保持连接不空闲时间过长，会被中间的路由设备断开
						sesson.heartbeat();
					}
				}
				counter++;
				// reset counter
				if (counter > (Long.MAX_VALUE - Integer.MAX_VALUE)) {
					counter = 0;
				}
			}

		}, period, period);
	}

	@Override
	public Session getSession(String pageId) {
		if (pageId == null) {
			return null;
		}
		return sessions.get(pageId);
	}

	@Override
	public Session putSession(String sessionId, Session newSession) {
		return sessions.putIfAbsent(sessionId, newSession);
	}

	@Override
	public Session removeSession(Session session) {
		if (session == null) {
			return session;
		}
		return sessions.remove(session.getSessionId());
	}

	public void destroy() {
		Iterator<Session> it = sessions.values().iterator();
		while (it.hasNext()) {
			Session sesson = it.next();
			sesson.invalidate();
		}
	}
}
