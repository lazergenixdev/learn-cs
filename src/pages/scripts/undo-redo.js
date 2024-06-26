export class History {
    constructor(set) {
        this.data = [];
        this.index = 0;
        this.ctrlPressed = false;
        this.set = set;
        this.max = 80;
    }

    push(state) {
        this.data = this.data.slice(0,this.index+1);
        this.data.push(state);
        if (this.data.length > this.max) {
            this.data = this.data.slice(-this.max);
        }
        this.index = this.data.length-1;
    }

    undo() {
        if (this.index > 0) {
            this.index -= 1;
            this.set(this.data[this.index]);
        }
    }

    redo() {
        if (this.index >= this.data.length-1) return;

        this.index += 1;
        this.set(this.data[this.index]);
    }

    setup() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Control') {
                this.ctrlPressed = true;
                return;
            }

            if (event.repeat) return;
            
            if (this.ctrlPressed && event.key === 'z') {
                this.undo();
                event.preventDefault(); // Prevent default behavior (e.g., browser back)
            } else if (this.ctrlPressed && event.key === 'r') {
                this.redo();
                event.preventDefault(); // Prevent default behavior (e.g., browser reload)
            }
        });
        document.addEventListener('keyup', (event) => {
            if (event.key === 'Control') {
                this.ctrlPressed = false;
            }
        });
        document.addEventListener('focusout', (event) => {
            this.ctrlPressed = false;
        });
    }
}
