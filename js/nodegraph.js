// node graph library made by me (carter)

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
    // private
    #jsondata;
    #beedata;

    // public
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
                node.name,
                node.text,
                node.link
            ));
        });
        
        return new this(data, null, nodesInternal, data.connections);
    }

    /*static fromBee(data) {
        

        return new this(null, data, nodesInternal, connectionsInternal);
    }

    toBee() {
        
    }*/
}

class NodeGraph {
    // private
    #canvas;
    #ctx;
    #data;
    #editBtn;
    #connBtn;
    #newBtn;
    #editResult;
    #editTable;
    #dataElem;
    #mouseX = 99999;
    #mouseY = 99999;
    #mouseBtns = 0;
    #lastMouseX = 99999;
    #lastMouseY = 99999;
    #lastMouseBtns = 0;
    #lastFPS = 0;
    #dragging = 0;
    #draggingNode = 0;
    #dragStart = 0;
    #editing = false;
    #connecting = false;

    // public
    connectingNode = -1;
    editingNode = -1;
    physics = false;
    arrows = false;
    fps = 0;
    cam;

    get nodes() {
        return this.data.nodes;
    }

    get connections() {
        return this.data.connections;
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
        this.newBtn = editElem[2];
        this.editResult = editElem[3];
        this.editTable = editElem[4];
        this.dataElem = editElem.slice(5, editElem.length);
        this.cam = new Camera(-500, -250, 1);
        this.lastFPS = Date.now();
        
        if (this.editBtn) this.editBtn.addEventListener("click", this.editPressed.bind(this), false);
        if (this.connBtn) this.connBtn.addEventListener("click", (e=>{this.setConnecting(!this.connecting)}).bind(this), false);
        if (this.newBtn) this.newBtn.addEventListener("click", this.newPressed.bind(this), false);

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
                        this.connectingNode = -1;
                        this.setConnecting(false);
                    } else {
                        this.connectingNode = this.draggingNode;
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
            this.newBtn.classList.remove("hidden");
        } else {
            this.editing = false;
            this.connecting = false;
            this.editBtn.innerText = "edit";
            this.editTable.classList.add("hidden");
            this.connBtn.classList.add("hidden");
            this.newBtn.classList.add("hidden");
            
            let jsonData = {nodes: [], connections: this.connections};
            this.nodes.forEach(node => {
                let nodeData = {x: node.pos.x, y: node.pos.y};
                if (node.name) nodeData.name = node.name;
                if (node.tooltip) nodeData.text = node.tooltip;
                if (node.link) nodeData.link = node.link;
                jsonData.nodes.push(nodeData);
            });

            let r = JSON.stringify(jsonData);
            console.log(r)
            this.editResult.innerText = r;


            this.editResult.classList.remove("hidden");
        }
    }

    newPressed(e) {
        if (this.editing) {
            this.nodes.push(new Node(
                (this.cam.x + 500) * this.cam.zoom,
                (this.cam.y + 250) * this.cam.zoom,
                "",
                "",
                ""
            ));
            this.editingNode = this.nodes.length - 1;
        }
    }

    setConnecting(newValue) {
        this.connecting = newValue;
        if (!newValue) this.connectingNode = -1;
        this.connBtn.innerText = this.connecting ? "cancel connection" : "start connection";
    }

    draw(delta) {
        let tooltip = null;
        this.ctx.fillStyle = this.bg;
        this.ctx.fillRect(0, 0, 1000, 500);
        this.t += delta;

        this.connections.forEach(conn => {
            let node1 = this.nodes[conn[0]];
            let node2 = this.nodes[conn[1]];

            let pos1 = this.cam.transform(node1.pos);
            let pos2 = this.cam.transform(node2.pos);

            this.ctx.beginPath();
            this.ctx.strokeStyle = "#777";
            this.ctx.lineWidth = 4 / this.cam.zoom;
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

                this.ctx.beginPath();
                this.ctx.fillStyle = "#777";

                // this code *will* bite you if you touch it
                this.ctx.moveTo(
                    (c * -15)/b+x,
                    (s * 15)/b+y);
                this.ctx.lineTo(
                    (c * 15 + s * 15)/b+x,
                    (c * 15 - s * 15)/b+y);
                this.ctx.lineTo(
                    (c * 15 + s * -15)/b+x,
                    (c * -15 - s * 15)/b+y);
                this.ctx.fill();
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
            node.draw(this.ctx, this.cam, (index===this.editingNode && this.editing) || (index===this.connectingNode && this.connecting));
            if (node.pointWithin(this.mouseX, this.mouseY, this.cam)) tooltip = node.tooltip;
        });

        if (tooltip) {
            this.ctx.beginPath();
            this.ctx.fillStyle = "#eee";
            this.ctx.strokeStyle = "black";
            this.ctx.lineWidth = 3;
            this.ctx.rect(this.mouseX, this.mouseY, 300, 200);
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.font = "12px SM64Font";
            this.ctx.textBaseline = "top";
            this.ctx.textAlign = "start";
            this.ctx.fillStyle = "black";
            this.ctx.fillText(tooltip, this.mouseX + 8, this.mouseY + 14);
        }

        if (this.editing && this.editingNode != -1) {
            let edited = this.nodes[this.editingNode];
            if (document.activeElement !== this.dataElem[0]) this.dataElem[0].value = edited.pos.x;
            else edited.pos.x = parseFloat(this.dataElem[0].value);
            if (document.activeElement !== this.dataElem[1]) this.dataElem[1].value = edited.pos.y;
            else edited.pos.y = parseFloat(this.dataElem[1].value);
            if (document.activeElement !== this.dataElem[2]) this.dataElem[2].value = edited.name;
            else edited.name = this.dataElem[2].value;
            if (document.activeElement !== this.dataElem[3]) this.dataElem[3].value = edited.tooltip;
            else edited.tooltip = this.dataElem[3].value;
            if (document.activeElement !== this.dataElem[4]) this.dataElem[4].value = edited.link;
            else edited.link = this.dataElem[4].value;
        } else {
            this.dataElem.forEach(e => {e.value = ""});
        } 

        if (this.lastFPS < Date.now() - 100) {
            this.fps = 1000 / delta;
            this.lastFPS = Date.now();
        }

        this.ctx.font = "12px SM64Font";
        this.ctx.textBaseline = "top";
        this.ctx.textAlign = "start";
        this.ctx.fillStyle = "black";
        this.ctx.fillText("fps: " + this.fps.toFixed(2), 10, 15);
    }
}

