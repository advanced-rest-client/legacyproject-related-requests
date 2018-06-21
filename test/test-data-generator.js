/* global chance */
const methods = ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'HEAD'];
const methodsSize = methods.length - 1;
const DataGenerator = {};
DataGenerator.genRequestObject = function(projectData) {
  const methodIndex = chance.integer({min: 0, max: methodsSize});
  let id = chance.string({length: 5});
  if (projectData) {
    id += '/' + projectData;
  }
  const obj = {
    _id: id,
    _rev: chance.string({length: 12}),
    name: chance.sentence({words: 2}),
    method: methods[methodIndex],
    url: chance.url(),
    projectOrder: chance.integer({min: 0, max: 10}),
    legacyProject: projectData
  };
  return obj;
};
DataGenerator.generateRequests = function(projectId) {
  const result = [];
  for (let i = 0; i < 25; i++) {
    const projectData = chance.bool() ? projectId : undefined;
    result.push(DataGenerator.genRequestObject(projectData));
  }
  return result;
};

DataGenerator.countProjectItems = function(requests, projectId) {
  const result = requests.filter((item) => item.legacyProject &&
    item.legacyProject === projectId);
  return result.length;
};
