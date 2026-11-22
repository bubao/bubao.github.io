/**
 * @description: 标签页离开/返回动态标题切换 + 控制台瓦猫彩蛋
 * @author: bubao
 */
(function() {
	if (typeof window === "undefined") return;

	// 1. 标签页失焦 / 聚焦动态标题
	let originalTitle = document.title;
	let titleTime;

	document.addEventListener("visibilitychange", function() {
		if (document.hidden) {
			originalTitle = document.title;
			document.title = "(つェ⊂) 瓦猫找不到你啦~";
			clearTimeout(titleTime);
		} else {
			document.title = "(≧∇≦) 欢迎回到瓦猫杂货铺！";
			titleTime = setTimeout(function() {
				document.title = originalTitle;
			}, 1500);
		}
	});

	// 2. F12 控制台瓦猫彩蛋打印函数
	function printCatEgg() {
		const titleStyle =
			"color: #ffd166; font-size: 15px; font-weight: bold; font-family: monospace; text-shadow: 1px 1px 2px rgba(0,0,0,0.4);";
		const badgeName =
			"background: #2f4154; color: #fff; padding: 4px 10px; border-radius: 4px 0 0 4px; font-weight: bold; font-size: 12px;";
		const badgeUrl =
			"background: #00cec9; color: #fff; padding: 4px 10px; border-radius: 0 4px 4px 0; font-size: 12px;";
		const descStyle = "color: #747d8c; font-size: 12px; line-height: 1.8;";

		console.log(
			`%c
   /\\_/\\    ╭──────────────────────────────────────────────╮
  ( o.o )   │  🐱 欢迎光临「瓦猫杂货铺」！                 │
   > ^ <    │  因为有了危机感，所以会义无反顾。             │
            ╰──────────────────────────────────────────────╯
`,
			titleStyle
		);

		console.log("%c瓦猫杂货铺%chttps://bubao.github.io/%c", badgeName, badgeUrl, "background: transparent;");
		console.log(
			"%c⚡ 90后，爱折腾，爱心理学，更爱编码。\n💡 探索技术边界，记录嵌入式与全栈开发实践。\n🎁 尝试在控制台输入 %cneko()%c 或 %c瓦猫%c 召唤小店宠吧！",
			descStyle,
			"color: #ff7675; font-weight: bold;",
			descStyle,
			"color: #ff7675; font-weight: bold;",
			descStyle
		);
	}

	// 挂载全局彩蛋指令（支持在 Console 直接输 neko() 或 瓦猫）
	window.neko = function() {
		printCatEgg();
		return "🐾 喵呜~ 瓦猫收到你的召唤啦！";
	};
	try {
		Object.defineProperty(window, "瓦猫", {
			get: function() {
				printCatEgg();
				return "🐾 喵呜~ 瓦猫在此！";
			}
		});
	} catch (e) {}

	// 页面初始化时打印
	printCatEgg();

	// 延时 800ms 再次确保打印在第三方日志（如 Valine/统计插件）下方
	setTimeout(printCatEgg, 800);

	// 监听按键：当访客按下 F12 或 Cmd+Option+I 时直接触发
	window.addEventListener("keydown", function(e) {
		if (
			e.key === "F12" ||
			(e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) ||
			(e.metaKey && e.altKey && (e.key === "I" || e.key === "i"))
		) {
			setTimeout(printCatEgg, 300);
		}
	});
})();
