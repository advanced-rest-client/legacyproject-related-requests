/**
@license
Copyright 2018 The Advanced REST client authors <arc@mulesoft.com>
Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.
*/
import {PolymerElement} from '../../@polymer/polymer/polymer-element.js';
import '../../pouchdb/dist/pouchdb.js';
/**
 * An element that computes a list of requests related to a project.
 * It handles all request related events to update the list if the request object
 * change.
 *
 * ### Example
 *
 * ```html
 * <legacyproject-related-requests project-id="project-id"></legacyproject-related-requests>
 * <script>
 *  document.querySelector('legacyproject-related-requests')
 *  .addEventListener('project-related-requests-read', function(e) {
 *    console.log('Request for project: ', e.detail.projectId, ' are ready: ', e.detail.items);
 *  });
 * &lt;/script>
 * ```
 *
 * @polymer
 * @customElement
 * @memberof UiElements
 */
class LegacyprojectRelatedRequests extends PolymerElement {
  static get properties() {
    return {
      /**
       * An ID of the legacy project. Once changed it queries the datastore for
       * related requests.
       */
      projectId: {
        type: String,
        observer: '_autoQuery'
      },
      /**
       * list of requests found for the project.
       */
      data: {
        type: Array,
        notify: true
      },
      /**
       * If `true` then it queries for whole request objects.
       * Otherwise it only returns the `name`, `_rev` and `_id` properties.
       */
      fullQuery: Boolean,
      // If set then query is performed
      querying: {
        type: Boolean,
        notify: true,
        readOnly: true
      }
    };
  }
  // Returns a handler to the datastore instance
  get db() {
    /* global PouchDB */
    return new PouchDB('saved-requests');
  }

  constructor() {
    super();
    this._requestObjectChanged = this._requestObjectChanged.bind(this);
    this._requestObjectDeleted = this._requestObjectDeleted.bind(this);
    this._requestObjectsDeleted = this._requestObjectsDeleted.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('request-object-changed', this._requestObjectChanged);
    window.addEventListener('request-object-deleted', this._requestObjectDeleted);
    window.addEventListener('request-objects-deleted', this._requestObjectsDeleted);
  }

