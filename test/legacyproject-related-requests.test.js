import {
  fixture,
  assert,
  html
} from '@open-wc/testing';
import * as sinon from 'sinon/pkg/sinon-esm.js';
import '../legacyproject-related-requests.js';
import { DataGenerator } from '@advanced-rest-client/arc-data-generator/arc-data-generator.js';

describe('<legacyproject-related-requests>', function() {
  async function basicFixture() {
    return await fixture(html `
      <legacyproject-related-requests></legacyproject-related-requests>
    `);
  }

  describe('initalization', () => {
    it('can be created from web api call', () => {
      const element = document.createElement('legacyproject-related-requests');
      assert.ok(element);
    });

    it('does not set data', async () => {
      const element = await basicFixture();
      assert.isUndefined(element.data);
    });

    it('does not set fullQuery', async () => {
      const element = await basicFixture();
      assert.isUndefined(element.fullQuery);
    });

    it('does not set querying', async () => {
      const element = await basicFixture();
      assert.isUndefined(element.querying);
    });

    it('does not projectId data', async () => {
      const element = await basicFixture();
      assert.isUndefined(element.projectId);
    });
  });

  describe('data event', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('dispatches the event when data change', () => {
      const spy = sinon.spy();
      element.addEventListener('data', spy);
      element._data = [{}];
      assert.isTrue(spy.calledOnce);
    });

    it('detail has "items"', () => {
      const spy = sinon.spy();
      element.addEventListener('data', spy);
      element._data = [{}];
      assert.deepEqual(spy.args[0][0].detail.items, element.data);
    });

    it('detail has "projectId"', () => {
      const spy = sinon.spy();
      element.addEventListener('data', spy);
      element._autoQuery = () => {};
      element.projectId = 'testid';
      element._data = [{}];
      assert.equal(spy.args[0][0].detail.projectId, 'testid');
    });
  });

  describe('query()', () => {
    let inserts;
    let projectId;
    before(async () => {
      inserts = await DataGenerator.insertSavedRequestData({
        projectsSize: 1,
        requestsSize: 5,
        forceProject: true
      });
      projectId = inserts.projects[0]._id;
    });

    after(async () => {
      await DataGenerator.destroySavedRequestData();
    });

    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('throws when no argument', async () => {
      let called = false;
      try {
        await element.query();
      } catch (_) {
        called = true;
      }
      assert.isTrue(called);
    });

    it('returns empty array when project does not exist', async () => {
      const result = await element.query('non-existing');
      assert.deepEqual(result, []);
    });

    it('reads scoped requests', async () => {
      const result = await element.query(projectId);
      assert.lengthOf(result, 5, 'has all items');
      const item = result[0];
      assert.typeOf(item._id, 'string', 'has _id');
      assert.typeOf(item._rev, 'string', 'has _rev');
      assert.typeOf(item.name, 'string', 'has name');
      assert.isUndefined(item.type, 'has no type');
    });

    it('reads full requests', async () => {
      element.fullQuery = true;
      const result = await element.query(projectId);
      assert.lengthOf(result, 5, 'has all items');
      const item = result[0];
      assert.typeOf(item._id, 'string', 'has _id');
      assert.typeOf(item._rev, 'string', 'has _rev');
      assert.typeOf(item.name, 'string', 'has name');
      assert.typeOf(item.type, 'string', 'has type');
    });

    it('ignores non existing items', async () => {
      const project = inserts.projects[0];
      project.requests.push('non-existing');
      await DataGenerator.updateObject('legacy-projects', project);
      const result = await element.query(projectId);
      assert.lengthOf(result, 5, 'has only existing items');
    });

    it('sorts the data by name', async () => {
      const requests = await element.query(projectId);
      const a = requests[0];
      const b = requests[1];
      const result = a.name.localeCompare(b.name);
      assert.equal(result, -1);
    });

    it('sorts the data by projectOrder', async () => {
      const created = inserts.requests;
      created[0].projectOrder = 3;
      created[1].projectOrder = 5;
      created[2].projectOrder = 4;
      created[3].projectOrder = 1;
      created[4].projectOrder = 2;
      const db = element.savedDb;
      await db.bulkDocs(created);
      const requests = await element.query(projectId);
      assert.equal(requests[0].name, created[3].name);
      assert.equal(requests[1].name, created[4].name);
      assert.equal(requests[2].name, created[0].name);
      assert.equal(requests[3].name, created[2].name);
      assert.equal(requests[4].name, created[1].name);
    });
  });

  describe('projectId', () => {
    let inserts;
    let projectId;
    before(async () => {
      inserts = await DataGenerator.insertSavedRequestData({
        projectsSize: 1,
        requestsSize: 5,
        forceProject: true
      });
      projectId = inserts.projects[0]._id;
    });

    after(async () => {
      await DataGenerator.destroySavedRequestData();
    });

    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('evetually dispatches data event with the data', (done) => {
      element.addEventListener('data', function f(e) {
        element.removeEventListener('data', f);
        assert.lengthOf(e.detail.items, 5, 'has all items');
        assert.equal(e.detail.projectId, projectId, 'projectId is set');
        done();
      });
      element.projectId = projectId;
    });

    it('evetually dispatches data event when project does not exist', (done) => {
      element.addEventListener('data', function f(e) {
        element.removeEventListener('data', f);
        assert.lengthOf(e.detail.items, 0, 'has no items');
        assert.equal(e.detail.projectId, 'test', 'projectId is set');
        done();
      });
      element.projectId = 'test';
    });

    it('runs query only once for the same project', () => {
      element._autoQuery = () => {};
      const spy = sinon.spy(element, '_autoQuery');
      element.projectId = projectId;
      assert.isTrue(spy.calledOnce);
      element.projectId = projectId;
      assert.isTrue(spy.calledOnce);
    });

    it('does not run query when removing project id', () => {
      const orig = element._autoQuery;
      element._autoQuery = () => {};
      element.projectId = projectId;
      element._autoQuery = orig;
      const spy = sinon.spy(element, 'query');
      element.projectId = '';
      assert.isFalse(spy.called);
    });
  });

  describe('legacy IDs system', () => {
    let projectId;
    before(async () => {
      const data = DataGenerator.generateSavedRequestData({
        projectsSize: 1,
        requestsSize: 5
      });
      projectId = data.projects[0]._id;
      data.requests.forEach((item) => {
        item._id = projectId + '/' + item._id;
        delete item.projects;
      });
      delete data.projects[0].requests;
      /* global PouchDB */
      const projectsDb = new PouchDB('legacy-projects');
      await projectsDb.bulkDocs(data.projects);
      const savedDb = new PouchDB('saved-requests');
      await savedDb.bulkDocs(data.requests);
    });

    after(async () => {
      await DataGenerator.destroySavedRequestData();
    });

    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('returns all project requests', async () => {
      const result = await element.query(projectId);
      assert.lengthOf(result, 5, 'has all items');
    });
  });

  describe('request-object-changed', () => {
    let element;
    let projectId;
    let requests;
    beforeEach(async () => {
      element = await basicFixture();
      const data = DataGenerator.generateSavedRequestData({
        projectsSize: 1,
        requestsSize: 5,
        forceProject: true
      });
      requests = element._prepareData(data.requests);
      element._data = requests;
      projectId = data.projects[0]._id;
      element._autoQuery = () => {};
      element.projectId = projectId;
    });

    function fire(request, cancelable) {
      if (typeof cancelable !== 'boolean') {
        cancelable = false;
      }
      const e = new CustomEvent('request-object-changed', {
        bubbles: true,
        cancelable,
        detail: {
          request
        }
      });
      document.body.dispatchEvent(e);
    }

    it('adds a new item when _data is not set', () => {
      const item = requests[0];
      element._data = undefined;
      fire(item);
      assert.deepEqual(element._data, [item]);
    });

    it('updates an item on the list', () => {
      const item = Object.assign({}, element._data[3]);
      item.name = 'other';
      const id = item._id;
      fire(item);
      const updated = element._data.find((i) => i._id === id);
      assert.equal(updated.name, 'other');
    });

    it('adds new item to the list', () => {
      const item = DataGenerator.generateSavedItem({
        project: projectId
      });
      fire(item);
      assert.lengthOf(element.data, 6);
    });

    it('ignores item from different proejct', () => {
      const item = DataGenerator.generateSavedItem({
        project: 'other'
      });
      fire(item);
      assert.lengthOf(element.data, 5);
    });

    it('accepts legacyProject proeprty', () => {
      const item = DataGenerator.generateSavedItem();
      item.legacyProject = projectId;
      fire(item);
      assert.lengthOf(element.data, 6);
    });

    it('ignores cancelable event', () => {
      const item = DataGenerator.generateSavedItem();
      item.legacyProject = projectId;
      fire(item, true);
      assert.lengthOf(element.data, 5);
    });
  });

  describe('request-object-deleted', () => {
    let element;
    let projectId;
    let requests;
    beforeEach(async () => {
      element = await basicFixture();
      const data = DataGenerator.generateSavedRequestData({
        projectsSize: 1,
        requestsSize: 5,
        forceProject: true
      });
      requests = element._prepareData(data.requests);
      element._data = requests;
      projectId = data.projects[0]._id;
      element._autoQuery = () => {};
      element.projectId = projectId;
    });

    function fire(id, cancelable) {
      if (typeof cancelable !== 'boolean') {
        cancelable = false;
      }
      const e = new CustomEvent('request-object-deleted', {
        bubbles: true,
        cancelable,
        detail: {
          id
        }
      });
      document.body.dispatchEvent(e);
    }

    it('removes item from _data', () => {
      const item = requests[0];
      fire(item._id);
      assert.lengthOf(element._data, 4);
    });

    it('ignores cancelable event', () => {
      const item = requests[0];
      fire(item._id, true);
      assert.lengthOf(element.data, 5);
    });

    it('ignores events without id', () => {
      fire();
      assert.lengthOf(element.data, 5);
    });
  });

  describe('request-objects-deleted', () => {
    let element;
    let projectId;
    let requests;
    beforeEach(async () => {
      element = await basicFixture();
      const data = DataGenerator.generateSavedRequestData({
        projectsSize: 1,
        requestsSize: 5,
        forceProject: true
      });
      requests = element._prepareData(data.requests);
      element._data = requests;
      projectId = data.projects[0]._id;
      element._autoQuery = () => {};
      element.projectId = projectId;
    });

    function fire(items, cancelable) {
      if (typeof cancelable !== 'boolean') {
        cancelable = false;
      }
      const e = new CustomEvent('request-objects-deleted', {
        bubbles: true,
        cancelable,
        detail: {
          items
        }
      });
      document.body.dispatchEvent(e);
    }

    it('removes items from _data', () => {
      const item = requests[0];
      fire([item._id]);
      assert.lengthOf(element._data, 4);
    });

    it('ignores cancelable event', () => {
      const item = requests[0];
      fire([item._id], true);
      assert.lengthOf(element.data, 5);
    });

    it('ignores events without ids', () => {
      fire();
      assert.lengthOf(element.data, 5);
    });
  });

  describe('a11y', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('is accessible', async () => {
      await assert.isAccessible(element);
    });
  });
});
