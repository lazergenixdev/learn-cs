import { Graph } from "../Graph.js";
import { draw_arrow } from "../graphics.js";

function distance_sq(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    return dx * dx + dy * dy;
}

function distance_line_sq(ax, ay, bx, by, px, py) {
    const pax = px - ax;
    const pay = py - ay;
    const bax = bx - ax;
    const bay = by - ay;
    const t = Math.max(Math.min((pax*bax + pay*bay) / (bax*bax + bay*bay), 1.0), 0.0);
    const dx = pax - bax*t;
    const dy = pay - bay*t;
    return dx*dx + dy*dy;
}

function node_distance(nodeA, nodeB) {
    return Math.sqrt(distance_sq(
        nodeA.position.x,
        nodeA.position.y,
        nodeB.position.x,
        nodeB.position.y,
    ));
}

const STIFF_MAX = 0.1;
const STIFF_MIN = 0.0;

class Physics {
    constructor(canvas, graph, saveCallback) {
        this.nodes = {};
        this.edges = [];
        this.nodeRadius = 20;
        this.stiffness = STIFF_MAX;
        this.save = saveCallback;

        const Bodies = Matter.Bodies;
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        this.runner = Matter.Runner.create();

        const meta = this.load_saved_data();

        // Create boundary walls
        const wallThickness = 500;
        const walls = [
            Bodies.rectangle(canvas.width / 2, -wallThickness / 2, canvas.width, wallThickness, { isStatic: true }), // Top wall
            Bodies.rectangle(canvas.width / 2, canvas.height + wallThickness / 2, canvas.width, wallThickness, { isStatic: true }), // Bottom wall
            Bodies.rectangle(-wallThickness / 2, canvas.height / 2, wallThickness, canvas.height, { isStatic: true }), // Left wall
            Bodies.rectangle(canvas.width + wallThickness / 2, canvas.height / 2, wallThickness, canvas.height, { isStatic: true }) // Right wall
        ];
        Matter.World.add(this.world, walls);
        
        // Create nodes
        graph.nodes.forEach(name => {
            let x,y;
            if (meta !== null && meta[name]) {
                [x, y] = meta[name];
            }
            else {
                x = Math.random() * 100.0 + 10.0;
                y = Math.random() * 100.0 + 10.0;
            }
            this.nodes[name] = this.create_node(name, x, y);
            Matter.World.add(this.world, this.nodes[name]);
        });
        
        // Create edges (constraints)
        graph.edges.forEach(edge => {
            const e = this.create_edge(
                this.nodes[edge[0]],
                this.nodes[edge[1]],
                edge[2]
            );
            this.edges.push(e);
        });
        Matter.World.add(this.world, this.edges);

        // Add mouse interaction
        const mouse = Matter.Mouse.create(canvas);
        this.mouseConstraint = Matter.MouseConstraint.create(
            this.engine, {
                mouse: mouse,
                constraint: {
                    stiffness: 0.2,
                    render: { visible: false }
                }
            }
        );
        Matter.World.add(this.world, this.mouseConstraint);
        canvas.onwheel = () => {}; // Enable scrolling

        // Set gravity to attract towards the center of the screen
        this.world.gravity.x = 0;
        this.world.gravity.y = 0;
        
        // Run the engine
        Matter.Runner.run(this.runner, this.engine);

        // TODO: Save whenever dragging is finished (with stiffness = 0)
    }

    create_node(name, x, y) {
        return Matter.Bodies.circle(x, y, this.nodeRadius, {
            restitution: 0.6,
            friction: 0.1,
            label: name
        });
    }

    create_edge(nodeA, nodeB, weight) {
        const edge = Matter.Constraint.create({
            bodyA: nodeA, 
            bodyB: nodeB, 
            stiffness: this.stiffness,
            length: node_distance(nodeA, nodeB),
        });
        edge.weight = weight;
        edge.stiffness = this.stiffness; // modules, lol
        return edge;
    }

    set_stiffness(value, reset = false) {
        this.stiffness = value;

        this.edges.forEach(edge => {
            if (reset) edge.length = node_distance(edge.bodyA, edge.bodyB);
            edge.stiffness = this.stiffness;
        });
    }

