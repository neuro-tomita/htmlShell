/*!
 * PureHtmlSinglePageAppSystem
 * 2019 Neuro Technology Corporation
 * tomita
 * 2019/06-
 * version 0.1.0
 */

const htmlShell = {
	config: {
		lisnerEvents: ["click", "dblclick", "change", "transitionend", "submit", "keydown",
			"keyup", "focus", "blur", "mouseover", "mouseout", "mouseleave", "mouseenter"],
		dialogBgID: "dialog_bg",
		hiddenClass: "hidden",
		fadeoutClass: "fadeOut",
	},
	requestBefore: [],
	requestAfter: [],
	targetHooks: [],
	addRequestParamHooks: [],
	bodyExecute: function (doc) {
		let els = doc.querySelectorAll('link[rel="_module"]');
		for (let i = 0; i < els.length; i++) {
			htmlShell.excuteEvent(els[i], null);
		}
	},
	excuteEvent: function (thisEl, params, eventName = '') {
		if (thisEl.hasAttribute("data-event" + (eventName == '' ? "" : "-" + eventName))) {
			if (!htmlShell.dataEvent(thisEl, eventName)) {
				return;
			}
		}
		var url = "";
		if (thisEl.tagName == "FORM") {
			url = thisEl.getAttribute('action');
		} else if (thisEl.hasAttribute("data-url" + (eventName == '' ? "" : "-" + eventName))) {
			url = thisEl.getAttribute('data-url' + (eventName == '' ? "" : "-" + eventName));
		} else if (thisEl.hasAttribute("href")) {
			url = thisEl.getAttribute('href');
		}
		if (url != "") {
			if (params == null) {
				params = new FormData();
			}
			if ((thisEl.hasAttribute("name")) & (thisEl.hasAttribute("value"))) {
				params.append(thisEl.getAttribute('name'), thisEl.getAttribute('value'));
			}
			if (thisEl.hasAttribute("data-params" + (eventName == '' ? "" : "-" + eventName))) {
				var paramKeys = thisEl.getAttribute("data-params" + (eventName == '' ? "" : "-" + eventName)).split(" ");
				for (var k = 0; k < paramKeys.length; k++) {

					const m = paramKeys[k].match(/^(.+?)\[(.*)\]$/);
					const names = m[2].split(',');
					var rootEl = htmlShell.getElement(m[1], thisEl);
					for (var i = 0; i < names.length; i++) {
						var nowEls = rootEl.querySelectorAll("[name='" + names[i] + "']");
						for (var j = 0; j < nowEls.length; j++) {
							let value = nowEls[j].value;
							if (nowEls[j].getAttribute('type') == 'checkbox') {
								value = nowEls[j].checked;
							}
							params.append(names[i], value);
						}
					}
				}
			}
			var param = url.replace(/^[^\?]+\?/, "")
			var searchParams = new URLSearchParams(param);
			searchParams.forEach(function (value, key) {
				params.append(key, value);
			});

			htmlShell.addRequestParamHooks.forEach(function (paramsHook) {
				paramsHook(params);
			});

			url = url.replace(/\?.*$/, "");
			var target = thisEl.getAttribute('data-target' + (eventName == '' ? "" : "-" + eventName));
			if (target == null) {
				target = '';
			}
			isNextTarget = true;
			htmlShell.targetHooks.forEach(handler => {
				if (!handler(target, thisEl, params, eventName)) {
					isNextTarget = false;
				}
			});
			if (isNextTarget) {
				var functions = {
					'success': function (xht) {
						var targetEl = thisEl.closest("#dialog");
						if (targetEl != null) {
							targetEl.addEventListener("transitionend", function (e) {
								if (e.target.parentNode != null) {
									e.target.parentNode.removeChild(e.target);
								}
							});
							if (document.getElementById(htmlShell.config.dialogBgID) != null) {
								document.getElementById(htmlShell.config.dialogBgID).addEventListener("transitionend", function (e) {
									e.target.parentNode.removeChild(e.target);
								});
							}
							targetEl.classList.add(htmlShell.config.fadeoutClass);
							document.getElementById(htmlShell.config.dialogBgID).parentNode.removeChild(document.getElementById(htmlShell.config.dialogBgID));
						}
						var parser = new DOMParser();
						var doc = parser.parseFromString(xht.responseText, "text/html");
						htmlShell.bodyExecute(doc);
						if (doc.body.hasAttribute("data-target" + (eventName == '' ? "" : "-" + eventName))) {
							target = doc.body.getAttribute("data-target" + (eventName == '' ? "" : "-" + eventName));
						}
						if (target == null) {
							target = "_pageNew_content";
						}
						var newBodys = doc.querySelectorAll('[data-body]');
						if (newBodys.length != 0) {
							for (let i = 0; i < newBodys.length; i++) {
								htmlShell.dataTarget(target, newBodys[i], thisEl, eventName);
							}
						} else {
							let title = doc.body.querySelector('title');
							if (title != null) {
								title.remove();
							}
							let meta = doc.body.querySelector('meta');
							if (meta != null) {
								meta.remove();
							}
							htmlShell.dataTarget(target, doc.body, thisEl, eventName);
						}
					}
				};
				functions.params = params;
				if (thisEl.tagName == "INPUT" && thisEl.type == "file") {
					for (let i = 0; i < thisEl.files.length; i++) {
						params.append(thisEl.name || 'file-' + i, thisEl.files[i]);
					}
					fetch(url, {
						method: "GET",
						body: params,
					})
						.then(res => res.text())
						.then(html => {
							var xhrContener = {};
							xhrContener.responseText = html;
							functions.success(xhrContener);
						})
						.catch(error => {
							window.alert("サーバとの通信でエラーが発生しました" + error);
						});
				} else {
					htmlShell.requestBefore.forEach(element => {
						functions = element(functions);
					});
					htmlShell.getAjax(url, functions);
				}
			}
		}
	},
	dataTarget: function (target, doc, thisEl, eventName) {
		var actionEl;
		if (doc.children.length == 0) {
			return;
		}
		if (target.startsWith("_pageNew")) {
			var targetEl = htmlShell.getElement(target.split("_")[2], thisEl);
			htmlShell.changeId(doc, targetEl.childElementCount);

			for (let i = 0; i < targetEl.children.length; i++) {
				targetEl.children[i].classList.add(htmlShell.config.hiddenClass);
			}

			var addDoc = document.createElement('div');
			var attrs = doc.attributes;
			for (var i = 0; i < attrs.length; i++) {
				addDoc.setAttribute(attrs[i].name, attrs[i].value);
			}

			while (doc.children.length != 0) {
				addDoc.appendChild(doc.children[0]);
			}

			if (addDoc.getAttribute('title') != null) {
				document.getElementsByTagName('title')[0].textContent = addDoc.getAttribute('title');
			}
			actionEl = targetEl.appendChild(addDoc);
			doc = addDoc;
		} else if (target.startsWith("_pageChange")) {
			var targetEl = htmlShell.getElement(target.split("_")[2], thisEl);
			htmlShell.changeId(doc, targetEl.childElementCount);
			if (targetEl.firstElementChild.id == doc.id) {
				var tarElHeight = targetEl.firstElementChild.firstElementChild.getBoundingClientRect().height;
				var scrollTopList = [];
				const elements = targetEl.firstElementChild.querySelectorAll('*');
				for (const el of elements) {
					if (!el.scrollHeight) continue;
					const style = getComputedStyle(el);
					const overflowY = style.overflowY;
					if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
						scrollTopList.push({
							'scrollTop': el.scrollTop,
							'scrollHeight': el.scrollHeight
						});
					}
				}
			}
			targetEl.lastElementChild.remove();
			for (let i = 0; i < targetEl.children.length; i++) {
				targetEl.children[i].classList.add(htmlShell.config.hiddenClass);
			}

			var addDoc = document.createElement('div');
			var attrs = doc.attributes;
			for (var i = 0; i < attrs.length; i++) {
				addDoc.setAttribute(attrs[i].name, attrs[i].value);
			}

			while (doc.children.length != 0) {
				addDoc.appendChild(doc.children[0]);
			}

			if (addDoc.getAttribute('title') != null) {
				document.getElementsByTagName('title')[0].textContent = addDoc.getAttribute('title');
			}
			actionEl = targetEl.appendChild(addDoc);
			doc = addDoc;
			if (scrollTopList != null) {
				const scrollElements = targetEl.firstElementChild.querySelectorAll('*');
				let index = 0;
				for (const el of scrollElements) {
					const style = getComputedStyle(el);
					const overflowY = style.overflowY;
					if (overflowY === 'auto' || overflowY === 'scroll') {
						if (!el.scrollHeight) continue;
						if (Math.abs(scrollTopList[index].scrollHeight - el.scrollHeight) < 10) {
							el.scrollTop = scrollTopList[index].scrollTop;
						}
						index++;
					}
				}
			}
		} else if (target.startsWith("_pageFirst")) {
			var targetEl = htmlShell.getElement(target.split("_")[2], thisEl);
			htmlShell.changeId(doc, targetEl.childElementCount);
			var clone = targetEl.cloneNode(false);
			targetEl.parentNode.replaceChild(clone, targetEl);
			targetEl = clone;

			var addDoc = document.createElement('div');
			var attrs = doc.attributes;
			for (var i = 0; i < attrs.length; i++) {
				addDoc.setAttribute(attrs[i].name, attrs[i].value);
			}

			while (doc.children.length != 0) {
				addDoc.appendChild(doc.children[0]);
			}

			if (addDoc.getAttribute('title') != null) {
				document.getElementsByTagName('title')[0].textContent = addDoc.getAttribute('title');
			}
			actionEl = targetEl.appendChild(addDoc);
			doc = addDoc;
		} else if (target.startsWith("_change")) {
			var targetEl = htmlShell.getElement(target.split("_")[2], thisEl);

			targetEl.textContent = null;
			var attrs = doc.attributes;
			for (var i = 0; i < attrs.length; i++) {
				targetEl.setAttribute(attrs[i].name, attrs[i].value);
			}

			while (doc.children.length != 0) {
				targetEl.parentNode.appendChild(doc.children[0]);
			}
			if (doc.getAttribute('title') != null) {
				document.getElementsByTagName('title')[0].textContent = doc.getAttribute('title');
			}
			actionEl = targetEl;
		} else if (target.startsWith("_dialog")) {
			var bg = document.getElementById(htmlShell.config.dialogBgID);

			if (bg != null) {
				bg.parentNode.removeChild(bg);
			}

			bg = document.createElement('div');
			var addDoc = document.createElement('div');
			var attrs = doc.attributes;
			for (var i = 0; i < attrs.length; i++) {
				addDoc.setAttribute(attrs[i].name, attrs[i].value);
			}
			while (doc.children.length != 0) {
				addDoc.appendChild(doc.children[0]);
			}

			bg.id = htmlShell.config.dialogBgID;
			document.body.appendChild(bg);

			actionEl = document.body.appendChild(addDoc);
		} else if (target.startsWith("_addElement")) {
			var targetEl = htmlShell.getElement(target.split("_")[2], thisEl)
			var attrs = doc.attributes;
			for (var i = 0; i < attrs.length; i++) {
				targetEl.setAttribute(attrs[i].name, attrs[i].value);
			}
			while (doc.children.length != 0) {
				targetEl.appendChild(doc.children[0]);
			}
			if (doc.hasAttribute("data-event" + (eventName == '' ? "" : "-" + eventName))) {
				targetEl.lastElementChild.setAttribute('data-event' + (eventName == '' ? "" : "-" + eventName),
					doc.getAttribute('data-event' + (eventName == '' ? "" : "-" + eventName)));
			}
			doc = targetEl.lastElementChild;
			actionEl = targetEl;
		}
		for (var i = 0; i < htmlShell.dataTarget.after.length; i++) {
			htmlShell.dataTarget.after[i](doc, thisEl, eventName);
		}
	},
	getElement: function (elName, tarEl, isArray) {
		if (isArray == null) {
			isArray = false;
		}
		if (elName.startsWith("!")) {
			var name = elName.replace("!", "");
			var retEl = tarEl;
			var isCustum = true;
			while (isCustum) {
				if (name.startsWith("parent")) {
					retEl = retEl.parentNode;
					name = name.substr(7);
				} else if (name.startsWith("next")) {
					retEl = retEl.nextElementSibling;
					name = name.substr(5);
				} else if (name.startsWith("before")) {
					retEl = retEl.previousElementSibling;
					name = name.substr(7);
				} else if (name.startsWith("closest")) {
					name = name.substr(8);
					var closet = name;
					if (~closet.indexOf('>')) {
						name = closet.substring(closet.indexOf('>') + 1);
						closet = closet.substring(0, closet.indexOf('>'));
					} else {
						name = '';
					}
					retEl = retEl.closest(closet);
				} else {
					isCustum = false;
				}
			}
			if (name != "") {
				if (isArray) {
					retEl = retEl.querySelectorAll(name);
				} else {
					retEl = retEl.querySelector(name);
				}
			}
			return retEl;
		} else if (elName.startsWith("*")) {
			if (isArray) {
				return document.querySelectorAll(elName.substr(1));
			} else {
				return document.querySelector(elName.substr(1));
			}
		} else if (~elName.indexOf('-')) {
			var nameList = elName.split("-");
			var retEl = document.getElementById(nameList[0]);
			var tarNo = retEl.childElementCount - 1;
			return document.getElementById(nameList[1] + "-" + tarNo);
		} else {
			return document.getElementById(elName);
		}
	},
	changeId: function (doc, pageNo) {
		var hasIdEl = doc.querySelectorAll("[id]");
		for (let i = 0; i < hasIdEl.length; i++) {
			hasIdEl[i].id += "-" + pageNo;
		}
	},
	dataEvent: function (tarEl, eventName = '') {
		var actionKey = tarEl.getAttribute("data-event" + (eventName == '' ? "" : "-" + eventName));
		var dataEvents = actionKey.split(" ");
		var isRet = true;
		for (var i = 0; i < dataEvents.length; i++) {
			var nowAction = dataEvents[i];
			if (nowAction.startsWith("_clear_")) {
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				if (targetEl != null) {
					targetEl.textContent = null;
				}
			} else if (nowAction.startsWith("_addClass_")) {
				var actions = nowAction.split('_');
				var targetEl = htmlShell.getElement(actions[2], tarEl);
				if (targetEl != null) {
					targetEl.classList.add(actions[3]);
				}
			} else if (nowAction.startsWith("_removeClass_")) {
				var actions = nowAction.split('_');
				var targetEl = htmlShell.getElement(actions[2], tarEl);
				if (targetEl != null) {
					targetEl.classList.remove(actions[3]);
				}
			} else if (nowAction.startsWith("_toggleClass_")) {
				var actions = nowAction.split('_');
				var targetEl = htmlShell.getElement(actions[2], tarEl);
				targetEl.classList.toggle(actions[3]);
			} else if (nowAction.startsWith("_toggle_")) {
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				if (targetEl != null) {
					if (targetEl.textContent != "") {
						targetEl.textContent = null;
						isRet = false;
					}
				}
			} else if (nowAction == "_close_dialog") {
				var targetEl = document.getElementById("dialog");
				var targetParent = targetEl.parentNode;
				targetEl.addEventListener("transitionend", function (e) {
					targetParent.removeChild(targetEl);
					if (document.getElementById(htmlShell.config.dialogBgID) != null) {
						targetParent.removeChild(document.getElementById(htmlShell.config.dialogBgID));
					}
				});
				targetEl.classList.add(htmlShell.config.fadeoutClass);
			} else if (nowAction == "_close_app") {
				window.onbeforeunload = null;
				window.open('about:blank', '_self').close();
			} else if (nowAction.startsWith("_close_")) {
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				if (targetEl != null) {
					if (htmlShell.hasTransition(targetEl)) {
						var targetParent = targetEl.parentNode;
						targetEl.classList.add(htmlShell.config.fadeoutClass);
						targetEl.addEventListener("transitionend", function (e) {
							targetParent.removeChild(targetEl);
							let children = targetParent.children;
							var viewEl = children[children.length - 1];
							if (viewEl != null) {
								viewEl.classList.remove(htmlShell.config.hiddenClass);
							}
						});
					} else {
						targetEl.classList.add(htmlShell.config.hiddenClass);
					}
				}
			} else if (nowAction.startsWith("_pageBackFirst")) {
				var dialogBg = document.getElementById(htmlShell.config.dialogBgID);
				if (dialogBg != null) {
					dialogBg.remove();
				}
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);

				while (targetEl.children.length != 1) {
					targetEl.children[targetEl.children.length - 1].remove();
				}
				targetEl.children[0].classList.remove(htmlShell.config.hiddenClass);
			} else if (nowAction.startsWith("_pageBack")) {
				var dialogBg = document.getElementById(htmlShell.config.dialogBgID);
				if (dialogBg != null) {
					dialogBg.remove();
				}
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				if (targetEl != null) {
					targetEl.lastElementChild.addEventListener("transitionend", function (e) {
						targetEl.lastElementChild.remove();
					});
					targetEl.lastElementChild.remove();
					for (var i = 0; i < targetEl.children.length; i++) {
						if (i >= targetEl.children.length - 1) {
							targetEl.children[i].classList.remove(htmlShell.config.hiddenClass);
						} else {
							targetEl.children[i].classList.add(htmlShell.config.hiddenClass);
						}
					}
				}
			} else if (nowAction.startsWith("_removes")) {
				var targetEls = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl, true);
				targetEls.forEach(targetEl => {
					if (targetEl != null) {
						tarEl = targetEl.parentNode;
						if (targetEl.classList.contains("panel")) {
							var targetParent = targetEl.parentNode;
							targetEl.addEventListener("transitionend", function (e) {
								targetEl.remove();
							});
							targetEl.classList.add(htmlShell.config.fadeoutClass);
						} else {
							targetEl.remove();
						}
					}
				});
				var dialogBg = document.getElementById(htmlShell.config.dialogBgID);
				if (dialogBg != null) {
					dialogBg.remove();
				}
			} else if (nowAction.startsWith("_remove")) {
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				if (targetEl != null) {
					tarEl = targetEl.parentNode;
					if (htmlShell.hasTransition(targetEl)) {
						var targetParent = targetEl.parentNode;
						targetEl.addEventListener("transitionend", function (e) {
							targetEl.remove();
						});
						targetEl.classList.add(htmlShell.config.fadeoutClass);
					} else {
						targetEl.remove();
					}
					var dialogBg = document.getElementById(htmlShell.config.dialogBgID);
					if (dialogBg != null) {
						dialogBg.remove();
					}
				}
			} else if (nowAction.startsWith("_show")) {
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				targetEl.classList.remove(htmlShell.config.hiddenClass);
				if (targetEl.classList.contains("panel")) {
					var dialogBg = document.getElementById(htmlShell.config.dialogBgID);
					if (dialogBg == null) {
						bg = document.createElement('div');
						bg.id = htmlShell.config.dialogBgID;
						document.body.appendChild(bg);
					}
					if (!targetEl.classList.contains("right") & !targetEl.classList.contains("left") &
						!targetEl.classList.contains("top") & !targetEl.classList.contains("bottom") &
						!targetEl.classList.contains("center")) {
						let clientRect = targetEl.parentNode.getBoundingClientRect();
						targetEl.firstElementChild.style.top = clientRect.top + "px";
					}
				}
			} else if (nowAction.startsWith("_hidden")) {
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				if (htmlShell.hasTransition(targetEl)) {
					var targetParent = targetEl.parentNode;
					targetEl.addEventListener("transitionend", function (e) {
						targetEl.classList.add(htmlShell.config.hiddenClass);
						targetEl.classList.remove(htmlShell.config.fadeoutClass);
					});
					targetEl.classList.add(htmlShell.config.fadeoutClass);
				} else {
					targetEl.classList.add(htmlShell.config.hiddenClass);
				}
				if (document.querySelectorAll(".panel:not(.hidden):not(.fadeOut),#dialog:not(.hidden)").length == 0) {
					var dialogBg = document.getElementById(htmlShell.config.dialogBgID);
					if (dialogBg != null) {
						dialogBg.remove();
					}
				}
			} else if (nowAction.startsWith("_replace")) {
				var fromEl = htmlShell.getElement(nowAction.split("_")[2], tarEl);
				var targetEl = htmlShell.getElement(nowAction.split("_")[3], tarEl);
				targetEl.textContent = null;
				targetEl.appendChild(fromEl);
			} else if (nowAction.startsWith("_execute")) {
				var fromEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				htmlShell.excuteEvent(fromEl, null, eventName);
			} else if (nowAction.startsWith("_focus")) {
				var fromEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				if (fromEl != null) {
					fromEl.focus();
				}
			} else if (nowAction.startsWith("_reload")) {
				location.reload();
			} else if (nowAction.startsWith("_checkboxHidden_")) {
				var targetEl = htmlShell.getElement(nowAction.substring(nowAction.indexOf('_', 1) + 1), tarEl);
				if (tarEl.checked) {
					targetEl.classList.add(htmlShell.config.hiddenClass);
				} else {
					targetEl.classList.remove(htmlShell.config.hiddenClass);
				}
			} else if (nowAction.startsWith("_fireEvent_")) {
				var actions = nowAction.split('_');
				var targetEl = htmlShell.getElement(actions[2], tarEl);
				if (actions[3] == 'click') {
					targetEl.click();
				} else {
					var event = new Event(actions[3]);
					targetEl.dispatchEvent(event);
				}
			}
		}
		if (!(htmlShell.dataEvent.after == null)) {
			for (var i = 0; i < htmlShell.dataEvent.after.length; i++) {
				if (!htmlShell.dataEvent.after[i](tarEl, dataEvents, eventName)) {
					isRet = false;
				}
			}
		}
		return isRet;
	},
	getAjax: function (url, functions) {
		// fetch APIで書き換え
		let sendText = "";
		if ('params' in functions) {
			// FormDataをURLエンコード形式に変換
			let params = functions.params;
			if (params instanceof FormData) {
				let arr = [];
				for (let [key, value] of params.entries()) {
					arr.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
				}
				sendText = arr.join("&");
			} else if (typeof params === "object") {
				// 念のためオブジェクト対応
				sendText = Object.keys(params).map(key =>
					encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
				).join("&");
			}
		}

		let controller = new AbortController();
		let timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

		let loadingTimeout = setTimeout(function () {
			if ((functions.loading == null) | (functions.loading)) {
				var loading = document.createElement('div');
				loading.id = 'loading';
				document.body.appendChild(loading)
			}
		}, 800);

		if ('before' in functions) {
			functions.before(null); // fetchはxhrオブジェクトが無いのでnull
		}

		fetch(url, {
			method: "POST",
			headers: {
				"Content-type": "application/x-www-form-urlencoded",
				"Cache-Control": "no-cache"
			},
			body: sendText,
			signal: controller.signal
		})
			.then(response => {
				clearTimeout(timeoutId);
				if (loadingTimeout != null) clearTimeout(loadingTimeout);
				let loading = document.getElementById('loading');
				if (loading != null) loading.parentNode.removeChild(loading);

				if (!response.ok) {
					let error = new Error("HTTP error " + response.status);
					error.response = response;
					throw error;
				}
				return response.text().then(text => {
					// 疑似xhrオブジェクト
					let xhr = {
						status: response.status,
						responseText: text
					};
					htmlShell.requestAfter.forEach(element => {
						element(xhr);
					});
					if ('success' in functions) {
						functions.success(xhr);
					}
					if ('complete' in functions) {
						functions.complete(xhr);
					}
				});
			})
			.catch(error => {
				if (loadingTimeout != null) clearTimeout(loadingTimeout);
				let loading = document.getElementById('loading');
				if (loading != null) loading.parentNode.removeChild(loading);

				let xhr = { status: 0, responseText: error.message };
				if (error.name === 'AbortError') {
					if ('timeout' in functions) {
						functions.timeout(xhr);
					} else {
						window.alert("サーバとの通信がタイムアウトしました");
					}
				} else if ('error' in functions) {
					functions.error(xhr);
				} else {
					window.alert("サーバとの通信でエラーが発生しました" + error.message);
					location.reload();
				}
				if ('complete' in functions) {
					functions.complete(xhr);
				}
			});
	},
	hasTransition: function (el) {
		const d = parseFloat(getComputedStyle(el).getPropertyValue('transition-duration')) || 0;
		return d > 0;
	}
};

