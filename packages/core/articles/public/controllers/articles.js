'use strict';

angular.module('mean.articles').controller('ArticlesController', ['$scope', '$sce', '$stateParams', '$location', '$http', 'Global', 'Articles', 'MeanUser', 'Groups',
    function ($scope, $sce, $stateParams, $location, $http, Global, Articles, MeanUser, Groups) {
        $scope.global = Global;
        $scope.group = 0;
        $scope.markdownEdit = false;
        $scope.article = {
            title: '',
            group: 0,
            content: ''
        };
        var featureOverlay;
        var map;
        $scope.toggle = function (_b) {
            _b = !_b;
            return _b;
        };
        $scope.$watch('markdownEdit', function() {
           if($scope.markdownEdit == true) {
               if(angular.isDefined($scope.article.content)) {
                   var editor = $("#markdown-editor").markdownEditor('editor');
                   if(typeof editor !== 'undefined') {
                       editor.getSession().setValue($scope.article.content);
                   }
               }
           }
        });
        $scope.markdown = function() {
            $("#markdown-editor").markdownEditor({
                preview: true,
                imageUpload: true,
                uploadPath: '/api/upload',
                onPreview: function(content, cb) {
                    $http({
                        url: '/api/markdown',
                        method: 'POST',
                        dataType: 'json',
                        data: {
                            content: content
                        }
                    }).success(function(result)  {
                        cb(result);
                    });
                }
            });
            var editor = $("#markdown-editor").markdownEditor('editor');
            if(typeof editor !== 'undefined') {
                //editor.getSession().setValue($scope.article.content);
                editor.on('change', function(e) {
                    $scope.article.content =  editor.getSession().getValue();
                });
            }
        };
        $scope.hasAuthorization = function (article) {
            if (!article || !article.user) return false;
            return MeanUser.isAdmin || article.user._id === MeanUser.user._id;
        };
        var geofeatures = [];
        $scope.create = function (isValid) {
            if (isValid) {
                var article = new Articles({
                    title: this.article.title,
                    content: this.article.content,
                    group: this.article.group,
                    geofeatures: geofeatures
                });
                article.$save(function (response) {
                    $location.path('articles/' + response._id);
                });
                this.article.title = '';
                this.article.content = '';
                this.article.group = '';
            } else {
                $scope.submitted = true;
            }
        };

        $scope.remove = function (article) {
            if (article) {
                article.$remove(function (response) {
                    for (var i in $scope.articles) {
                        if ($scope.articles[i] === article) {
                            $scope.articles.splice(i, 1);
                        }
                    }
                    $location.path('articles');
                });
            } else {
                $scope.article.$remove(function (response) {
                    $location.path('articles');
                });
            }
        };

        $scope.update = function (isValid) {
            if (isValid) {
                var article = $scope.article;
                if (!article.updated) {
                    article.updated = [];
                }
                article.updated.push(new Date().getTime());

                article.$update(function () {
                    $location.path('articles/' + article._id);
                });
            } else {
                $scope.submitted = true;
            }
        };

        $scope.find = function () {
            Articles.query(function (articles) {
                $scope.articles = articles;
                initFeatures();
            });
            initMap();
        };
        $scope.getContent = function(article) {
          if(!angular.isUndefined(article.contentRendered))  {
              return $sce.trustAsHtml(article.contentRendered);
          } else {
              return $sce.trustAsHtml(article.content);
          }
        };

        $scope.findOne = function () {
            Articles.get({
                articleId: $stateParams.articleId
            }, function (article) {
                $scope.article = article;
                $scope.article.contentRendered = '';
                $http({
                    url: '/api/markdown',
                    method: 'POST',
                    dataType: 'json',
                    data: {
                        content: $scope.article.content
                    }
                }).success(function(result)  {
                    $scope.contentRendered = $sce.trustAsHtml(result);
                    //$scope.$apply();
                });

            });
        };
        $scope.features = new ol.Collection();
        $scope.findGroups = function () {
            Groups.query(
                function (groups) {
                    $scope.groups = groups;
                }
            );
            initMap();
            modifyMap();
        };
        function initFeatures() {
            for (var i in $scope.articles) {
                var geofeats = $scope.articles[i].geofeatures;
                for (var j in geofeats) {
                    console.log(geofeats[j][0]);
                    if (geofeats[j][0].length > 1) {
                        console.log('make Polygon');
                        var feature = new ol.Feature({
                            geometry: new ol.geom.Polygon(geofeats[j]),
                            name: $scope.articles[i].title,
                            article: $scope.articles[i]
                        });
                        $scope.features.push(feature);
                    }
                }
            }
            map.on('pointermove', function (evt) {
                if (evt.dragging) {
                    return;
                }
                highlight(map.getEventPixel(evt.originalEvent));
            });
            map.on('click', function (evt) {
                displayInfo(map.getEventPixel(evt.originalEvent));
            });
        }

        var highlightFeature = null;
        var selectedFeature = null;
        $scope.selectedArticle = false;
        var normal_style = new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.3)'
            }),
            stroke: new ol.style.Stroke({
                color: '#ffcc33',
                width: 2
            }),
            image: new ol.style.Circle({
                radius: 7,
                fill: new ol.style.Fill({
                    color: '#ffcc33'
                })
            })
        });

        function displayInfo(pixel) {
            var click_style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 255, 0.5)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ff0033',
                    width: 3
                })
            });
            var feature = map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                return feature;
            });
            if (selectedFeature) {
                selectedFeature.setStyle(normal_style);
                selectedFeature = null;
                $scope.selectedArticle = false;
            }
            if (feature) {
                selectedFeature = feature;
                feature.setStyle(click_style);
                $scope.article = feature.getProperties().article;
                $scope.selectedArticle = true;
                console.log($scope.selectedArticle);
                $scope.$apply();
            }


        }

        function highlight(pixel) {
            var highlight_style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 0, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ff0033',
                    width: 2
                })
            });

            var feature = map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                return feature;
            });
            if (highlightFeature) {
                highlightFeature.setStyle(normal_style);
                highlightFeature = null;
            }
            if (feature) {
                highlightFeature = feature;
                feature.setStyle(highlight_style);
            }
        }

        function initMap() {
            var rudolfstr = ol.proj.fromLonLat([13.73976, 51.07001]);

            map = new ol.Map({
                layers: [
                    new ol.layer.Tile({
                        preload: 4,
                        source: new ol.source.OSM()
                    })
                    //,featureOverlay
                ],
                target: 'map',
                view: new ol.View({
                    center: rudolfstr,
                    zoom: 16
                })
            });
            featureOverlay = new ol.FeatureOverlay({
                //source: new ol.source.Vector({features: $scope.features}),
                //map: map,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.3)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#ffcc33',
                        width: 2
                    }),
                    image: new ol.style.Circle({
                        radius: 7,
                        fill: new ol.style.Fill({
                            color: '#ffcc33'
                        })
                    })
                })
            });
            $scope.features = featureOverlay.getFeatures();
            featureOverlay.setMap(map);
        }

        function modifyMap() {
            //map.addLayer(featureOverlay);
            var modify = new ol.interaction.Modify({
                features: featureOverlay.getFeatures(),
                // the SHIFT key must be pressed to delete vertices, so
                // that new vertices can be drawn at the same position
                // of existing vertices
                deleteCondition: function (event) {
                    return ol.events.condition.shiftKeyOnly(event) &&
                        ol.events.condition.singleClick(event);
                }
            });
            map.addInteraction(modify);
            var draw = new ol.interaction.Draw({
                features: featureOverlay.getFeatures(),
                type: 'Polygon'
            });
            draw.on('drawend', function (event) {
                console.log(event);
                console.log($scope.features.getArray());
                var f = event.feature.getGeometry();
                geofeatures.push(f.getCoordinates());

                console.log(geofeatures);
            });
            map.addInteraction(draw);
        }
    }
]);