    add_node(name, x, y, graph) {
        if (!graph.addNode(name)) {
            console.warn(`Already have a node called "${name}"`);
            return;
        }

        console.log(`Node added: ${[name]}`);
        
        const node = this.create_node(name, x, y);
        this.nodes[name] = node;
        Matter.World.add(this.world, node);
        this.save();
    }

    add_edge(weight, nodeA, nodeB, graph) {
        if (!graph.addEdge(nodeA.label, nodeB.label, weight)) {
            console.warn(`Already have a edge that connects "${nodeA.label}" and "${nodeB.label}"`);
            return;
        }

        console.log(`Edge added: ${[nodeA.label, nodeB.label, weight]}`);

        const edge = this.create_edge(nodeA, nodeB, weight);
        this.edges.push(edge);
        Matter.World.add(this.world, edge);
        this.save();
    }
    
    max_distance_sq() { return this.nodeRadius * this.nodeRadius * 4.0; }

    find_closest_node(x, y, maxDistanceSq = this.max_distance_sq()) {
        let minDistanceSq = 1e999;
        let result = null;
        for (const node of Object.values(this.nodes)) {
            const ds = distance_sq(node.position.x, node.position.y, x, y);
            if (ds < minDistanceSq) {
                minDistanceSq = ds;
                result = node;
            }
        }
        return (minDistanceSq <= maxDistanceSq)? result : null;
    }

    find_closest_edge(x, y, maxDistanceSq = 100) {
        let minDistanceSq = 1e999;
        let result = null;
        for (const edge of this.edges) {
            const p0 = edge.bodyA.position;
            const p1 = edge.bodyB.position;
            const ds = distance_line_sq(p0.x, p0.y, p1.x, p1.y, x, y);
            if (ds < minDistanceSq) {
                minDistanceSq = ds;
                result = edge;
            }
        }
        return (minDistanceSq <= maxDistanceSq)? result : null;
    }

    remove_node(x, y, graph) {
        const node = this.find_closest_node(x, y);
        if (node === null) return;

        const name = node.label;
        graph.removeNode(name);

        this.edges = this.edges.filter(edge => {
            const keep = edge.bodyA.label !== name && edge.bodyB.label !== name;
            if (!keep) Matter.World.remove(this.world, edge);
            return keep;
        });
        
        console.log(`Node removed: ${[name]}`);
        Matter.World.remove(this.world, node);
        delete this.nodes[name];
        this.save();
    }

    remove_edge(x, y, graph) {
        const edge = this.find_closest_edge(x, y);
        if (edge === null) return;
        
        console.log(`Edge removed: ${[edge.bodyA.label, edge.bodyB.label, edge.weight]}`);
        graph.removeEdge(edge.bodyA.label, edge.bodyB.label);
        this.edges = this.edges.filter(e => e !== edge);
        Matter.World.remove(this.world, edge);
        this.save();
    }
    
    clear() {
        for (const node of Object.values(this.nodes)) {
            Matter.World.remove(this.world, node);
        }
        for (const edge of this.edges) {
            Matter.World.remove(this.world, edge);
        }
        this.nodes = {};
        this.edges = [];
    }

    stringify() {
        const meta = {};
        for (const [name, node] of Object.entries(this.nodes)) {
            const x = Math.round(node.position.x);
            const y = Math.round(node.position.y);
            meta[name] = `${x},${y}`;
        }
        return JSON.stringify(meta);
    }

    load_saved_data() {
        const raw = JSON.parse(localStorage.getItem('meta')) || {};
        if (Object.keys(raw).length === 0) return null;

        for (const [name, str] of Object.entries(raw)) {
            raw[name] = str.split(',').map(x => parseInt(x));
        }
        return raw;
    }
}

const MODE_NORMAL              = 0;
const MODE_NODE_ADD            = 1;
const MODE_EDGE_ADD            = 2;
const MODE_NODE_REMOVE         = 3;
const MODE_EDGE_REMOVE         = 4;
const MODE_DEPTH_FIRST_SEARCH  = 5;
const MODE_BREATH_FIRST_SEARCH = 6;

const BACKGROUND_COLOR = '#1a1a1a';
const DEFAULT_COLOR = 'dimgray';
const VISITED_COLOR = '#004eff';
const PENDING_COLOR = '#00E000';

