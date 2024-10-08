// node graph library made by me (carter)

// --- CONSTANTS ---
const DEFAULT_RADIUS = 30;

const LINK_COLOR = "#777";
const LINK_WIDTH = 4;

const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT = 200;
const TOOLTIP_OUTLINE_WIDTH = 3;
const TOOLTIP_TEXT_TOLERANCE = 15;
const TOOLTIP_FONT_SIZE = 12;
const TOOLTIP_LINE_HEIGHT = 22;
const TOOLTIP_X_OFFSET = 8;
const TOOLTIP_Y_OFFSET = 14;

const FPS_TEXT_SIZE = 12;
const FPS_X_OFFSET = 10; 
const FPS_Y_OFFSET = 15;

const PHYSICS_RANDOM_RANGE = 100;
const PHYSICS_RANDOM_LARGE = 50;
const PHYSICS_CONNECTION_ATTRACTION = 100;
const PHYSICS_MAX_REPEL = 300;
const PHYSICS_VELOCITY_DIVISOR = 1000;

const NODE_TEXT_SIZE = 12;
const NODE_TEXT_X_OFFSET = 7;
const NODE_TEXT_Y_OFFSET = 14;
const NODE_CLICK_OFFSET = 10;

// --- HELPER FUNCTIONS ---
const getLines = (ctx, text, maxWidth) => { // from https://stackoverflow.com/a/16599668
    var words = text.split(" ");
    var lines = [];
    var currentLine = words[0];

    for (var i = 1; i < words.length; i++) {
        var word = words[i];
        var width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

// --- CLASSES ---
class Vector2d {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    center(v) {
        return new Vector2d(
            (this.x + v.x) / 2,
            (this.y + v.y) / 2
        )
    }
}

class Camera extends Vector2d {
    constructor(x, y, zoom) {
        super(x, y);
        this.zoom = zoom;
    }

    transform(v) {
        return new Vector2d(
            v.x / this.zoom - this.x,
            v.y / this.zoom - this.y
        );
    }
}

class GraphData {
    nodes = [];
    connections = [];

    constructor(jsondata, beedata, nodes, connections) {
        this.jsondata = jsondata;
        this.beedata = beedata;
        this.nodes = nodes;
        this.connections = connections;
    }

    static fromJSON(data) {
        let nodesInternal = [];
        data.nodes.forEach(node => {
            nodesInternal.push(new Node(
                node.x,
                node.y,
                DEFAULT_RADIUS,
                node.name,
                false,
                node.text,
                node.link
            ));
        });
        
        return new this(data, null, nodesInternal, data.connections);
    }

    static fromBee(data) {
        let nodesInternal = [];
        let connectionsInternal = [];
        let state = 0;

        let splitData = data.split("\n");
        splitData.forEach(curLine => {
            switch (state) {
                case 0:
                    if (curLine.includes("### BEGIN NODES ###")) state = 1;
                    break;
                case 1:
                    if (curLine.includes("### BEGIN CONNECTIONS ###")) {
                        state = 2;
                        break;
                    }
                    //console.log(curLine);
                    let node = curLine.replaceAll("\r", "").split("|");
                    nodesInternal.push(new Node(
                        parseFloat(node[0]) ?? 0,
                        parseFloat(node[1]) ?? 0,
                        parseInt(node[2]) ?? DEFAULT_RADIUS,
                        node[3] ?? "",
                        node[4] == "false" ? false : true,
                        node[5] ?? "",
                        node[6] ?? ""
                    ));
                    break;
                case 2:
                    if (curLine.includes("### END BEE ###")) {
                        state = 3;
                        break;
                    }
                    //console.log(curLine);
                    connectionsInternal.push(curLine.replaceAll("\r", "").split("|"));
                    break;
                case 3:
                    break;
            }
        });

        return new this(null, data, nodesInternal, connectionsInternal);
    }

    toJSON() {
        let jsonData = {nodes: [], connections: this.connections};
        this.nodes.forEach(node => {
            let nodeData = {x: node.pos.x, y: node.pos.y, radius: node.radius, name: node.name, right: node.right};
            if (node.tooltip) nodeData.text = node.tooltip;
            if (node.link) nodeData.link = node.link;
            jsonData.nodes.push(nodeData);
        });

        return JSON.stringify(jsonData);
    }

    toBee() {
        let result = "";
        result += "### BEGIN NODES ###\n";
        this.nodes.forEach(node => {
            result += `${node.pos.x}|${node.pos.y}|${node.radius}|${node.name}|${node.right}|${node.tooltip}|${node.link}\n`;
        });
        result += "### BEGIN CONNECTIONS ###\n";
        this.connections.forEach(conn => {
            result += `${conn[0]}|${conn[1]}\n`;
        });
        result += "### END BEE ###\n";
        return result;
    }
}

class NodeGraph {
    mouseX = 99999;
    mouseY = 99999;
    mouseBtns = 0;
    lastMouseX = 99999;
    lastMouseY = 99999;
    lastMouseBtns = 0;
    lastFPS = 0;
    dragging = 0;
    draggingNode = 0;
    dragStart = 0;
    editing = false;
    connecting = false;
    connectingNode = -1;
    disconnecting = false;
    disconnectingNode = -1;
    editingNode = -1;
    physics = false;
    arrows = false;
    fps = 0;

    get nodes() {
        return this.data.nodes;
    }

    get connections() {
        return this.data.connections;
    }

    set connections(newValue) {
        this.data.connections = newValue;
    }

    get jsonData() {
        return this.data.toJSON();
    }

    get beeData() {
        return this.data.toBee();
    }

    constructor(canvas, backgroundColor, data, physics, arrows, editElem) {
        const ctx = canvas.getContext("2d");
        this.canvas = canvas;
        this.ctx = ctx;
        this.data = data;

        this.bg = backgroundColor;
        this.physics = physics;
        this.arrows = arrows;
        this.editBtn = editElem[0];
        this.connBtn = editElem[1];
        this.rcBtn = editElem[2];
        this.newBtn = editElem[3];
        this.rnBtn = editElem[4];
        this.editResult = editElem[5];
        this.editTable = editElem[6];
        this.dataElem = editElem.slice(7, editElem.length);
        this.cam = new Camera(-500, -250, 1);
        this.lastFPS = Date.now();
        
        if (this.editBtn) this.editBtn.addEventListener("click", this.editPressed.bind(this), false);
        if (this.connBtn) this.connBtn.addEventListener("click", (e=>{this.setConnecting(!this.connecting)}).bind(this), false);
        if (this.rcBtn) this.rcBtn.addEventListener("click", (e=>{this.setRemoveConnection(!this.disconnecting)}).bind(this), false);
        if (this.newBtn) this.newBtn.addEventListener("click", this.newPressed.bind(this), false);
        if (this.rnBtn) this.rnBtn.addEventListener("click", this.rnPressed.bind(this), false);

        canvas.addEventListener("mousemove", this.mouseUpdate.bind(this), false);
        canvas.addEventListener("mouseenter", this.mouseUpdate.bind(this), false);
        canvas.addEventListener("mousedown", this.mouseUpdate.bind(this), false);
        canvas.addEventListener("mouseup", this.mouseUpdate.bind(this), false);
        canvas.addEventListener("mosuescroll", this.scrollEvent.bind(this), false);
        canvas.addEventListener("DOMMouseScroll", this.scrollEvent.bind(this), false);
    }
    
    mouseUpdate(e) {
        this.mouseX = e.pageX;
        this.mouseY = e.pageY;
        this.mouseBtns = e.buttons;

        if (this.lastMouseBtns === 0 && this.mouseBtns === 1) {
            this.nodes.forEach((node, index) => {
                if (node.pointWithin(this.mouseX, this.mouseY, this.cam)) {
                    this.dragging = 2;
                    this.draggingNode = index;
                }
            });

            if (this.dragging === 0) this.dragging = 1;

            this.dragStart = Date.now();
        }

        if (this.lastMouseBtns === 1 && this.mouseBtns === 1) {
            let xDif = this.mouseX - this.lastMouseX;
            let yDif = this.mouseY - this.lastMouseY;
            if (this.dragging === 1) {
                this.cam.x -= xDif;
                this.cam.y -= yDif;
            } else if (this.dragging === 2) {
                this.nodes[this.draggingNode].pos.x += xDif * this.cam.zoom;
                this.nodes[this.draggingNode].pos.y += yDif * this.cam.zoom;
            }
        }

        if (this.lastMouseBtns === 1 && this.mouseBtns === 0) {
            if (Date.now() - this.dragStart < 100 && this.dragging === 2) {
                let dragged = this.nodes[this.draggingNode];
                if (this.connecting) {
                    if (this.connectingNode !== -1) {
                        this.connections.push([this.connectingNode, this.draggingNode]);
                        this.setConnecting(false);
                    } else {
                        this.connectingNode = this.draggingNode;
                    }
                }
                else if (this.disconnecting) {
                    if (this.disconnectingNode !== -1) {
                        this.connections = this.connections.filter(conn => (conn[0] !== this.disconnectingNode) || (conn[1] !== this.draggingNode)); // tanks js
                        this.setRemoveConnection(false);
                    } else {
                        this.disconnectingNode = this.draggingNode;
                    }
                }
                else if (this.editing) this.editingNode = this.draggingNode==this.editingNode ? -1 : this.draggingNode;
                else if (dragged.link) window.location = dragged.link;
            }

            this.dragging = 0;
        };
        
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
        this.lastMouseBtns = this.mouseBtns;
    }

    scrollEvent(e) {
        this.cam.zoom += this.cam.zoom / e.detail / 3;
    }

    editPressed(e) {
        if (!this.editing) {
            this.editing = true;
            this.editBtn.innerText = "finish";
            this.editTable.classList.remove("hidden");
            this.connBtn.classList.remove("hidden");
            this.rcBtn.classList.remove("hidden");
            this.newBtn.classList.remove("hidden");
            this.rnBtn.classList.remove("hidden");
        } else {
            this.editing = false;
            this.connecting = false;
            this.editBtn.innerText = "edit";
            this.editTable.classList.add("hidden");
            this.connBtn.classList.add("hidden");
            this.rcBtn.classList.add("hidden");
            this.newBtn.classList.add("hidden");
            this.rnBtn.classList.add("hidden");
            
            let r = this.beeData;
            //console.log(r);
            //console.log(this.editResult);
            this.editResult.textContent = r;

            this.editResult.classList.remove("hidden");
        }
    }

    newPressed(e) {
        if (this.editing) {
            this.nodes.push(new Node(
                (this.cam.x + 500) * this.cam.zoom,
                (this.cam.y + 250) * this.cam.zoom,
                DEFULAT_RADIUS,
                "",
                "",
                ""
            ));
            this.editingNode = this.nodes.length - 1;
        }
    }

    rnPressed(e) {
        if (this.editing && this.editingNode !== -1) {
            this.connections = this.connections.filter(conn => (conn[0] !== this.editingNode) && (conn[1] !== this.editingNode));
            this.nodes.splice(this.editingNode, 1);
            this.connections = this.connections.map(conn => {
                const move = n => {
                    if (n > this.editingNode) {
                        return n - 1;
                    }
                    return n;
                };
                return [move(conn[0]), move(conn[1])];
            });

            if (!this.nodes[this.editingNode]) {
                this.editingNode = -1;
            }
        }
    }

    setConnecting(newValue) {
        this.connecting = newValue;
        if (!newValue) this.connectingNode = -1;
        this.connBtn.innerText = this.connecting ? "cancel connection" : "start connection";
    }

    setRemoveConnection(newValue) {
        this.disconnecting = newValue;
        if (!newValue) this.disconnectingNode = -1;
        this.rcBtn.innerText = this.disconnecting ? "cancel remove connection" : "remove connection";
    }

    draw(delta) {
        let tooltip = null;
        this.ctx.fillStyle = this.bg;
        this.ctx.fillRect(0, 0, 1000, 500);
        this.t += delta;

        this.connections.forEach(conn => {
            let node1 = this.nodes[conn[0]];
            let node2 = this.nodes[conn[1]];

            let unt1 = node1.pos;
            let unt2 = node2.pos;
            let pos1 = this.cam.transform(unt1);
            let pos2 = this.cam.transform(unt2);

            this.ctx.beginPath();
            this.ctx.strokeStyle = LINK_COLOR;
            this.ctx.lineWidth = LINK_WIDTH / this.cam.zoom;
            this.ctx.moveTo(pos1.x, pos1.y);
            this.ctx.lineTo(pos2.x, pos2.y);
            this.ctx.stroke();

            if (this.arrows) {
                //let rad = (Math.PI / 180) * this.t / 5;
                let rad = Math.atan2(node2.pos.x - node1.pos.x, node2.pos.y - node1.pos.y) + Math.PI*0.5;
                let c = Math.cos(rad);
                let s = Math.sin(rad);

                let b = this.cam.zoom;
                let cen = pos1.center(pos2);
                let x = cen.x;
                let y = cen.y;
                let size = Math.max(Math.min(
                    ((unt2.x - unt1.x) ** 2 + (unt2.y - unt1.y) ** 2)
                        ** 0.5 * 0.07, 25), 10); // meth

                this.ctx.beginPath();
                this.ctx.fillStyle = this.backgroundColor;
                this.ctx.strokeStyle = LINK_COLOR;
                this.ctx.lineWidth = LINK_WIDTH / this.cam.zoom;

                // this code *will* bite you if you touch it
                this.ctx.moveTo(
                    (c * -size)/b+x,
                    (s * size)/b+y);
                this.ctx.lineTo(
                    (c * size + s * size)/b+x,
                    (c * size - s * size)/b+y);
                this.ctx.lineTo(
                    (c * size + s * -size)/b+x,
                    (c * -size - s * size)/b+y);
                this.ctx.lineTo(
                    (c * -size)/b+x,
                    (s * size)/b+y);
                this.ctx.fill();
                this.ctx.stroke();
            }
        });

        if (this.physics) {
            this.nodes.forEach((node, index) => {
                if (!(this.dragging === 2 && this.draggingNode === index)) {
                    let nodeConns = [];
                    this.connections.forEach(conn => {
                        if (conn[0] == index) nodeConns.push(conn[1]);
                        if (conn[1] == index) nodeConns.push(conn[0]);
                    });

                    node.physicsTick(this.nodes, nodeConns);
                }
            });
        }

        this.nodes.forEach((node, index) => {
            if (!(this.dragging === 2 && this.draggingNode === index)) node.move(delta);
            node.draw(this.ctx, this.cam, (index===this.editingNode && this.editing) || (index===this.connectingNode && this.connecting) || (index===this.disconnectingNode && this.disconnecting));
            if (node.pointWithin(this.mouseX, this.mouseY, this.cam)) tooltip = node.tooltip;
        });

        if (tooltip) {
            this.ctx.beginPath();
            this.ctx.fillStyle = "#eee";
            this.ctx.strokeStyle = "black";
            this.ctx.lineWidth = TOOLTIP_OUTLINE_WIDTH;
            this.ctx.rect(this.mouseX, this.mouseY, TOOLTIP_WIDTH, TOOLTIP_HEIGHT);
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.font = TOOLTIP_FONT_SIZE + "px SM64Font";
            this.ctx.textBaseline = "top";
            this.ctx.textAlign = "start";
            this.ctx.fillStyle = "black";
            let lines = getLines(this.ctx, tooltip, TOOLTIP_WIDTH - TOOLTIP_TEXT_TOLERANCE);
            lines.forEach((line, index) => {
                this.ctx.fillText(line, this.mouseX + TOOLTIP_X_OFFSET, this.mouseY + TOOLTIP_Y_OFFSET + (index * TOOLTIP_LINE_HEIGHT));
            });
        }

        if (this.editing && this.editingNode != -1) {
            let edited = this.nodes[this.editingNode];
            if (document.activeElement !== this.dataElem[0]) this.dataElem[0].value = edited.pos.x;
            else edited.pos.x = parseFloat(this.dataElem[0].value);
            if (document.activeElement !== this.dataElem[1]) this.dataElem[1].value = edited.pos.y;
            else edited.pos.y = parseFloat(this.dataElem[1].value);
            if (document.activeElement !== this.dataElem[2]) this.dataElem[2].value = edited.radius;
            else edited.radius = parseFloat(this.dataElem[2].value);
            if (document.activeElement !== this.dataElem[3]) this.dataElem[3].value = edited.name;
            else edited.name = this.dataElem[3].value;

            edited.right = this.dataElem[4].checked;
            //console.log(edited.right);
            //console.log(this.dataElem[4].checked);
            
            if (document.activeElement !== this.dataElem[5]) this.dataElem[5].value = edited.tooltip;
            else edited.tooltip = this.dataElem[5].value;
            if (document.activeElement !== this.dataElem[6]) this.dataElem[6].value = edited.link;
            else edited.link = this.dataElem[6].value;
        } else {
            this.dataElem.forEach(e => {e.value = ""});
        } 

        if (this.lastFPS < Date.now() - 100) {
            this.fps = 1000 / delta;
            this.lastFPS = Date.now();
        }

        this.ctx.font = FPS_TEXT_SIZE + "px SM64Font";
        this.ctx.textBaseline = "top";
        this.ctx.textAlign = "start";
        this.ctx.fillStyle = "black";
        this.ctx.fillText("fps: " + this.fps.toFixed(2), FPS_X_OFFSET, FPS_Y_OFFSET);
    }
}

class Node {
    velocityX = 0;
    velocityY = 0;
    tooltip = null;
    link = null;

    constructor(x, y, radius, name, right, tooltip, link) {
        this.pos = new Vector2d(x, y);
        this.radius = radius;
        this.name = name;
        this.right = right;
        if (tooltip) this.tooltip = tooltip;
        if (link) this.link = link;
    }

    physicsTick(otherNodes, conns) {
        this.velocityX = 0;
        this.velocityY = 0;
        otherNodes.forEach((node, index) => {
            if (this != node) {
                let x = this.pos.x - node.pos.x;
                let y = this.pos.y - node.pos.y;
                if (x === 0) x = Math.random() * PHYSICS_RANDOM_RANGE - PHYSICS_RANDOM_LARGE;
                if (y === 0) y = Math.random() * PHYSICS_RANDOM_RANGE - PHYSICS_RANDOM_LARGE;
                let d = Math.sqrt(x*x + y*y);
                let c = 0;
                if (conns.indexOf(index) !== -1) {
                    c = 1 - d / PHYSICS_CONNECTION_ATTRACTION;
                } else {
                    c = 1 - Math.max(0, Math.min(d, PHYSICS_MAX_REPEL)) / PHYSICS_MAX_REPEL;
                }
                this.velocityX += x*c;
                this.velocityY += y*c;
            }
        });
        this.velocityX /= PHYSICS_VELOCITY_DIVISOR;
        this.velocityY /= PHYSICS_VELOCITY_DIVISOR;
    }
    
    move(delta) {
        this.pos.x += this.velocityX * delta;
        this.pos.y += this.velocityY * delta;
    }

    draw(ctx, camera, selected) { 
        let newpos = camera.transform(this.pos);

        ctx.beginPath();
        ctx.strokeStyle = selected ? "grey" : "black";
        ctx.fillStyle = "white";
        ctx.lineWidth = (selected ? 5 : 4) / camera.zoom;
        ctx.arc(newpos.x, newpos.y, this.radius / camera.zoom, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.font = NODE_TEXT_SIZE / camera.zoom + "px SM64Font";
        ctx.fillStyle = "black";
        if (this.right) {
            ctx.textBaseline = "center";
            ctx.textAlign = "left";
            ctx.fillText(this.name, newpos.x + NODE_TEXT_X_OFFSET / camera.zoom + this.radius / camera.zoom, newpos.y);
        } else {
            ctx.textBaseline = "top";
            ctx.textAlign = "center";
            ctx.fillText(this.name, newpos.x, newpos.y + NODE_TEXT_Y_OFFSET / camera.zoom + this.radius / camera.zoom);
        }
    }

    pointWithin(x, y, camera) {
        let newpos = camera.transform(new Vector2d(
            this.pos.x + NODE_CLICK_OFFSET * camera.zoom,
            this.pos.y + NODE_CLICK_OFFSET * camera.zoom
        ));
        return (newpos.x - x) ** 2 + (newpos.y - y) ** 2 < (this.radius / camera.zoom) ** 2;
    }
}
