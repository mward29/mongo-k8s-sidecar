var Db = require('mongodb').Db;
var MongoClient = require('mongodb').MongoClient;
var async = require('async');
var config = require('./config');
var assert = require('assert');

var localhost = '127.0.0.1'; //Can access mongo as localhost from a sidecar

var getDb = function(host, done) {
  //If they called without host like getDb(function(err, db) { ... });
  if (arguments.length === 1) {
    if (typeof arguments[0] === 'function') {
      done = arguments[0];
      host = localhost;
    } else {
      throw new Error('getDb illegal invocation. User either getDb(\'options\', function(err, db) { ... }) OR getDb(function(err, db) { ... })');
    }
  }

  var mongoOptions = {};
  host = host || localhost;

  if (config.mongoSSLEnabled) {
    mongoOptions = {
      ssl: config.mongoSSLEnabled,
      sslAllowInvalidCertificates: config.mongoSSLAllowInvalidCertificates,
      sslAllowInvalidHostnames: config.mongoSSLAllowInvalidHostnames
    }
  }

  var connectUrl = "mongodb://" + host + ":" + config.mongoPort + "/admin"


  MongoClient.connect(connectUrl, mongoOptions, function (err, db) {
      assert.equal(null, err);

      return done(null, db);
  });
};

var replSetGetConfig = function(db, done) {
    db.command({ replSetGetConfig: 1 }, {}, function (err, results) {
        if (err) {
          return done(err);
        }

        return done(null, results.config);
    });
};

var replSetGetStatus = function(db, done) {

    db.command({ replSetGetStatus: {} }, {}, function (err, results) {
        if (err) {
          return done(err);
        }
        return done(null, results);
    });
};

var initReplSet = function(db, hostIpAndPort, done) {

  console.log('initReplSet', hostIpAndPort);
  db.command({ replSetInitiate: {} }, {}, function (err) {
    if (err) {
      return done(err);
    }

    //We need to hack in the fix where the host is set to the hostname which isn't reachable from other hosts
    replSetGetConfig(db, function(err, rsConfig) {
      if (err) {
        return done(err);
      }

      console.log('initial rsConfig is', rsConfig);
      rsConfig.configsvr = config.isConfigRS;
      rsConfig.members[0].host = hostIpAndPort;
      rsConfig.settings.getLastErrorDefaults = { w: "majority", wtimeout: 5000 }

      async.retry({times: 20, interval: 500}, function(callback) {
        replSetReconfig(db, rsConfig, false, callback);
      }, function(err, results) {
        if (err) {
          return done(err);
        }
        return done();
      });
    });
  });
};

var replSetReconfig = function(db, rsConfig, force, done) {
  console.log('replSetReconfig', rsConfig);

  rsConfig.version++;
  db.command({ replSetReconfig: rsConfig, force: force }, {}, function (err) {
      if (err) {
          return done(err);
      }

      return done();
  });
};

var addNewReplSetMembers = function(db, addrToAdd, addrToRemove, shouldForce, done) {
  replSetGetConfig(db, function(err, rsConfig) {
    if (err) {
      return done(err);
    }

    removeDeadMembers(rsConfig, addrToRemove);

    addNewMembers(rsConfig, addrToAdd);

    replSetReconfig(db, rsConfig, shouldForce, done);
  });
};

var addNewMembers = function(rsConfig, addrsToAdd) {
  if (!addrsToAdd || !addrsToAdd.length) return;

  //Follows what is basically in mongo's rs.add function
  var max = 0;

  for (var j in rsConfig.members) {
    if (rsConfig.members[j]._id > max) {
      max = rsConfig.members[j]._id;
    }
  }

  for (var i in addrsToAdd) {
    var cfg = {
      _id: ++max,
      host: addrsToAdd[i]
    };

    var exists = false;

    for (var j in rsConfig.members) {
      var member = rsConfig.members[j];
      if (member.host === addrsToAdd[i]) {
        console.log("Host [%s] already exists in the Replicaset. Not adding...",addrsToAdd[i])
        exists = true
        break;
      }
    }

    if (!exists){
      rsConfig.members.push(cfg);
    }

  }
};

var removeDeadMembers = function(rsConfig, addrsToRemove) {
  if (!addrsToRemove || !addrsToRemove.length) return;

  for (var i in addrsToRemove) {
    var addrToRemove = addrsToRemove[i];
    for (var j in rsConfig.members) {
      var member = rsConfig.members[j];
      if (member.host === addrToRemove) {
        rsConfig.members.splice(j, 1);
        break;
      }
    }
  }
};

var isInReplSet = function(ip, done) {
  getDb(ip, function(err, db) {
    if (err) {
      return done(err);
    }

    replSetGetConfig(db, function(err, rsConfig) {
      db.close();
      if (!err && rsConfig) {
        done(null, true);
      }
      else {
        done(null, false);
      }
    });
  });
};

module.exports = {
  getDb: getDb,
  replSetGetStatus: replSetGetStatus,
  initReplSet: initReplSet,
  addNewReplSetMembers: addNewReplSetMembers,
  isInReplSet: isInReplSet
};
