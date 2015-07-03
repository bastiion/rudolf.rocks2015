 'use strict';

 //Articles service used for articles REST endpoint
 angular.module('mean.articles').factory('Groups', ['$http',
 function($http) {
    return {
        query: function (cb) {
            $http.get('api/groups').success(function(data) {
                    console.log("get groups " + data);
                    cb(data);
                }
            );
        }
    }
 }
 ]);
