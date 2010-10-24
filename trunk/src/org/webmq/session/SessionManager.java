package org.webmq.session;

public interface SessionManager {

	Session getSession(String sessionId);

	Session putSession(String sessionId, Session newSession);

	Session removeSession(Session session);

}
