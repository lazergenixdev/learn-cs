export class History {
    constructor(setCallback, maxSize = 80) {
        this.data = [];
        this.index = -1; // Start with no states
        this.ctrlPressed = false;
        this.setCallback = setCallback;
        this.maxSize = maxSize;

        this.setupEventListeners();
    }

    push(state) {
        // Remove future history when pushing a new state
        this.data = this.data.slice(0, this.index + 1);
        this.data.push(state);

        // Limit the number of stored states
        if (this.data.length > this.maxSize) {
            this.data.shift(); // Remove the oldest state
        }

        // Move index to the new state
        this.index = this.data.length - 1;
    }

    undo() {
        if (this.index > 0) {
            this.index--;
            this.setCallback(this.data[this.index]);
        }
    }

    redo() {
        if (this.index < this.data.length - 1) {
            this.index++;
            this.setCallback(this.data[this.index]);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        document.addEventListener('focusout', () => {this.ctrlPressed = false;});
    }


    handleKeyDown(event) {
        if (event.key === 'Control') {
            this.ctrlPressed = true;
            return;
        }

        if (this.ctrlPressed && event.key === 'z') {
            this.undo();
            event.preventDefault(); // Prevent default behavior (e.g., browser back)
        } else if (this.ctrlPressed && event.key === 'r') {
            this.redo();
            event.preventDefault(); // Prevent default behavior (e.g., browser reload)
        }
    }

    handleKeyUp(event) {
        if (event.key === 'Control') {
            this.ctrlPressed = false;
        }
    }
}
