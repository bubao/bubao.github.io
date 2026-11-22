/**
 * @description: 前端核心库现代大版本向下兼容垫片 (Mermaid 11+, Anime.js 4+, AnchorJS 5+)
 * 抹平新旧 API 差异，确保主题 (Fluid) 及站内既有插件零改动正常运行
 * @author: bubao
 */
(function() {
	"use strict";

	if (typeof window === "undefined") return;

	/**
	 * 1. Anime.js v4 兼容适配器
	 * 将旧版 anime({ targets, duration, easing, ... }) 自动桥接至 v4 的 animate(targets, params)
	 */
	function adaptAnime() {
		if (!window.anime) return;
		const v4 = window.anime;

		// 若已适配或本身即可直接调用函数，跳过
		if (typeof v4 === "function" && v4.__adapted) return;

		if (typeof v4.animate === "function") {
			const legacyAnime = function(options) {
				if (!options) return null;
				const targets = options.targets;
				const params = Object.assign({}, options);
				delete params.targets;
				try {
					return v4.animate(targets, params);
				} catch (e) {
					console.warn("[lib-adapters] anime invocation fallback:", e);
					return null;
				}
			};

			// 继承所有静态工具函数与属性
			Object.assign(legacyAnime, v4);
			legacyAnime.__adapted = true;
			legacyAnime.v4 = v4;
			window.anime = legacyAnime;
		}
	}

	/**
	 * 2. Mermaid v11+ 兼容适配器
	 * 抹平废弃的 mermaid.init()，自动重定向至现代异步 mermaid.run()
	 */
	function adaptMermaid() {
		if (!window.mermaid) return;
		const m = window.mermaid;
		if (m.__adapted) return;

		const originalInit = m.init;
		m.init = function(options, nodes) {
			if (typeof originalInit === "function") {
				try {
					return originalInit.apply(this, arguments);
				} catch (err) {
					// 静默重定向至现代 run API
					if (typeof m.run === "function") {
						return m.run({
							querySelector: typeof nodes === "string" ? nodes : ".mermaid",
							nodes: Array.isArray(nodes) ? nodes : (nodes instanceof HTMLElement ? [nodes] : undefined)
						});
					}
				}
			} else if (typeof m.run === "function") {
				return m.run({
					querySelector: typeof nodes === "string" ? nodes : ".mermaid",
					nodes: Array.isArray(nodes) ? nodes : (nodes instanceof HTMLElement ? [nodes] : undefined)
				});
			}
		};
		m.__adapted = true;
	}

	/**
	 * 3. AnchorJS v5 兼容适配器
	 * 保证 window.anchors 实例常驻且安全
	 */
	function adaptAnchors() {
		if (!window.anchors && window.AnchorJS) {
			window.anchors = new window.AnchorJS();
		}
	}

	// 立即执行初步适配
	adaptAnime();
	adaptMermaid();
	adaptAnchors();

	// 监听后续动态加载或 DOMReady 阶段的延迟挂载
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function() {
			adaptAnime();
			adaptMermaid();
			adaptAnchors();
		});
	}

	// 为通过 Fluid.utils.createScript 动态注入的脚本提供自动重检机制
	const checkInterval = setInterval(function() {
		adaptAnime();
		adaptMermaid();
		adaptAnchors();
	}, 150);

	setTimeout(function() {
		clearInterval(checkInterval);
	}, 4000);
})();
