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

class NodeGraph {
    constructor(canvas, backgroundColor, data, physics, arrows, editelem) {
        const ctx = canvas.getContext("2d");
        this.canvas = canvas;
        this.ctx = ctx;
        this.nodes = [];
        data.nodes.forEach(node => {
            this.nodes.push(new Node(
                node.x,
                node.y,
                node.name,
                node.text,
                node.link
            ));
        });
        this.connections = data.connections;
        this.bg = backgroundColor;
        this.physics = physics;
        this.arrows = arrows;
        this.editbtn = editelem[0];
        this.editresult = editelem[1];
        this.dataelem = editelem.slice(2, editelem.length);
        if (editbtn) editbtn.addEventListener("click", this.editPressed.bind(this), false);

        this.cam = new Camera(-500, -250, 1);
        this.mouseX = 99999;
        this.mouseY = 99999;
        this.mouseBtns = 0;
        this.lastMouseX = 99999;
        this.lastMouseY = 99999;
        this.lastMouseBtns = 0;
        this.lastFPS = Date.now();
        this.fps = 0;
        this.dragging = 0;
        this.draggingNode = 0;
        this.dragStart = 0;
        this.t = 0;
        this.editing = false;
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
                if (dragged.link) {
                    if (this.editing) {
                        this.dataelem[0].value = dragged.pos.x;
                        this.dataelem[1].value = dragged.pos.y;
                        this.dataelem[2].value = dragged.name;
                        this.dataelem[3].value = dragged.tooltip;
                        this.dataelem[4].value = dragged.link;
                    } else window.location = dragged.link;
                }
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
            this.editbtn.innerText = "finish";
        } else {
            this.editing = false;
            this.editbtn.innerText = "edit";
            this.editresult.innerText = "placeholder";
            this.editresult.classList.remove("hidden");
        }
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
            node.draw(this.ctx, this.cam);
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

    draw(ctx, camera) { 
        let newpos = camera.transform(this.pos);

        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.fillStyle = "white";
        ctx.lineWidth = 4 / camera.zoom;
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