class Node {
    constructor(x, y, name, tooltip, link) {
        this.pos = new Vector2d(x, y);
        this.radius = 30;
        this.name = name;
        this.velocityX = 0;
        this.velocityY = 0;
        this.tooltip = null;
        if (tooltip) this.tooltip = tooltip;
        this.link = null;
        if (link) this.link = link;
    }

    physicsTick(otherNodes, conns) {
        this.velocityX = 0;
        this.velocityY = 0;
        otherNodes.forEach((node, index) => {
            if (this != node) {
                let x = this.pos.x - node.pos.x;
                let y = this.pos.y - node.pos.y;
                if (x === 0) x = Math.random() * 100 - 50;
                if (y === 0) y = Math.random() * 100 - 50;
                let d = Math.sqrt(x*x + y*y);
                let c = 0;
                if (conns.indexOf(index) !== -1) {
                    c = 1 - d / 100;
                } else {
                    c = 1 - Math.max(0, Math.min(d, 300)) / 300;
                }
                this.velocityX += x*c;
                this.velocityY += y*c;
            }
        });
        this.velocityX /= 1000;
        this.velocityY /= 1000;
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

        ctx.font = 12 / camera.zoom + "px SM64Font";
        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        ctx.fillStyle = "black";
        ctx.fillText(this.name, newpos.x, newpos.y + 14 / camera.zoom + this.radius / camera.zoom);
    }

    pointWithin(x, y, camera) {
        let newpos = camera.transform(new Vector2d(
            this.pos.x + 10 * camera.zoom,
            this.pos.y + 10 * camera.zoom
        ));
        return (newpos.x - x) ** 2 + (newpos.y - y) ** 2 < (this.radius / camera.zoom) ** 2;
    }
}
