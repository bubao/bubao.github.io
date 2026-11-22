/**
 * @description: 文章卡片 3D 悬浮微透视动效（Card 3D Tilt）
 * @author: bubao
 */
(function() {
	if (typeof window === "undefined") return;

	// 触摸屏设备无需 3D 视差
	if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

	function initTilt() {
		const cards = document.querySelectorAll(".index-card");
		if (!cards.length) return;

		cards.forEach(function(card) {
			if (card.dataset.tiltInitialized) return;
			card.dataset.tiltInitialized = "true";

			card.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s ease";
			card.style.transformStyle = "preserve-3d";

			let isHovered = false;

			card.addEventListener("mouseenter", function() {
				isHovered = true;
			});

			card.addEventListener("mousemove", function(e) {
				if (!isHovered) return;
				const rect = card.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				const centerX = rect.width / 2;
				const centerY = rect.height / 2;

				// 倾斜幅度限制在 5 度以内，优雅克制
				const rotateX = ((centerY - y) / centerY) * 4;
				const rotateY = ((x - centerX) / centerX) * 4;

				card.style.transform =
					"perspective(1000px) rotateX(" +
					rotateX.toFixed(2) +
					"deg) rotateY(" +
					rotateY.toFixed(2) +
					"deg) scale3d(1.015, 1.015, 1.015)";
			});

			card.addEventListener("mouseleave", function() {
				isHovered = false;
				card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
			});
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initTilt);
	} else {
		initTilt();
	}
})();
