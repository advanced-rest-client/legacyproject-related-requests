[![Published on NPM](https://img.shields.io/npm/v/@advanced-rest-client/legacyproject-related-requests.svg)](https://www.npmjs.com/package/@advanced-rest-client/legacyproject-related-requests)

[![Build Status](https://travis-ci.org/advanced-rest-client/legacyproject-related-requests.svg?branch=stage)](https://travis-ci.org/advanced-rest-client/legacyproject-related-requests)

[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/advanced-rest-client/legacyproject-related-requests)


# legacyproject-related-requests

Computes a list of requests related to a (legacy) project.
It is an internal ARC component to read request data.

## Example:

```html
<legacyproject-related-requests></legacyproject-related-requests>
```

## Usage

### Installation
```
npm install --save @advanced-rest-client/legacyproject-related-requests
```

### In a LitElement

```js
import { LitElement, html } from 'lit-element';
import '@advanced-rest-client/legacyproject-related-requests/legacyproject-related-requests.js';

class SampleElement extends PolymerElement {
  render() {
    return html`
    <legacyproject-related-requests
      .projectId="${this.projectId}"
      @data="${this._requestsHandler}"></legacyproject-related-requests>
    `;
  }

  _requestsHandler(e) {
    this.requests = e.detail.value;
  }
}
customElements.define('sample-element', SampleElement);
```

## Development

```sh
git clone https://github.com/advanced-rest-client/legacyproject-related-requests
cd legacyproject-related-requests
npm install
```

### Running the tests
```sh
npm test
```

## API components

This components is a part of [API components ecosystem](https://elements.advancedrestclient.com/)
