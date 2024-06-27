import { Graph } from "../Graph.js";
import { draw_arrow } from "../graphics.js";

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
            const x = Math.random() * 100.0;
            const y = Math.random() * 100.0;
            this.nodes[name] = Bodies.circle(x, y, this.nodeRadius, { restitution: 0.6, friction: 0.1, label: name })
            Matter.World.add(this.world, this.nodes[name]);
        });
        
        // Create edges (constraints)
        graph.edges.forEach(edge => {
            this.edges.push(
                Constraint.create({
                    bodyA: this.nodes[edge[0]], 
                    bodyB: this.nodes[edge[1]], 
                    stiffness: 0.001,
                    length: 150
                })
            );
        });
        Matter.World.add(this.world, this.edges);

        // Add mouse interaction
        const mouse = Matter.Mouse.create(canvas);
        const mouseConstraint = Matter.MouseConstraint.create(
            this.engine, {
                mouse: mouse,
                constraint: {
                    stiffness: 0.2,
                    render: { visible: false }
                }
            }
        );
        Matter.World.add(this.world, mouseConstraint);
        
        // Set gravity to attract towards the center of the screen
        this.world.gravity.x = 0;
        this.world.gravity.y = 0;
        
        // Run the engine
        Matter.Runner.run(this.runner, this.engine);
    }
}

class GraphView extends HTMLElement {
    constructor() {
        super();
        // Attach a shadow root to the element.
        this.attachShadow({ mode: 'open' });

        const canvas = document.createElement('canvas');
        canvas.width = this.clientWidth;
        canvas.height = this.clientHeight;

        this.graph = new Graph();
        this.graph.test();

        const script = document.createElement('script');
        script.src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.17.1/matter.min.js";
        script.onload = () => {
            this.physics = new Physics(canvas, this.graph);
        };

        this.shadowRoot.append(script, canvas);
    }

    connectedCallback() {
        // Invoked each time the custom element is appended into a document-connected element.
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

        // Render edges
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 3;
        this.physics.edges.forEach(edge => {
            draw_arrow(
                ctx,
                edge.bodyA.position.x, edge.bodyA.position.y,
                edge.bodyB.position.x, edge.bodyB.position.y,
                this.physics.nodeRadius,
                12,
            );
        });
        
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Render nodes
        for (const [name, node] of Object.entries(this.physics.nodes)) {
            ctx.beginPath();
            ctx.arc(node.position.x, node.position.y, this.physics.nodeRadius, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fillStyle = 'blue';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.stroke();
            ctx.font = "24px sans-serif";
            ctx.fillText(name, node.position.x, node.position.y);
        }

        requestAnimationFrame(this.render.bind(this));
    }

    lockEdges() {
        function distance(x0, y0, x1, y1) {
            const dx = x1 - x0;
            const dy = y1 - y0;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        function nodeDistance(nodeA, nodeB) {
            return distance(
                nodeA.position.x,
                nodeA.position.y,
                nodeB.position.x,
                nodeB.position.y,
            );
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