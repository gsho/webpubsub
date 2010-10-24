package org.webmq.connector;

import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.Executors;

import org.jboss.netty.bootstrap.Bootstrap;
import org.jboss.netty.bootstrap.ServerBootstrap;
import org.jboss.netty.channel.Channel;
import org.jboss.netty.channel.ChannelFuture;
import org.jboss.netty.channel.ChannelPipeline;
import org.jboss.netty.channel.ChannelPipelineFactory;
import org.jboss.netty.channel.Channels;
import org.jboss.netty.channel.socket.nio.NioServerSocketChannelFactory;
import org.jboss.netty.handler.codec.http.HttpRequestDecoder;
import org.jboss.netty.handler.codec.http.HttpResponseEncoder;
import org.webmq.Constants;

public class WebmqServer {

	private ServerBootstrap bootstrap;

	private ServerBootstrap flashPolicyFileBootstrap;

	private Map<String, Object> options;

	private Channel bindingChannel;

	private Channel flashPolicyFileBindingChannel;

	private int port = 7777;

	private WebmqHandler handler;

	private String staticFileRoot;

	public void start() {

		if (port <= 0 || port >= 65535) {
			throw new IllegalArgumentException();
		}
		if (handler == null) {
			WebmqHandler webmqHandler = new WebmqHandler();
			webmqHandler.setStaticFileRoot(staticFileRoot);
			webmqHandler.init();
			this.handler = webmqHandler;
		}
		// flash 跨域访问的安全策略文件输出
		flashPolicyFileBootstrap = new ServerBootstrap(
				new NioServerSocketChannelFactory(Executors
						.newCachedThreadPool(), Executors.newCachedThreadPool()));
		flashPolicyFileBootstrap.setOption("child.tcpNoDelay", true);
		flashPolicyFileBootstrap
				.setPipelineFactory(new ChannelPipelineFactory() {
					// Flash socket policy file
					private CrossDomainHandler crossDomainHandler = new CrossDomainHandler();

					@Override
					public ChannelPipeline getPipeline() throws Exception {
						ChannelPipeline pipeline = Channels.pipeline();
						pipeline.addLast("crossDomainHandler",
								crossDomainHandler);
						return pipeline;
					}
				});
		flashPolicyFileBindingChannel = flashPolicyFileBootstrap
				.bind(new InetSocketAddress(843));
		// webmq 服务
		bootstrap = new ServerBootstrap(new NioServerSocketChannelFactory(
				Executors.newCachedThreadPool(), Executors
						.newCachedThreadPool()));
		if (options != null) {
			bootstrap.setOptions(options);
		}
		bootstrap.setOption("child.tcpNoDelay", true);
		bootstrap.setPipelineFactory(new ChannelPipelineFactory() {

			@Override
			public ChannelPipeline getPipeline() throws Exception {
				ChannelPipeline pipeline = Channels.pipeline();
				pipeline.addLast("decoder", new HttpRequestDecoder());
				pipeline.addLast("encoder", new HttpResponseEncoder());
				pipeline.addLast(Constants.WEBMQ_HANDLER_NAME, handler);
				return pipeline;
			}
		});
		bindingChannel = bootstrap.bind(new InetSocketAddress(port));

	}

	public void stop() {
		if (handler != null) {
			handler.destroy();
		}
		Channel channel = this.flashPolicyFileBindingChannel;
		if (channel != null) {
			ChannelFuture closeFuture = channel.close();
			closeFuture.awaitUninterruptibly();
			Bootstrap bootstrap = this.flashPolicyFileBootstrap;
			if (bootstrap != null) {
				bootstrap.releaseExternalResources();
			}
		}

		channel = this.bindingChannel;
		if (channel != null) {
			ChannelFuture closeFuture = channel.close();
			closeFuture.awaitUninterruptibly();
			Bootstrap bootstrap = this.bootstrap;
			if (bootstrap != null) {
				bootstrap.releaseExternalResources();
			}
		}

	}

	public Map<String, Object> getOptions() {
		return options;
	}

	public void setOptions(Map<String, Object> options) {
		this.options = options;
	}

	public int getPort() {
		return port;
	}

	public void setPort(int port) {
		this.port = port;
	}

	public String getStaticFileRoot() {
		return staticFileRoot;
	}

	public void setStaticFileRoot(String staticFileRoot) {
		this.staticFileRoot = staticFileRoot;
	}

}
