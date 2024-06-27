import { History } from "./undo-redo.js";
import { draw_arrow } from "./graphics.js";

let mouseX = 0;
let mouseY = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let nodeCount = 0;
let treeHeight = 0;

let hoveredNode = null;
let selectedNode = null;
let lastInsertedValue = undefined;

const RED   = 0;
const BLACK = 1;
let root = JSON.parse(localStorage.getItem('root'));

function save_tree() {
    const state = JSON.stringify(tree_copy(root));
    history.push(state);
    localStorage.setItem('root', state);
}

function create_node(value) {
    return {value: value, color: RED};
}

function distance_sq(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    return dx * dx + dy * dy;
}

function avl_rotation(x, y) {
    // Want `y` to be the parent
    if (y.parent == x) {
        let t = y;
        y = x;
        x = t;        
    }
    let p = y.parent;
    
    if (p) {
        if (p.left == y) p.left  = x;
        else             p.right = x;
    } else root = x;
    x.parent = p;
    y.parent = x;
    
    // Right rotation
    if (y.left == x) {
        let b = x.right;
        x.right  = y;
        y.left   = b;
        if(b) b.parent = y;
    }
    // Left rotation
    else if (y.right == x) {
        let b = x.left;
        x.left   = y;
        y.right  = b;
        if(b) b.parent = y;
    }
}

function insert(value) {
    if (typeof value !== "number")
        value = parseInt(value);

    if (root === null) {
        root = create_node(value);
        return;
    }

    lastInsertedValue = value;
    const insert_from = (node, value) => {
        if (value < node.value) {
            if (node.left) return insert_from(node.left, value);
            node.left = create_node(value);
        }
        else {
            if (node.right) return insert_from(node.right, value);
            node.right = create_node(value);
        }
    };
    insert_from(root, value);
}

function preprocess_tree(root) {
    nodeCount = 0;

    // Helper function to visit each node and set its properties
    const visit_node = (node, parent) => {
        if (!node) return 0; // Base case: if the node is null, return height 0
        
        const left_height = visit_node(node.left, node);

        node.parent = parent;
        node.index  = nodeCount++;
        
        const right_height = visit_node(node.right, node);
        
        // Return the height of the current node's subtree
        return Math.max(left_height, right_height) + 1;
    }

    treeHeight = visit_node(root, null);
}

function tree_copy(node) {
    // Ensure node is an object and not null
    if (typeof node !== 'object' || node === null) {
        return node; // Return primitive types or null unchanged
    }

    // Create a new object to hold the copied properties
    const copiedNode = {};

    // Iterate through all properties of the original object
    for (let key in node) {
        // Skip copying the 'parent' property
        if (key === 'parent') {
            continue;
        }

        // Recursively copy nested objects or arrays
        copiedNode[key] = tree_copy(node[key]);
    }

    return copiedNode;
}

function check_red_black_tree_conditions() {
    const rules = {
        // Rule 1: The root is always black
        "rule-1": () => root.color == BLACK,

        // Rule 2: Red nodes can't have red children
        "rule-2": () => {
            const validate_node = (node) => {
                if (!node) return true;
                
                if (node.color === RED) {
                    if (node.left?.color === RED || node.right?.color === RED) {
                        return false;
                    }
                }
                return validate_node(node.left) && validate_node(node.right);
            };
            return validate_node(root);
        },

        // Rule 3: Every path from the root to leaf has the same number of black nodes
        "rule-3": () => {
            const count_black_nodes = (node) => {
                if (!node) return 1;
                
                const left_count  = count_black_nodes(node.left);
                const right_count = count_black_nodes(node.right);
                
                if (left_count === 0 || right_count === 0 || left_count !== right_count) return 0;
                
                return (node.color === BLACK)? left_count + 1 : left_count;
            }
            return count_black_nodes(root) !== 0;
        },
    };

    for (const [id, fn] of Object.entries(rules)) {
        document.getElementById(id).style.color = (root === null) || fn()? "lime" : "white";
    }
}

