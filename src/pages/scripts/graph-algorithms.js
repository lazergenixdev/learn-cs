const graphView = document.querySelector('graph-view');
const overlay = document.getElementById('overlay');

let cancel = () => {};

//{
//    const rect = graphView.getBoundingClientRect();
//    overlay.style.top  = `${rect.top}px`;
//    overlay.style.left = `${rect.left}px`;
//}
function removeOverlay() {
    cancel();
    overlay.style.display = "none";
}
overlay.addEventListener('click', removeOverlay);

graphView.setCallback('addnode', (x,y,add_node)=>{
    const addNodeDialog = document.getElementById('add-node-dialog');
    cancel = () => { addNodeDialog.style.display = "none"; };
    overlay.style.display = "inherit";

    const rect = graphView.getBoundingClientRect();
    // TODO: This can be offscreen, fix pls
    addNodeDialog.style.left = `${x + rect.left}px`;
    addNodeDialog.style.top  = `${y + rect.top}px`;
    addNodeDialog.style.display = "flex";

    const input = addNodeDialog.querySelector('input');
    input.value = "";
    input.onkeydown = event => {
        switch (event.key) {
            case 'Enter':
                add_node(input.value);
            case 'Escape':
                removeOverlay();    
                break;
            default:
        }
    };
    input.focus();

    const button = addNodeDialog.querySelector('button');
    button.onclick = () => {
        add_node(input.value);
        removeOverlay();
    };
});

graphView.setCallback('addedge', (x,y,add_edge)=>{
    const addEdgeDialog = document.getElementById('add-edge-dialog');
    cancel = () => { addEdgeDialog.style.display = "none"; };
    overlay.style.display = "inherit";

    const rect = graphView.getBoundingClientRect();
    // TODO: This can be offscreen, fix pls
    addEdgeDialog.style.left = `${x + rect.left}px`;
    addEdgeDialog.style.top  = `${y + rect.top}px`;
    addEdgeDialog.style.display = "flex";

    const input = addEdgeDialog.querySelector('input');
    const add = () => {
        const value = parseFloat(input.value);
        if (isNaN(value)) return;
        add_edge(value);
    };
    input.value = "";
    input.onkeydown = event => {
        switch (event.key) {
            case 'Enter':
                add();
            case 'Escape':
                removeOverlay();    
                break;
            default:
        }
    };
    input.focus();

    const button = addEdgeDialog.querySelector('button');
    button.onclick = () => {
        add();
        removeOverlay();
    };
});

const stiffToggle = document.getElementById('stiff');
stiffToggle.checked = false;
function updateStiff() {
    if (stiffToggle.checked) {
        graphView.unlockEdges();
    } else {
        graphView.lockEdges();
    }
}
stiffToggle.addEventListener('change', updateStiff);

const directedToggle = document.getElementById('directed');
function updateDirected() {
    graphView.setDirected(directedToggle.checked);
}
directedToggle.addEventListener('change', updateDirected);

const mode = document.getElementById('mode');
function setMode() {
    graphView.setMode(parseInt(mode.value));
}
setMode();
mode.addEventListener('change', setMode);

function clearGraph() {
    if (!window.confirm("Clear graph?")) return;
    graphView.clear();
}

document.getElementById('clear').addEventListener('click', clearGraph);

// Shortcuts
document.addEventListener('keydown', event => {
    if (window.getComputedStyle(overlay).display !== "none")
        return;

    const map = {
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
        '5': 4,
        '6': 5,
        'f': () => {
            stiffToggle.checked = !stiffToggle.checked
            updateStiff();
        },
        'Backspace': clearGraph,
        'ArrowLeft':  () => graphView.step(-1),
        'ArrowRight': () => graphView.step(+1),
    };
    const value = map[event.key];
    switch (typeof value) {
        case 'number':
            graphView.setMode(mode.value = value);
            break;
        case 'function':
            value();
            break;
    //  default:
    //      console.log(event.key);
    }
});