class GraphView extends HTMLElement {
    constructor() {
        super();
        // Attach a shadow root to the element.
        this.attachShadow({ mode: 'open' });
        this.callbacks = {};
        this.minVelocity = 1.0;
        this.freezeRender = false;

        const canvas = document.createElement('canvas');
        const handleInteract = event => {
            const rect = canvas.getBoundingClientRect(); // Get element's position relative to viewport
            let pos;
    
            if (event.type === 'click') {
                pos = [event.clientX - rect.left, event.clientY - rect.top];
            } else if (event.type === 'touchstart') {
                const touch = event.touches[0];
                pos = [touch.clientX - rect.left, touch.clientY - rect.top];
            }

            switch (this.mode) {
                case MODE_NODE_ADD:
                    const add_node = name => { this.physics.add_node(name, ...pos, this.graph); };
                    this.callbacks.onaddnode(...pos, add_node);
                    break;
                case MODE_EDGE_ADD:
                    if (this.selectedNode) {
                        const nodeB = this.physics.find_closest_node(...pos);
                        const nodeA = this.selectedNode;
                        if (!nodeB) {
                            this.selectedNode = null;
                            break;
                        }
                        const add_edge = weight => { this.physics.add_edge(weight, nodeA, nodeB, this.graph); };
                        this.callbacks.onaddedge(...pos, add_edge);
                        this.selectedNode = null;
                    }
                    else {
                        this.selectedNode = this.physics.find_closest_node(...pos);
                    }
                    break;
                case MODE_NODE_REMOVE:
                    this.physics.remove_node(...pos, this.graph);
                    break;
                case MODE_EDGE_REMOVE:
                    this.physics.remove_edge(...pos, this.graph);
                    break;
                case MODE_DEPTH_FIRST_SEARCH: {
                    const node = this.physics.find_closest_node(...pos);
                    if (node) {
                        this.startNode = node.label;
                        this.index = 0;
                        this.result = this.graph.dfs(this.startNode);
                        this.setInfo();
                    }
                    break;
                }
                case MODE_BREATH_FIRST_SEARCH: {
                    const node = this.physics.find_closest_node(...pos);
                    if (node) {
                        this.startNode = node.label;
                        this.index = 0;
                        this.result = this.graph.bfs(this.startNode);
                        this.setInfo();
                    }
                    break;
                }
                default:
            }
        };

        this.addEventListener('click',      handleInteract);
        this.addEventListener('touchstart', handleInteract);

        {
            let g = localStorage.getItem('graph');
            if (g === null) {
                g = '{"nodes":["A","B","C"],"edges":[["A","C",3],["C","B",4],["B","A",7]]}';
                localStorage.setItem('graph', g);
                localStorage.setItem('meta', '{"A":"100,66","B":"241,121","C":"108,188"}');
            }
            this.graph = Graph.parse(g);
        }

        const script = document.createElement('script');
        script.src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.17.1/matter.min.js";
        script.onload = () => {
            this.physics = new Physics(canvas, this.graph, () => this.save());
        };

        const style = document.createElement('style');
        style.innerHTML = `
        :host {
            display: block;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
        }
        .canvas-container {
            width: 100%;
            height: 100%;
            position: relative;
        }
        canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
        .info {
            position: absolute;
            color: white;
            font-family: monospace;
            font-size: 20px;
        }
        .line {
            padding: 4px;
            display: flex;
            align-items: center;
        }
        .icon {
            width: 16px;
            height: 16px;
            display: inline-block;
            margin-left: 6px;
            margin-right: 6px;
            border: 4px black solid;
            border-radius: 4px;
        }
        `;

        const info = document.createElement('div');
        info.classList.add('info');
        
        const div = document.createElement('div');
        div.classList.add('canvas-container');
        div.appendChild(info);
        div.appendChild(canvas);
        
        this.shadowRoot.append(style, script, div);
        
        window.addEventListener('resize', event => this.handleResize());
        
        this.setMode(MODE_NORMAL);
    }
    
