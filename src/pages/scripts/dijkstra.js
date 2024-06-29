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
    overlay.style.display = "inherit";
    cancel = () => { addNodeDialog.style.display = "none"; };

    const addNodeDialog = document.getElementById('add-node-dialog');
    const rect = graphView.getBoundingClientRect();
    // TODO: This can be offscreen, fix pls
    addNodeDialog.style.left = `${x + rect.left}px`;
    addNodeDialog.style.top  = `${y + rect.top}px`;
    addNodeDialog.style.display = "flex";

    const input = addNodeDialog.querySelector('input');
    input.value = "";
    input.onkeydown = event => {
        if (event.key === 'Enter') {
            add_node(input.value);
            removeOverlay();
        }
    };
    input.focus();

    const button = addNodeDialog.querySelector('button');
    button.onclick = () => {
        add_node(input.value);
        removeOverlay();
    };
});

const stiffToggle = document.getElementById('stiff');
stiffToggle.addEventListener('change', () => {
    if (stiffToggle.checked) {
        graphView.lockEdges();
    } else {
        graphView.unlockEdges();
    }
});

const mode = document.getElementById('mode');
const setMode = () => graphView.mode = parseInt(mode.value);
setMode();
mode.addEventListener('change', setMode);

//const edgeNode1 = document.getElementById('edge-node-1');
//const edgeNode2 = document.getElementById('edge-node-2');
//nodes.forEach(node => {
//    const optionElement = document.createElement('option');
//    optionElement.textContent = "A";
//    optionElement.value = node; // Set the value attribute to the item
//    edgeNode1.appendChild(optionElement);
//    edgeNode2.appendChild(optionElement.cloneNode(true));
//});