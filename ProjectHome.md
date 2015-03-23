最近在做一些实时web相关的项目，实时web相对传统web来说，很多方面都是格格不入的，要在传统的web server上直接支持实时web会比较麻烦，当然最近很多web server也在做这方面的工作，但我始终觉得这类需求较为特别，做成一独立的服务较为合适，于是开发了一个基于web的message queue，也就是在浏览器端可能直接订阅和发送信息。

项目特点:
1.支持websocket(基于浏览器原生支持或flash socket)、httpstreaming(基于hidden ifame)、longpolling(基于jsonp script tag)。
2.较为全面 的浏览器支持，做过测试的浏览器：IE6、IE8、FF3.6、chrome5、chrome6、safari5，还有一些浏览器没做过测试，有时间再补上。
3.准实时信息交互，从发送到接收一般都在20ms以内，当然这个还看网络状况。
4.高并发的tcp连接支持，轻松上十万甚至百万并发连接，只要内存足够大。
5.支持两种消息模式:topic和queue。
6.支持嵌入式开发
7.消息非持久化

更详细的了解请看:http://afei1689.javaeye.com/blog/763953