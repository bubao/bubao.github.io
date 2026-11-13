/**
 * @description: 猫动画主题切换
 * @author: bubao
 * @date: 2021-01-24 21:21:11
 * @last author: bubao
 * @last edit time: 2021-01-28 12:19:28
 */

(function() {
	const colorToggleButtonName = "color-toggle-btn";

	// eslint-disable-next-line no-undef
	Fluid.utils.waitElementLoaded("#" + colorToggleButtonName, function() {
		const button = document.getElementById(colorToggleButtonName);
		if (button) {
			const BODY = document.getElementsByTagName("body")[0];
			let isAnimating = false;

			// 使用 capture:true 确保在 color-schema.js 冒泡阶段之前执行
			button.addEventListener("click", function() {
				if (isAnimating) return;
				isAnimating = true;

				// 此时 localStorage 还未被 color-schema.js 修改
				// 读取当前主题来预测下一个主题
				const colorSchemaStorageKey = "Fluid_Color_Scheme";
				let currentSetting;
				try {
					currentSetting = localStorage.getItem(colorSchemaStorageKey);
				} catch (e) {
					currentSetting = null;
				}

				const invertColorSchemaObj = { dark: "light", light: "dark" };
				const validColorSchemaKeys = { dark: true, light: true };

				// 预测切换后的主题
				let futureTheme;
				if (validColorSchemaKeys[currentSetting]) {
					futureTheme = invertColorSchemaObj[currentSetting];
				} else {
					//  fallback：从默认值取反
					const defaultScheme = document.documentElement.getAttribute("data-default-color-scheme");
					futureTheme = invertColorSchemaObj[defaultScheme] || "light";
				}

				// 创建 neko 动画（独立于主题切换）
				const oldNeko = document.getElementById("neko");
				if (oldNeko) oldNeko.remove();

				const neko = BODY.createChild("div", {
					id: "neko",
					innerHTML:
						"<div class=\"planet\"><div class=\"sun\"></div><div class=\"moon\"></div></div><div class=\"body\"><div class=\"face\"><section class=\"eyes left\"><span class=\"pupil\"></span></section><section class=\"eyes right\"><span class=\"pupil\"></span></section><span class=\"nose\"></span></div></div>"
				});

				const hideNeko = function() {
					// eslint-disable-next-line no-undef
					Fluid.utils.transition(neko, { delay: 2500, opacity: 0 }, function() {
						neko.remove();
						isAnimating = false;
					});
				};

				// neko 默认无 dark class（太阳+白天背景）
				let c;
				if (futureTheme === "dark") {
					// 要切换到深色模式：neko 从白天→黑夜
					c = function() {
						neko.addClass("dark");
						hideNeko();
					};
				} else {
					// 要切换到白天模式：neko 从黑夜→白天
					neko.addClass("dark"); // 先显示黑夜
					c = function() {
						neko.removeClass("dark"); // 再变回白天
						hideNeko();
					};
				}

				// eslint-disable-next-line no-undef
				Fluid.utils.transition(neko, 1, function() {
					setTimeout(c, 700);
				});
			}, true); // capture = true
		}
	});
})();
