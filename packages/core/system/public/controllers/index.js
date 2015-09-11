'use strict';

angular.module('mean.system').controller('IndexController', ['$scope', 'Global',
  function($scope, Global) {
    $scope.global = Global;
    $scope.sites = {
      'makeapoint':{
        'name':'makeapoint',
        'text':'Makeapoint is a platform to craft and fine-tune ideas and messages providing a graphical experience which brough an offline methodlogy online',
        'author':'Linnovate',
        'link':'http://www.linnovate.net',
        'image':'/theme/assets/img/makeapoint.png'
      },
      'cactus':{
        'name':'Milan e.V',
        'text':'Der Milan e.V arbeitet als gemeinnütziger Verein auf lokaler Ebene für die Förderung und Bereicherung des sozialen und kulturellen Lebens. Unser aktuelles Tätigkeitsgebiet ist Dresden mit dem Kernpunkt südliches Hechtviertel. Unsere Zielgruppe sind junge Erwachsene mit psychischen Störungen und in Krisensituationen, Angehörige sowie alle Bürger*innen, die sich ehrenamtlich engagieren wollen oder am Geschehen partizipieren wollen',
        'author':'Vera',
        'link':'http://www.milan-dd.de/de/',
        'image':'/theme/assets/img/milan.png'
      }
    };
    $scope.packages = {
      'gmap':{
        'name':'gmap',
        'text':'gmap lets you add geographical information to your applications objects',
        'author':'linnovate',
        'link':'http://www.qed42.com',
        'image':'/theme/assets/img/gmap.png'
      },
      'upload':{
        'name':'Upload',
        'text':'hello text',
        'author':'Linnovate',
        'link':'http://www.linnovate.net',
        'image':'http://cdn.designbyhumans.com/pictures/blog/09-2013/pop-culture-cats/Pop_Culture_Cats_Hamilton_Hipster.jpg'
      },
      'socket':{
        'name':'Socket',
        'text':'Socket.io support',
        'author':'Linnovate',
        'link':'http://www.linnovate.net',
        'image':'http://cdn.designbyhumans.com/pictures/blog/09-2013/pop-culture-cats/Pop_Culture_Cats_Hamilton_Hipster.jpg'
      }
    };


    $scope.initScroller = function() {
      var sc = skrollr.init({
        render: function(data) {
          //if (DEBUG_SCROLL !== undefined && DEBUG_SCROLL === true) {
          //  console.log(data.curTop);
          //}
        }
      });
    };

    $scope.$watch(function () {
      for (var i = 0; i < $scope.sites.length; i+=1) {
        if ($scope.sites[i].active) {
          return $scope.sites[i];
        }
      }
    }, function (currentSlide, previousSlide) {
      if (currentSlide !== previousSlide) {
        console.log('currentSlide:', currentSlide);
      }
    });
  }
]);