    setMode(m) {
        this.mode = m;
        if (m >= MODE_DEPTH_FIRST_SEARCH) {
            this.index = 0;
            if (!this.graph.hasNode(this.startNode)) {
                this.startNode = this.graph.nodes[0];
            }
            const map = {};
            if (m === MODE_DEPTH_FIRST_SEARCH)
                this.result = this.graph.dfs(this.startNode);
            if (m === MODE_BREATH_FIRST_SEARCH)
                this.result = this.graph.bfs(this.startNode);
        }
        else {
            delete this.result;
            delete this.index;
        }
        this.setInfo();
    }

    algorithmName() {
        switch (this.mode) {
            case MODE_DEPTH_FIRST_SEARCH:
                return "Depth-First Search";
            case MODE_BREATH_FIRST_SEARCH:
                return "Breath-First Search";
            default:
                return null;
        }
    }

    setInfo() {
        const info = this.shadowRoot.querySelector('.info');
        const title = this.algorithmName();
        if (!title) {
            info.innerHTML = '';
            return;
        }

        const r = this.result[this.index];
        let ds = "Stack";
        if (this.mode === MODE_BREATH_FIRST_SEARCH)
            ds = "Queue";
        info.innerHTML = `
        <div class="line">${this.algorithmName()}</div>
        <div class="line"><div class="icon" style="background-color: ${VISITED_COLOR};"></div>Visited (${r.X})</div>
        <div class="line"><div class="icon" style="background-color: ${PENDING_COLOR};"></div>${ds} (${r.F})</div>
        `;
    }
    
    step(d) {
        if (this.mode >= MODE_DEPTH_FIRST_SEARCH) {
            this.index = Math.min(Math.max(this.index + d, 0), this.result.length-1);
            this.setInfo();
        }
    }

    hasEdge(a, b) {
        for (const edge of this.result[this.index].edges) {
            if (a === edge[0] && b === edge[1])
                return true;
        }
        return false;
    }

    edgeColor(edge) {
        if (this.result?.length > 0); else {
            return 'white';
        }

        const r = this.result[this.index];
        const a = edge.bodyA.label;
        const b = edge.bodyB.label;
        if (r.highlightedEdge) {
            if (this.graph.edgesEqual([a, b], r.highlightedEdge))
                return 'lime';
        }
        for (const edge of r.edges) {
            if (this.graph.edgesEqual([a, b], edge))
                return VISITED_COLOR;
        }
        return DEFAULT_COLOR;
    }

    nodeColor(node) {
        if (!this.algorithmName()) {
            if (this.specialNode?.label === node.label) {
                switch (this.mode) {
                    case MODE_EDGE_ADD:
                        return 'lime';
                    case MODE_NODE_REMOVE:
                        return 'red';
                    default:
                        return 'black';
                }
            }
            return 'blue';
        }
        const r = this.result[this.index];
        if (r.X.includes(node.label)) return VISITED_COLOR;
        if (r.F.includes(node.label)) return PENDING_COLOR;
        return DEFAULT_COLOR;
    }
    
    nodeActive(node) {
        if (this.result) {
            const r = this.result[this.index];
            return r.active === node.label;
        }
    }

    /**
     * 
     * @param {string} name:
     *  - "addnode"
     *  - "addedge" 
     */
    setCallback(name, callback) {
        this.callbacks['on'+name] = callback;
    }

    connectedCallback() {
        this.handleResize();
        this.render();
    }

    handleResize() {
        const canvas = this.shadowRoot.querySelector('canvas');
        const div    = this.shadowRoot.querySelector('.canvas-container');
        console.log(`RESIZE ${[this.clientWidth, this.clientHeight]}`);
        canvas.width  = div.clientWidth;
        canvas.height = div.clientHeight;
        this.render();
    }

    render() {
        if (this.selectedNode && this.mode !== MODE_EDGE_ADD)
            this.selectedNode = null;

        const canvas = this.shadowRoot.querySelector('canvas');
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!this.physics) {
            requestAnimationFrame(this.render.bind(this));
            return;
        }

        let removedEdge = null;
        if (this.mode === MODE_EDGE_REMOVE) {
            const mousePosition = this.physics.mouseConstraint.constraint.pointA;
            removedEdge = this.physics.find_closest_edge(mousePosition.x, mousePosition.y);
        }
        
