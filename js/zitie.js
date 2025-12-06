/* eslint-disable  */
var bigDiv = document.getElementById("bigDiv");
var ulPrintContent = document.getElementById("printContent");
var ipt = document.getElementById("ipt");
var file = document.getElementById("lefile");
var fontFaceD = document.getElementById("fontFaceUrl");
var fontFaceS = document.getElementById("font-face-style");
var fontFaceUrl = '';
var fontType = {
	'ttf': 'truetype',
	'woff': 'woff',
	'woff2': 'woff2',
}

file.onchange = function (e) {
	var fontFaceUrl = e.target.files[0];
	var filename = fontFaceUrl.name;

	var fontExtn = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
	if (/\.(ttf|woff|woff2)$/.test(filename) && window.FileReader) {
		var reader = new window.FileReader();
		reader.readAsDataURL(fontFaceUrl)
		reader.onload = function (e) {
			var fontFaceS = document.getElementById("font-face-style");
			fontURL = e.target.result;
			fontFaceS.innerHTML = "@font-face {font-family: 'ziti';src: url('" + (fontURL + '') + "') format('" + (fontType[fontExtn]) + "');}"
		}

	}
}

function changeFontFace() {
	console.log("xas1a")
	if (fontFaceD.value) {
		console.log("xasa")
		fontFaceUrl = fontFaceD.value;
		var filename = fontFaceUrl
		this.fontExtn = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
		if (/\.(ttf|woff|woff2)$/.test(filename)) {
			fontFaceS.innerHTML = "@font-face {font-family: 'ziti';src: url('" + fontFaceUrl + "') format('" + (fontType[fontExtn]) + "');}"
		}
	}
}
window.onload = function () {

	var bigDiv = document.getElementById("bigDiv");
	var ulPrintContent = document.getElementById("printContent");
	var ipt = document.getElementById("ipt");
	var file = document.getElementById("lefile");
	var fontFaceD = document.getElementById("fontFaceUrl");
	var fontFaceS = document.getElementById("font-face-style");
	var ipg = document.getElementById("ipg");

	var fontFaceUrl = '';

	bigDiv.style.display = "none";
	ulPrintContent.style.display = "block";

	bigDiv.onclick = function () {
		ulPrintContent.style.display = "block";
		bigDiv.style.display = "none";
		ipg.style.display = "block";

	}

	ulPrintContent.onclick = function (e) {
		ulPrintContent.style.display = "none";

		ipg.style.display = "none";
		var bigDiv = document.getElementById("bigDiv");

		bigDiv.innerText = e.target.innerText[0];
		var get_width = getWidth();
		var font_size = "font-size: " + get_width * 0.68 + "px;line-height: " + get_width + "px;width: " + get_width + "px;";
		bigDiv.style.cssText = font_size + "background: url('./img/bg31.svg') no-repeat; background-size: " + get_width + "px; font-family: 'ziti';";
		console.log("bigDiv.style.cssText",bigDiv.style.cssText)
	}
	ulPrintContent.innerHTML = '';
	var sss = '永和九年岁在癸丑'
	for (var index = 0; index < sss.length; index++) {
		var hzSpan = document.createElement("span");
		hzSpan.className = 'hz-line';
		hzSpan.innerText = sss[index];
		hzSpan.style.cssText = "background: url('./img/bg31.svg'); font-family: 'ziti';";
		ulPrintContent.appendChild(hzSpan);
	}


	ipt.oninput = function (e) {
		var data = e.target.value.replace(/[^\u4E00-\u9FA5]/g, '');
		ulPrintContent.innerHTML = '';
		if (!data) {
			data = '永和九年岁在癸丑'
		}
		for (var n = 0; n < data.length; ++n) {
			var hzSpan = document.createElement("span");
			hzSpan.className = 'hz-line';
			hzSpan.innerText = data[n];
			hzSpan.style.cssText = "background: url('./img/bg31.svg'); font-family: 'ziti';";

			ulPrintContent.appendChild(hzSpan);
		}
	}

	function getWidth() {
		var winWidth;
		var get_width = document.querySelector('article.page-content').clientWidth;
		// var get_width = window.innerWidth;
		// if (get_width) {
			winWidth = get_width;
		// } else if ((document.body) && (document.body.clientWidth)) {
		// 	winWidth = document.body.clientWidth;
		// }
		console.log(winWidth);
		return winWidth
	}
}