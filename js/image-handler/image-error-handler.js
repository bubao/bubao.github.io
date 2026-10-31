/**
 * @description: 图片加载失败处理
 * 当 index_img 或 banner_img 加载失败时，使用 default_index_img 替换
 * @author: bubao
 */

(function() {
	/**
	 * 处理 img 标签加载失败
	 */
	function handleImageError(img) {
		if (!img || img.dataset.errorHandled) {
			return;
		}
		img.dataset.errorHandled = "true";

		// 默认图片（从主题配置读取，fallback 到 dalogo1.png）
		// eslint-disable-next-line no-undef
		const DEFAULT_FALLBACK_IMAGE = (CONFIG && CONFIG.post && CONFIG.post.default_index_img) || "https://fastly.jsdelivr.net/gh/bubao/picgo_db_tiny/logo/dalogo1.png";

		img.src = DEFAULT_FALLBACK_IMAGE;
		img.classList.add("img-fallback");
		img.onerror = null; // 防止循环
	}

	/**
	 * 处理背景图片加载失败（用于 banner_img）
	 */
	function handleBgImageError(element) {
		if (!element || element.dataset.bgErrorHandled) {
			return;
		}
		element.dataset.bgErrorHandled = "true";

		// eslint-disable-next-line no-undef
		const DEFAULT_FALLBACK_IMAGE = (CONFIG && CONFIG.post && CONFIG.post.default_index_img) || "https://fastly.jsdelivr.net/gh/bubao/picgo_db_tiny/logo/dalogo1.png";

		element.style.backgroundImage = "url('" + DEFAULT_FALLBACK_IMAGE + "')";
	}

	/**
	 * 检查并处理背景图片
	 */
	function checkBgImage(el) {
		const src = el.style.backgroundImage;
		const url = src.match(/\((.*?)\)/);
		if (url) {
			const img = new Image();
			img.onerror = function() {
				handleBgImageError(el);
			};
			img.src = url[1].replace(/(['"])/g, "");
		}
	}

	// 注册全局 img error 事件委托（捕获阶段）
	document.addEventListener("error", function(event) {
		const target = event.target;
		if (target && target.tagName === "IMG") {
			handleImageError(target);
		}
	}, true);

	// 处理已存在的 img 标签
	const imgs = document.querySelectorAll("img");
	imgs.forEach(function(img) {
		if (img.complete && img.naturalWidth === 0) {
			handleImageError(img);
		}
	});

	// 处理背景图片（banner 等）
	const bgElements = document.querySelectorAll("#banner[style*='background-image']");
	bgElements.forEach(checkBgImage);
})();
