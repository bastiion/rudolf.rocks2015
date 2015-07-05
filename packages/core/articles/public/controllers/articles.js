'use strict';

angular.module('mean.articles').controller('ArticlesController', ['$scope', '$sce', '$stateParams', '$location', '$http', 'Global', 'Articles', 'MeanUser', 'Groups',
    function ($scope, $sce, $stateParams, $location, $http, Global, Articles, MeanUser, Groups) {
        $scope.global = Global;
        $scope.group = 0;
        $scope.markdownEdit = false;
        $scope.editTool = 'select';
        $scope.article = {
            title: '',
            group: 0,
            content: '',
            tags: [],
            contentRendered: $sce.trustAsHtml('')
        };
        $scope.selectedArticle = false;
        $scope.features = new ol.Collection();
        var featureOverlay, drawInteraction, modifyInteraction, selectInteraction;
        var highlightFeature = null;
        var selectedFeature = null;
        var geofeatures = [];
        var map;
        var rudolfstr = ol.proj.fromLonLat([13.73976, 51.07001]);

        var stamenLayer = new ol.layer.Tile({
            source: new ol.source.Stamen({
                layer: 'toner'
            })
        });
        var osmLayer = new ol.layer.Tile({
            preload: 4,
            source: new ol.source.OSM()
        });
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
        $scope.create = function (isValid) {
            if (isValid) {
                updateGeometryFeatures();
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
                updateGeometryFeatures();
                $scope.article.geofeatures = geofeatures;
                var article = $scope.article;
                console.log(article);

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

        $scope.mapFind = function() {
            Articles.query(function (articles) {
                $scope.articles = articles;
                initFeatures();
            });
            initMap();
            enableSelectMod();
        };

        $scope.find = function () {
            Articles.query(function (articles) {
                $scope.articles = articles;
            });
        };
        $scope.getContent = function(article) {
          if(!angular.isUndefined(article.contentRendered))  {
              return $sce.trustAsHtml(article.contentRendered);
          } else {
              return $sce.trustAsHtml(article.content);
          }
        };

        var initControls = function() {
            var t = $('#tags'),
                tags = $scope.article.tags;
            t.tagsinput();

            for(var i in tags) {
                try {
                    t.tagsinput('add', tags[i]);
                } catch(e) {
                    console.log("Error at tag " + tag[i]);
                }
            }
        };
        $scope.initView= function () {
            Articles.get({
                articleId: $stateParams.articleId
            }, function (article) {
                $scope.article = article;
                $http({
                    url: '/api/markdown',
                    method: 'POST',
                    dataType: 'json',
                    data: {
                        content: $scope.article.content
                    }
                }).success(function(result)  {
                    $scope.article.contentRendered = $sce.trustAsHtml(result);
                    //$scope.$apply();
                });
            });
        };

        $scope.initEdit = function () {
            initMap();
            modifyMap();
            Articles.get({
                articleId: $stateParams.articleId
            }, function (article) {
                $scope.article = article;
                $http({
                    url: '/api/markdown',
                    method: 'POST',
                    dataType: 'json',
                    data: {
                        content: $scope.article.content
                    }
                }).success(function(result)  {
                    $scope.article.contentRendered = $sce.trustAsHtml(result);
                    //$scope.$apply();
                });
                makeFeatures($scope.article.geofeatures, $scope.article);
                //mapEvents();
                initControls();

            });
        };
        $scope.initCreate = function () {
            Groups.query(
                function (groups) {
                    $scope.groups = groups;
                }
            );
            initControls();
            initMap();
            modifyMap();
        };
        function initFeatures() {
            for (var i in $scope.articles) {
                var geofeats = $scope.articles[i].geofeatures;
                makeFeatures(geofeats, $scope.articles[i]);

            }
            mapEvents();
        }
        function mapEvents() {
            map.on('pointermove', function (evt) {
                if (evt.dragging) {
                    return;
                }
                highlight(map.getEventPixel(evt.originalEvent));
            });
            /*map.on('click', function (evt) {
                displayInfo(map.getEventPixel(evt.originalEvent));
            });*/
        }

        function enableSelectMod() {
            selectInteraction = new ol.interaction.Select({
                layers: [featureOverlay],
                style: click_style,
                multi: false
            });
            selectInteraction.getFeatures().on('add', function(event) {
                selectedFeature = event.target.item(0);
                $scope.article = selectedFeature.getProperties().article;
                $scope.selectedArticle = true;
                console.log($scope.selectedArticle);
                $scope.$apply();
            });
            map.addInteraction(selectInteraction);
        }

        function makeFeatures(geofeats, article) {
            for (var j in geofeats) {
                console.log(geofeats[j][0]);
                if (geofeats[j][0].length > 1) {
                    console.log('make Polygon');
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Polygon(geofeats[j]),
                        name: article.title,
                        article: article
                    });
                    $scope.features.push(feature);
                } else if(geofeats[j].length == 2) {
                    console.log('make Marker');
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Point(geofeats[j]),
                        name: article.title,
                        article: article
                    });
                    feature.setStyle(iconStyle)
                    $scope.features.push(feature);
                }
            }
        }


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

        var highlight_style = new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 0, 255, 0.2)'
            }),
            stroke: new ol.style.Stroke({
                color: '#ff0033',
                width: 2
            })
        });

        var click_style = new ol.style.Style({
            fill: new ol.style.Fill({
                color: 'rgba(255, 0, 255, 0.5)'
            }),
            stroke: new ol.style.Stroke({
                color: '#ff0033',
                width: 3
            })
        });


        var iconStyle = new ol.style.Style({
            image: new ol.style.Icon({
                anchor: [0.5, 52],
                anchorXUnits: 'fraction',
                anchorYUnits: 'pixels',
                opacity: 0.75,
                src: '/articles/assets/img/maps-pointer-star.png'

            })
        });

        $scope.setEditTool = function(tool) {
            $scope.editTool = tool;
            modifyMap();
        };

        $scope.deleteFeature = function() {
            if(selectedFeature !== null) {
                featureOverlay.removeFeature(selectedFeature);
            }
            selectInteraction.getFeatures().remove(selectedFeature);
            selectedFeature = null;
        };



        function highlight(pixel) {

            var feature = map.forEachFeatureAtPixel(pixel, function (feature, layer) {
                return feature;
            });
            if (highlightFeature) {
                if(angular.isDefined(highlightFeature.normalStyle))
                    highlightFeature.setStyle(highlightFeature.normalStyle);
                else
                    highlightFeature.setStyle(normal_style);
                highlightFeature = null;
            }
            if (feature && feature.getGeometry().getType()  !== 'Point') {
                highlightFeature = feature;
                feature.normalStyle = feature.getStyle();
                feature.setStyle(highlight_style);
            }
        }

        function initMap() {

            map = new ol.Map({
                layers: [ stamenLayer

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
                style: normal_style
            });

            $scope.features = featureOverlay.getFeatures();
            featureOverlay.setMap(map);

        }




        function modifyMap() {
            //map.addLayer(featureOverlay);
            //map.on('keydown', function(event) {
            //   console.log(event);
            //});
            if(modifyInteraction !== null) map.removeInteraction(modifyInteraction);
            if(drawInteraction !== null) map.removeInteraction(drawInteraction);
            modifyInteraction = new ol.interaction.Modify({
                features: featureOverlay.getFeatures(),
                // the SHIFT key must be pressed to delete vertices, so
                // that new vertices can be drawn at the same position
                // of existing vertices
                deleteCondition: function (event) {
                    return ol.events.condition.shiftKeyOnly(event) &&
                        ol.events.condition.singleClick(event);
                }
            });
            map.addInteraction(modifyInteraction);
            selectInteraction = new ol.interaction.Select({
                layers: [featureOverlay],
                style: click_style,
                multi: false
            });
            selectInteraction.getFeatures().on('add', function(event) {
               selectedFeature = event.target.item(0);
            });
            map.addInteraction(selectInteraction);

            var drawType = 'select';
            if($scope.editTool == 'polygon') drawType = 'Polygon';
            else if($scope.editTool == 'marker') drawType = 'Point';
            if(drawType == 'select') return;
            drawInteraction = new ol.interaction.Draw({
                features: featureOverlay.getFeatures(),
                type: drawType
            });
            drawInteraction.on('drawend', function (event) {
                console.log(event);
                console.log($scope.features.getArray());
                if(drawType == 'Point') {
                    event.feature.setStyle(iconStyle);
                }

            });
            map.addInteraction(drawInteraction);
        }

        function updateGeometryFeatures() {
            geofeatures = [];
            $scope.features.forEach(function(feat) {
                geofeatures.push(feat.getGeometry().getCoordinates());
            });
            console.log(geofeatures);
        }
    }
]);
