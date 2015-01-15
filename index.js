
"use strict";

/**
 * Module dependencies.
 */

var pathToRegexp = require("path-to-regexp");
var compose = require("koa-compose");
var assert = require("assert");
var debug = require("debuglog")("siren/mount");

/**
 * Expose `mount()`.
 */

module.exports = mount;

/**
 * Mount `app` with `prefix`, `app`
 * may be a Koa application or
 * middleware function.
 *
 * @param {String|RegExp|Application|Function} prefix, app, or function
 * @param {Application|Function} [app or function]
 * @return {Function}
 * @api public
 */

function mount(prefix, app, options) {

  var regexp = prefix;
  if (typeof prefix !== "string") {

    if (prefix instanceof RegExp) {
      prefix = prefix.source;
    } else {
      options = app;
      app = prefix;
      prefix = "/";
    }
  } else {
    assert("/" === prefix[0], "mount path must begin with '/'");
  }

  var downstream = app.middleware ? compose(app.middleware) : app;

  if (prefix === "/") {
    return downstream;
  }

  debug("mount %s %s", prefix, app.name || "unnamed");

  options = options || {};

  var keys = [];
  if (!(regexp instanceof RegExp)) {
    regexp = pathToRegexp(prefix, keys, {
      "strict": true,
      "end": false
    });
  }

  return function *(upstream) {

    var prev = this.path;
    var prevParams = this.params;
    var newParams = [];
    var newPath = match(regexp, prev, keys, newParams);

    if (!newPath) {
      return yield *upstream;
    }

    if (options.mergeParams) {
      newParams = mergeParams(this.params, newParams);
    }
    this.path = newPath;
    this.params = newParams;

    debug("enter %s -> %s", prev, newPath);

    yield *downstream.call(this, function *() {

      this.path = prev;
      this.params = prevParams;
      yield* upstream;
      this.params = newParams;
      this.path = newPath;
    }.call(this));

    debug("leave %s -> %s", prev, newPath);
    this.path = prev;
    this.params = prevParams;
  };
}

/**
 * Check if `prefix` satisfies a `path`.
 * Returns the new path and fills the `params` according to `keys`.
 *
 * @param {RegExp} regexp
 * @param {String} path
 * @param {Array} keys
 * @param {Array} params
 * @return {String?}
 * @api private
 */

function match(regexp, path, keys, params) {

  var matches = regexp.exec(path);
  if (matches) {
    params = params || [];
    var captures = matches.length ? matches.slice(1) : [];

    if (keys.length) {
      for (var i = -1, l = captures.length; ++i < l;) {
        if (keys[i]) {
          var c = captures[i];
          params[keys[i].name] = c ? safeDecodeURIComponent(c) : c;
        }
      }
    } else {
      for (var i = -1, l = captures.length; ++i < l;) {
        var c = captures[i];
        params[i] = c ? safeDecodeURIComponent(c) : c;
      }
    }

    path = path.substr(matches[0].length);
    if (!path.length || path[0] !== "/") {
      path = "/" + path;
    }

    return path;
  }

  return null;
}

/**
 * Safe decodeURIComponent, won't throw any error.
 * If `decodeURIComponent` error happen, just return the original value.
 *
 * @param {String} text
 * @return {String} URL decode original string.
 */

function safeDecodeURIComponent(component) {
  try {
    return decodeURIComponent(component);
  } catch (e) {
    return component;
  }
}

/**
 * Merge `b` and `a` into a new object.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 * @api private
 */

function mergeParams(a, b) {

  if (!b) {
    return a;
  }

  var c = [];
  for (var prop in a) {
    c[prop] = a[prop];
  }

  for (prop in b) {
    c[prop] = b[prop];
  }

  return c;
}