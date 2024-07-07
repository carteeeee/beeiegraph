// node graph library made by me (carter)

class NodeGraph {
    constructor(canvas, backgroundColor) {
        const ctx = canvas.getContext("2d");
        this.canvas = canvas;
        this.ctx = ctx;
        this.nodes = [];
        this.bg = backgroundColor;
        this.x = 0;
    }
    
    draw(delta) {
        this.ctx.fillStyle = this.bg;
        this.ctx.fillRect(0, 0, 1000, 500);

        this.ctx.fillStyle = "red";
        this.x += delta/5;
        this.ctx.fillRect(this.x, 0, 150, 75);
    }
}

class Node {
    
}
