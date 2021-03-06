(function() {
  'use strict';

  angular
    .module('snsoftHr')
    .factory('localdb', localdb);

  /** @ngInject */
  function localdb($log, $window, $q) {
    var DB_NAME = "snsofthrdb";
    var DB_VERSION = 10;
    /**
     * IndexedDB Version Changelog
     * 4 (Ricco): added leave table
     *          : added department as leave table index
     */
    var db;

    var service = {
      openDb: openDb,
      getObjectStore: getObjectStore,
      getDbConn: getDbConn
    };

    return service;
    
    //// Public Functions
    function openDb() {
      var deferred = $q.defer();
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      var justUpgraded = false;

      req.onerror = function (evt) {
        $log.info("openDb:", evt.target.errorCode);
        deferred.reject();
      };

      req.onupgradeneeded = function (evt) {
        $log.info("openDb.onupgradeneeded");

        var dataBase = evt.target.result;
        var txn = evt.target.transaction;

        var usrObjStore, deptObjStore, leaveObjStore, systemObjStore;

        var storeCreateIndex = function (objectStore, name, options) {
            if (!objectStore.indexNames.contains(name)) {
                objectStore.createIndex(name, name, options);
            }
        }

        switch(true) {
          case (evt.oldVersion < 3):
            $log.info("IndexedDB Version 3");

            usrObjStore = dataBase.createObjectStore("user", { keyPath : "username", autoIncrement : true });
            usrObjStore.createIndex('usergroup', 'usergroup', { unique: false });

            deptObjStore= dataBase.createObjectStore("department", { keyPath : "department"});

            // Create Index
            usrObjStore.createIndex("userDepartment", "department", { unique: false });

            //Permission object store
            var store = evt.currentTarget.result
            .createObjectStore("permission", { keyPath: 'id', autoIncrement: true });
            store.createIndex('code', 'code', { unique: false });
            store.createIndex('desc', 'desc', { unique: false });
            store.createIndex('PermissionList', 'PermissionList', { unique: false });

            // default departments
            txn.objectStore('department').add({department: "IT Department"});
            txn.objectStore('department').add({department: "HR Department"});
            txn.objectStore('department').add({department: "R&D Department"});

            // default admin user
            txn.objectStore('user').add({username: "admin@snsoft.my",userpwd: "123",usergroup: "1",supervisor: "",status: "Active",position: "",fullname: "admin",department: "IT Department",contactno: "123"});

            // default permission group
            var list = [1,2,3,4,5];
            txn.objectStore('permission').add({code: "P1",desc: "P1",PermissionList: list});

          case (evt.oldVersion < 4):      
            $log.info("IndexedDB Version 4");
            leaveObjStore = dataBase.createObjectStore("leave", { keyPath : "_id", autoIncrement : true });
            storeCreateIndex(leaveObjStore, "department", { unique: false });
          case (evt.oldVersion < 5): 
            $log.info("IndexedDB Version 5");
            systemObjStore = dataBase.createObjectStore("system", { keyPath : "_id", autoIncrement : true });
            txn.objectStore('system').add({leaveTypes: { 1: "Annual Leave", 2: "Medical Leave", 99: "Other Reason" }});
          case (evt.oldVersion < 6): 
            $log.info("IndexedDB Version 6");
            storeCreateIndex(leaveObjStore, "user.username", { unique: true });
            storeCreateIndex(leaveObjStore, "user.department", { unique: false });
          case (evt.oldVersion < 7): 
            $log.info("IndexedDB Version 7");
            leaveObjStore = txn.objectStore('leave');
            storeCreateIndex(leaveObjStore, "user", { unique: true, multiEntry: true});
          case (evt.oldVersion < 8):
            $log.info("IndexedDB Version 8");
            leaveObjStore = txn.objectStore('leave');
            leaveObjStore.deleteIndex('user');
            storeCreateIndex(leaveObjStore, "user", { unique: true, multiEntry: true});
          case (evt.oldVersion < 9):
            $log.info("IndexedDB Version 9");
            leaveObjStore = txn.objectStore('leave');
            leaveObjStore.deleteIndex('user');
            storeCreateIndex(leaveObjStore, "user", { unique: false, multiEntry: true});
          case (evt.oldVersion < 10):
            $log.info("IndexedDB Version 10");
            leaveObjStore = txn.objectStore('leave');
            storeCreateIndex(leaveObjStore, "approvalBy", { unique: false, multiEntry: true});            
        }

        deferred.resolve();
      };

      req.onsuccess = function () {
        db = this.result;
        deferred.resolve(db);
      };

      return deferred.promise;
    }

    /**
     * @param {string} store_name
     * @param {string} mode either "readonly" or "readwrite"
     */
    function getObjectStore(store_name, mode) {
      var tx = db.transaction(store_name, mode);
      return tx.objectStore(store_name);
    }

    function getDbConn()
    {
      return Promise.resolve(db);
    }
  }
})();
