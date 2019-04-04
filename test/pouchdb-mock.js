export const PouchDbMock = {};
PouchDbMock.mock = function(requests) {
  function Mocked() {}

  Mocked.prototype.allDocs = function() {
    const result = {
      rows: requests.map((item) => {
        return {
          id: item._id
        };
      })
    };
    return Promise.resolve(result);
  };
  Mocked.prototype.get = function(id) {
    return requests.find((item) => item._id === id);
  };
  window.PouchDB = Mocked;
};
