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

const STIFF_MAX = 0.1;
const STIFF_MIN = 0.0;

class Physics {
    constructor(canvas, graph) {
        this.nodes = {};
        this.edges = [];
        this.nodeRadius = 20;

        const Bodies = Matter.Bodies;
        const Constraint = Matter.Constraint;
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        this.runner = Matter.Runner.create();

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
            const x = Math.random() * 100.0 + 10.0;
            const y = Math.random() * 100.0 + 10.0;
            this.nodes[name] = this.create_node(name, x, y);
            Matter.World.add(this.world, this.nodes[name]);
        });
        
        // Create edges (constraints)
        graph.edges.forEach(edge => {
            this.edges.push(
                Constraint.create({
                    bodyA: this.nodes[edge[0]], 
                    bodyB: this.nodes[edge[1]], 
                    stiffness: STIFF_MAX,
                    length: 150
                })
            );
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

        // Set gravity to attract towards the center of the screen
        this.world.gravity.x = 0;
        this.world.gravity.y = 0;
        
        // Run the engine
        Matter.Runner.run(this.runner, this.engine);
    }

    create_node(name, x, y) {
        return Matter.Bodies.circle(x, y, this.nodeRadius, {
            restitution: 0.6,
            friction: 0.1,
            label: name
        });
    }

    add_node(name, x, y, graph) {
        if (this.nodes[name]) {
            console.warn(`Already have a node called "${name}"`);
            return;
        }

        console.log(`NODE ADDED: ${[name, x, y]}`);
        
        const node = this.create_node(name, x, y);
        this.nodes[name] = node;
        Matter.World.add(this.world, node);
    }
    
    maxDistanceSq() { return this.nodeRadius * this.nodeRadius * 2.0; }

    find_closest_node(x, y, maxDistanceSq = this.maxDistanceSq()) {
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
        if (node !== null) {
            const name = node.label;
            graph.removeNode(name);

            this.edges = this.edges.filter(edge => {
                const keep = edge.bodyA.label !== name && edge.bodyB.label !== name;
                if (!keep) Matter.World.remove(this.world, edge);
                return keep;
            });

            Matter.World.remove(this.world, node);
            delete this.nodes[name];
        }
    }

    remove_edge(x, y, graph) {
        const edge = this.find_closest_edge(x, y);
        if (edge !== null) {
            graph.removeEdge(edge.bodyA.label, edge.bodyB.label);
            this.edges = this.edges.filter(e => e !== edge);
            Matter.World.remove(this.world, edge);
        }
    }
}

const MODE_NORMAL      = 0;
const MODE_NODE_ADD    = 1;
const MODE_EDGE_ADD    = 2;
const MODE_NODE_REMOVE = 3;
const MODE_EDGE_REMOVE = 4;

class GraphView extends HTMLElement {
    constructor() {
        super();
        // Attach a shadow root to the element.
        this.attachShadow({ mode: 'open' });
        this.mode = MODE_NORMAL;
        this.callbacks = {};

        const canvas = document.createElement('canvas');
        canvas.width = this.clientWidth;
        canvas.height = this.clientHeight;
        canvas.addEventListener('click', event => {
            const rect = canvas.getBoundingClientRect(); // Get element's position relative to viewport
            const pos = [event.clientX - rect.left, event.clientY - rect.top];

            switch (this.mode) {
                case MODE_NODE_ADD:
                    const add_node = name => { this.physics.add_node(name, ...pos, this.graph); };
                    this.callbacks.onaddnode(...pos, add_node);
                    break;
                case MODE_NODE_REMOVE:
                    this.physics.remove_node(...pos, this.graph);
                    break;
                case MODE_EDGE_REMOVE:
                    this.physics.remove_edge(...pos, this.graph);
                    break;
                default:
            }
        });

        this.graph = new Graph();
        this.graph.test(); // TODO: REMOVE ME

        const script = document.createElement('script');
        script.src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.17.1/matter.min.js";
        script.onload = () => {
            this.physics = new Physics(canvas, this.graph);
        };

        this.shadowRoot.append(script, canvas);
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
        this.render();
    }

    render() {
        const canvas = this.shadowRoot.querySelector('canvas');
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!this.physics) {
            requestAnimationFrame(this.render.bind(this));
            return;
        }

        if (this.shadowRoot.x) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.shadowRoot.x++, 0, 100, 100);
        }

        let removedEdge = null;
        if (this.mode === MODE_EDGE_REMOVE) {
            const mousePosition = this.physics.mouseConstraint.constraint.pointA;
            removedEdge = this.physics.find_closest_edge(mousePosition.x, mousePosition.y);
        }

        // Render edges
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 3;
        this.physics.edges.forEach(edge => {
            const style = (removedEdge === edge)? 'red' : 'white';
            ctx.strokeStyle = style;
            ctx.fillStyle   = style;
            draw_arrow(
                ctx,
                edge.bodyA.position.x, edge.bodyA.position.y,
                edge.bodyB.position.x, edge.bodyB.position.y,
                this.physics.nodeRadius,
                12,
            );
        });
        
        ctx.strokeStyle = 'white';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let removedNode = null;
        if (this.mode === MODE_NODE_REMOVE) {
            const mousePosition = this.physics.mouseConstraint.constraint.pointA;
            removedNode = this.physics.find_closest_node(mousePosition.x, mousePosition.y);
        }

        // Render nodes
        for (const [name, node] of Object.entries(this.physics.nodes)) {
            ctx.beginPath();
            ctx.arc(node.position.x, node.position.y, this.physics.nodeRadius, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fillStyle = (removedNode?.label === node.label)? 'red' : 'blue';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.stroke();
            ctx.font = "24px sans-serif";
            ctx.fillText(name, node.position.x, node.position.y);
        }

        requestAnimationFrame(this.render.bind(this));
    }

    lockEdges() {
        function nodeDistance(nodeA, nodeB) {
            return Math.sqrt(distance_sq(
                nodeA.position.x,
                nodeA.position.y,
                nodeB.position.x,
                nodeB.position.y,
            ));
        }

        this.physics.edges.forEach(edge => {
            edge.length = nodeDistance(edge.bodyA, edge.bodyB);
            edge.stiffness = 0.1;
        });
    }

    unlockEdges() {
        this.physics.edges.forEach(edge => {
            edge.stiffness = 0.0;
        });
    }
}

// Define the new element
customElements.define('graph-view', GraphView);