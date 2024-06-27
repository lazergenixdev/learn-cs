export class Graph {
    constructor() {
        this.nodes = [];
        this.edges = [];
    }

    addNode(name) {
        if (!this.nodes.includes(name)) {
            this.nodes.push(name);
        } else {
            console.log(`Node ${name} already exists.`);
        }
    }

    removeNode(node) {
        const nodeIndex = this.nodes.indexOf(node);
        if (nodeIndex !== -1) {
            this.nodes.splice(nodeIndex, 1);

            // Remove all edges associated with this node
            this.edges = this.edges.filter(edge => edge[0] !== node && edge[1] !== node);
        } else {
            console.log(`Node ${node} does not exist.`);
        }
    }

    addEdge(nameA, nameB, weight) {
        if (!this.nodes.includes(nameA) || !this.nodes.includes(nameB)) {
            console.log(`One or both nodes ${nameA} and ${nameB} do not exist.`);
            return;
        }

        for (let edge of this.edges) {
            if ((edge[0] === nameA && edge[1] === nameB) || (edge[0] === nameB && edge[1] === nameA)) {
                console.log(`Edge between ${nameA} and ${nameB} already exists.`);
                return;
            }
        }

        this.edges.push([nameA, nameB, weight]);
    }

    removeEdge(nameA, nameB) {
        const edgeIndex = this.edges.findIndex(edge => 
            (edge[0] === nameA && edge[1] === nameB) || (edge[0] === nameB && edge[1] === nameA)
        );

        if (edgeIndex !== -1) {
            this.edges.splice(edgeIndex, 1);
        } else {
            console.log(`Edge between ${nameA} and ${nameB} does not exist.`);
        }
    }

    stringify() {
        return JSON.stringify(this);
    }

    test() {
        // Add nodes
        this.addNode('A');
        this.addNode('B');
        this.addNode('C');
        this.addNode('D');
        this.addNode('E');
        this.addNode('F');
        this.addNode('G');
    
        // Add edges with weights
        this.addEdge('A', 'B', 5);
        this.addEdge('A', 'C', 10);
        this.addEdge('A', 'D', 15);
        this.addEdge('B', 'E', 7);
        this.addEdge('C', 'D', 11);
        this.addEdge('C', 'F', 6);
        this.addEdge('D', 'G', 12);
        this.addEdge('E', 'F', 4);
        this.addEdge('E', 'G', 3);
        this.addEdge('F', 'G', 8);
    }
}