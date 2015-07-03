'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;


/**
 * Group Schema
 */

var GroupSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: false
  }
});


/**
 * Article Schema
 */
var ArticleSchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  contentRendered: {
    type: String,
    required: false
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  group: {
    type: Schema.ObjectId,
    ref: 'Group'
  },
  tags: {
    type: [String]
  },
  geofeatures: {
    type: []
  },
  updated: {
    type: Array
  }
});

/**
 * Validations
 */
ArticleSchema.path('title').validate(function(title) {
  return !!title;
}, 'Title cannot be blank');

ArticleSchema.path('content').validate(function(content) {
  return !!content;
}, 'Content cannot be blank');

/**
 * Statics
 */
ArticleSchema.statics.load = function(id, cb) {
  this.findOne({
    _id: id
  }).populate('user', 'name username').populate('group', 'name').exec(cb);
};

mongoose.model('Article', ArticleSchema);
mongoose.model('Group', GroupSchema);