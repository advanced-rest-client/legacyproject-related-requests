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
import { LitElement } from 'lit-element';
import 'pouchdb/dist/pouchdb.js';
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
class LegacyprojectRelatedRequests extends LitElement {
  static get properties() {
    return {
      /**
       * An ID of the legacy project. Once changed it queries the datastore for
       * related requests.
       */
      projectId: { type: String },
      /**
       * If `true` then it queries for whole request objects.
       * Otherwise it only returns the `name`, `_rev` and `_id` properties.
       */
      fullQuery: { type: Boolean }
    };
  }
  // Returns a handler to the saved store instance
  get savedDb() {
    /* global PouchDB */
    return new PouchDB('saved-requests');
  }

  // Returns a handler to the saved store instance
  get projectDb() {
    return new PouchDB('legacy-projects');
  }

  get projectId() {
    return this._projectId;
  }

  set projectId(value) {
    const old = this._projectId;
    /* istanbul ignore if */
    if (old === value) {
      return;
    }
    this._projectId = value;
    this._autoQuery(value);
  }
  /**
   * @return {Array<Object>} list of requests found for the project.
   */
  get data() {
    return this._data;
  }

  get _data() {
    return this.__data;
  }

  set _data(value) {
    const old = this.__data;
    /* istanbul ignore if */
    if (old === value) {
      return;
    }
    this.__data = value;
    this.dispatchEvent(new CustomEvent('data', {
      detail: {
        projectId: this.projectId,
        items: value
      }
    }));
  }

  /**
   * @return {Boolean} true if currently querying for the data.
   */
  get querying() {
    return this._querying;
  }

  get _querying() {
    return this.__querying;
  }

  set _querying(value) {
    const old = this.__querying;
    /* istanbul ignore if */
    if (old === value) {
      return;
    }
    this.__querying = value;
    this.dispatchEvent(new CustomEvent('querying', {
      detail: {
        value
      }
    }));
  }

  constructor() {
    super();
    this._requestObjectChanged = this._requestObjectChanged.bind(this);
    this._requestObjectDeleted = this._requestObjectDeleted.bind(this);
    this._requestObjectsDeleted = this._requestObjectsDeleted.bind(this);
  }

  connectedCallback() {
    /* istanbul ignore else */
    if (super.connectedCallback) {
      super.connectedCallback();
    }
    this.setAttribute('aria-hidden', 'true');
    window.addEventListener('request-object-changed', this._requestObjectChanged);
    window.addEventListener('request-object-deleted', this._requestObjectDeleted);
    window.addEventListener('request-objects-deleted', this._requestObjectsDeleted);
  }

  disconnectedCallback() {
    window.removeEventListener('request-object-changed', this._requestObjectChanged);
    window.removeEventListener('request-object-deleted', this._requestObjectDeleted);
    window.removeEventListener('request-objects-deleted', this._requestObjectsDeleted);
    /* istanbul ignore else */
    if (super.disconnectedCallback) {
      super.disconnectedCallback();
    }
  }
  /**
   * Automatically run function when either `opened` or `projectId` change.
   *
   * @param {String} projectId
   */
  async _autoQuery(projectId) {
    if (!projectId) {
      return;
    }
    const requests = await this.query(projectId);
    this._data = requests;
  }
  /**
   * Queries the datastore for related requests list for the project.
   *
   * @param {String} id Project ID
   * @return {Promise} Promise resolved to the list of related to project
   * requests.
   */
  async query(id) {
    if (!id) {
      throw new Error('The "id" argument is missing');
    }
    this._querying = true;
    try {
      const keys = await this._readProjectRequests(id);
      if (!keys.length) {
        return await this._tryLegacy(id);
      }
      let requests = await this._getProjectRequest(keys);
      requests = this._prepareData(requests);
      requests = this._setDataScope(requests);
      this._querying = false;
      return requests;
    } catch (cause) {
      this._querying = false;
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
      return [];
    }
  }

  async _readProjectRequests(id) {
    const db = this.projectDb;
    const doc = await db.get(id);
    return doc.requests || [];
  }

  async _getProjectRequest(keys) {
    const db = this.savedDb;
    const response = await db.allDocs({
      include_docs: true,
      keys
    });
    const result = [];
    response.rows.forEach((item) => {
      if (!item.error && item.doc) {
        result[result.length] = item.doc;
      }
    });
    return result;
  }

  async _tryLegacy(id) {
    const db = this.savedDb;
    let response = await db.allDocs();
    response = this._filterRequests(response, id);
    response = await Promise.all(response.map((item) => db.get(item.id)));
    let requests = this._prepareData(response);
    requests = this._setDataScope(response);
    this._querying = false;
    return requests;
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
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
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
    const { request } = e.detail;
    let projects = [];
    if (request.legacyProject) {
      projects = [request.legacyProject];
    }
    if (request.projects) {
      projects = projects.concat(request.projects);
    }
    if (projects.indexOf(this.projectId) === -1) {
      return;
    }
    let items = this.data || [];
    if (!items.length) {
      items = [request];
    } else {
      const index = items.findIndex((item) => item._id === request._id);
      if (index === -1) {
        items.push(request);
      } else {
        items[index] = request;
      }
      items = this._prepareData(items);
    }
    this._data = [...items];
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
    const { id } = e.detail;
    if (!id) {
      return;
    }
    this._checkDeleted([id]);
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
    let changed = false;
    for (let i = items.length - 1; i >= 0; i--) {
      if (~ids.indexOf(items[i]._id)) {
        items.splice(i, 1);
        changed = true;
      }
    }
    if (changed) {
      this._data = [...items];
    }
  }

  /**
   * Fired when the query function finished querying for the data.
   *
   * @event project-related-requests
   * @param {String} projectId Current project ID
   * @param {Array} items List of requests related to the project.
   */
}
window.customElements.define('legacyproject-related-requests', LegacyprojectRelatedRequests);
