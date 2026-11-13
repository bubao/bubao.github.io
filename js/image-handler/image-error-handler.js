/* global CONFIG */

/**
 * @description: 图片动态加载器
 * 状态机：未渲染 -> 毛玻璃 + 流光动效；渲染完成 -> 渐进去毛玻璃；渲染失败 -> 默认图兜底
 * @author: bubao
 */

(function() {
	"use strict";

	const DEFAULT_FALLBACK_URL = "/img/default.png";

	// Fluid 懒加载占位图（与 CONFIG.lazyload.loading_img 保持一致）
	const LOADING_IMG = (function() {
		if (window.CONFIG && CONFIG.lazyload && CONFIG.lazyload.loading_img) {
			return CONFIG.lazyload.loading_img;
		}
		return "/img/loading.gif";
	})();

	function normalizeUrl(url) {
		if (!url) return "";
		if (isDataUri(url)) return url;
		try {
			const anchor = document.createElement("a");
			anchor.href = url;
			return anchor.href;
		} catch (err) {
			return url;
		}
	}

	const LOADING_IMG_HREF = normalizeUrl(LOADING_IMG);
	const DEFAULT_FALLBACK_HREF = normalizeUrl(DEFAULT_FALLBACK_URL);

	function isDataUri(url) {
		return !!url && (url.indexOf("data:") === 0 || url.indexOf("blob:") === 0);
	}

	// 当前 source 是否仍是占位图（真实图片尚未请求/渲染）
	function isPlaceholderSrc(url) {
		if (!url) return true;
		if (isDataUri(url)) return true;
		const normalized = normalizeUrl(url);
		return normalized === LOADING_IMG_HREF || /\/loading\.gif$/.test(normalized);
	}

	// 是否处于 Fluid 懒加载占位阶段（srcset 为 loading 图，真实地址在 src）
	function isLazyPhase(img) {
		return !!(img && img.hasAttribute && img.hasAttribute("lazyload"));
	}

	// 参与毛玻璃占位的图片：内容大图（首页封面/正文图等）或宽度 ≥64px 的自定义图片；
	// 小头像等尺寸敏感的小图不参与，避免占位样式撑坏布局
	function isEffectTarget(img) {
		if (!img) return false;
		if (img.matches && img.matches(".index-img img, .markdown-body img, .post-entry img")) {
			return true;
		}
		return img.offsetWidth >= 64;
	}

	// 真实图片是否已经渲染出来
	function isRealImageReady(img) {
		if (!img || !isEffectTarget(img) || img.dataset.errorHandled) return false;
		if (isLazyPhase(img)) return false;
		const currentSrc = img.currentSrc || img.getAttribute("src") || img.src || "";
		if (!currentSrc || isPlaceholderSrc(currentSrc)) return false;
		return img.complete && img.naturalWidth > 0;
	}

	function isUserCustomImage(url) {
		if (!url || isDataUri(url)) return false;
		return normalizeUrl(url) !== DEFAULT_FALLBACK_HREF;
	}

	// 未渲染：毛玻璃 + 光效动效
	function applyLoadingState(img) {
		img.classList.add("img-loading-shimmer");
		img.classList.remove("img-loaded-done");
	}

	// 渲染完成：去除毛玻璃
	function applyLoadedState(img) {
		img.classList.remove("img-loading-shimmer");
		img.classList.add("img-loaded-done");
	}

	// 渲染失败：默认图兜底
	function handleImageError(img) {
		if (!img || img.dataset.errorHandled) return;
		// 占位图自身的失败不代表真实图片失败，交给真实加载阶段的判定
		if (isLazyPhase(img)) return;
		// 有内联 onerror 自定义兜底的图片不接管
		if (img.hasAttribute && img.hasAttribute("onerror")) return;

		const originalSrc = img.getAttribute("src") || img.src || "";
		if (!isUserCustomImage(originalSrc)) return;

		img.dataset.errorHandled = "true";

		// 移除懒加载占位属性，确保兜底图立即生效
		if (img.hasAttribute("lazyload")) img.removeAttribute("lazyload");
		if (img.hasAttribute("srcset")) img.removeAttribute("srcset");

		img.classList.remove("img-loading-shimmer");
		img.classList.add("img-fallback");
		img.style.opacity = "0.6";
		img.src = DEFAULT_FALLBACK_URL;
		setTimeout(function() {
			img.style.opacity = "";
		}, 250);
	}

	function evaluateImageState(img) {
		if (!img || img.dataset.errorHandled) return;
		// 小头像等尺寸敏感图不参与占位/去模糊状态切换
		if (!isEffectTarget(img)) return;

		// 早期已彻底加载失败（complete 但宽度为 0）的图，直接兜底
		if (!isLazyPhase(img) && img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
			handleImageError(img);
			return;
		}

		// 已渲染完成后不再回退占位态
		if (img.dataset.rendered) return;

		if (isRealImageReady(img)) {
			img.dataset.rendered = "true";
			applyLoadedState(img);
		} else {
			applyLoadingState(img);
		}
	}

	function bindImageEffect(img) {
		if (!img || !isEffectTarget(img) || img.dataset.effectBound) return;
		img.dataset.effectBound = "true";
		img.addEventListener("load", function() {
			evaluateImageState(img);
		});
		img.addEventListener("error", function() {
			handleImageError(img);
		});
	}

	function setupImageEffect(img) {
		bindImageEffect(img);
		evaluateImageState(img);
	}

	function scheduleEvaluate(img) {
		if (!img || !isEffectTarget(img)) return;
		bindImageEffect(img);
		if (img._evalTimer) return;
		img._evalTimer = setTimeout(function() {
			img._evalTimer = null;
			evaluateImageState(img);
		}, 30);
	}

	function handleBgImageError(element) {
		if (!element || element.dataset.bgErrorHandled) return;
		element.dataset.bgErrorHandled = "true";
		element.style.backgroundImage = "url(\"" + DEFAULT_FALLBACK_URL + "\")";
		element.classList.add("banner-fallback");
	}

	function checkBgImage(el) {
		if (!el) return;
		const style = window.getComputedStyle(el);
		const bg = el.style.backgroundImage || style.backgroundImage;
		if (!bg || bg === "none") return;

		const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
		if (!match || !match[1]) return;

		const rawUrl = match[1].trim();
		if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.includes("gradient") || rawUrl.includes(DEFAULT_FALLBACK_URL)) {
			return;
		}

		const tester = new Image();
		tester.onerror = function() {
			handleBgImageError(el);
		};
		tester.src = rawUrl;
	}

	function scanAllImages() {
		// 监听全部图片（小头像等尺寸敏感图由 isEffectTarget 过滤掉）
		document.querySelectorAll("img").forEach(setupImageEffect);

		const banners = document.querySelectorAll("#banner, .header-inner, .banner");
		banners.forEach(checkBgImage);
	}

	function init() {
		document.addEventListener(
			"error",
			function(event) {
				const target = event.target;
				if (target && target.tagName === "IMG") {
					handleImageError(target);
				}
			},
			true
		);

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", scanAllImages);
		} else {
			scanAllImages();
		}

		// 监听属性变化（捕捉 Fluid lazyload 从 srcset 占位图切换到真实 src 的时刻）
		if (typeof MutationObserver !== "undefined") {
			const observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.type === "attributes") {
						const target = mutation.target;
						if (target && target.tagName === "IMG") {
							scheduleEvaluate(target);
						}
					} else if (mutation.addedNodes && mutation.addedNodes.length > 0) {
						mutation.addedNodes.forEach(function(node) {
							if (node.nodeType === 1) {
								if (node.tagName === "IMG") {
									setupImageEffect(node);
								} else if (node.querySelectorAll) {
									node.querySelectorAll("img").forEach(setupImageEffect);
								}
							}
						});
					}
				});
			});
			observer.observe(document.body || document.documentElement, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["src", "srcset", "lazyload"]
			});
		}

		setTimeout(scanAllImages, 500);
		setTimeout(scanAllImages, 1500);
	}

	init();
})();