  disconnectedCallback() {
    window.removeEventListener('request-object-changed', this._requestObjectChanged);
    window.removeEventListener('request-object-deleted', this._requestObjectDeleted);
    window.removeEventListener('request-objects-deleted', this._requestObjectsDeleted);
    super.disconnectedCallback();
  }
  /**
   * Dispatches non-bubbling `project-related-requests-read` event with
   * data.
   *
   * @param {Array<Object>} requests List of request related to the project.
   * @param {String} projectId ID of the project
   */
  _dispatchReadEvent(requests, projectId) {
    this.dispatchEvent(new CustomEvent('project-related-requests-read', {
      bubbles: false,
      composed: true,
      detail: {
        projectId: projectId,
        items: requests
      }
    }));
  }
  /**
   * Automatically run function when either `opened` or `projectId` change.
   *
   * @param {String} projectId
   */
  _autoQuery(projectId) {
    if (!projectId) {
      return;
    }
    this.query(projectId)
    .then((requests) => {
      this.set('data', requests);
      this._dispatchReadEvent(requests, projectId);
    })
    .catch((cause) => {
      this.dispatchEvent(new CustomEvent('error', {
        bubbles: false,
        composed: true,
        detail: {
          message: cause.message
        }
      }));
    });
  }
  /**
   * Queries the datastore for related requests list for the project.
   *
   * @param {String} id Project ID
   * @return {Promise} Promise resolved to the list of related to project
   * requests.
   */
  query(id) {
    if (!id) {
      return Promise.reject(new Error('The "id" argument is missing'));
    }
    this._setQuerying(true);
    const db = this.db;
    return db.allDocs()
    .then((response) => this._filterRequests(response, id))
    .then((response) => Promise.all(response.map((item) => db.get(item.id))))
    .then((requests) => this._setDataScope(requests))
    .then((requests) => this._prepareData(requests))
    .then((requests) => {
      this._setQuerying(false);
      return requests;
    })
    .catch((cause) => {
      this._setQuerying(false);
      let message;
      if (cause.message) {
        message = cause.message;
      } else {
        message = JSON.stringify(cause);
      }
      this.dispatchEvent(new CustomEvent('send-analytics', {
        bubbles: true,
        composed: true,
        detail: {
          type: 'exception',
          description: message,
          fatal: true
        }
      }));
      console.error('Query for project\'s related requests', cause);
      throw cause;
    });
  }
  /**
   * Filters request list returned by the query to ones related to current
   * request.
   * @param {Object} dbResponse PouchDB query response
   * @param {String} id Project ID
   * @return {Array} Filtered list of requests that are related to the project
   */
  _filterRequests(dbResponse, id) {
    return dbResponse.rows.filter((item) => item.id.indexOf(id) !== -1);
  }
  /**
   * Perpares request objects depending on the `fullQuery` property.
   * If the property is set this does nothing. Otherwise this returns the
   * `name`, `_id` and `_rev` properties in the list of objects.
   *
   * @param {Array} list List of request objects
   * @return {Array} List of requests with requested scope.
   */
  _setDataScope(list) {
    if (this.fullQuery) {
      return list;
    }
    return list.map((item) => {
      return {
        _id: item._id,
        _rev: item._rev,
        name: item.name
      };
    });
  }
  /**
   * Sorts requests list by `projectOrder` property. Also, maps  `_id` to `id`
   * so some legacy views can support this data.
   *
   * @param {Array} list List of request objects
   * @return {Array} Sorted list of requests
   */
  _prepareData(list) {
    if (!list.length) {
      return [];
    }
    list.sort((a, b) => {
      if (a.projectOrder > b.projectOrder) {
        return 1;
      }
      if (a.projectOrder < b.projectOrder) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      }
      return 0;
    });
    return list.map((item) => {
      item.id = item._id;
      return item;
    });
  }
  /**
   * Handler for the `request-object-changed` event.
   * If the event is not cancelable and its `legacyProject` property equal current
   * project ID then it updates/adds request to the `data` list.
   *
   * @param {CustomEvent} e
   */
  _requestObjectChanged(e) {
    if (e.cancelable) {
      return;
    }
    const request = e.detail.request;
    if (!request || !request.legacyProject || request.legacyProject !== this.projectId) {
      return;
    }
    let items = this.data;
    if (!items || !items.length) {
      this.set('data', [request]);
      this._dispatchReadEvent(this.data, this.projectId);
      return;
    }
    const oldId = e.detail.oldId;
    const existing = items.findIndex((item) => item._id === oldId);
    if (existing === -1) {
      items.push(request);
    } else {
      items[existing] = e.detail.request;
    }
    items = this._prepareData(items);
    this.set('data', items);
  }
  /**
   * Handler for the `request-object-deleted` event. Removes a request from the
   * `data` list if removed item is on the list.
   *
   * @param {CustomEvent} e
   */
  _requestObjectDeleted(e) {
    if (e.cancelable) {
      // not yet saved
      return;
    }
    if (!e.detail.id) {
      return;
    }
    this._checkDeleted([e.detail.id]);
  }
  /**
   * Handler for the `request-objects-deleted` event. Removes deleted requests
   * from the `data` list if they are on the list.
   *
   * @param {CustomEvent} e
   */
  _requestObjectsDeleted(e) {
    if (e.cancelable) {
      // not yet saved
      return;
    }
    const ids = e.detail.items;
    if (!ids || !ids.length) {
      return;
    }
    this._checkDeleted(ids);
  }
  /**
   * Checks if any of the removed items is on current `data` list. Removes
   * items that are in the `ids` list.
   * @param {Array<String>} ids List of removed items IDs.
   */
  _checkDeleted(ids) {
    const items = this.data;
    if (!items || !items.length) {
      return;
    }
    for (let i = items.length - 1; i >= 0; i--) {
      if (~ids.indexOf(items[i]._id)) {
        this.splice('data', i, 1);
      }
    }
  }

  /**
   * Fired when the query function finished querying for the data.
   *
   * @event project-related-requests-read
   * @param {String} projectId Current project ID
   * @param {Array} items List of requests related to the project.
   */
}
window.customElements.define('legacyproject-related-requests', LegacyprojectRelatedRequests);