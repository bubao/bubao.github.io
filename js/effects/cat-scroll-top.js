/**
 * @description: “瓦猫”火箭升空回到顶部动效
 * @author: bubao
 */
(function() {
	if (typeof window === "undefined") return;

	function initCatScroll() {
		const btn = document.getElementById("scroll-top-button");
		if (!btn) return;

		// 注入瓦猫火箭样式结构
		btn.classList.add("cat-rocket-btn");
		btn.setAttribute("title", "瓦猫火箭，发射回顶！");

		// 替换默认箭头图标为精致猫咪火箭 SVG 图标
		btn.innerHTML = `
			<div class="cat-rocket-inner">
				<svg class="cat-rocket-svg" viewBox="0 0 64 64" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
					<!-- 火箭身躯 -->
					<path d="M32 6 C20 18 18 36 20 48 L44 48 C46 36 44 18 32 6 Z" fill="#fff" stroke="#2f4154" stroke-width="2.5" stroke-linejoin="round"/>
					<!-- 舷窗与小猫探头 -->
					<circle cx="32" cy="28" r="9" fill="#ffd166" stroke="#2f4154" stroke-width="2"/>
					<!-- 猫耳 -->
					<path d="M25 22 L27 17 L30 21 Z" fill="#2f4154"/>
					<path d="M39 22 L37 17 L34 21 Z" fill="#2f4154"/>
					<!-- 猫咪闭眼微笑 -->
					<path d="M28 27 Q30 29 32 27" stroke="#2f4154" stroke-width="1.5" stroke-linecap="round"/>
					<path d="M32 27 Q34 29 36 27" stroke="#2f4154" stroke-width="1.5" stroke-linecap="round"/>
					<!-- 火箭尾翼 -->
					<path d="M19 40 L10 49 L20 48 Z" fill="#ff7675" stroke="#2f4154" stroke-width="2"/>
					<path d="M45 40 L54 49 L44 48 Z" fill="#ff7675" stroke="#2f4154" stroke-width="2"/>
					<!-- 喷气火焰 -->
					<path class="rocket-flame" d="M26 49 Q32 62 38 49 Z" fill="#ff9f43"/>
					<path class="rocket-flame-inner" d="M28 49 Q32 57 36 49 Z" fill="#fff200"/>
				</svg>
			</div>
		`;

		let isLaunching = false;

		btn.addEventListener("click", function(e) {
			if (isLaunching) return;
			isLaunching = true;

			btn.classList.add("launching");

			// 平滑回滚至顶部
			window.scrollTo({
				top: 0,
				behavior: "smooth"
			});

			setTimeout(function() {
				btn.classList.remove("launching");
				isLaunching = false;
			}, 1000);
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initCatScroll);
	} else {
		initCatScroll();
	}
})();
