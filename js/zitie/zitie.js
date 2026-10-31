/**
 * @description: 字帖生成器
 * @author: bubao
 * @features: 支持主题切换 (dark/light mode)
 */
(function() {
	'use strict';

	// 配置
	var CONFIG = {
		defaultText: '永和九年岁在癸丑',
		gridSize: 80,
		fontSize: 58
	};

	// 字体类型映射
	var fontType = {
		'ttf': 'truetype',
		'woff': 'woff',
		'woff2': 'woff2'
	};

	// DOM 元素
	var bigDiv, ulPrintContent, ipt, file, fontFaceD, fontFaceS, ipg;

	/**
	 * 初始化
	 */
	function init() {
		bigDiv = document.getElementById('bigDiv');
		ulPrintContent = document.getElementById('printContent');
		ipt = document.getElementById('ipt');
		file = document.getElementById('lefile');
		fontFaceD = document.getElementById('fontFaceUrl');
		fontFaceS = document.getElementById('font-face-style');
		ipg = document.getElementById('ipg');

		if (!ulPrintContent || !bigDiv) return;

		// 初始状态
		bigDiv.style.display = 'none';
		ulPrintContent.style.display = 'block';

		// 渲染默认字帖
		renderText(CONFIG.defaultText);

		// 事件绑定
		bindEvents();

		// 初始化主题
		initTheme();

		// 监听主题变化
		watchThemeChange();
	}

	/**
	 * 绑定事件
	 */
	function bindEvents() {
		// 大字帖点击：返回小字帖
		bigDiv.onclick = function() {
			ulPrintContent.style.display = 'block';
			bigDiv.style.display = 'none';
			ipg.style.display = 'block';
		};

		// 小字帖点击：显示大字
		ulPrintContent.onclick = function(e) {
			if (!e.target.classList.contains('hz-line')) return;

			ulPrintContent.style.display = 'none';
			ipg.style.display = 'none';

			var text = e.target.innerText[0];
			var width = getWidth();

			bigDiv.innerText = text;
			bigDiv.style.cssText = getBigDivStyle(width);
		};

		// 文本输入
		ipt.oninput = function(e) {
			var data = e.target.value.replace(/[^\u4E00-\u9FA5]/g, '') || CONFIG.defaultText;
			renderText(data);
		};

		// 字体文件上传
		file.onchange = handleFontUpload;

		// 主题切换时更新字帖颜色
		window.addEventListener('themeChange', updateThemeColors);
	}

	/**
	 * 渲染字帖文字
	 */
	function renderText(text) {
		ulPrintContent.innerHTML = '';
		var bgUrl = getGridBackgroundUrl();

		for (var i = 0; i < text.length; i++) {
			var span = document.createElement('span');
			span.className = 'hz-line';
			span.innerText = text[i];
			span.style.cssText = 'background: url("' + bgUrl + '") left center no-repeat; background-size: ' + CONFIG.gridSize + 'px; font-family: \'ziti\'; width: ' + CONFIG.gridSize + 'px; height: ' + CONFIG.gridSize + 'px;';
			ulPrintContent.appendChild(span);
		}
	}

	/**
	 * 获取大方格样式
	 */
	function getBigDivStyle(width) {
		var bgUrl = getGridBackgroundUrl();
		var size = width * 0.68;
		return 'font-size: ' + size + 'px; line-height: ' + width + 'px; width: ' + width + 'px; height: ' + width + 'px; background: url("' + bgUrl + '") no-repeat; background-size: ' + width + 'px; font-family: \'ziti\';';
	}

	/**
	 * 根据主题获取网格背景图 URL
	 */
	function getGridBackgroundUrl() {
		var isDark = document.documentElement.getAttribute('data-user-color-scheme') === 'dark' ||
			(!document.documentElement.getAttribute('data-user-color-scheme') &&
			 window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
		return isDark ? '/zitie/img/bg31-dark.svg' : '/zitie/img/bg31.svg';
	}

	/**
	 * 初始化主题相关颜色
	 */
	function initTheme() {
		updateThemeColors();
	}

	/**
	 * 判断当前是否为深色模式
	 * 优先看用户设置，其次默认主题，最后系统偏好
	 */
	function isDarkMode() {
		var userScheme = document.documentElement.getAttribute('data-user-color-scheme');
		if (userScheme === 'dark') return true;
		if (userScheme === 'light') return false;
		// 没有用户设置时，看默认主题
		var defaultScheme = document.documentElement.getAttribute('data-default-color-scheme');
		if (defaultScheme === 'dark') return true;
		if (defaultScheme === 'light') return false;
		// 都没有则看系统偏好
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	/**
	 * 更新字帖颜色 (根据当前主题)
	 * 只处理 CSS 无法动态计算的 JS 渲染内容
	 */
	function updateThemeColors() {
		var dark = isDarkMode();

		// 只更新字符颜色 (JS 动态生成的 span)
		var textColor = dark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(224, 6, 6, 0.9)';
		var hzLines = document.querySelectorAll('.hz-line');
		hzLines.forEach(function(el) {
			el.style.color = textColor;
		});

		if (bigDiv) {
			bigDiv.style.color = textColor;
		}

		// 重新渲染以更新网格背景图
		var currentText = (ipt && ipt.value) ? ipt.value.replace(/[^\u4E00-\u9FA5]/g, '') : CONFIG.defaultText;
		renderText(currentText);
	}

	/**
	 * 监听主题变化
	 */
	function watchThemeChange() {
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.type === 'attributes' && mutation.attributeName === 'data-user-color-scheme') {
					updateThemeColors();
					// 触发自定义事件
					window.dispatchEvent(new CustomEvent('themeChange'));
				}
			});
		});

		observer.observe(document.documentElement, { attributes: true });
	}

	/**
	 * 计算字帖区域宽度
	 */
	function getWidth() {
		var article = document.querySelector('article.page-content');
		return article ? article.clientWidth : window.innerWidth;
	}

	/**
	 * 处理字体上传
	 */
	function handleFontUpload(e) {
		var fontFile = e.target.files[0];
		if (!fontFile) return;

		var filename = fontFile.name;
		var ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();

		if (/\.(ttf|woff|woff2)$/.test(filename) && window.FileReader) {
			var reader = new FileReader();
			reader.readAsDataURL(fontFile);
			reader.onload = function(e) {
				var fontURL = e.target.result;
				if (fontFaceS) {
					fontFaceS.innerHTML = "@font-face {font-family: 'ziti';src: url('" + fontURL + "') format('" + fontType[ext] + "');}";
				}
			};
		}
	}

	/**
	 * 确认字体 URL
	 */
	window.changeFontFace = function() {
		if (fontFaceD && fontFaceD.value) {
			var filename = fontFaceD.value;
			var ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
			if (/\.(ttf|woff|woff2)$/.test(filename) && fontFaceS) {
				fontFaceS.innerHTML = "@font-face {font-family: 'ziti';src: url('" + fontFaceD.value + "') format('" + fontType[ext] + "');}";
			}
		}
	};

	// 页面加载完成后初始化
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
