document.addEventListener("DOMContentLoaded", () => {
	let autoLogin = true;

	let svgBackground = document.getElementById("background");

	window.addEventListener("resize", setBackgroundSize);

	setBackgroundSize();

	const Notify = new Notifier("TopLeft");

	let body = document.getElementsByTagName("body")[0];

	if(detectMobile()) {
		body.id = "mobile";
	} else {
		body.id = "desktop";
	}

	let ip = document.getElementById("span-ip").textContent;
	let port = document.getElementById("span-port").textContent;

	let gradientStops = {
		stop1: document.getElementById("stop-1"),
		stop2: document.getElementById("stop-2"),
		stop3: document.getElementById("stop-3")
	};

	let socket = io.connect(`http://${ip}:${port}`);

	let divLogin = document.getElementById("login-wrapper");
	let divApp = document.getElementById("app-wrapper");

	let buttonServer = document.getElementById("server-button");

	let inputUsername = document.getElementById("input-username");

	let buttonRandomUsername = document.getElementById("random-username-button");
	let buttonConfirmUsername = document.getElementById("confirm-username-button");

	let buttonLogout = document.getElementById("logout-button");

	let savedUsername = localStorage.getItem("username");
	if(!empty(savedUsername)) {
		inputUsername.value = savedUsername;
	}

	buttonServer.addEventListener("click", () => {
		if(buttonServer.classList.contains("active") || buttonServer.classList.contains("processing")) {
			socket.disconnect();
		} else {
			socket.connect();

			if(divLogin.classList.contains("hidden") && !empty(localStorage.getItem("username"))) {
				socket.emit("register", localStorage.getItem("username"));
			}
		}
	});

	inputUsername.addEventListener("keydown", (event) => {
		if(event.key.toLowerCase() === "enter") {
			buttonConfirmUsername.click();
		}
	});

	buttonRandomUsername.addEventListener("click", () => {
		socket.emit("random-username");
	});

	buttonConfirmUsername.addEventListener("click", () => {
		socket.emit("register", inputUsername.value);
	});

	buttonLogout.addEventListener("click", () => {
		socket.emit("logout");
	});

	socket.on("connect", () => {
		if(autoLogin && !empty(savedUsername) && !divLogin.classList.contains("hidden") && !empty(inputUsername.value)) {
			setTimeout(() => buttonConfirmUsername.click(), 625);
		}

		setStatus("Connected");
	});

	socket.on("disconnect", () => {
		setStatus("Disconnected");
	});

	socket.on("reconnection_attempt", () => {
		setStatus("Reconnecting");
	});

	socket.on("reconnect", () => {
		setStatus("Connected");
	});

	socket.on("ping", () => {
		socket.emit("pong");
	});

	socket.on("set-ip", ip => {
		localStorage.setItem("ip", ip);
	});

	socket.on("login", username => {
		if(empty(localStorage.getItem("privateKey")) || empty(localStorage.getItem("publicKey"))) {
			CryptoFD.generateRSAKeys().then(keys => {
				localStorage.setItem("privateKey", keys.privateKey);
				localStorage.setItem("publicKey", keys.publicKey);

				socket.emit("set-key", keys.publicKey);
			}).catch(error => {
				console.log(error);

				Notify.error({
					title: "RSA Keys",
					description: "Couldn't generate public/private key pair."
				});
			});
		} else {
			socket.emit("set-key", localStorage.getItem("publicKey"));
		}

		login(username);
	});

	socket.on("logout", () => {
		logout();
	});

	socket.on("notify", notification => {
		Notify.info(notification);
	});

	socket.on("random-username", username => {
		inputUsername.value = username;
	});

	socket.on("username-invalid", () => {
		Notify.error({
			title: "Username Invalid",
			description: "Please only use letters and numbers."
		});
	});

	socket.on("username-taken", () => {
		Notify.error({
			title: "Username Taken",
			description: "That username isn't available."
		});
	});

	socket.on("client-list", clients => {
		console.log(clients);
	});

	socket.on("set-color", colors => {
		let gradientStopKeys = Object.keys(gradientStops);
	
		for(let i = 0; i < gradientStopKeys.length; i++) {
			gradientStops[gradientStopKeys[i]].setAttribute("stop-color", colors[i]);
		}

		svgBackground.style.background = colors[2];
	});

	function login(username) {
		buttonServer.style.left = "120px";

		localStorage.setItem("username", username);

		divApp.classList.remove("hidden");

		divLogin.style.opacity = 0;
		
		setStatus("Connected");

		setTimeout(() => {
			divLogin.removeAttribute("style");
			divLogin.classList.add("hidden");
			
			inputUsername.value = "";
		}, 250);
	}

	function logout() {
		buttonServer.removeAttribute("style");

		localStorage.removeItem("username");

		divApp.style.opacity = 0;

		divLogin.style.zIndex = 1;
		divLogin.classList.remove("hidden");

		setStatus("Connected");

		setTimeout(() => {
			divApp.removeAttribute("style");
			divApp.classList.add("hidden");

			divLogin.removeAttribute("style");
		}, 250);
	}

	function setStatus(status) {
		let content = `${ip}:${port} | ${status}`;
		if(!divApp.classList.contains("hidden") && !empty(localStorage.getItem("username"))) {
			content = `${ip}:${port} | ${status} as ${localStorage.getItem("username")}`;
		}

		buttonServer.textContent = content;

		switch(status) {
			case "Connected":
				buttonServer.classList.add("active");
				buttonServer.classList.remove("processing");
				break;
			case "Reconnecting":
				buttonServer.classList.remove("active");
				buttonServer.classList.add("processing");
				break;
			case "Disconnected":
				buttonServer.classList.remove("active");
				buttonServer.classList.remove("processing");
				break;
		}
	}

	function setBackgroundSize() {
		if(window.innerWidth + 300 > window.innerHeight) {
			svgBackground.setAttribute("viewBox", `0 0 2000 ${window.innerHeight}`);
		} else {
			svgBackground.setAttribute("viewBox", `0 0 ${window.innerWidth} 1500`);
		}
	}
});

function detectMobile() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}