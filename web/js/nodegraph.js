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
        this.nodes = [new Node()];
        this.bg = backgroundColor;
        this.cam = new Camera(0, 0, 1);
    }
    
    draw(delta) {
        this.ctx.fillStyle = this.bg;
        this.ctx.fillRect(0, 0, 1000, 500);

        this.nodes.forEach(node=>{
            node.draw(this.ctx, this.cam);
        });

        //this.cam.x += delta / 10;
        this.cam.zoom += delta / 100;
    }
}

class Node {
    constructor() {
        this.pos = new Vector2d(0, 0);
    }

    draw(ctx, camera) {
        let newpos = camera.transform(this.pos);

        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4 / camera.zoom;
        ctx.arc(newpos.x, newpos.y, 40 / camera.zoom, 0, 2 * Math.PI);
        ctx.stroke();
    }
}
