const PermissionManager = require("./PermissionManager");
const UploadManager = require("./UploadManager");
const DBAdapter = require("./DBAdapter");
const utils = require("./Utils");

module.exports = class ConnectionManager {
	constructor(io, db, clientLimit = 64, pingInterval = 2500) {
		this.io = io;
		this.db = db;
		this.clientLimit = clientLimit;
		this.clients = {};

		this.ping = setInterval(() => {
			this.io.to("network").emit("ping");
		}, pingInterval);
	}

	attach(socket) {
		let address = socket.handshake.address;

		socket.on("disconnect", async () => {
			socket.leave("network");

			this.clients[address]?.permissionManager.off("change");

			await this.removeClient(address);
		});

		socket.on("set-key", async key => {
			this.clients[address]["key"] = key;
				
			await this.saveClients();
			await this.broadcastList();
		});
	}

	async broadcastList(changed = false) {
		let clients = await this.getClients();
		this.io.to("network").emit("client-list", clients);

		if(changed) {
			let list = [];
			Object.keys(clients).map(ip => {
				list.push(`${ip} => ${clients[ip]["username"]}`);
			});

			console.log(utils.epoch(), ": \x1b[33m", list, "\x1b[0m");
		}
	}

	async getClients() {
		let clients = await this.db.fetch("clients");
		return clients.data;
	}

	clientExists(address) {
		return Object.keys(this.clients).includes(address);
	}

	usernameTaken(username) {
		Object.keys(this.clients).map(ip => {
			if(username.toLowerCase() === this.clients[ip]["username"].toLowerCase()) {
				return true;
			}
		});

		return false;
	}

	clientLimitReached() {
		return (Object.keys(this.clients).length >= this.clientLimit);
	}

	async saveClients() {
		let clients = DBAdapter.adapt(this.clients);

		try {
			await this.db.save("clients", clients, false);
		} catch(error) {
			await this.db.save("clients", clients, true);

			if(error.status !== 409) {
				console.log(error);
			}
		}
	}

	async addClient(socket, username) {
		if(!this.clientLimitReached()) {
			let address = socket.handshake.address;

			if(this.clientExists(address)) {
				await this.removeClient(address);
			}

			socket.join("network");

			let color = utils.getColor(address, this.clients);
			
			let permissionManager = new PermissionManager(this);
			permissionManager.attach(socket);
			
			let uploadManager = new UploadManager(this, permissionManager);
			uploadManager.attach(socket);

			permissionManager.on("change", (state) => {
				this.clients[address]["permissionManager"] = state;
				uploadManager.updatePermissionManager(state);
			});

			this.clients[address] = { socket:socket, username:username, key:null, uploadManager:uploadManager, permissionManager:permissionManager, color:color.index };

			this.attach(socket);

			socket.emit("set-color", color.colors);
			socket.emit("login", username);

			await this.saveClients();
			await this.broadcastList(true);
		} else {
			socket.emit("notify", { 
				title: "Limit Reached", 
				description: "Maximum number of devices are connected to the server.", 
				duration: 30000, 
				background: "rgb(230,20,20)",
				color: "rgb(255,255,255)"
			});
		}
	}

	async removeClient(address) {
		delete this.clients[address];

		await this.saveClients();
		await this.broadcastList(true);
	}
}