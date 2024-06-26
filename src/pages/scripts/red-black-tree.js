
let mouseX = 0;
let mouseY = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let nodeCount = 0;

let hoveredNode = null;
let selectedNode = null;

// Red: 0, Black: 1
let root = JSON.parse(localStorage.getItem('root'));

function save_tree() {
    localStorage.setItem('root', JSON.stringify(tree_copy(root)));
}

const RED   = 0;
const BLACK = 1;

function create_node(value) {
    return {value: value, color: (Math.random() < 0.5? 0:1)};
}

function distance_sq(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    return dx * dx + dy * dy;
}

function traverse_inorder(root, callbackfn) {
    const inorder = (node, depth) => {
        if (!node) return;
        inorder(node.left, depth + 1);
        callbackfn(node, depth);
        inorder(node.right, depth + 1);
    };
    inorder(root, 0);
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
        if (b) b.parent = y;
    }
    // Left rotation
    else if (y.right == x) {
        let b = x.left;
        x.left   = y;
        y.right  = b;
        if (b) b.parent = y;
    }
}

function insert(value) {
    if (typeof value !== "number")
        value = parseInt(value);

    if (root === null) {
        root = create_node(value);
        return;
    }

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
    // Sets the node count and every nodes index & parent
    nodeCount = 0;
    const visit_node = (node, parent) => {
        if (!node) return;
        visit_node(node.left, node);
        node.parent = parent;
        node.index  = nodeCount++;
        visit_node(node.right, node);
    }
    visit_node(root, null);
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
    if (root === null) {
        document.getElementById("rule-1").style.color = "lime";
        document.getElementById("rule-2").style.color = "lime";
        document.getElementById("rule-3").style.color = "lime";
        return;
    }

    const rule1 = () => root.color == BLACK;
    const rule2 = () => {
        const good = (node) => {
            if (node.color == BLACK) {
                if (node.left  && !good(node.left))  return false;
                if (node.right && !good(node.right)) return false;
                return true;
            }
            if (node.left) {
                if (node.left.color == RED || !good(node.left))
                    return false;
            }
            if (node.right) {
                if (node.right.color == RED || !good(node.right))
                    return false;
            }
            return true;
        }
        return good(root);
    };
    const rule3 = () => {
        const count_black_nodes = (node) => {
            if (!node) return 1;
        
            const left_count  = count_black_nodes(node.left);
            const right_count = count_black_nodes(node.right);
            
            if (left_count === 0
            || right_count === 0
            ||  left_count !== right_count
            ) return 0;
            
            return (node.color == BLACK)? left_count + 1 : left_count;
        }
        return count_black_nodes(root) !== 0;
    };

    document.getElementById("rule-1").style.color = rule1()? "lime":"white";
    document.getElementById("rule-2").style.color = rule2()? "lime":"white";
    document.getElementById("rule-3").style.color = rule3()? "lime":"white";
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
    
    drawData.lines.forEach((l) => {
        ctx.beginPath();
        ctx.moveTo(...l.start);
        ctx.lineTo(...l.end);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
    });
    
    // Draw Circle for node
    drawData.nodes.forEach((p) => {
        // Draw a circle for each node
        ctx.beginPath();
        ctx.arc(...p.center, 10, 0, Math.PI * 2, false);
        ctx.strokeStyle = '#FFF'
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = p.node.color? '#000' : '#F00';
        ctx.fill();

        // Draw hovered/selected indicator
        if (p.node == hoveredNode || p.node == selectedNode) {
            ctx.beginPath();
            ctx.arc(...p.center, 20, 0, Math.PI * 2, false);
            ctx.strokeStyle = p.node == selectedNode? '#FFF':'lime'
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.closePath();
        }

        // Draw value for each node
        [x,y] = p.center;
        ctx.lineWidth = 5;
        ctx.font = "20px monospace";
        ctx.strokeStyle = '#000'
        ctx.fillStyle = '#FFF';
        ctx.textAlign='center';
        ctx.strokeText(p.node.value, x, y+30);
        ctx.fillText(p.node.value, x, y+30);
    });
}

