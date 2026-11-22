/* eslint-disable node/no-unsupported-features/node-builtins */
/**
 * @description: Mermaid 流程图全屏高清缩放灯箱与源码查看系统 (支持查看/复制DSL源码、全屏放大、滚轮缩放、鼠标拖拽平移与多模式画布底色)
 * @author: bubao
 */
(function() {
	"use strict";

	if (typeof window === "undefined") return;

	function decodeBase64Utf8(b64) {
		if (!b64) return "";
		try {
			const bytes = Uint8Array.from(atob(b64), function(c) { return c.charCodeAt(0); });
			return new TextDecoder().decode(bytes);
		} catch (e) {
			try {
				return decodeURIComponent(escape(atob(b64)));
			} catch (e2) {
				return atob(b64);
			}
		}
	}

	function escapeHtml(str) {
		return (str || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	// 1. 在 Mermaid 渲染前尽早备份原始文本
	function captureRawSource() {
		const rawCodes = document.querySelectorAll(".markdown-body code.mermaid");
		rawCodes.forEach(function(code) {
			if (!code.querySelector("svg") && code.textContent) {
				const raw = code.textContent.trim();
				code.dataset.mermaidRawText = raw;
				if (code.parentElement) {
					code.parentElement.dataset.mermaidRawText = raw;
				}
			}
		});
	}
	captureRawSource();
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", captureRawSource);
	}

	function getMermaidSource(container) {
		if (!container) return "";
		const b64 = container.dataset.mermaidCode || (container.querySelector("code.mermaid") && container.querySelector("code.mermaid").dataset.mermaidCode);
		if (b64) {
			const decoded = decodeBase64Utf8(b64);
			if (decoded && decoded.trim()) return decoded.trim();
		}
		if (container.dataset.mermaidRawText && container.dataset.mermaidRawText.trim()) {
			return container.dataset.mermaidRawText.trim();
		}
		const code = container.querySelector("code.mermaid");
		if (code && code.dataset.mermaidRawText && code.dataset.mermaidRawText.trim()) {
			return code.dataset.mermaidRawText.trim();
		}
		return "";
	}

	function copyToClipboard(text, btn) {
		function onSuccess() {
			const oldHtml = btn.innerHTML;
			btn.innerHTML = "<svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\"><polyline points=\"20 6 9 17 4 12\"></polyline></svg><span>已复制</span>";
			btn.classList.add("mermaid-copied");
			setTimeout(function() {
				btn.innerHTML = oldHtml;
				btn.classList.remove("mermaid-copied");
			}, 2000);
		}
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(text).then(onSuccess, fallback);
		} else {
			fallback();
		}
		function fallback() {
			const ta = document.createElement("textarea");
			ta.value = text;
			ta.style.position = "fixed";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.select();
			try {
				document.execCommand("copy");
				onSuccess();
			} catch (e) {}
			ta.remove();
		}
	}

	// 切换文章内图表的源码展示 / 图表展示
	function toggleInPageSource(container, sourceBtn) {
		const existingBox = container.querySelector(".mermaid-source-box");
		const svg = container.querySelector("svg");

		if (existingBox) {
			existingBox.remove();
			container.classList.remove("mermaid-showing-source");
			if (svg) svg.style.display = "";
			sourceBtn.innerHTML = "<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><polyline points=\"16 18 22 12 16 6\"></polyline><polyline points=\"8 6 2 12 8 18\"></polyline></svg><span>源码</span>";
			sourceBtn.title = "查看流程图源码";
			return;
		}

		const codeText = getMermaidSource(container);
		if (!codeText) {
			return;
		}

		container.classList.add("mermaid-showing-source");
		if (svg) svg.style.display = "none";

		const sourceBox = document.createElement("div");
		sourceBox.className = "mermaid-source-box";
		sourceBox.innerHTML = `
      <div class="mermaid-source-header">
        <div class="mermaid-source-tag">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          <span>Mermaid DSL 源码</span>
        </div>
        <button type="button" class="mermaid-copy-code-btn" title="一键复制源码">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>复制源码</span>
        </button>
      </div>
      <pre class="mermaid-source-pre"><code>${escapeHtml(codeText)}</code></pre>
    `;

		const copyBtn = sourceBox.querySelector(".mermaid-copy-code-btn");
		copyBtn.addEventListener("click", function(e) {
			e.stopPropagation();
			copyToClipboard(codeText, copyBtn);
		});

		sourceBtn.innerHTML = "<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"></circle><polyline points=\"21 15 16 10 5 21\"></polyline></svg><span>图表</span>";
		sourceBtn.title = "返回渲染图表视图";

		container.appendChild(sourceBox);
	}

	function initMermaidZoom() {
		const svgs = document.querySelectorAll(
			".markdown-body svg[id^=\"mermaid-\"], .markdown-body .mermaid > svg, .markdown-body pre code.mermaid > svg"
		);
		if (!svgs || svgs.length === 0) return;

		svgs.forEach(function(svg) {
			const container = svg.closest("pre") || svg.closest(".mermaid") || svg.parentElement;
			if (!container) return;

			// 彻底清理子级上被误加的容器类与多余按钮
			const childContainers = container.querySelectorAll(".mermaid-zoom-container");
			childContainers.forEach(function(el) {
				if (el !== container) {
					el.classList.remove("mermaid-zoom-container");
					delete el.dataset.mermaidZoomReady;
				}
			});
			container.querySelectorAll(".mermaid-zoom-btn, .mermaid-source-btn").forEach(function(el) {
				if (!el.closest(".mermaid-tools-bar")) el.remove();
			});

			const existingBars = container.querySelectorAll(".mermaid-tools-bar");
			if (existingBars.length > 1) {
				for (let i = 1; i < existingBars.length; i++) existingBars[i].remove();
			}

			if (container.dataset.mermaidZoomReady === "true" && existingBars.length === 1) {
				return;
			}

			container.dataset.mermaidZoomReady = "true";
			container.classList.add("mermaid-zoom-container");

			if (getComputedStyle(container).position === "static") {
				container.style.position = "relative";
			}

			// 注入顶层工具栏：【源码】与【全屏放大】
			if (container.querySelectorAll(".mermaid-tools-bar").length === 0) {
				const toolbar = document.createElement("div");
				toolbar.className = "mermaid-tools-bar";

				const sourceCode = getMermaidSource(container);
				if (sourceCode) {
					const sourceBtn = document.createElement("button");
					sourceBtn.type = "button";
					sourceBtn.className = "mermaid-tool-btn-item mermaid-source-btn";
					sourceBtn.title = "查看 / 复制流程图源码";
					sourceBtn.innerHTML = "<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><polyline points=\"16 18 22 12 16 6\"></polyline><polyline points=\"8 6 2 12 8 18\"></polyline></svg><span>源码</span>";
					sourceBtn.addEventListener("click", function(e) {
						e.preventDefault();
						e.stopPropagation();
						toggleInPageSource(container, sourceBtn);
					});
					toolbar.appendChild(sourceBtn);
				}

				const zoomBtn = document.createElement("button");
				zoomBtn.type = "button";
				zoomBtn.className = "mermaid-tool-btn-item mermaid-zoom-btn";
				zoomBtn.title = "全屏高清查看流程图 (点击放大)";
				zoomBtn.innerHTML = "<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" +
          "<polyline points=\"15 3 21 3 21 9\"></polyline>" +
          "<polyline points=\"9 21 3 21 3 15\"></polyline>" +
          "<line x1=\"21\" y1=\"3\" x2=\"14\" y2=\"10\"></line>" +
          "<line x1=\"3\" y1=\"21\" x2=\"10\" y2=\"14\"></line>" +
          "</svg><span>全屏放大</span>";

				zoomBtn.addEventListener("click", function(e) {
					e.preventDefault();
					e.stopPropagation();
					openMermaidModal(container);
				});
				toolbar.appendChild(zoomBtn);

				container.appendChild(toolbar);
			}

			// 点击图表区域也可直接放大（源码展示时不触发全屏放大）
			container.onclick = function(e) {
				if (container.classList.contains("mermaid-showing-source")) return;
				if (e.target.closest("a") || e.target.closest(".copy-btn") || e.target.closest(".mermaid-tools-bar")) {
					return;
				}
				openMermaidModal(container);
			};
		});
	}

	// 全屏高清查看灯箱
	function openMermaidModal(container) {
		if (document.querySelector(".mermaid-fullscreen-modal")) return;

		const sourceSvg = container.querySelector("svg");
		if (!sourceSvg) return;

		const svgClone = sourceSvg.cloneNode(true);
		svgClone.removeAttribute("width");
		svgClone.removeAttribute("height");
		svgClone.style.width = "100%";
		svgClone.style.height = "100%";
		svgClone.style.maxWidth = "none";
		svgClone.style.maxHeight = "none";
		svgClone.style.display = "block";

		const rawSourceCode = getMermaidSource(container);
		const isCurrentDark = document.documentElement.getAttribute("data-user-color-scheme") === "dark";
		const themes = ["mermaid-canvas-dark", "mermaid-canvas-slate", "mermaid-canvas-white"];
		let currentThemeIdx = isCurrentDark ? 0 : 2;
		const initialCanvasClass = themes[currentThemeIdx];

		const modal = document.createElement("div");
		modal.className = "mermaid-fullscreen-modal";
		modal.innerHTML = `
      <div class="mermaid-modal-backdrop"></div>
      <div class="mermaid-modal-header">
        <div class="mermaid-modal-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          <span>流程图全屏预览</span>
          <span class="mermaid-scale-badge" id="mermaid-scale-text">100%</span>
        </div>
        <div class="mermaid-modal-tools">
          ${rawSourceCode
		? `
          <button type="button" class="mermaid-tool-btn" id="m-code-toggle" title="查看 / 隐藏流程图源码 (C)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          </button>
          `
		: ""}
          <button type="button" class="mermaid-tool-btn" id="m-bg-toggle" title="切换画布底色 (暗黑 / 浅灰 / 白底)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
          <button type="button" class="mermaid-tool-btn" id="m-zoom-in" title="放大 (+)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
          <button type="button" class="mermaid-tool-btn" id="m-zoom-out" title="缩小 (-)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
          <button type="button" class="mermaid-tool-btn" id="m-zoom-reset" title="复位 (1:1)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
          </button>
          <button type="button" class="mermaid-tool-btn mermaid-close-btn" id="m-close" title="关闭 (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div class="mermaid-modal-body" id="mermaid-modal-viewport">
        <div class="mermaid-svg-wrapper ${initialCanvasClass}" id="mermaid-svg-canvas"></div>
        ${rawSourceCode
		? `
        <div class="mermaid-modal-source-drawer" id="m-source-drawer" style="display: none;">
          <div class="mermaid-drawer-header">
            <div class="mermaid-drawer-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              <span>Mermaid DSL 源代码</span>
            </div>
            <button type="button" class="mermaid-copy-code-btn" id="m-drawer-copy">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>复制源码</span>
            </button>
          </div>
          <pre class="mermaid-drawer-pre"><code>${escapeHtml(rawSourceCode)}</code></pre>
        </div>
        `
		: ""}
      </div>
      <div class="mermaid-modal-footer">
        <span>💡 支持鼠标滚轮缩放 · 拖拽平移画布 · 点击右上角切换白底/深色 · 按 C 查看源码 · 按 ESC 退出</span>
      </div>
    `;

		document.body.appendChild(modal);
		const canvas = modal.querySelector("#mermaid-svg-canvas");
		canvas.appendChild(svgClone);

		requestAnimationFrame(function() {
			modal.classList.add("mermaid-modal-active");
		});

		let scale = 1.0;
		let translateX = 0;
		let translateY = 0;
		let isDragging = false;
		let startX = 0;
		let startY = 0;

		const scaleText = modal.querySelector("#mermaid-scale-text");
		const viewport = modal.querySelector("#mermaid-modal-viewport");
		const sourceDrawer = modal.querySelector("#m-source-drawer");

		function updateTransform() {
			canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
			if (scaleText) scaleText.textContent = Math.round(scale * 100) + "%";
		}

		function setScale(newScale) {
			scale = Math.max(0.2, Math.min(6.0, newScale));
			updateTransform();
		}

		// 源码抽屉开关逻辑
		function toggleDrawer() {
			if (!sourceDrawer) return;
			const isVisible = sourceDrawer.style.display !== "none";
			sourceDrawer.style.display = isVisible ? "none" : "flex";
			const codeToggleBtn = modal.querySelector("#m-code-toggle");
			if (codeToggleBtn) {
				codeToggleBtn.classList.toggle("active", !isVisible);
			}
		}

		const codeToggleBtn = modal.querySelector("#m-code-toggle");
		if (codeToggleBtn) {
			codeToggleBtn.addEventListener("click", function(e) {
				e.stopPropagation();
				toggleDrawer();
			});
		}

		const drawerCopyBtn = modal.querySelector("#m-drawer-copy");
		if (drawerCopyBtn && rawSourceCode) {
			drawerCopyBtn.addEventListener("click", function(e) {
				e.stopPropagation();
				copyToClipboard(rawSourceCode, drawerCopyBtn);
			});
		}

		// 画布底色切换：支持在暗黑、浅灰、纯白三种底色之间自由循环切换
		const bgToggleBtn = modal.querySelector("#m-bg-toggle");
		if (bgToggleBtn) {
			bgToggleBtn.addEventListener("click", function(e) {
				e.stopPropagation();
				canvas.classList.remove(themes[currentThemeIdx]);
				currentThemeIdx = (currentThemeIdx + 1) % themes.length;
				canvas.classList.add(themes[currentThemeIdx]);
			});
		}

		modal.querySelector("#m-zoom-in").addEventListener("click", function(e) {
			e.stopPropagation();
			setScale(scale * 1.25);
		});
		modal.querySelector("#m-zoom-out").addEventListener("click", function(e) {
			e.stopPropagation();
			setScale(scale / 1.25);
		});
		modal.querySelector("#m-zoom-reset").addEventListener("click", function(e) {
			e.stopPropagation();
			scale = 1.0;
			translateX = 0;
			translateY = 0;
			updateTransform();
		});

		viewport.addEventListener("wheel", function(e) {
			if (e.target.closest("#m-source-drawer")) return;
			e.preventDefault();
			const delta = e.deltaY < 0 ? 1.15 : 0.87;
			setScale(scale * delta);
		}, { passive: false });

		viewport.addEventListener("mousedown", function(e) {
			if (e.button !== 0 || e.target.closest("#m-source-drawer")) return;
			isDragging = true;
			startX = e.clientX - translateX;
			startY = e.clientY - translateY;
			viewport.style.cursor = "grabbing";
		});

		window.addEventListener("mousemove", function onMouseMove(e) {
			if (!isDragging) return;
			translateX = e.clientX - startX;
			translateY = e.clientY - startY;
			updateTransform();
		});

		window.addEventListener("mouseup", function onMouseUp() {
			if (isDragging) {
				isDragging = false;
				viewport.style.cursor = "grab";
			}
		});

		function closeModal() {
			modal.classList.remove("mermaid-modal-active");
			setTimeout(function() {
				modal.remove();
			}, 250);
			document.removeEventListener("keydown", onKeyDown);
		}

		function onKeyDown(e) {
			if (e.key === "Escape") closeModal();
			if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey && !e.altKey) {
				toggleDrawer();
			}
		}
		document.addEventListener("keydown", onKeyDown);

		modal.querySelector("#m-close").addEventListener("click", function(e) {
			e.stopPropagation();
			closeModal();
		});
		modal.querySelector(".mermaid-modal-backdrop").addEventListener("click", closeModal);
	}

	// ==========================================
	// 主题联动系统：跟随深色 / 浅色模式无缝重绘 Mermaid
	// ==========================================
	let isThemeSwitching = false;
	function syncMermaidTheme(targetScheme) {
		if (typeof window === "undefined" || !window.mermaid || isThemeSwitching) return;
		isThemeSwitching = true;

		try {
			const isDark = targetScheme === "dark";
			const themeName = isDark ? "dark" : "default";

			window.mermaid.initialize({
				startOnLoad: false,
				theme: themeName,
				flowchart: { curve: "linear" }
			});

			const containers = document.querySelectorAll(".markdown-body pre.mermaid-raw-container, .markdown-body pre:has(.mermaid)");
			containers.forEach(function(container) {
				const codeText = getMermaidSource(container);
				if (!codeText) return;

				// 清理旧 SVG 与源码展开框
				const oldSvg = container.querySelector("svg");
				if (oldSvg) oldSvg.remove();
				const oldSourceBox = container.querySelector(".mermaid-source-box");
				if (oldSourceBox) oldSourceBox.remove();
				container.classList.remove("mermaid-showing-source");

				let codeEl = container.querySelector("code.mermaid");
				if (!codeEl) {
					codeEl = document.createElement("code");
					codeEl.className = "mermaid";
					container.appendChild(codeEl);
				}
				codeEl.removeAttribute("data-processed");
				codeEl.textContent = codeText;
			});

			// 重新解析渲染新主题
			const codes = document.querySelectorAll(".markdown-body code.mermaid");
			if (codes.length > 0) {
				window.mermaid.init(undefined, codes);
			}
		} catch (e) {
			console.warn("[Mermaid Theme Sync] 重绘异常:", e);
		} finally {
			setTimeout(function() {
				isThemeSwitching = false;
				initMermaidZoom();
			}, 200);
		}
	}

	function initThemeListener() {
		let currentScheme = document.documentElement.getAttribute("data-user-color-scheme") || "light";

		// 若初次打开页面即为深色模式，校准重绘一次官方 dark 主题
		if (currentScheme === "dark") {
			setTimeout(function() {
				syncMermaidTheme("dark");
			}, 200);
		}

		try {
			const themeObserver = new MutationObserver(function(mutations) {
				mutations.forEach(function(m) {
					if (m.type === "attributes" && m.attributeName === "data-user-color-scheme") {
						const newScheme = document.documentElement.getAttribute("data-user-color-scheme") || "light";
						if (newScheme !== currentScheme) {
							currentScheme = newScheme;
							syncMermaidTheme(newScheme);
						}
					}
				});
			});
			themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-user-color-scheme"] });
		} catch (e) {}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function() {
			initMermaidZoom();
			initThemeListener();
		});
	} else {
		initMermaidZoom();
		initThemeListener();
	}

	window.addEventListener("load", function() {
		setTimeout(initMermaidZoom, 300);
		setTimeout(initMermaidZoom, 1000);
		setTimeout(initMermaidZoom, 2500);
	});

	try {
		const observer = new MutationObserver(function(mutations) {
			const hasSvg = mutations.some(function(m) {
				return Array.prototype.some.call(m.addedNodes, function(node) {
					return node.nodeType === 1 && (node.tagName.toLowerCase() === "svg" || (node.querySelector && node.querySelector("svg")));
				});
			});
			if (hasSvg) {
				initMermaidZoom();
			}
		});

		const target = document.querySelector(".markdown-body") || document.body;
		if (target) {
			observer.observe(target, { childList: true, subtree: true });
		}
	} catch (e) {}

	if (window.Fluid && window.Fluid.events) {
		window.Fluid.events.registerRefreshCallback(function() {
			setTimeout(initMermaidZoom, 300);
		});
	}
})();
