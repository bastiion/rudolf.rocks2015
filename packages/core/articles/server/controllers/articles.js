'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Article = mongoose.model('Article'),
    Group = mongoose.model('Group'),
  _ = require('lodash'),
  marked = require('marked'),
    fs = require('fs'),
    multiparty = require('multiparty'),
    Q = require('q');
module.exports = function(Articles) {

    /**
     * Setup default groups
     */
    //Group.collection.remove();
    Group.collection.insert([
        { short: 'service', name: 'Dienstleistung', description: 'Stand der einen immateriellen Service gegen Spende anbietet.'},
        { short: 'stand', name: 'Stand', description: 'Stand der irgend etwas gegen Spende anbietet.'},
        { short: 'game', name: 'Spiel-&Spaß', description: 'Aktionen und Stände mit spielerischem Kontext für Kinder und Erwachsene'},
        { short: 'drink', name: 'Getränke', description: 'Getränkestände, Kontakt zu Getränkehändlern, Ausschank'},
        { short: 'food', name: 'Essen', description: 'Verköstigung und Kulinarisches mit Fokus auf kaubaren Lebensmittel'},
        { short: 'music', name: 'Musik-&Bühne', description: 'Bühnenaufbau, -technik und -management, Bands, Musiker, Acts'}
    ]);
    function renderMarkdown(content) {
        return marked(content);
    }

    return {
        /**
        * Find article by id
        */
        article: function(req, res, next, id) {
            Article.load(id, function(err, article) {
                if (err) return next(err);
                if (!article) return next(new Error('Failed to load article ' + id));
                req.article = article;
                next();
            });
        },
        /**
        * Create an article
        */
        create: function(req, res) {
            var article = new Article(req.body);
            article.user = req.user;
            article.contentRendered = renderMarkdown(article.content);

            article.save(function(err) {
                if (err) {
                  return res.status(500).json({
                    error: 'Cannot save the article'
                  });
                }

                Articles.events.publish('create', {
                    description: req.user.name + ' created ' + req.body.title + ' article.'
                });

                res.json(article);
            });
        },
        /**
        * Update an article
        */
        update: function(req, res) {
            var article = req.article;

            article = _.extend(article, req.body);
            article.contentRendered = renderMarkdown(article.content);


            article.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        error: 'Cannot update the article'
                    });
                }

                Articles.events.publish('update', {
                    description: req.user.name + ' updated ' + req.body.title + ' article.'
                });

                res.json(article);
            });
        },
        /**
        * Delete an article
        */
        destroy: function(req, res) {
            var article = req.article;


            article.remove(function(err) {
                if (err) {
                    return res.status(500).json({
                        error: 'Cannot delete the article'
                    });
                }

                Articles.events.publish('remove', {
                    description: req.user.name + ' deleted ' + article.title + ' article.'
                });

                res.json(article);
            });
        },
        /**
        * Show an article
        */
        show: function(req, res) {

            Articles.events.publish('view', {
                description: req.user.name + ' read ' + req.article.title + ' article.'
            });

            res.json(req.article);
        },
        /**
        * List of Articles
        */
        all: function(req, res) {
            Article.find().sort('-created').populate('user', 'name username').populate('group', 'name').exec(function(err, articles) {
                if (err) {
                    return res.status(500).json({
                        error: 'Cannot list the articles'
                    });
                }

                res.json(articles);
            });
        },
        /**
         * List groups
         */
        groups: function(req, res) {
            Group.find().sort('name').exec(function(err, groups) {
               if(err) {
                   return res.status(500).json({
                       error: 'Cannot list groups'
                   });
               }


               res.json(groups);
            });

        },
        renderMarkdown: function(req, res) {
            if(typeof req.body.content === 'string')
                return res.send(renderMarkdown(req.body.content));
            else return res.status(500).json({error: 'no content'});
        },
        upload: function(req, res) {
            var fileUrls = [];
            function saveFile(file) {
                var q = Q.defer();
                fs.readFile(file.path, function (err, data) {
                        console.log(__dirname);
                        var filename = Date.now() + file.originalFilename;
                        var newUrl = "/articles/assets/uploads/" + filename;
                        var newPath = __dirname +  "/../../public/assets/uploads/" + filename;
                        fs.writeFile(newPath, data, function (err) {
                            if (err) {
                                console.log(err);
                                q.resolve();
                                //   res.status(500).json({error: err});
                            } else {
                                console.log(newUrl);
                                fileUrls.push(newUrl);
                                q.resolve(newUrl);
                            }
                        });
                    });
                return q.promise;

            }
//            console.log(req);
            var form = new multiparty.Form();
            form.parse(req, function(err, fields, files) {
                console.log(files);
                if (_.isUndefined(files))
                    return res.status(500).json({error: 'could not upload files'});
                var promises = [];
                for (var f in files) {
                    if (f.indexOf('file') !== 0) continue;
                    var file = files[f][0];
                    promises.push(saveFile(file));
                }
                Q.all(promises).done(function (result) {
                    console.log(result);
                    console.log(fileUrls);
                    res.json(fileUrls);
                });
            });
        }
    };
}