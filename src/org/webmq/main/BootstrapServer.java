package org.webmq.main;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.webmq.connector.WebmqServer;

public class BootstrapServer {

	private static final Log logger = LogFactory.getLog(BootstrapServer.class);

	public static void main(String[] args) {
		final WebmqServer server = new WebmqServer();
		if (args != null && args.length > 0) {
			if (logger.isWarnEnabled()) {
				logger.warn("the static file root is " + args[0]);
			}
			// js and flash swf file
			server.setStaticFileRoot(args[0]);
		} else {
			if (logger.isWarnEnabled()) {
				logger.warn("the static file root isn't set!");
			}
		}
		server.start();
		if (logger.isWarnEnabled()) {
			logger.warn("the webmq server is started!");
		}
		Runtime.getRuntime().addShutdownHook(new Thread() {
			@Override
			public void run() {
				if (logger.isWarnEnabled()) {
					logger.warn("stoping the webmq server...");
				}
				server.stop();
				if (logger.isWarnEnabled()) {
					logger.warn("the webmq server is closed!");
				}
			}
		});
	}

}
