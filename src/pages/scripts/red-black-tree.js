
let mouseX = 0;
let mouseY = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let nodeCount = 0;

let hoveredNode = null;
let selectedNode = null;

// Red: 0, Black: 1
let root = JSON.parse(localStorage.getItem('root'));

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

function index_tree(root) {
    let i = 0;
    traverse_inorder(root, (n) => n.index = i++);
    return i;
}

function set_tree_parents(node, parent) {
    if (!node) return;
    node.parent = parent;
    set_tree_parents(node.left, node);
    set_tree_parents(node.right, node);
}

function preprocess_tree(root) {
    set_tree_parents(root, null);
    nodeCount = index_tree(root);
}

function tree_copy(node) {
    // Ensure node is an object and not null
    if (typeof node !== 'object' || node === null) {
        return node; // Return primitive types or null unchanged
    }

    // Create a new object to hold the copied properties
    const copiedNode = Array.isArray(node) ? [] : {};

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


    };

    document.getElementById("rule-1").style.color = rule1()? "lime":"white";
    document.getElementById("rule-2").style.color = rule2()? "lime":"white";
    document.getElementById("rule-3").style.color = rule3()? "lime":"white";
}

// Draw something on the canvas as an example
function test_draw(ctx) {
    // Draw a rectangle
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(50, 50, 150, 100);

    // Draw a circle
    ctx.beginPath();
    ctx.arc(300, 150, 50, 0, Math.PI * 2, false);
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.closePath();
    ctx.fillStyle = distance_sq(mouseX, mouseY, 300, 150) > 50*50? '#0000FF':'#FF0000';
    ctx.fill();

    // Draw a triangle
    ctx.beginPath();
    ctx.moveTo(500, 50);
    ctx.lineTo(450, 150);
    ctx.lineTo(550, 150);
    ctx.closePath();
    ctx.fillStyle = '#0000FF';
    ctx.fill();

    // Draw a line
    ctx.beginPath();
    ctx.moveTo(100, 300);
    ctx.lineTo(500, 300);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.closePath();
}

function draw(ctx) {
    // Clear canvas
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Setup
    hoveredNode = null;

    const draw_node = (node, depth) => {
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
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(calc_node_x(node.left), calc_node_y(depth + 1));
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
            
            draw_node(node.left, depth + 1);
        }

        // Draw connection to right child
        if (node.right) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(calc_node_x(node.right), calc_node_y(depth + 1));
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
            
            draw_node(node.right, depth + 1);
        }

        // Draw Circle for node
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2, false);
        ctx.strokeStyle = '#FFF'
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = node.color? '#000' : '#F00';
        ctx.fill();
        
        const hover = distance_sq(mouseX, mouseY, x, y) < 40*40;
        if (hover) hoveredNode = node;
        if (hover || selectedNode == node) {
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2, false);
            ctx.strokeStyle = selectedNode == node? '#FFF':'lime'
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.closePath();
        }
        
        // Draw value for node
        ctx.lineWidth = 5;
        ctx.font = "20px monospace";
        ctx.strokeStyle = '#000'
        ctx.fillStyle = '#FFF';
        ctx.textAlign='center';
        ctx.strokeText(node.value, x, y+30);
        ctx.fillText(node.value, x, y+30);
    };
    if (root) draw_node(root, 0);

    localStorage.setItem('root', JSON.stringify(tree_copy(root)));
    check_red_black_tree_conditions();
}

function init() {
    preprocess_tree(root);

    // Get the canvas element and its context
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext("2d", { alpha: false });

    // Resize canvas to fit its container
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        draw(ctx);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Function to handle 'mousemove' event
    function handleMouseMove(event) {
        const element = document.querySelector('.canvas-container');
        const rect = element.getBoundingClientRect(); // Get element's position relative to viewport
        mouseX = event.clientX - rect.left; // Calculate mouse X position relative to element
        mouseY = event.clientY - rect.top; // Calculate mouse Y position relative to element

        // TODO: only redraw if we NEED to
        draw(ctx);
    }

    const container = document.querySelector('.canvas-container');
    container.addEventListener('mousemove', handleMouseMove);

    function handleClick(event) {
        // perform an AVL rotation
        if (hoveredNode && selectedNode) {
            if (hoveredNode == selectedNode) {
                hoveredNode.color = 1 - hoveredNode.color;
            }
            else {
                avl_rotation(hoveredNode, selectedNode);
                preprocess_tree(root)
            }
            selectedNode = null;
        }
        else {
            selectedNode = hoveredNode;
        }
        draw(ctx);
    }
    container.addEventListener('click', handleClick);

    const addNodeButton = document.getElementById('add-node');
    function add_node(event) {
        const addNodeInput = document.getElementById('add-node-value');
        insert(addNodeInput.value);
        preprocess_tree(root);
        draw(ctx);
    }
    addNodeButton.addEventListener('click', add_node)

    const clearButton = document.getElementById('clear-tree');
    function clear_tree(event) {
        if (window.confirm("Clear all nodes?")) {
            root = null;
        }
        draw(ctx);
    }
    clearButton.addEventListener('click', clear_tree)
}

window.addEventListener('DOMContentLoaded', init);