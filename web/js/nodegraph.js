// node graph library made by me (carter)

class Vector2d {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Camera extends Vector2d {
    constructor(x, y, zoom) {
        super(x, y);
        this.zoom = zoom;
    }

    xTransform(x) {
        return (x - this.x) / this.zoom;
    }

    yTransform(y) {
        return (y - this.y) / this.zoom;
    }

    transform(v) {
        return new Vector2d(
            (v.x - this.x) / this.zoom,
            (v.y - this.y) / this.zoom
        );
    }
}

class NodeGraph {
    constructor(canvas, backgroundColor) {
        const ctx = canvas.getContext("2d");
        this.canvas = canvas;
        this.ctx = ctx;
        this.nodes = [
            new Node(0, 0, "a", {text: "a"}),
            new Node(100, 100, "b")
        ];
        this.bg = backgroundColor;
        this.cam = new Camera(0, 0, 1);
        this.mouseX = 99999;
        this.mouseY = 99999;
        this.mouseBtns = 0;
        this.lastMouseX = 99999;
        this.lastMouseY = 99999;
        this.lastMouseBtns = 0;
        document.addEventListener("mousemove", this.mouseUpdate.bind(this), false);
        document.addEventListener("mouseenter", this.mouseUpdate.bind(this), false);
        document.addEventListener("mosuescroll", this.scrollEvent.bind(this), false);
        document.addEventListener("DOMMouseScroll", this.scrollEvent.bind(this), false);
    }
    
    mouseUpdate(e) {
        this.mouseX = e.pageX;
        this.mouseY = e.pageY;
        this.mouseBtns = e.buttons;

        if (this.lastMouseBtns === 1 && this.mouseBtns === 1) {
            this.cam.x -= (this.mouseX - this.lastMouseX) * this.cam.zoom;
            this.cam.y -= (this.mouseY - this.lastMouseY) * this.cam.zoom;
        }
        
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
        this.lastMouseBtns = this.mouseBtns;
    }

    scrollEvent(e) {
        this.cam.zoom += e.detail/100;
    }

    draw(delta) {
        let tooltip = null;
        this.ctx.fillStyle = this.bg;
        this.ctx.fillRect(0, 0, 1000, 500);

        this.nodes.forEach(node=>{
            node.draw(this.ctx, this.cam);
            if (node.pointWithin(this.mouseX, this.mouseY, this.cam)) tooltip = node.tooltip;
        });

        if (tooltip) {
            this.ctx.beginPath();
            this.ctx.fillStyle = "white";
            this.ctx.strokeStyle = "black";
            this.ctx.lineWidth = 3;
            this.ctx.rect(this.mouseX, this.mouseY, 300, 200);
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.font = "24px serif";
            this.ctx.textBaseline = "top";
            this.ctx.textAlign = "start";
            this.ctx.fillStyle = "black";
            this.ctx.fillText(tooltip.text, this.mouseX + 5, this.mouseY + 5);
        }
    }
}

class Node {
    constructor(x, y, name, tooltip) {
        this.pos = new Vector2d(x, y);
        this.radius = 40;
        this.name = name;
        this.tooltip = null;
        if (tooltip) this.tooltip = tooltip;
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

        ctx.font = 24 / camera.zoom + "px serif";
        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        ctx.fillStyle = "black";
        ctx.fillText(this.name, newpos.x, newpos.y + 5 + this.radius / camera.zoom);
    }

    pointWithin(x, y, camera) {
        let newpos = camera.transform(this.pos);

        return (newpos.x - x) ** 2 + (newpos.y - y) ** 2 < (this.radius / camera.zoom) ** 2;
    }
}