let drawData = {
    reset: function() {
        this.nodes = [];
        this.lines = [];
    },
    prevHoveredNode:  null,
    prevSelectedNode: null,
};
let redraw;

function draw(ctx) {
    if (!redraw) return;
    redraw = false;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw tree connection lines
    ctx.lineWidth = 3;
    drawData.lines.forEach((l) => {
        ctx.strokeStyle = lastInsertedValue? l.color : '#FFF';
        ctx.fillStyle   = lastInsertedValue? l.color : '#FFF';
        draw_arrow(ctx, ...l.start, ...l.end, 8);
    });
    
    // Draw Circle for node
    drawData.nodes.forEach((p) => {
        // Draw a circle for each node
        ctx.beginPath();
        ctx.arc(...p.center, 10, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.strokeStyle = '#FFF'
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = p.node.color? '#000' : '#F00';
        ctx.fill();

        // Draw hovered/selected indicator
        if (p.node == hoveredNode || p.node == selectedNode) {
            ctx.beginPath();
            ctx.arc(...p.center, 20, 0, Math.PI * 2, false);
            ctx.closePath();
            ctx.strokeStyle = p.node == selectedNode? '#FFF':'lime'
            ctx.lineWidth = 8;
            ctx.stroke();
        }

        // Draw value for each node
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000'
        ctx.fillStyle = '#FFF';
        ctx.font = "20px monospace";
        ctx.textAlign='center';
        const [x,y] = p.center;
        ctx.strokeText(p.node.value, x, y+30);
        ctx.fillText(p.node.value, x, y+30);
    });
}

function generate_draw_data() {
    drawData.reset();

    // Setup
    hoveredNode = null;

    const visit_node = (node, depth, followLastInserted) => {
        const calc_x = (node) => {
            const nx = Math.min(80, canvasWidth / (nodeCount+1));
            const w = nx * (nodeCount+1);
            return ((node.index + 1) / (nodeCount + 1)) * w + (canvasWidth-w)/2.0;
        }
        const calc_y = (depth) => (
            depth * Math.min(80, (canvasHeight-80)/treeHeight) + 40
        );

        let x = calc_x(node),
            y = calc_y(depth);
            
        // Draw connection to left child
        if (node.left) {
            const follow = followLastInserted && lastInsertedValue < node.value;
            drawData.lines.push({
                start: [x,y],
                end: [calc_x(node.left), calc_y(depth + 1)],
                color: follow? '#4F4': '#FFF',
            });
            visit_node(node.left, depth + 1, follow);
        }
        
        // Draw connection to right child
        if (node.right) {
            const follow = followLastInserted && lastInsertedValue > node.value;
            drawData.lines.push({
                start: [x,y],
                end: [calc_x(node.right), calc_y(depth + 1)],
                color: follow? '#4F4': '#FFF',
            });
            visit_node(node.right, depth + 1, follow);
        }
        
        const hover = distance_sq(mouseX, mouseY, x, y) < 40*40;
        if (hover) hoveredNode = node;
        
        drawData.nodes.push({
            center: [x,y],
            node:   node,
        });
    };
    if (root) visit_node(root, 0, true);

    if (hoveredNode != drawData.prevHoveredNode) {
        drawData.prevHoveredNode = hoveredNode;
        redraw = true;
    }

    if (selectedNode != drawData.prevSelectedNode) {
        drawData.prevSelectedNode = selectedNode;
        redraw = true;
    }
}

const history = new History((state) => {
    localStorage.setItem('root', state);
    const new_root = JSON.parse(state);
    root = new_root;
    preprocess_tree(root);
    lastInsertedValue = undefined;
    generate_draw_data();
    check_red_black_tree_conditions();
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext("2d", { alpha: false });
    redraw = true;
    draw(ctx);
});

function init() {
    history.push(JSON.stringify(tree_copy(root)));
    preprocess_tree(root);
    check_red_black_tree_conditions();
    
    const container = document.querySelector('.canvas-container');
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext("2d", { alpha: false });
    
    function debounce(func, timeout = 250) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    // Resize canvas to fit its container
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        canvasWidth  = container.clientWidth;
        canvasHeight = container.clientHeight;
        generate_draw_data();
        redraw = true;
        draw(ctx);
    }

    window.addEventListener('resize', debounce(() => resizeCanvas()));
    resizeCanvas();

    container.addEventListener('mousemove', (event) => {
        const element = document.querySelector('.canvas-container');
        const rect = element.getBoundingClientRect(); // Get element's position relative to viewport
        mouseX = event.clientX - rect.left; // Calculate mouse X position relative to element
        mouseY = event.clientY - rect.top; // Calculate mouse Y position relative to element
        generate_draw_data();
        draw(ctx);
    });

    const overlay = document.getElementById('overlay');
    overlay.addEventListener('click', (event) => {
        overlay.style.display = "none";
    });

    container.addEventListener('click', (event) => {
        const overlay = document.getElementById('overlay');
        const howto   = document.getElementById('how-to');
        const style   = window.getComputedStyle(howto);
        if (style.display !== "none") {
            howto.style.display = "none";
            overlay.style.display = "none";
        }

        if (hoveredNode && selectedNode) {
            let updated = false;
            if (hoveredNode == selectedNode) {
                hoveredNode.color = 1 - hoveredNode.color;
                updated = true;
            }
            else if (hoveredNode.parent == selectedNode
            ||      selectedNode.parent == hoveredNode) {
                avl_rotation(hoveredNode, selectedNode);
                preprocess_tree(root)
                generate_draw_data();
                updated = true;
            }
            if (updated) {
                check_red_black_tree_conditions();
                save_tree();
                selectedNode = null;
                redraw = true;
            }
        }
        else if(selectedNode || hoveredNode) {
            selectedNode = hoveredNode;
            redraw = true;
        }
        if (lastInsertedValue !== undefined) {
            lastInsertedValue = undefined;
            redraw = true;
        }
        draw(ctx);
    });

    const clearButton = document.getElementById('clear-tree');
    const helpButton = document.getElementById('help');

    document.addEventListener('keydown', (event) => {
        const modal = document.getElementById('new-node-value');
        const overlay = document.getElementById('overlay');
        
        const style = window.getComputedStyle(overlay);
        const visible = (style.display !== "none");

        const hide = () => {
            modal.style.display = "none";
            overlay.style.display = "none";
            clearButton.disabled = false;
            helpButton.disabled = false;
        };

        const isNumber = (c) => { return !isNaN(c) && c !== ' '; };
        if (event.key === 'Enter') {
            if (!visible) return;
            hide();
            insert(modal.innerText);
            preprocess_tree(root);
            generate_draw_data();
            check_red_black_tree_conditions();
            save_tree();
            redraw = true;
            draw(ctx);

            document.getElementById('add-node-input').value = "";
        }
        else if (event.key === 'Backspace') {
            if (!visible) return;
            if (modal.innerText.length <= 1) hide();
            else modal.innerText = modal.innerText.slice(0, -1);
        }
        else if (event.key === 'Escape') hide();
        else if (isNumber(event.key)) {
            if (!visible) {
                modal.style.display = "block";
                overlay.style.display = "flex";
                modal.innerText = "";
                clearButton.disabled = true;
                helpButton.disabled = true;
            }
            modal.innerText += event.key;
        }
    });
    
    clearButton.addEventListener('click', (event) => {
        if (window.confirm("Clear all nodes?")) {
            root = null;
            check_red_black_tree_conditions();
            save_tree();
            drawData.reset();
            redraw = true;
            draw(ctx);
        }
    });
    
    helpButton.addEventListener('click', (event) => {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementById('how-to').style.display = "block";
    });
}

window.addEventListener('DOMContentLoaded', init);