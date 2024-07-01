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

        this.directed = true;
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

    neighbors(name) {
        if (this.directed) {
            return this.edges.filter(e => e[0] === name).map(e => e[1]).sort();
        }
        return this.edges
            .filter(e => e[0] === name || e[1] === name)
            .map(e => (e[0] === name)? e[1] : e[0])
            .sort();
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
    
    hasNode(name) {
        return this.nodes.includes(name);
    }

    hasEdge(nameA, nameB) {
        const edgeIndex = this.edges.findIndex(edge => 
            (edge[0] === nameA && edge[1] === nameB) || (edge[0] === nameB && edge[1] === nameA)
        );

        return (edgeIndex !== -1);
    }

    weight(nameA, nameB) {
        const edgeIndex = this.edges.findIndex(edge => 
            (edge[0] === nameA && edge[1] === nameB) || (edge[0] === nameB && edge[1] === nameA)
        );

        if (edgeIndex !== -1) {
            return this.edges[edgeIndex][2];
        }
        return null;
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

    edgesEqual(edgeA, edgeB) {
        return (edgeA[0] === edgeB[0] && edgeA[1] === edgeB[1])
        || (!this.directed && edgeA[0] === edgeB[1] && edgeA[1] === edgeB[0])
    }

    dfs(startNode) {
        return this.graphSearch(
            startNode,
            stack => stack.pop(),
            node => this.neighbors(node).reverse()
        );
    }
    
    bfs(startNode) {
        return this.graphSearch(
            startNode,
            queue => queue.shift(),
            node => this.neighbors(node)
        );
    }

    dijkstra(startNode) {
        const dist = {};
        const prev = {};
        const visited = [];
        for (const name of this.nodes) {
            dist[name] = 1e999;
        }
        dist[startNode] = 0;
        const H = [[startNode, 0]];
        
        let record = [];
        const saveRecord = (activeNode, highlight) => {
            const entry = {
                X: Object.values(visited),
                F: H.map(a => a[0]),
                edges: Object.entries(prev).map(e => e.reverse()),
                active: activeNode,
                dist: {...dist},
                ...highlight
            };
            record.push(entry);
        };

        saveRecord("");
        while (H.length > 0) {
            const [u,d] = H.pop();
            if (!visited.includes(u))
                visited.push(u);
            saveRecord(u);

            for (const v of this.neighbors(u)) {
                const w = this.weight(u,v);
                if (dist[v] > dist[u] + w) {
                    dist[v] = dist[u] + w;
                    prev[v] = u;
                    H.push([v, dist[v]]);
                    H.sort((a,b) => a[1] == b[1]? b[0].localeCompare(a[0]) : b[1] - a[1]);
                    saveRecord(u, {highlightedEdge: [u, v]});
                }
            }
        }
        saveRecord("");
        
        return record;
    }
    
    graphSearch(startNode, removeNode, neighbors, insertNode = (A, node) => A.push(node)) {
        let visited = [];
        let F = [startNode];
        let result = [];
        let tree = [];

        let record = [];
        const saveRecord = (activeNode, highlight) => {
            const entry = {
                X: Object.values(visited),
                F: F.map(a => a[0]),
                edges: Object.values(tree),
                active: activeNode,
                ...highlight
            };
            record.push(entry);
        };
    
        saveRecord("");
        while (F.length > 0) {
            const [node,prev] = removeNode(F);
            
            if (!visited.includes(node)) {
                // Visit node
                visited.push(node);
                result.push(node);
                if (prev) {
                    tree.push([prev, node]);
                }
                saveRecord(node);
                
                // Add all unvisited neighbors
                for (const neighbor of neighbors(node)) {
                    if (!visited.includes(neighbor)) {
                        insertNode(F, [neighbor, node]);
                        saveRecord(node, {highlightedEdge: [node, neighbor]});
                    }
                }
            }
        }
        saveRecord("");
    
        return record;
    }
}