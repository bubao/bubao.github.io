/**
 * @description: 顶部极光阅读进度条 + 猫爪足迹标尺
 * @author: bubao
 */
(function() {
	if (typeof window === "undefined") return;

	function initReadingProgress() {
		// 仅在文章页生效（存在 #board 或 .post-content）
		const contentEl = document.querySelector(".post-content") || document.getElementById("board");
		if (!contentEl) return;

		// 创建进度条容器
		const container = document.createElement("div");
		container.id = "reading-progress-container";
		container.innerHTML = `
			<div id="reading-progress-bar">
				<div id="reading-cat-paw">
					<svg viewBox="0 0 32 32" width="18" height="18" fill="#ffd166">
						<circle cx="16" cy="22" r="7"/>
						<circle cx="9" cy="12" r="3.2"/>
						<circle cx="16" cy="9" r="3.2"/>
						<circle cx="23" cy="12" r="3.2"/>
					</svg>
				</div>
			</div>
		`;
		document.body.appendChild(container);

		const bar = document.getElementById("reading-progress-bar");
		const paw = document.getElementById("reading-cat-paw");
		let isTicking = false;

		function updateProgress() {
			const rect = contentEl.getBoundingClientRect();
			const windowHeight = window.innerHeight;
			const totalHeight = contentEl.offsetHeight - windowHeight;

			if (totalHeight <= 0) {
				container.style.opacity = "0";
				return;
			}

			// 计算滚动距离相对于文章内容的百分比
			const currentProgress = -rect.top;
			let percent = (currentProgress / totalHeight) * 100;
			percent = Math.max(0, Math.min(100, percent));

			if (percent > 0) {
				container.style.opacity = "1";
				bar.style.width = percent.toFixed(1) + "%";

				if (percent >= 99) {
					paw.classList.add("completed");
				} else {
					paw.classList.remove("completed");
				}
			} else {
				container.style.opacity = "0";
			}

			isTicking = false;
		}

		window.addEventListener(
			"scroll",
			function() {
				if (!isTicking) {
					requestAnimationFrame(updateProgress);
					isTicking = true;
				}
			},
			{ passive: true }
		);

		updateProgress();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initReadingProgress);
	} else {
		initReadingProgress();
	}
})();
