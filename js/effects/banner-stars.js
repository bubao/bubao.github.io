/**
 * @description: 首屏深空流星雨与星辰粒子动效（只在 Banner 处于视口时渲染）
 * @author: bubao
 */
(function() {
	if (typeof window === "undefined") return;

	function init() {
		const banner = document.getElementById("banner");
		if (!banner) return;

		const canvas = document.createElement("canvas");
		canvas.id = "banner-stars-canvas";
		canvas.style.position = "absolute";
		canvas.style.top = "0";
		canvas.style.left = "0";
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		canvas.style.pointerEvents = "none";
		canvas.style.zIndex = "1";
		banner.insertBefore(canvas, banner.firstChild);

		const ctx = canvas.getContext("2d");
		let width, height;
		let isVisible = true;
		let animId = null;

		function resize() {
			width = canvas.width = banner.offsetWidth;
			height = canvas.height = banner.offsetHeight;
		}

		resize();
		window.addEventListener("resize", resize, { passive: true });

		// 1. 初始化繁星点点
		const STAR_COUNT = 60;
		const stars = [];
		for (let i = 0; i < STAR_COUNT; i++) {
			stars.push({
				x: Math.random() * width,
				y: Math.random() * height,
				radius: Math.random() * 1.5 + 0.5,
				alpha: Math.random(),
				speed: Math.random() * 0.02 + 0.005,
				increasing: Math.random() > 0.5
			});
		}

		// 2. 初始化流星
		const meteors = [];

		function spawnMeteor() {
			if (meteors.length < 2 && Math.random() < 0.015) {
				meteors.push({
					x: Math.random() * width + 100,
					y: Math.random() * (height * 0.4),
					length: Math.random() * 80 + 50,
					speed: Math.random() * 6 + 4,
					angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
					alpha: 1
				});
			}
		}

		function draw() {
			if (!isVisible) return;

			ctx.clearRect(0, 0, width, height);

			// 绘制星辰闪烁
			stars.forEach(function(star) {
				if (star.increasing) {
					star.alpha += star.speed;
					if (star.alpha >= 1) star.increasing = false;
				} else {
					star.alpha -= star.speed;
					if (star.alpha <= 0.2) star.increasing = true;
				}

				ctx.beginPath();
				ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(255, 255, 255, " + star.alpha.toFixed(2) + ")";
				ctx.shadowBlur = star.radius * 2;
				ctx.shadowColor = "#fff";
				ctx.fill();
			});

			// 生成与绘制流星
			spawnMeteor();

			for (let i = meteors.length - 1; i >= 0; i--) {
				const m = meteors[i];
				const endX = m.x - Math.cos(m.angle) * m.length;
				const endY = m.y - Math.sin(m.angle) * m.length;

				const grad = ctx.createLinearGradient(m.x, m.y, endX, endY);
				grad.addColorStop(0, "rgba(255, 255, 255, " + m.alpha + ")");
				grad.addColorStop(0.3, "rgba(255, 230, 150, " + (m.alpha * 0.6) + ")");
				grad.addColorStop(1, "rgba(255, 255, 255, 0)");

				ctx.beginPath();
				ctx.moveTo(m.x, m.y);
				ctx.lineTo(endX, endY);
				ctx.strokeStyle = grad;
				ctx.lineWidth = 1.8;
				ctx.stroke();

				m.x += Math.cos(m.angle) * m.speed;
				m.y += Math.sin(m.angle) * m.speed;
				m.alpha -= 0.012;

				if (m.alpha <= 0 || m.x < -100 || m.y > height + 100) {
					meteors.splice(i, 1);
				}
			}

			animId = requestAnimationFrame(draw);
		}

		// 视口检测优化：滑离顶部时暂停渲染，彻底省电
		if ("IntersectionObserver" in window) {
			const observer = new IntersectionObserver(
				function(entries) {
					entries.forEach(function(entry) {
						if (entry.isIntersecting) {
							isVisible = true;
							if (!animId) animId = requestAnimationFrame(draw);
						} else {
							isVisible = false;
							if (animId) {
								cancelAnimationFrame(animId);
								animId = null;
							}
						}
					});
				},
				{ threshold: 0.05 }
			);
			observer.observe(banner);
		} else {
			animId = requestAnimationFrame(draw);
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
