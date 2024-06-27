class PageLink extends HTMLElement {
    // Called once when document.createElement('recipe-card') is called, or
    // the element is written into the DOM directly as <recipe-card>
    constructor() {
        super(); // Inheret everything from HTMLElement

        // Attaches the shadow DOM to this Web Component
        this.attachShadow({ mode: 'open' });

        // This element will hold our markup once our data is set
        const a = document.createElement('a');

        // This style element will hold all of the styles for the Web Component
        const style = document.createElement('style');
        // Insert all of the styles in to the <style> element
        style.innerHTML = `
        .button {
            width: 300px;
            height: 200px;
            background-size: cover;
            background-position: center;
            background-image: url('${this.getAttribute('src')}');
            position: relative;
            border-radius: 10px;
            overflow: hidden;
            text-decoration: none;
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            border: 2px solid;
            border-color: black;
        }
        .button:hover {
            border-color: white;
            transform: translateY(-5px);
            box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
        }
        .button .overlay {
            background: rgba(0, 0, 0, 0.75);
            padding: 10px;
            text-align: center;
        }
        .button .title {
            font-size: 24px;
            font-weight: bold;
        }
        .button .description {
            font-size: 16px;
        }
        `;

        a.href = this.getAttribute('href');
        a.classList.add('button');
      
      // Append the <style> and <article> elements to the Shadow DOM
      this.shadowRoot.append(style, a);
    }
    
    connectedCallback() {
        const a = this.shadowRoot.querySelector('a');
        a.innerHTML = `
            <div class="overlay">
                <div class="title">${this.getAttribute('title')}</div>
                <div class="description">${this.innerHTML}</div>
            </div>
        `;
    }
}
  
// Define the Class so you can use it as a custom element
customElements.define('page-link', PageLink);