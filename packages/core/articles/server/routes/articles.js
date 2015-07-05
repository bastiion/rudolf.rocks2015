'use strict';

// Article authorization helpers
var hasAuthorization = function(req, res, next) {
  if (req.user.roles.indexOf('admin') === -1 && !req.article.user._id.equals(req.user._id)) {
    return res.status(401).send('User is not authorized '+ req.user.roles);
  }
  next();
};

module.exports = function(Articles, app, auth) {
  
  var articles = require('../controllers/articles')(Articles);

  app.route('/api/articles')
    .get(articles.all)
    .post(auth.requiresLogin, articles.create);
  app.route('/api/articles/:articleId')
    .get(auth.isMongoId, articles.show)
    .put(auth.isMongoId, auth.requiresLogin, hasAuthorization, articles.update)
    .delete(auth.isMongoId, auth.requiresLogin, hasAuthorization, articles.destroy);
  app.route('/api/groups')
      .get(articles.groups);
  app.route('/api/markdown')
      .post(articles.renderMarkdown);
  app.route('/api/upload')
      .post(articles.upload);
  // Finish with setting up the articleId param
  app.param('articleId', articles.article);
};
