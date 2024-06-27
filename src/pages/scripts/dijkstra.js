
const stiffToggle = document.getElementById('stiff');
stiffToggle.addEventListener('change', () => {
    const graphView = document.querySelector('graph-view');
    if (stiffToggle.checked) {
        graphView.lockEdges();
    } else {
        graphView.unlockEdges();
    }
});

//const edgeNode1 = document.getElementById('edge-node-1');
//const edgeNode2 = document.getElementById('edge-node-2');
//nodes.forEach(node => {
//    const optionElement = document.createElement('option');
//    optionElement.textContent = "A";
//    optionElement.value = node; // Set the value attribute to the item
//    edgeNode1.appendChild(optionElement);
//    edgeNode2.appendChild(optionElement.cloneNode(true));
//});