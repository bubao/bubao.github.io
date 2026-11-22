/**
 * @description: 鼠标点击极光粒子炸裂特效（基于 Anime.js）
 * @author: bubao
 */
(function() {
	if (typeof window === "undefined") return;

	// 颜色调色盘（极光与马卡龙霓虹色系）
	const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#6C5CE7", "#00CEC9", "#FF7675", "#74B9FF", "#A29BFE"];

	function init() {
		const anime = window.anime;
		if (!anime) {
			setTimeout(init, 100);
			return;
		}

		const canvas = document.createElement("canvas");
		canvas.id = "click-particles-canvas";
		canvas.style.position = "fixed";
		canvas.style.top = "0";
		canvas.style.left = "0";
		canvas.style.width = "100vw";
		canvas.style.height = "100vh";
		canvas.style.pointerEvents = "none";
		canvas.style.zIndex = "999999";
		document.body.appendChild(canvas);

		const ctx = canvas.getContext("2d");
		const numberOfParticules = 24;

		function setCanvasSize() {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}

		setCanvasSize();
		window.addEventListener("resize", setCanvasSize, { passive: true });

		function createCircle(x, y) {
			const p = {};
			p.x = x;
			p.y = y;
			p.color = "#FFF";
			p.radius = 0.1;
			p.alpha = 0.5;
			p.lineWidth = 6;
			p.draw = function() {
				ctx.globalAlpha = p.alpha;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI, true);
				ctx.lineWidth = p.lineWidth;
				ctx.strokeStyle = p.color;
				ctx.stroke();
				ctx.globalAlpha = 1;
			};
			return p;
		}

		function setParticuleDirection(p) {
			const angle = (anime.random(0, 360) * Math.PI) / 180;
			const value = anime.random(40, 140);
			const radius = [-1, 1][anime.random(0, 1)] * value;
			return {
				x: p.x + radius * Math.cos(angle),
				y: p.y + radius * Math.sin(angle)
			};
		}

		function createParticule(x, y) {
			const p = {};
			p.x = x;
			p.y = y;
			p.color = COLORS[anime.random(0, COLORS.length - 1)];
			p.radius = anime.random(8, 16);
			p.endPos = setParticuleDirection(p);
			p.draw = function() {
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI, true);
				ctx.fillStyle = p.color;
				ctx.fill();
			};
			return p;
		}

		function renderParticule(anim) {
			for (let i = 0; i < anim.animatables.length; i++) {
				anim.animatables[i].target.draw();
			}
		}

		function animateParticules(x, y) {
			const circle = createCircle(x, y);
			const particules = [];
			for (let i = 0; i < numberOfParticules; i++) {
				particules.push(createParticule(x, y));
			}

			anime
				.timeline()
				.add({
					targets: particules,
					x: function(p) {
						return p.endPos.x;
					},
					y: function(p) {
						return p.endPos.y;
					},
					radius: 0.1,
					duration: anime.random(800, 1400),
					easing: "easeOutExpo",
					update: renderParticule
				})
				.add(
					{
						targets: circle,
						radius: anime.random(50, 90),
						lineWidth: 0,
						alpha: {
							value: 0,
							easing: "linear",
							duration: anime.random(500, 700)
						},
						duration: anime.random(900, 1300),
						easing: "easeOutExpo",
						update: renderParticule
					},
					0
				);
		}

		anime({
			duration: Infinity,
			update: function() {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
		});

		document.addEventListener(
			"pointerdown",
			function(e) {
				if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
				animateParticules(e.clientX, e.clientY);
			},
			false
		);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