function generate_draw_data() {
    drawData.reset();

    // Setup
    hoveredNode = null;

    const visit_node = (node, depth) => {
        const calc_node_x = (node) => {
            return ((node.index + 1) / (nodeCount + 1)) * canvasWidth;
        }
        const calc_node_y = (depth) => {
            return depth * 100 + 100;
        }

        let x = calc_node_x(node),
            y = calc_node_y(depth);
            
        // Draw connection to left child
        if (node.left) {
            drawData.lines.push({
                start: [x,y],
                end: [calc_node_x(node.left), calc_node_y(depth + 1)],
            });
            visit_node(node.left, depth + 1);
        }

        // Draw connection to right child
        if (node.right) {
            drawData.lines.push({
                start: [x,y],
                end: [calc_node_x(node.right), calc_node_y(depth + 1)],
            });
            visit_node(node.right, depth + 1);
        }
        
        const hover = distance_sq(mouseX, mouseY, x, y) < 40*40;
        if (hover) hoveredNode = node;
        
        drawData.nodes.push({
            center: [x,y],
            node:   node,
        });
    };
    if (root) visit_node(root, 0);

    if (hoveredNode != drawData.prevHoveredNode) {
        drawData.prevHoveredNode = hoveredNode;
        redraw = true;
    }

    if (selectedNode != drawData.prevSelectedNode) {
        drawData.prevSelectedNode = selectedNode;
        redraw = true;
    }
}


function init() {
    preprocess_tree(root);
    check_red_black_tree_conditions();
    
    const container = document.querySelector('.canvas-container');
    
    // Get the canvas element and its context
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

    // Function to handle 'mousemove' event
    function handleMouseMove(event) {
        const element = document.querySelector('.canvas-container');
        const rect = element.getBoundingClientRect(); // Get element's position relative to viewport
        mouseX = event.clientX - rect.left; // Calculate mouse X position relative to element
        mouseY = event.clientY - rect.top; // Calculate mouse Y position relative to element
        generate_draw_data();
        draw(ctx);
    }
    container.addEventListener('mousemove', handleMouseMove);

    function handleClick(event) {
        if (hoveredNode && selectedNode) {
            if (hoveredNode == selectedNode) {
                hoveredNode.color = 1 - hoveredNode.color;
            }
            else {
                avl_rotation(hoveredNode, selectedNode);
                preprocess_tree(root)
                generate_draw_data();
            }
            check_red_black_tree_conditions();
            save_tree();
            selectedNode = null;
            redraw = true;
        }
        else if(selectedNode || hoveredNode) {
            selectedNode = hoveredNode;
            redraw = true;
        }
        document.getElementById('textInput').focus();
        draw(ctx);
    }
    container.addEventListener('click', handleClick);

    container.addEventListener('keydown', (event) => {
        const modal = document.getElementById('new-node-value');
        const overlay = document.getElementById('overlay');
        
        const isNumber = (c) => { return !isNaN(c) && c !== ' '; }
        if (event.key === 'Enter') {
            modal.style.display = "none";
            overlay.style.display = "none";
        }
        if (event.key === 'Backspace') {
            console.log('Backspace key was pressed!');
        }
        else if (isNumber(event.key)) {
            const style = window.getComputedStyle(overlay);
            if (style.display === "none") {
                modal.style.display = "block";
                overlay.style.display = "flex";
                modal.innerText = "";
            }
            modal.innerText += event.key;
        }
    });

    const addNodeButton = document.getElementById('add-node');
    function add_node(event) {
        const addNodeInput = document.getElementById('add-node-value');
        insert(addNodeInput.value);
        preprocess_tree(root);
        generate_draw_data();
        check_red_black_tree_conditions();
        save_tree();
        redraw = true;
        draw(ctx);
    }
    addNodeButton.addEventListener('click', add_node);
    
    const clearButton = document.getElementById('clear-tree');
    function clear_tree(event) {
        if (window.confirm("Clear all nodes?")) {
            root = null;
            check_red_black_tree_conditions();
            save_tree();
            drawData.reset();
            redraw = true;
            draw(ctx);
        }
    }
    clearButton.addEventListener('click', clear_tree);
}

window.addEventListener('DOMContentLoaded', init);