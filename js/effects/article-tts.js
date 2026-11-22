/**
 * @description: 文章播客化语音伴读器 (高保真句级高亮、随身悬浮播放器、跨标签页防中断自动恢复)
 * @author: bubao
 */
(function() {
	if (typeof window === "undefined") return;

	function initArticleTTS() {
		if (!("speechSynthesis" in window)) return;

		const contentEl =
			document.querySelector(".post-content .markdown-body") ||
			document.querySelector(".markdown-body");
		if (!contentEl) return;
		if (document.getElementById("article-tts-bar") || contentEl.querySelector(".tts-sentence-node")) return;

		// 0. 跨标签页防中断隔离机制 (解决多 Tab 刷新互相掐断语音的核心 Bug)
		const tabSessionId = "tts_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
		const STORAGE_KEY_ACTIVE = "blog_tts_active_tab";

		function isCurrentTabActiveSpeaker() {
			try {
				return localStorage.getItem(STORAGE_KEY_ACTIVE) === tabSessionId;
			} catch (e) {
				return isPlaying;
			}
		}

		let broadcast = null;
		if (typeof BroadcastChannel !== "undefined") {
			try {
				broadcast = new BroadcastChannel("blog_tts_channel");
				broadcast.onmessage = function(event) {
					const data = event.data;
					if (!data) return;
					// 其它标签页主动发起了播放，本标签页静默让出播放权并重置 UI，不产生多音混杂
					if (data.type === "PLAY_STARTED" && data.tabId !== tabSessionId) {
						clearRetryTimer();
						if (isPlaying) {
							setUIState("stopped");
						}
					}
				};
			} catch (e) {}
		}

		window.addEventListener("storage", function(e) {
			if (e.key === STORAGE_KEY_ACTIVE && e.newValue && e.newValue !== tabSessionId) {
				clearRetryTimer();
				if (isPlaying) {
					setUIState("stopped");
				}
			}
		});

		// 1. 递归提取并按完整语义“句子”颗粒度切分，智能融合行内格式与公式，保护代码块与排版
		const sentenceList = [];
		let sentenceCount = 0;

		function isSpeakable(text) {
			if (!text) return false;
			// 必须包含中文汉字、英文字母或阿拉伯数字，杜绝纯标点符号/空白导致底层语音引擎挂死
			return /[一-龥a-zA-Z0-9]/.test(text);
		}

		function cleanSentence(text) {
			return text
				.replace(/https?:\/\/[^\s]+/g, "")
				.replace(/[#*`_~>[\]]/g, "")
				.replace(/\\text\{([^}]+)\}/g, "$1")
				.replace(/\\[a-zA-Z]+/g, " ")
				.replace(/[{}]/g, "")
				.replace(/\s+/g, " ")
				.trim();
		}

		function getNodeReadableText(node) {
			if (!node) return "";
			if (node.nodeType === 3) return node.nodeValue;
			if (node.nodeType === 1) {
				if (shouldExclude(node)) return "";
				// 针对含有 KaTeX 的行内节点，克隆并剔除 MathML 隐藏副树与 display 公式块，提取纯净、自然的可视排版文本
				const clone = node.cloneNode(true);
				clone.querySelectorAll(".katex-mathml, .katex-display, script, style").forEach(function(el) {
					el.remove();
				});
				return clone.innerText || clone.textContent || "";
			}
			return "";
		}

		const validBlockTags = ["P", "BLOCKQUOTE", "LI", "H1", "H2", "H3", "H4", "H5", "H6"];
		const excludeClassList = [
			"highlight", "hljs", "gutter", "mermaid", "katex-display",
			"toc", "post-toc", "license", "copyright", "article-tts-bar"
		];

		function shouldExclude(node) {
			if (!node || node.nodeType !== 1) return false;
			const tag = node.tagName.toUpperCase();
			if (tag === "PRE" || tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return true;
			for (let i = 0; i < excludeClassList.length; i++) {
				if (node.classList && node.classList.contains(excludeClassList[i])) return true;
			}
			return false;
		}

		const DELIM_REGEX = /([。！？!?；;\n]+[”’"')）\]]*\s*)/;

		function processBlockNode(block) {
			if (shouldExclude(block)) return;

			// 收集直接归属于本块级的行内子流（遇到嵌套的块级如 li 内的 p 则跳过，交由该子块独立处理，不丢漏行内正文）
			const inlineChildren = Array.from(block.childNodes).filter(function(ch) {
				if (ch.nodeType === 1 && validBlockTags.indexOf(ch.tagName) !== -1) return false;
				return true;
			});

			// 拆分当前行内子节点流中直接包含断句符号的 TextNode
			inlineChildren.forEach(function(ch) {
				if (ch.nodeType === 3) {
					let match;
					let currentOffset = 0;
					while ((match = DELIM_REGEX.exec(ch.nodeValue.substring(currentOffset)))) {
						const splitIndex = currentOffset + match.index + match[0].length;
						if (splitIndex < ch.nodeValue.length) {
							ch = ch.splitText(splitIndex);
							currentOffset = 0;
						} else {
							break;
						}
					}
				}
			});

			// 拆分后重新获取平铺的最新行内子节点
			const currentInline = Array.from(block.childNodes).filter(function(ch) {
				if (ch.nodeType === 1 && validBlockTags.indexOf(ch.tagName) !== -1) return false;
				return true;
			});

			let currentGroup = [];
			currentInline.forEach(function(ch, idx) {
				// 遇到 display 块级公式或需排除节点时，提前结算当前积累的句子
				if (ch.nodeType === 1 && shouldExclude(ch)) {
					if (currentGroup.length > 0) {
						commitSentenceGroup(block, currentGroup);
						currentGroup = [];
					}
					return;
				}

				currentGroup.push(ch);
				const isLast = (idx === currentInline.length - 1);
				let endsSentence = false;
				if (ch.nodeType === 3) {
					endsSentence = DELIM_REGEX.test(ch.nodeValue);
				} else if (ch.nodeType === 1) {
					endsSentence = DELIM_REGEX.test(ch.textContent.trim());
				}

				if (endsSentence || isLast) {
					commitSentenceGroup(block, currentGroup);
					currentGroup = [];
				}
			});
		}

		function commitSentenceGroup(block, groupNodes) {
			if (!groupNodes || groupNodes.length === 0) return;
			const rawText = groupNodes.map(function(n) { return getNodeReadableText(n); }).join("");
			const cleaned = cleanSentence(rawText);
			if (!isSpeakable(cleaned)) return;

			const span = document.createElement("span");
			span.className = "tts-sentence-node";
			span.setAttribute("data-s-idx", sentenceCount);

			const firstNode = groupNodes[0];
			block.insertBefore(span, firstNode);
			groupNodes.forEach(function(n) {
				span.appendChild(n);
			});

			sentenceList.push({
				index: sentenceCount++,
				text: cleaned,
				element: span
			});
		}

		// 顺序处理正文所有合法块级元素，支持含公式行内文字与嵌套 p 并存且互不冲突
		const allBlocks = Array.from(contentEl.querySelectorAll(validBlockTags.join(",")));
		allBlocks.forEach(function(block) {
			processBlockNode(block);
		});

		window.__ttsSentenceList = sentenceList;

		if (sentenceList.length === 0) return;

		// 2. 音色筛选与规范化分组 (精确对齐：Google 普通话/粤语/台湾国语 与 系统 普通话(婷婷)/粤语/台湾国语)
		let availableVoices = [];
		let selectedVoice = null;
		const SAVED_VOICE_KEY = "blog_tts_preferred_voice_name";

		function getVoiceCategory(v) {
			const name = (v.name || "").toLowerCase();
			const lang = (v.lang || "").toLowerCase();
			const isGoogle = name.includes("google");

			// Google 语音库
			if (isGoogle) {
				if (lang.includes("hk") || name.includes("粤") || name.includes("cantonese")) {
					return { source: "google", type: "cantonese", rank: 2 };
				}
				if (lang.includes("tw") || name.includes("台") || name.includes("國語") || name.includes("国语")) {
					return { source: "google", type: "taiwan", rank: 3 };
				}
				if (lang.startsWith("zh") || lang.startsWith("cmn")) {
					return { source: "google", type: "mandarin", rank: 1 };
				}
			}

			// 系统原生语音库
			if (name.includes("婷婷")) {
				return { source: "system", type: "tingting", rank: 10 };
			}
			if (lang.includes("hk") || name.includes("粤") || name.includes("cantonese") || name.includes("sin-ji")) {
				return { source: "system", type: "cantonese", rank: 12 };
			}
			if (lang.includes("tw") || name.includes("taiwan") || name.includes("mei-jia")) {
				return { source: "system", type: "taiwan", rank: 13 };
			}
			if (
				(lang.startsWith("zh-cn") || lang.startsWith("zh_cn") || lang === "zh" || lang.startsWith("cmn")) &&
				!lang.includes("hk") && !lang.includes("tw")
			) {
				return { source: "system", type: "mandarin", rank: 11 };
			}

			return null;
		}

		function getFilteredVoices() {
			try {
				const allVoices = window.speechSynthesis.getVoices() || [];
				if (allVoices.length === 0) return [];

				const matched = [];
				const seenKeys = {};

				allVoices.forEach(function(v) {
					const cat = getVoiceCategory(v);
					if (!cat) return;

					// 避免同一分类下重复填充（如 compact 与 non-compact 重复）
					const key = cat.source + "_" + (cat.type === "tingting" ? "mandarin" : cat.type);
					if (cat.type === "tingting") {
						// 婷婷优先保留
						matched.push({ voice: v, category: cat });
						seenKeys[key] = true;
						return;
					}

					if (!seenKeys[key]) {
						matched.push({ voice: v, category: cat });
						seenKeys[key] = true;
					}
				});

				// 按 Google(普通话、粤语、台湾国语) -> 系统(婷婷普通话、普通话、粤语、台湾国语) 排序
				matched.sort(function(a, b) {
					return a.category.rank - b.category.rank;
				});

				return matched.map(function(m) { return m.voice; });
			} catch (e) {
				return [];
			}
		}

		function formatVoiceLabel(v) {
			const cat = getVoiceCategory(v);
			if (!cat) return v.name || "普通话";

			if (cat.source === "google") {
				if (cat.type === "mandarin") return "Google · 普通话";
				if (cat.type === "cantonese") return "Google · 粤语 (香港)";
				if (cat.type === "taiwan") return "Google · 台湾国语";
			}

			if (cat.source === "system") {
				if (cat.type === "tingting") return "系统 · 婷婷 (普通话)";
				if (cat.type === "mandarin") return "系统 · 普通话";
				if (cat.type === "cantonese") return "系统 · 粤语 (香港)";
				if (cat.type === "taiwan") return "系统 · 台湾国语";
			}

			return v.name;
		}

		function renderVoiceSelectOptions() {
			if (!voiceSelect) return;
			voiceSelect.innerHTML = "";
			if (availableVoices.length === 0) {
				const opt = document.createElement("option");
				opt.textContent = "默认普通话";
				opt.value = "0";
				voiceSelect.appendChild(opt);
				return;
			}

			const googleList = [];
			const systemList = [];

			availableVoices.forEach(function(v, idx) {
				const cat = getVoiceCategory(v);
				if (cat && cat.source === "google") {
					googleList.push({ voice: v, index: idx });
				} else {
					systemList.push({ voice: v, index: idx });
				}
			});

			if (googleList.length > 0) {
				const groupG = document.createElement("optgroup");
				groupG.label = "── Google 语音 ──";
				googleList.forEach(function(item) {
					const opt = document.createElement("option");
					opt.value = item.index;
					opt.textContent = formatVoiceLabel(item.voice);
					if (selectedVoice && selectedVoice.name === item.voice.name) {
						opt.selected = true;
					}
					groupG.appendChild(opt);
				});
				voiceSelect.appendChild(groupG);
			}

			if (systemList.length > 0) {
				const groupS = document.createElement("optgroup");
				groupS.label = "── 系统原生语音 ──";
				systemList.forEach(function(item) {
					const opt = document.createElement("option");
					opt.value = item.index;
					opt.textContent = formatVoiceLabel(item.voice);
					if (selectedVoice && selectedVoice.name === item.voice.name) {
						opt.selected = true;
					}
					groupS.appendChild(opt);
				});
				voiceSelect.appendChild(groupS);
			}
		}

		function loadVoiceList() {
			availableVoices = getFilteredVoices();
			if (availableVoices.length > 0) {
				let preferred = null;
				try {
					const savedName = localStorage.getItem(SAVED_VOICE_KEY);
					if (savedName) {
						preferred = availableVoices.find(function(v) { return v.name === savedName; });
					}
				} catch (e) {}

				if (!preferred) {
					preferred =
						availableVoices.find(function(v) { return v.name.includes("婷婷"); }) ||
						availableVoices.find(function(v) { return v.name.includes("Google") && !v.lang.includes("hk"); }) ||
						availableVoices[0];
				}
				selectedVoice = preferred;
				renderVoiceSelectOptions();
			}
		}

		// 3. 播客播放器状态管理
		let currentIndex = 0;
		let isPlaying = false;
		let isPaused = false;
		let currentRate = 1.0;
		let autoScrollEnabled = true;
		let keepAliveTimer = null;
		let currentUtteranceId = 0;
		let retryCount = 0;
		let lastRetryIndex = -1;
		let retryTimer = null;
		let toastTimer = null;
		let activeUtterance = null;
		let watchdogTimer = null;
		window._activeTTSUtterance = null;
		const rates = [1.0, 1.25, 1.5, 2.0];

		function clearWatchdogTimer() {
			if (watchdogTimer) {
				clearTimeout(watchdogTimer);
				watchdogTimer = null;
			}
		}

		function showToast(msg, duration) {
			duration = duration || 2000;
			let toast = document.getElementById("tts-toast");
			if (!toast) {
				toast = document.createElement("div");
				toast.id = "tts-toast";
				toast.className = "tts-toast";
				document.body.appendChild(toast);
			}
			toast.textContent = msg;
			toast.classList.add("tts-toast-visible");
			if (toastTimer) clearTimeout(toastTimer);
			toastTimer = setTimeout(function() {
				toast.classList.remove("tts-toast-visible");
				setTimeout(function() {
					if (toast && toast.parentNode && !toast.classList.contains("tts-toast-visible")) {
						// keep in dom
					}
				}, 300);
			}, duration);
		}

		function clearRetryTimer() {
			if (retryTimer) {
				clearTimeout(retryTimer);
				retryTimer = null;
			}
		}

		const totalWords = sentenceList.reduce(function(acc, cur) {
			return acc + cur.text.length;
		}, 0);
		const totalMinutes = Math.max(1, Math.ceil(totalWords / 280));
		const postTitle = (
			document.querySelector("h1#seo-header") ||
			document.querySelector("h1") ||
			{ innerText: "文章语音伴读" }
		).innerText.trim();

		// 4. 创建播客播放器卡片 (优化布局与交互)
		const player = document.createElement("div");
		player.id = "article-tts-bar";
		player.className = "article-tts-bar";

		player.innerHTML = `
			<div class="tts-header">
				<div class="tts-badge">
					<div class="tts-icon" title="文章语音伴读">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
							<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
						</svg>
					</div>
					<div class="tts-waves" title="伴读律动">
						<span class="wave-bar"></span>
						<span class="wave-bar"></span>
						<span class="wave-bar"></span>
						<span class="wave-bar"></span>
					</div>
					<div class="tts-info">
						<span class="tts-title" title="${postTitle}">${postTitle}</span>
						<span class="tts-status" id="tts-status-text">已就绪 · 共 ${sentenceList.length} 句 · 约 ${totalMinutes} 分钟</span>
					</div>
				</div>

				<div class="tts-controls">
					<button type="button" class="tts-btn" id="tts-prev-btn" title="上一句 [快捷键 ←]">
						<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
							<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
						</svg>
					</button>

					<button type="button" class="tts-btn tts-btn-primary" id="tts-play-btn" title="播放 / 暂停 [快捷键 空格]">
						<svg class="tts-icon-play" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
						<svg class="tts-icon-pause" style="display:none;" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
						</svg>
					</button>

					<button type="button" class="tts-btn" id="tts-next-btn" title="下一句 [快捷键 →]">
						<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
							<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
						</svg>
					</button>

					<button type="button" class="tts-btn" id="tts-stop-btn" title="停止朗读 [快捷键 Esc]">
						<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
							<path d="M6 6h12v12H6z"/>
						</svg>
					</button>

					<button type="button" class="tts-btn tts-btn-pill" id="tts-rate-btn" title="点击切换语速">1.0x</button>

					<div class="tts-voice-wrapper" title="选择朗读声音">
						<select id="tts-voice-select" class="tts-select"></select>
					</div>

					<button type="button" class="tts-btn tts-btn-pill tts-autoscroll-btn tts-btn-active" id="tts-autoscroll-btn" title="点击切换：朗读时页面是否跟随滚动">
						<svg class="tts-autoscroll-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
							<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
						</svg>
						<span class="tts-autoscroll-text">跟随阅读: 开</span>
					</button>
				</div>
			</div>

			<div class="tts-progress-wrapper">
				<div class="tts-progress-track" id="tts-progress-track" title="悬浮预览文字，点击精准跳转">
					<div class="tts-progress-fill" id="tts-progress-fill"></div>
					<div class="tts-progress-tooltip" id="tts-progress-tooltip" style="display:none;"></div>
				</div>
				<div class="tts-progress-meta">
					<span id="tts-progress-sentence">第 0 / ${sentenceList.length} 句 (0%)</span>
					<span id="tts-progress-time">预估时长 ${totalMinutes} 分钟</span>
				</div>
			</div>

			<div class="tts-live-transcript" id="tts-live-transcript">
				<div class="tts-transcript-row tts-row-current">
					<span class="tts-transcript-tag">朗读中</span>
					<span class="tts-transcript-content" id="tts-live-text">已就绪，点击播放开始伴读</span>
				</div>
				<div class="tts-transcript-row tts-row-next" id="tts-next-row" style="display:none;">
					<span class="tts-transcript-tag tts-tag-next">下一句</span>
					<span class="tts-transcript-content" id="tts-next-text"></span>
				</div>
			</div>

			<div class="tts-tip-banner">
				<span>💡 操作指南：划选文字指定朗读起点 · 快捷键：[空格] 播放/暂停 · [← / →] 上下句 · [Esc] 停止</span>
			</div>
		`;

		contentEl.parentNode.insertBefore(player, contentEl);

		// 5. 创建随身播客悬浮控制器 (Mini Floating Player)
		const fabContainer = document.createElement("div");
		fabContainer.id = "tts-float-container";
		fabContainer.className = "tts-float-container";
		fabContainer.style.display = "none";
		fabContainer.innerHTML = `
			<div class="tts-float-fab" id="tts-float-fab" title="文章语音伴读 (点击展开控制条)">
				<div class="tts-fab-icon">
					<svg class="tts-fab-play-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M8 5v14l11-7z"/>
					</svg>
					<svg class="tts-fab-pause-icon" style="display:none;" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
					</svg>
				</div>
				<div class="tts-fab-badge" id="tts-fab-badge">0%</div>
				<div class="tts-fab-ring"></div>
			</div>
			<div class="tts-float-panel" id="tts-float-panel" style="display:none;">
				<button type="button" class="tts-mini-btn" id="tts-mini-prev" title="上一句 [←]">
					<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
				</button>
				<button type="button" class="tts-mini-btn tts-mini-play" id="tts-mini-play" title="播放/暂停 [空格]">
					<svg class="tts-mini-icon-play" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
					<svg class="tts-mini-icon-pause" style="display:none;" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
				</button>
				<button type="button" class="tts-mini-btn" id="tts-mini-next" title="下一句 [→]">
					<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
				</button>
				<span class="tts-mini-snippet" id="tts-mini-snippet" title="点击定位到当前句子">已就绪</span>
				<button type="button" class="tts-mini-btn tts-mini-top" id="tts-mini-top" title="回到顶部播放器">
					<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>
				</button>
			</div>
		`;
		document.body.appendChild(fabContainer);

		// 6. 创建文字划选气泡
		const bubble = document.createElement("div");
		bubble.id = "tts-selection-bubble";
		bubble.style.display = "none";
		bubble.innerHTML = `
			<button type="button" class="tts-bubble-btn" id="tts-bubble-read-from">
				<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
					<path d="M8 5v14l11-7z"/>
				</svg>
				从此处朗读
			</button>
		`;
		document.body.appendChild(bubble);

		// DOM 元素引用
		const btnPlay = document.getElementById("tts-play-btn");
		const btnPrev = document.getElementById("tts-prev-btn");
		const btnNext = document.getElementById("tts-next-btn");
		const btnStop = document.getElementById("tts-stop-btn");
		const btnRate = document.getElementById("tts-rate-btn");
		const btnAutoScroll = document.getElementById("tts-autoscroll-btn");
		const voiceSelect = document.getElementById("tts-voice-select");
		const statusText = document.getElementById("tts-status-text");
		const progressTrack = document.getElementById("tts-progress-track");
		const progressFill = document.getElementById("tts-progress-fill");
		const progressTooltip = document.getElementById("tts-progress-tooltip");
		const progressSentence = document.getElementById("tts-progress-sentence");
		const progressTime = document.getElementById("tts-progress-time");
		const liveTranscript = document.getElementById("tts-live-transcript");
		const liveText = document.getElementById("tts-live-text");
		const nextRow = document.getElementById("tts-next-row");
		const nextText = document.getElementById("tts-next-text");
		const iconPlay = btnPlay.querySelector(".tts-icon-play");
		const iconPause = btnPlay.querySelector(".tts-icon-pause");

		// Mini 控制器相关引用
		const fab = document.getElementById("tts-float-fab");
		const fabPanel = document.getElementById("tts-float-panel");
		const fabPlayIcon = fab.querySelector(".tts-fab-play-icon");
		const fabPauseIcon = fab.querySelector(".tts-fab-pause-icon");
		const fabBadge = document.getElementById("tts-fab-badge");
		const miniPrev = document.getElementById("tts-mini-prev");
		const miniPlay = document.getElementById("tts-mini-play");
		const miniNext = document.getElementById("tts-mini-next");
		const miniSnippet = document.getElementById("tts-mini-snippet");
		const miniTop = document.getElementById("tts-mini-top");
		const miniPlayIcon = miniPlay.querySelector(".tts-mini-icon-play");
		const miniPauseIcon = miniPlay.querySelector(".tts-mini-icon-pause");
		const bubbleBtn = document.getElementById("tts-bubble-read-from");

		if (window.speechSynthesis.onvoiceschanged !== undefined) {
			window.speechSynthesis.onvoiceschanged = loadVoiceList;
		}
		loadVoiceList();

		if (voiceSelect) {
			voiceSelect.addEventListener("change", function(e) {
				const idx = parseInt(e.target.value, 10);
				if (!isNaN(idx) && availableVoices[idx]) {
					selectedVoice = availableVoices[idx];
					try {
						localStorage.setItem(SAVED_VOICE_KEY, selectedVoice.name);
					} catch (err) {}
					showToast(`已选用声音：${formatVoiceLabel(selectedVoice)}`);
					if (isPlaying && !isPaused) {
						playSentence(currentIndex);
					}
				}
			});
		}

		// Keep-Alive 机制：解决 Chromium 引擎在长段语音中 15 秒静默挂起缺陷
		function startKeepAlive() {
			stopKeepAlive();
			keepAliveTimer = setInterval(function() {
				if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
					try {
						window.speechSynthesis.pause();
						window.speechSynthesis.resume();
					} catch (e) {}
				}
			}, 12000);
		}

		function stopKeepAlive() {
			if (keepAliveTimer) {
				clearInterval(keepAliveTimer);
				keepAliveTimer = null;
			}
		}

		let activeHighlightedEl = null;

		function clearHighlight() {
			if (activeHighlightedEl) {
				activeHighlightedEl.classList.remove("tts-reading-active");
				activeHighlightedEl = null;
			}
		}

		function highlightSentence(el) {
			clearHighlight();
			if (el) {
				el.classList.add("tts-reading-active");
				activeHighlightedEl = el;
				if (autoScrollEnabled) {
					el.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			}
		}

		function setUIState(state) {
			if (state === "playing") {
				isPlaying = true;
				isPaused = false;
				player.classList.add("tts-active");
				player.classList.remove("tts-paused");
				fab.classList.add("tts-fab-active");
				fab.classList.remove("tts-fab-paused");
				iconPlay.style.display = "none";
				iconPause.style.display = "inline-block";
				fabPlayIcon.style.display = "none";
				fabPauseIcon.style.display = "inline-block";
				if (miniPlayIcon) miniPlayIcon.style.display = "none";
				if (miniPauseIcon) miniPauseIcon.style.display = "inline-block";
				liveTranscript.style.display = "block";
				startKeepAlive();
			} else if (state === "paused") {
				isPlaying = true;
				isPaused = true;
				player.classList.remove("tts-active");
				player.classList.add("tts-paused");
				fab.classList.remove("tts-fab-active");
				fab.classList.add("tts-fab-paused");
				iconPlay.style.display = "inline-block";
				iconPause.style.display = "none";
				fabPlayIcon.style.display = "inline-block";
				fabPauseIcon.style.display = "none";
				if (miniPlayIcon) miniPlayIcon.style.display = "inline-block";
				if (miniPauseIcon) miniPauseIcon.style.display = "none";
				statusText.textContent = `已暂停 · 当前停在第 ${currentIndex + 1} 句`;
				clearRetryTimer();
				clearWatchdogTimer();
				stopKeepAlive();
			} else {
				isPlaying = false;
				isPaused = false;
				player.classList.remove("tts-active", "tts-paused");
				fab.classList.remove("tts-fab-active", "tts-fab-paused");
				iconPlay.style.display = "inline-block";
				iconPause.style.display = "none";
				fabPlayIcon.style.display = "inline-block";
				fabPauseIcon.style.display = "none";
				if (miniPlayIcon) miniPlayIcon.style.display = "inline-block";
				if (miniPauseIcon) miniPauseIcon.style.display = "none";
				statusText.textContent = `已就绪 · 共 ${sentenceList.length} 句 · 约 ${totalMinutes} 分钟`;
				liveText.textContent = "已就绪，点击播放开始伴读";
				if (nextRow) nextRow.style.display = "none";
				if (miniSnippet) miniSnippet.textContent = "已就绪";
				clearRetryTimer();
				clearWatchdogTimer();
				stopKeepAlive();
				clearHighlight();
			}
		}

		function playSentence(index) {
			clearRetryTimer();
			clearWatchdogTimer();

			if (index < 0 || index >= sentenceList.length) {
				stop();
				statusText.textContent = `🎉 朗读完毕 (全文共 ${sentenceList.length} 句)`;
				progressFill.style.width = "100%";
				progressSentence.textContent = `第 ${sentenceList.length} / ${sentenceList.length} 句 (100%)`;
				fabBadge.textContent = "100%";
				showToast("🎉 本文语音伴读已全部完成！");
				return;
			}

			const item = sentenceList[index];
			if (!item || !isSpeakable(item.text)) {
				playSentence(index + 1);
				return;
			}

			if (index !== lastRetryIndex) {
				retryCount = 0;
				lastRetryIndex = index;
			}

			currentIndex = index;
			const thisUtteranceId = ++currentUtteranceId;

			// 确认本标签页独占全局发声权
			try {
				localStorage.setItem(STORAGE_KEY_ACTIVE, tabSessionId);
				if (broadcast) {
					broadcast.postMessage({ type: "PLAY_STARTED", tabId: tabSessionId });
				}
			} catch (e) {}

			highlightSentence(item.element);

			const percent = Math.round(((currentIndex + 1) / sentenceList.length) * 100);
			progressFill.style.width = percent + "%";
			progressSentence.textContent = `第 ${currentIndex + 1} / ${sentenceList.length} 句 (${percent}%)`;
			fabBadge.textContent = percent + "%";

			const remainingWords = sentenceList.slice(currentIndex).reduce(function(acc, cur) {
				return acc + cur.text.length;
			}, 0);
			const remainingMinutes = Math.max(1, Math.ceil(remainingWords / (280 * currentRate)));
			progressTime.textContent = `剩余约 ${remainingMinutes} 分钟`;
			statusText.textContent = `正在朗读第 ${currentIndex + 1} / ${sentenceList.length} 句...`;

			if (liveText) {
				liveText.textContent = item.text;
			}
			if (nextRow && nextText) {
				if (currentIndex + 1 < sentenceList.length) {
					nextRow.style.display = "flex";
					nextText.textContent = sentenceList[currentIndex + 1].text;
				} else {
					nextRow.style.display = "none";
				}
			}
			if (miniSnippet) {
				miniSnippet.textContent = item.text.length > 18 ? item.text.slice(0, 18) + "..." : item.text;
			}

			// 仅在当前确实有未完成发音（如用户跳句或上一句被卡住）时才调用 cancel，避免自然流畅过渡时触发 Chrome 异步竞态
			if (window.speechSynthesis.speaking && isCurrentTabActiveSpeaker()) {
				try {
					window.speechSynthesis.cancel();
				} catch (e) {}
			}

			const utterance = new SpeechSynthesisUtterance(item.text);
			activeUtterance = utterance;
			window._activeTTSUtterance = utterance;

			if (selectedVoice) utterance.voice = selectedVoice;
			utterance.lang = (selectedVoice && selectedVoice.lang) || "zh-CN";
			utterance.rate = currentRate;

			// 智能防假死自愈守护定时器 (Watchdog Timer)
			// 解决系统音频驱动休眠、后台 Tab 限流或浏览器内核偶发丢失 onend 回调时彻底卡死的问题
			const estimatedSec = Math.max(8, Math.ceil(item.text.length / (3 * currentRate)) + 6);
			watchdogTimer = setTimeout(function() {
				if (thisUtteranceId === currentUtteranceId && isPlaying && !isPaused) {
					console.warn("[TTS] 语音引擎回调超时未触发，激活看门狗推进至下一句:", item.text);
					clearWatchdogTimer();
					if (activeUtterance === utterance) {
						activeUtterance = null;
						window._activeTTSUtterance = null;
					}
					try {
						window.speechSynthesis.cancel();
					} catch (err) {}
					playSentence(currentIndex + 1);
				}
			}, estimatedSec * 1000);

			utterance.onstart = function() {
				if (thisUtteranceId === currentUtteranceId) {
					setUIState("playing");
				}
			};

			utterance.onend = function() {
				clearWatchdogTimer();
				if (activeUtterance === utterance) {
					activeUtterance = null;
					window._activeTTSUtterance = null;
				}
				if (thisUtteranceId !== currentUtteranceId) return;
				retryCount = 0;
				if (isPlaying && !isPaused) {
					playSentence(currentIndex + 1);
				}
			};

			utterance.onerror = function(e) {
				clearWatchdogTimer();
				if (activeUtterance === utterance) {
					activeUtterance = null;
					window._activeTTSUtterance = null;
				}
				if (thisUtteranceId !== currentUtteranceId) return;

				// 如果用户主动暂停或停止，无需恢复
				if (!isPlaying || isPaused) return;

				// 针对 Chromium 浏览器底层已知缺陷：多 Tab 刷新或页面重载时取消
				if (e.error === "interrupted" || e.error === "canceled") {
					if (isCurrentTabActiveSpeaker() && retryCount < 2) {
						retryCount++;
						clearRetryTimer();
						retryTimer = setTimeout(function() {
							if (
								thisUtteranceId === currentUtteranceId &&
								isPlaying &&
								!isPaused &&
								isCurrentTabActiveSpeaker()
							) {
								playSentence(currentIndex);
							}
						}, 200);
						return;
					}
				}

				if (isPlaying && !isPaused) {
					playSentence(currentIndex + 1);
				}
			};

			try {
				window.speechSynthesis.speak(utterance);
			} catch (err) {
				console.error("[TTS] speak error:", err);
				clearWatchdogTimer();
				playSentence(currentIndex + 1);
			}
		}

		function play() {
			if (isPaused) {
				setUIState("playing");
				statusText.textContent = `正在朗读第 ${currentIndex + 1} / ${sentenceList.length} 句...`;
				try {
					window.speechSynthesis.resume();
				} catch (e) {}
				// 针对 Chromium resume() 静默失效的自愈兜底机制
				setTimeout(function() {
					if (isPlaying && !isPaused && !window.speechSynthesis.speaking) {
						playSentence(currentIndex);
					}
				}, 300);
			} else {
				playSentence(currentIndex);
			}
		}

		function pause() {
			if (isPlaying && !isPaused) {
				clearRetryTimer();
				clearWatchdogTimer();
				try {
					window.speechSynthesis.pause();
				} catch (e) {}
				setUIState("paused");
			}
		}

		function stop() {
			clearRetryTimer();
			clearWatchdogTimer();
			currentUtteranceId++;
			activeUtterance = null;
			window._activeTTSUtterance = null;
			if (isPlaying && isCurrentTabActiveSpeaker()) {
				try {
					window.speechSynthesis.cancel();
				} catch (e) {}
				try {
					localStorage.removeItem(STORAGE_KEY_ACTIVE);
				} catch (e) {}
			}
			setUIState("stopped");
		}

		// 核心控制按钮事件
		btnPlay.addEventListener("click", function() {
			if (isPlaying && !isPaused) {
				pause();
				showToast("已暂停伴读");
			} else {
				play();
				showToast("开始伴读");
			}
		});

		btnPrev.addEventListener("click", function() {
			const target = Math.max(0, currentIndex - 1);
			playSentence(target);
			showToast(`上一句 (第 ${target + 1} 句)`);
		});

		btnNext.addEventListener("click", function() {
			const target = Math.min(sentenceList.length - 1, currentIndex + 1);
			playSentence(target);
			showToast(`下一句 (第 ${target + 1} 句)`);
		});

		btnStop.addEventListener("click", function() {
			stop();
			showToast("已停止伴读");
		});

		btnRate.addEventListener("click", function() {
			const idx = (rates.indexOf(currentRate) + 1) % rates.length;
			currentRate = rates[idx];
			btnRate.textContent = currentRate.toFixed(1) + "x";
			showToast(`已切换语速：${currentRate.toFixed(1)}x`);
			if (isPlaying && !isPaused) {
				playSentence(currentIndex);
			}
		});

		// “跟随阅读” 状态切换与明确提示
		btnAutoScroll.addEventListener("click", function() {
			autoScrollEnabled = !autoScrollEnabled;
			btnAutoScroll.classList.toggle("tts-btn-active", autoScrollEnabled);
			const textSpan = btnAutoScroll.querySelector(".tts-autoscroll-text");
			if (textSpan) {
				textSpan.textContent = autoScrollEnabled ? "跟随阅读: 开" : "跟随阅读: 关";
			}
			showToast(
				autoScrollEnabled
					? "已开启跟随阅读（正文自动平滑滚动对齐朗读句）"
					: "已关闭跟随阅读（停止自动滚动，可自由浏览正文）"
			);
			if (autoScrollEnabled && activeHighlightedEl) {
				activeHighlightedEl.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		});

		// 进度条悬浮预览与点击精准跳转
		if (progressTrack) {
			progressTrack.addEventListener("mousemove", function(e) {
				if (!progressTooltip) return;
				const rect = progressTrack.getBoundingClientRect();
				const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
				const targetIdx = Math.min(sentenceList.length - 1, Math.floor(clickRatio * sentenceList.length));
				const item = sentenceList[targetIdx];
				if (item) {
					progressTooltip.style.display = "block";
					progressTooltip.style.left = (clickRatio * 100) + "%";
					const preview = item.text.length > 20 ? item.text.slice(0, 20) + "..." : item.text;
					progressTooltip.textContent = `第 ${targetIdx + 1} 句: ${preview}`;
				}
			});

			progressTrack.addEventListener("mouseleave", function() {
				if (progressTooltip) progressTooltip.style.display = "none";
			});

			progressTrack.addEventListener("click", function(e) {
				const rect = progressTrack.getBoundingClientRect();
				const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
				const targetIdx = Math.min(sentenceList.length - 1, Math.floor(clickRatio * sentenceList.length));
				playSentence(targetIdx);
				showToast(`已跳转至第 ${targetIdx + 1} 句`);
			});
		}

		// 随身 Mini 控制器交互
		fab.addEventListener("click", function(e) {
			e.stopPropagation();
			if (!fabPanel) return;
			const isVisible = fabPanel.style.display === "flex";
			fabPanel.style.display = isVisible ? "none" : "flex";
		});

		if (miniPlay) {
			miniPlay.addEventListener("click", function(e) {
				e.stopPropagation();
				if (isPlaying && !isPaused) {
					pause();
					showToast("已暂停伴读");
				} else {
					play();
					showToast("开始伴读");
				}
			});
		}

		if (miniPrev) {
			miniPrev.addEventListener("click", function(e) {
				e.stopPropagation();
				const target = Math.max(0, currentIndex - 1);
				playSentence(target);
				showToast(`上一句 (第 ${target + 1} 句)`);
			});
		}

		if (miniNext) {
			miniNext.addEventListener("click", function(e) {
				e.stopPropagation();
				const target = Math.min(sentenceList.length - 1, currentIndex + 1);
				playSentence(target);
				showToast(`下一句 (第 ${target + 1} 句)`);
			});
		}

		if (miniSnippet) {
			miniSnippet.addEventListener("click", function(e) {
				e.stopPropagation();
				if (activeHighlightedEl) {
					activeHighlightedEl.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			});
		}

		if (miniTop) {
			miniTop.addEventListener("click", function(e) {
				e.stopPropagation();
				player.scrollIntoView({ behavior: "smooth", block: "center" });
			});
		}

		// 全局键盘快捷键 (极其人性化与高效)
		document.addEventListener("keydown", function(e) {
			const active = document.activeElement;
			if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
				return;
			}

			if (e.code === "Space") {
				if (isPlaying || isPaused || player.classList.contains("tts-active")) {
					e.preventDefault();
					if (isPlaying && !isPaused) {
						pause();
						showToast("已暂停伴读 (按空格继续)");
					} else {
						play();
						showToast("继续伴读 (按空格暂停)");
					}
				}
			} else if (e.code === "ArrowLeft") {
				if (isPlaying || isPaused) {
					e.preventDefault();
					const target = Math.max(0, currentIndex - 1);
					playSentence(target);
					showToast(`上一句 (第 ${target + 1} 句)`);
				}
			} else if (e.code === "ArrowRight") {
				if (isPlaying || isPaused) {
					e.preventDefault();
					const target = Math.min(sentenceList.length - 1, currentIndex + 1);
					playSentence(target);
					showToast(`下一句 (第 ${target + 1} 句)`);
				}
			} else if (e.code === "Escape") {
				if (isPlaying || isPaused) {
					stop();
					showToast("已停止伴读");
				}
			}
		});

		// 划选文字气泡交互
		let targetStartIdx = null;

		function hideBubble() {
			bubble.style.display = "none";
		}

		document.addEventListener("mouseup", function(e) {
			if (bubble.contains(e.target)) return;

			const selection = window.getSelection();
			if (!selection || selection.isCollapsed) {
				hideBubble();
				return;
			}

			const text = selection.toString().trim();
			if (text.length === 0) {
				hideBubble();
				return;
			}

			const anchorNode = selection.anchorNode;
			const anchorEl = anchorNode ? (anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode) : null;
			if (!anchorEl || !contentEl.contains(anchorEl)) {
				hideBubble();
				return;
			}

			const matchedSpan = anchorEl.closest(".tts-sentence-node");
			if (!matchedSpan) {
				hideBubble();
				return;
			}

			const sIdx = parseInt(matchedSpan.getAttribute("data-s-idx"), 10);
			if (isNaN(sIdx)) {
				hideBubble();
				return;
			}

			targetStartIdx = sIdx;

			const range = selection.getRangeAt(0);
			const rect = range.getBoundingClientRect();

			bubble.style.display = "inline-flex";
			bubble.style.left = `${window.scrollX + rect.left + rect.width / 2}px`;
			bubble.style.top = `${window.scrollY + rect.top - 38}px`;
		});

		document.addEventListener("selectionchange", function() {
			const sel = window.getSelection();
			if (!sel || sel.isCollapsed) {
				hideBubble();
			}
		});

		bubbleBtn.addEventListener("click", function(e) {
			e.stopPropagation();
			hideBubble();
			if (targetStartIdx !== null) {
				playSentence(targetStartIdx);
				showToast(`已从第 ${targetStartIdx + 1} 句开始伴读`);
			}
		});

		// 页面向下滚动时随身播客 FAB 显示
		window.addEventListener("scroll", function() {
			if (!fabContainer || !player) return;
			const rect = player.getBoundingClientRect();
			if (rect.bottom < 0) {
				fabContainer.style.display = "flex";
			} else {
				fabContainer.style.display = "none";
				if (fabPanel) fabPanel.style.display = "none";
			}
		}, { passive: true });

		// 核心防御：只有处于播放中且本标签页为活跃拥有者时才在 beforeunload 取消
		window.addEventListener("beforeunload", function() {
			if (isPlaying && isCurrentTabActiveSpeaker()) {
				clearRetryTimer();
				window.speechSynthesis.cancel();
				try {
					localStorage.removeItem(STORAGE_KEY_ACTIVE);
				} catch (e) {}
			}
		});
	}

	function startWithKaTeXWait() {
		if (window.__KATEX_DONE__) {
			initArticleTTS();
		} else {
			let resolved = false;
			const handler = function() {
				if (resolved) return;
				resolved = true;
				initArticleTTS();
			};
			window.addEventListener("katex-rendered", handler, { once: true });
			setTimeout(handler, 600);
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", startWithKaTeXWait);
	} else {
		startWithKaTeXWait();
	}

	setTimeout(startWithKaTeXWait, 1000);
})();
