/**
 * @description:
 * @author: bubao
 * @date: 2021-06-10 14:05:04
 * @last author: bubao
 * @last edit time: 2021-06-10 14:06:27
 */
// Copyright (c) 2021 bubao
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

;(function() {
	function update() {
		const now = new Date();
		const grt = new Date("2016-07-25 23:32:08"); /** 此处是计时的起始时间 **/
		now.setTime(now.getTime() + 250);
		const days = (now - grt) / 1000 / 60 / 60 / 24;
		const dnum = Math.floor(days);
		const hours = (now - grt) / 1000 / 60 / 60 - (24 * dnum);
		let hnum = Math.floor(hours);
		if (String(hnum).length === 1) {
			hnum = "0" + hnum;
		}
		const minutes = (now - grt) / 1000 / 60 - (24 * 60 * dnum) - (60 * hnum);
		let mnum = Math.floor(minutes);
		if (String(mnum).length === 1) {
			mnum = "0" + mnum;
		}
		const seconds = (now - grt) / 1000 - (24 * 60 * 60 * dnum) - (60 * 60 * hnum) - (60 * mnum);
		let snum = Math.round(seconds);
		if (String(snum).length === 1) {
			snum = "0" + snum;
		}
		document.getElementById("timeDate").innerHTML = "本站安全运行&nbsp" + dnum + "&nbsp天";
		document.getElementById("times").innerHTML = hnum + "&nbsp小时&nbsp" + mnum + "&nbsp分&nbsp" + snum + "&nbsp秒";
	}
	setInterval(update, 1000);
})();