htmlShell.dataTarget.after = [];
htmlShell.dataEvent.after = [];

document.addEventListener("DOMContentLoaded", function (event) {
	htmlShell.config.lisnerEvents.forEach(function (eventName) {
		document.addEventListener(eventName, e => {
			// e.targetがエレメントでなければキャンセル
			if (!(e.target instanceof Element)) return;

			const targetSelectorOld = `[data-event], [data-url], [data-target], [url], [action], [href]`;
			const targetSelector = targetSelectorOld + `, [data-event-${eventName}], [data-url-${eventName}], [data-target-${eventName}]`;
			const el = e.target.matches(targetSelector) ? e.target : e.target.closest(targetSelector);

			if (!el) return;
			if (el.matches(targetSelectorOld)) {
				if (eventName == "submit") {
					htmlShell.excuteEvent(el, new FormData(el), '');
					e.preventDefault();
				} else if ((eventName == "change") && (el.tagName == "SELECT")) {
					var formData = new FormData();
					formData.append("value", el.value);
					htmlShell.excuteEvent(el, formData, '');
					e.preventDefault();

				} else if ((eventName == "change") && (el.tagName == "INPUT")) {
					el.blur();
					var formData = new FormData();
					formData.append("value", el.value);
					if (el.type == 'file') {
						for (let j = 0; j < el.files.length; j++) {
							formData.append('file-' + j, el.files[j]);
						}
					}
					htmlShell.excuteEvent(el, formData, '');
					e.preventDefault();

				} else if (eventName == "click") {
					if ((el.tagName != "FORM") && (el.tagName != "BODY") && (el.tagName != "HTML")) {
						// target|data-targetが_blankの場合は新しいタブで開く
						if ((el.getAttribute('target') == '_blank') || (el.getAttribute('data-target') == '_blank')) {
							window.open(el.getAttribute('href') || el.getAttribute('data-url'), '_blank');
						} else {
							htmlShell.excuteEvent(el, null, '');
							e.preventDefault();
						}
					}
				}
			} else {
				console.log(`Event: ${eventName}, Element: ${el.tagName}, ID: ${el.id}, Class: ${el.className}`);
				if ((el.tagName != "BODY") && (el.tagName != "HTML")) {
					htmlShell.excuteEvent(el, null, eventName);
					e.preventDefault();
				}
			}

		}, true);
	});
	window.onkeydown = function (e) {
		if (e.keyCode == 13) {
			if (e.target.classList.contains("goReturn")) {
				return true;
			} else if ((e.target != null) && (e.target.type == 'textarea')) {
				return true;
			} else {
				var offset = 1;
				if (e.shiftKey) {
					offset = -1;
				}
				var next = e.target.nextElementSibling;
				if (next != null) {
					next.focus();
				} else {
					e.target.blur();
				}
				return false;
			}
		} else if (e.keyCode == 8) {
			if ((e.target.tagName == "INPUT" && e.target.type == "text") || e.target.tagName == "TEXTAREA") {
				// 入力できる場合は制御しない
				if (!e.target.readOnly && !e.target.disabled) {
					return true;
				}
			}
			return false;
		}
	};

});
