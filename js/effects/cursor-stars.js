/**
 * @description: 鼠标光标流光星屑轨迹特效（Fairy Dust / Starlight Trail）
 * @author: bubao
 */
(function() {
	if (typeof window === "undefined") return;

	// 触摸设备无需光标粒子
	if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

	function initCursorStars() {
		const canvas = document.createElement("canvas");
		canvas.id = "cursor-stars-canvas";
		canvas.style.position = "fixed";
		canvas.style.top = "0";
		canvas.style.left = "0";
		canvas.style.width = "100vw";
		canvas.style.height = "100vh";
		canvas.style.pointerEvents = "none";
		canvas.style.zIndex = "999998";
		document.body.appendChild(canvas);

		const ctx = canvas.getContext("2d");
		let width, height;

		function resize() {
			width = canvas.width = window.innerWidth;
			height = canvas.height = window.innerHeight;
		}

		resize();
		window.addEventListener("resize", resize, { passive: true });

		const STAR_COLORS = ["#FFD166", "#06D6A0", "#118AB2", "#EF476F", "#F78FB3", "#70A1FF"];
		const particles = [];
		let animId = null;

		function createStar(x, y) {
			const size = Math.random() * 4 + 2;
			particles.push({
				x: x + (Math.random() - 0.5) * 8,
				y: y + (Math.random() - 0.5) * 8,
				size: size,
				maxLife: Math.random() * 25 + 20,
				life: 0,
				color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
				vx: (Math.random() - 0.5) * 1.5,
				vy: Math.random() * 1.2 + 0.4, // 轻微向下重力飘落
				rotation: Math.random() * Math.PI
			});
		}

		function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
			let rot = (Math.PI / 2) * 3;
			let x = cx;
			let y = cy;
			const step = Math.PI / spikes;

			ctx.beginPath();
			ctx.moveTo(cx, cy - outerRadius);
			for (let i = 0; i < spikes; i++) {
				x = cx + Math.cos(rot) * outerRadius;
				y = cy + Math.sin(rot) * outerRadius;
				ctx.lineTo(x, y);
				rot += step;

				x = cx + Math.cos(rot) * innerRadius;
				y = cy + Math.sin(rot) * innerRadius;
				ctx.lineTo(x, y);
				rot += step;
			}
			ctx.lineTo(cx, cy - outerRadius);
			ctx.closePath();
			ctx.fill();
		}

		function loop() {
			ctx.clearRect(0, 0, width, height);

			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i];
				p.life++;
				p.x += p.vx;
				p.y += p.vy;
				p.rotation += 0.05;

				const progress = p.life / p.maxLife;
				const alpha = 1 - progress;
				const currentRadius = p.size * (1 - progress * 0.3);

				ctx.save();
				ctx.fillStyle = p.color;
				ctx.globalAlpha = Math.max(0, alpha);
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rotation);

				// 绘制四角闪烁星芒
				drawStar(ctx, 0, 0, 4, currentRadius, currentRadius / 2.5);
				ctx.restore();

				if (p.life >= p.maxLife) {
					particles.splice(i, 1);
				}
			}

			if (particles.length > 0) {
				animId = requestAnimationFrame(loop);
			} else {
				animId = null;
			}
		}

		let lastX = 0;
		let lastY = 0;

		window.addEventListener(
			"mousemove",
			function(e) {
				const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
				// 只有位移达到阈值时才产生粒子，避免过度拥挤
				if (dist > 8) {
					createStar(e.clientX, e.clientY);
					if (Math.random() > 0.5) createStar(e.clientX, e.clientY);
					lastX = e.clientX;
					lastY = e.clientY;

					if (!animId) {
						animId = requestAnimationFrame(loop);
					}
				}
			},
			{ passive: true }
		);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initCursorStars);
	} else {
		initCursorStars();
	}
})();
