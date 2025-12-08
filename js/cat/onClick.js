/**
 * @description:
 * @author: bubao
 * @date: 2021-01-24 21:21:11
 * @last author: bubao
 * @last edit time: 2021-01-28 12:19:28
 */

(function() {
	const rootElement = document.documentElement;
	const colorSchemaStorageKey = "Fluid_Color_Scheme";
	const colorSchemaMediaQueryKey = "--color-mode";
	const colorToggleButtonName = "color-toggle-btn";
	const colorToggleIconName = "color-toggle-icon";

	function getSchemaFromCSSMediaQuery() {
		const res = getComputedStyle(rootElement).getPropertyValue(
			colorSchemaMediaQueryKey
		);
		if (typeof res === "string") {
			return res.replace(/["'\s]/g, "");
		}
		return null;
	}
	const validColorSchemaKeys = {
		dark: true,
		light: true
	};
	function getLS(k) {
		try {
			return localStorage.getItem(k);
		} catch (e) {
			return null;
		}
	}
	const invertColorSchemaObj = {
		dark: "light",
		light: "dark"
	};
	function toggleCustomColorSchema() {
		let currentSetting = getLS(colorSchemaStorageKey);

		if (validColorSchemaKeys[currentSetting]) {
			// 从 localStorage 中读取模式，并取相反的模式
			currentSetting = invertColorSchemaObj[currentSetting];
		} else if (currentSetting === null) {
			// 当 localStorage 中没有相关值，或者 localStorage 抛了 Error
			// 先按照按钮的状态进行切换
			const iconElement = document.getElementById(colorToggleIconName);
			if (iconElement) {
				currentSetting = iconElement.getAttribute("data");
			}
			if (!iconElement || !validColorSchemaKeys[currentSetting]) {
				// 当 localStorage 中没有相关值，或者 localStorage 抛了 Error，则读取默认值并切换到相反的模式
				currentSetting = invertColorSchemaObj[getSchemaFromCSSMediaQuery()];
			}
		} else {
			return;
		}
		// 将相反的模式写入 localStorage

		return currentSetting;
	}

	// eslint-disable-next-line no-undef
	Fluid.utils.waitElementLoaded("#" + colorToggleButtonName, function() {
		const button = document.getElementById(colorToggleButtonName);
		if (button) {
			// 当用户点击切换按钮时，获得新的显示模式、写入 localStorage、并在页面上生效
			const BODY = document.getElementsByTagName("body")[0];
			button.addEventListener("click", () => {
				const current = toggleCustomColorSchema();
				const neko = BODY.createChild("div", {
					id: "neko",
					innerHTML:
            "<div class=\"planet\"><div class=\"sun\"></div><div class=\"moon\"></div></div><div class=\"body\"><div class=\"face\"><section class=\"eyes left\"><span class=\"pupil\"></span></section><section class=\"eyes right\"><span class=\"pupil\"></span></section><span class=\"nose\"></span></div></div>"
				});

				const hideNeko = function() {
				// eslint-disable-next-line no-undef
					Fluid.utils.transition(
						neko,
						{
							delay: 2500,
							opacity: 0
						},
						function() {
							BODY.removeChild(neko);
						}
					);
				};
				let c;
				if (current === "light") {
					c = function() {
						neko.addClass("dark");
						hideNeko();
					};
				} else {
					neko.addClass("dark");
					c = function() {
						neko.removeClass("dark");
						hideNeko();
					};
				}
				// eslint-disable-next-line no-undef
				Fluid.utils.transition(neko, 1, function() {
					setTimeout(c, 700);
				});
			});
		}
	});
})();
