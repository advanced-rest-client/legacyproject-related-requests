[![Published on NPM](https://img.shields.io/npm/v/@advanced-rest-client/legacyproject-related-requests.svg)](https://www.npmjs.com/package/@advanced-rest-client/legacyproject-related-requests)

[![Build Status](https://travis-ci.org/advanced-rest-client/legacyproject-related-requests.svg?branch=stage)](https://travis-ci.org/advanced-rest-client/legacyproject-related-requests)

[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/advanced-rest-client/legacyproject-related-requests)


# legacyproject-related-requests

Computes a list of requests related to a (legacy) project

## Example:

```html
<legacyproject-related-requests></legacyproject-related-requests>
```

## API components

This components is a part of [API components ecosystem](https://elements.advancedrestclient.com/)

## Usage

### Installation
```
npm install --save @advanced-rest-client/legacyproject-related-requests
```

### In an html file

```html
<html>
  <head>
    <script type="module">
      import './node_modules/@advanced-rest-client/legacyproject-related-requests/legacyproject-related-requests.js';
    </script>
  </head>
  <body>
    <legacyproject-related-requests></legacyproject-related-requests>
  </body>
</html>
```

### In a Polymer 3 element

```js
import {PolymerElement, html} from './node_modules/@polymer/polymer/polymer-element.js';
import './node_modules/@advanced-rest-client/legacyproject-related-requests/legacyproject-related-requests.js';

class SampleElement extends PolymerElement {
  static get template() {
    return html`
    <legacyproject-related-requests></legacyproject-related-requests>
    `;
  }
}
customElements.define('sample-element', SampleElement);
```

### Installation

```sh
git clone https://github.com/advanced-rest-client/legacyproject-related-requests
cd api-url-editor
npm install
npm install -g polymer-cli
```

### Running the demo locally

```sh
polymer serve --npm
open http://127.0.0.1:<port>/demo/
```

### Running the tests
```sh
polymer test --npm
```
