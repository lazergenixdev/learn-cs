/**
 * Represents a graph data structure.
 */
export class Graph {
    /**
     * Initializes a new instance of the Graph class.
     */
    constructor() {
        /**
         * Array to store nodes of the graph.
         * @type {Array<string>}
         */
        this.nodes = [];

        /**
         * Array to store edges of the graph.
         * @type {Array<Array<string|number>>}
         */
        this.edges = [];
    }

    /**
     * Checks if the graph is empty.
     *
     * @returns {boolean} - Returns true if the graph has no nodes and no edges, otherwise false.
     */
    isEmpty() {
        return this.nodes.length === 0 && this.edges.length === 0;
    }

    clear() {
        this.nodes = [];
        this.edges = [];
    }
    
    /**
     * Adds a new node to the graph.
     * @param {string} name - The name of the node to add.
     * @returns {boolean} True if the node was successfully added, false if it already exists.
     */
    addNode(name) {
        if (this.nodes.includes(name)) {
            console.log(`Node ${name} already exists.`);
            return false;
        }
        
        this.nodes.push(name);
        return true;
    }

    /**
     * Removes a node from the graph.
     * @param {string} node - The node to remove.
     */
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

    /**
     * Adds an edge between two nodes with an optional weight.
     * @param {string} nameA - The name of the first node.
     * @param {string} nameB - The name of the second node.
     * @param {number} [weight] - The weight of the edge (optional).
     * @returns {boolean} True if the edge was successfully added, false if it already exists or nodes don't exist.
     */
    addEdge(nameA, nameB, weight) {
        if (!this.nodes.includes(nameA) || !this.nodes.includes(nameB)) {
            console.log(`One or both nodes ${nameA} and ${nameB} do not exist.`);
            return false;
        }

        for (let edge of this.edges) {
            if ((edge[0] === nameA && edge[1] === nameB) || (edge[0] === nameB && edge[1] === nameA)) {
                console.log(`Edge between ${nameA} and ${nameB} already exists.`);
                return false;
            }
        }

        this.edges.push([nameA, nameB, weight]);
        return true;
    }

    /**
     * Removes an edge between two nodes.
     * @param {string} nameA - The name of the first node.
     * @param {string} nameB - The name of the second node.
     */
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

    /**
     * Returns a JSON string representation of the graph.
     * @returns {string} JSON string representing the graph.
     */
    stringify() {
        return JSON.stringify(this);
    }

    /**
     * Parses a JSON string and returns a new Graph instance.
     *
     * @param {string} jsonString - The JSON string representation of a Graph.
     * @returns {Graph} - A new Graph instance populated with nodes and edges from the JSON string.
     * @throws {SyntaxError} - Throws an error if the JSON string is not valid.
     */
    static parse(jsonString) {
		const parsed = JSON.parse(jsonString);
		const graph = new Graph();
		graph.nodes = parsed?.nodes || [];
		graph.edges = parsed?.edges || [];
		return graph;
    }

    /**
     * Test function to populate the graph with nodes and edges.
     */
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