        const mix = (a,b) => {
            a = a.position, b = b.position;
            const x = a.x + b.x;
            const y = a.y + b.y;
            return [x/2, y/2];
        };

        // Render edges
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 3;
        ctx.font = "24px sans-serif";
        this.physics.edges.forEach(edge => {
            let style = (removedEdge === edge)? 'red' : this.edgeColor(edge);
            ctx.strokeStyle = style;
            ctx.fillStyle   = style;
            this.drawEdge(ctx, edge);
        });
        this.physics.edges.forEach(edge => {
            const w = `${edge.weight}`;
            const [x,y] = mix(edge.bodyA, edge.bodyB);

            ctx.strokeStyle = BACKGROUND_COLOR;
            ctx.lineWidth = 10; 
            ctx.strokeText(w, x, y);
            ctx.fillStyle = (removedEdge === edge)? 'red' : 'white';
            //if (this.mode >= MODE_DEPTH_FIRST_SEARCH) ctx.fillStyle = 'gray';
            ctx.fillText(w, x, y);
        });
        
        this.specialNode = null;
        const mousePosition = this.physics.mouseConstraint.constraint.pointA;
        const modes = [
            MODE_NODE_REMOVE,
            MODE_EDGE_ADD,
            MODE_DEPTH_FIRST_SEARCH,
            MODE_BREATH_FIRST_SEARCH,
        ];
        if (modes.includes(this.mode)) {
            this.specialNode = this.physics.find_closest_node(mousePosition.x, mousePosition.y);
        }
        
        // Render nodes
        ctx.strokeStyle = 'white';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        Object.entries(this.physics.nodes).forEach(this.drawNode.bind(this, ctx));

        // TODO: Freeze all rendering until canvas is clicked again.
        // TODO: When min velocity drops below 1.0
        requestAnimationFrame(this.render.bind(this));
    }

    drawNode(ctx, [name, node]) {
        const node_path = (node,r) => {
            ctx.beginPath();
            ctx.arc(node.position.x, node.position.y, r, 0, 2 * Math.PI);
            ctx.closePath();
        };
        
        node_path(node, this.physics.nodeRadius);

        if (this.mode < MODE_DEPTH_FIRST_SEARCH) {
            ctx.fillStyle = this.nodeColor(node);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.fillText(name, node.position.x, node.position.y);
            
            if (this.selectedNode?.label === node.label) {
                node_path(node, this.physics.nodeRadius + 10);
                ctx.lineWidth = 6;
                ctx.stroke();
                ctx.lineWidth = 3;
            }
        }
        else {
            ctx.lineWidth = 4;
            ctx.fillStyle = (this.specialNode?.label === node.label)? 'lime' : BACKGROUND_COLOR;
            ctx.fill();
            ctx.strokeStyle = this.nodeColor(node);
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.fillText(name, node.position.x, node.position.y);
            
            if (this.nodeActive(node)) {
                node_path(node, this.physics.nodeRadius + 6);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.lineWidth = 4;
            }
        }
    }

    drawEdge(ctx, edge) {
        if (this.graph.directed) {
            draw_arrow(
                ctx,
                edge.bodyA.position.x, edge.bodyA.position.y,
                edge.bodyB.position.x, edge.bodyB.position.y,
                this.physics.nodeRadius,
                12,
            );
        }
        else {
            ctx.beginPath();
            ctx.moveTo(edge.bodyA.position.x, edge.bodyA.position.y);
            ctx.lineTo(edge.bodyB.position.x, edge.bodyB.position.y);
            ctx.closePath();
            ctx.stroke();
        }
    }

    clear() {
        this.physics.clear();
        this.graph.clear();
        this.save();
    }

    save() {
        localStorage.setItem('graph', this.graph.stringify());
        localStorage.setItem('meta', this.physics.stringify());
        console.log("Saved!");
    }

    lockEdges() {
        this.physics.set_stiffness(STIFF_MAX, true);
        this.save();
    }

    unlockEdges() {
        this.physics.set_stiffness(STIFF_MIN);
    }

    setDirected(directed) {
        this.graph.directed = directed;
        if (this.mode >= MODE_DEPTH_FIRST_SEARCH)
            this.setMode(this.mode);
    }
}

// Define the new element
customElements.define('graph-view', GraphView);