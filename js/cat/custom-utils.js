/**
 * @description:
 * @author: bubao
 * @date: 2021-01-24 21:12:08
 * @last author: bubao
 * @last edit time: 2021-01-27 08:52:38
 */
// eslint-disable-next-line no-undef
Fluid.utils.transition = function(target, type, complete) {
	let animation = {};
	let display = "none";
	switch (type) {
		case 0:
			animation = { opacity: [1, 0] };
			break;
		case 1:
			animation = { opacity: [0, 1] };
			display = "block";
			break;
		case "bounceUpIn":
			animation = {
				begin: function(anim) {
					target.display("block");
				},
				translateY: [
					{ value: -60, duration: 200 },
					{ value: 10, duration: 200 },
					{ value: -5, duration: 200 },
					{ value: 0, duration: 200 }
				],
				opacity: [0, 1]
			};
			display = "block";
			break;
		case "shrinkIn":
			animation = {
				begin: function(anim) {
					target.display("block");
				},
				scale: [
					{ value: 1.1, duration: 300 },
					{ value: 1, duration: 200 }
				],
				opacity: 1
			};
			display = "block";
			break;
		case "slideRightIn":
			animation = {
				begin: function(anim) {
					target.display("block");
				},
				translateX: [100, 0],
				opacity: [0, 1]
			};
			display = "block";
			break;
		case "slideRightOut":
			animation = {
				translateX: [0, 100],
				opacity: [1, 0]
			};
			break;
		default:
			animation = type;
			display = type.display;
			break;
	}
	// eslint-disable-next-line no-undef
	anime(
		Object.assign(
			{
				targets: target,
				duration: 200,
				easing: "linear"
			},
			animation
		)
	).finished.then(function() {
		target.display(display);
		complete && complete();
	});
};
