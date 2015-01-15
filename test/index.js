"use strict";

var mount = require("..");
var koa = require("koa");
var request = require("supertest");
var should = require("should");

function doneIfError(done) {
  return function (err) {
    if (err) {
      return done(err);
    }
  };
}


describe("mount", function () {

  describe("when no prefix params", function() {

    it("should mount at /", function (done) {

      var a = koa();
      var b = koa();
      a.use(function *(next) {

        yield *next;
        if ("/hello" === this.path) {
          this.body = "Hello";
        }
      });

      b.use(function *(next) {

        yield *next;
        if ("/world" === this.path) {
          this.body = "World";
        }
      });

      var app = koa();
      app.use(mount(a));
      app.use(mount(b));

      var client = request(app.listen());
      client.get("/").expect(404, doneIfError(done));
      client.get("/hello").expect("Hello", doneIfError(done));
      client.get("/world").expect("World", done);
    });

    it("should mount regular expression", function (done) {

      var app = koa();
      var a = koa();

      a.use(function *() {

        should.exist(this.params);
        this.params.should.have.property("0", "abc");
        this.status = 204;
      });

      app.use(mount(/\/([^\/]+)\/?/i, a));

      request(app.listen())
      .get("/abc")
      .expect(204, done);
    });

    it("should cascade properly", function (done) {

      var app = koa();
      var a = koa();
      var b = koa();
      var c = koa();

      a.use(function *(next) {

        yield *next;
        this.body = "foo" + (this.body || "");
      });

      b.use(function *(next) {

        yield *next;
        this.body = "bar" + (this.body || "");
      });

      c.use(function *(next) {

        yield *next;
        this.body = "baz" + (this.body || "");
      });

      app.use(mount("/foo", a));
      a.use(mount("/bar", b));
      b.use(mount("/baz", c));

      var client = request(app.listen());
      client.get("/foo").expect("foo", doneIfError(done));
      client.get("/foo/bar").expect("foobar", doneIfError(done));
      client.get("/foo/bar/baz").expect("foobarbaz", done);
    });

    it("should restore prefix for mounted apps", function (done) {

      var app = koa();
      var a = koa();
      var b = koa();
      var c = koa();

      a.use(function *(next) {

        this.body = (this.body || "") + "foo";
        yield *next;
      });

      b.use(function *(next) {

        this.body = (this.body || "") + "bar";
        yield *next;
      });

      c.use(function *(next) {

        this.body = (this.body || "") + "baz";
        yield *next;
      });

      app.use(mount("/foo", a));
      app.use(mount("/foo/bar", b));
      app.use(mount("/foo/bar/baz", c));

      var client = request(app.listen());
      client.get("/foo").expect("foo", doneIfError(done));
      client.get("/foo/bar").expect("foobar", doneIfError(done));
      client.get("/foo/bar/baz").expect("foobarbaz", done);
    });

    it("should restore prefix for mounted middleware", function (done) {

      var app = koa();

      app.use(mount("/foo", function *(next) {

        this.body = (this.body || "") + "foo";
        yield *next;
      }));

      app.use(mount("/foo/bar", function *(next) {

        this.body = (this.body || "") + "bar";
        yield *next;
      }));

      app.use(mount("/foo/bar/baz", function *(next) {

        this.body = (this.body || "") + "baz";
        yield *next;
      }));

      var client = request(app.listen());
      client.get("/foo").expect("foo", doneIfError(done));
      client.get("/foo/bar").expect("foobar", doneIfError(done));
      client.get("/foo/bar/baz").expect("foobarbaz", done);
    });

    it("should have the correct path", function (done) {

      var app = koa();
      var a = koa();

      a.use(function *(next) {

        this.path.should.equal("/");
        yield *next;
        this.path.should.equal("/");
      });

      app.use(function *(next) {

        this.path.should.equal("/foo");
        yield *next;
        this.path.should.equal("/foo");
      });

      app.use(mount("/foo", a));

      request(app.listen())
      .get("/foo").end(done);
    });

    it("should match the correct prefix /prefix", function (done) {

      var app = koa();
      app.use(mount("/prefix", function *() {

        this.status = 204;
      }));

      var client = request(app.listen());
      client.get("/abcds").expect(404, doneIfError(done));
      client.get("/prefixasdf").expect(404, doneIfError(done));
      client.get("/prefix").expect(204, doneIfError(done));
      client.get("/prefix/vcasda").expect(204, done);
    });

    it("should match the correct directory /prefix/", function (done) {

      var app = koa();
      app.use(mount("/prefix/", function *() {

        this.status = 204;
      }));

      var client = request(app.listen());
      client.get("/abcds").expect(404, doneIfError(done));
      client.get("/prefixasdf").expect(404, doneIfError(done));
      client.get("/prefix").expect(404, doneIfError(done));
      client.get("/prefix/").expect(204, doneIfError(done));
      client.get("/prefix/vcasda").expect(204, done);
    });
  });

  describe("when prefix contains params", function () {

    it("should mount at param prefix", function (done) {

      var a = koa();
      var b = koa();

      a.use(function *(next) {

        yield *next;
        this.body = this.path + "a" + this.params.id;
      });

      b.use(function *(next) {

        yield *next;
        this.body = this.path + "b" + this.params.id;
      });

      var app = koa();
      app.use(mount("/a/:id", a));
      app.use(mount("/b/:id", b));

      var client = request(app.listen());
      client.get("/").expect(404, doneIfError(done));
      client.get("/a/ida").expect("/aida", doneIfError(done));
      client.get("/b/idb").expect("/bidb", doneIfError(done));
      client.get("/a/ida/b").expect("/baida", doneIfError(done));
      client.get("/b/idb/a").expect("/abidb", done);
    });

    it("should mount cascade param prefix properly", function (done) {

      var app = koa();
      var a = koa();
      var b = koa();
      var c = koa();

      a.use(function *(next) {

        yield *next;
        this.body = this.params.id + (this.body || "");
      });

      b.use(function *(next) {

        yield *next;
        this.body = this.params.id + (this.body || "");
      });

      c.use(function *(next) {

        yield *next;
        this.body = this.params.id + (this.body || "");
      });

      app.use(mount("/:id", a));
      a.use(mount("/:id", b));
      b.use(mount("/:id", c));

      var client = request(app.listen());
      client.get("/foo").expect("foo", doneIfError(done));
      client.get("/foo/bar").expect("foobar", doneIfError(done));
      client.get("/foo/bar/baz").expect("foobarbaz", done);
    });


    it("should restore prefix and params for mounted apps", function (done) {

      var app = koa();
      var a = koa();
      var b = koa();
      var c = koa();

      a.use(function *(next) {

        this.body = (this.body || "") + this.params.id;
        yield *next;
        this.params.id.should.equal("foo");
        should.not.exist(this.params.id2);
        should.not.exist(this.params.id3);
      });

      b.use(function *(next) {

        this.body = (this.body || "") + this.params.id2;
        yield *next;
        this.params.id.should.equal("foo");
        this.params.id2.should.equal("bar");
        should.not.exist(this.params.id3);
      });

      c.use(function *(next) {

        this.body = (this.body || "") + this.params.id3;
        yield *next;
        this.params.id.should.equal("foo");
        this.params.id2.should.equal("bar");
        this.params.id3.should.equal("baz");
      });

      app.use(mount("/:id", a));
      app.use(mount("/:id/:id2", b));
      app.use(mount("/:id/:id2/:id3", c));

      var client = request(app.listen());
      client.get("/foo").expect("foo", doneIfError(done));
      client.get("/foo/bar").expect("foobar", doneIfError(done));
      client.get("/foo/bar/baz").expect("foobarbaz", done);
    });

    it("should restore prefix for mounted middleware", function (done) {

      var app = koa();

      app.use(mount("/:id", function *(next) {

        this.body = (this.body || "") + this.params.id;
        yield *next;
        this.params.id.should.equal("foo");
        should.not.exist(this.params.id2);
        should.not.exist(this.params.id3);
      }));

      app.use(mount("/:id/:id2", function *(next) {

        this.body = (this.body || "") + this.params.id2;
        yield *next;
        this.params.id.should.equal("foo");
        this.params.id2.should.equal("bar");
        should.not.exist(this.params.id3);
      }));

      app.use(mount("/:id/:id2/:id3", function *(next) {

        this.body = (this.body || "") + this.params.id3;
        yield *next;
        this.params.id.should.equal("foo");
        this.params.id2.should.equal("bar");
        this.params.id3.should.equal("baz");
      }));

      var client = request(app.listen());
      client.get("/foo").expect("foo", doneIfError(done));
      client.get("/foo/bar").expect("foobar", doneIfError(done));
      client.get("/foo/bar/baz").expect("foobarbaz", done);
    });

    it("should merge params if `options.mergeParams` is true", function (done) {

      var app = koa();
      var a = koa();
      var b = koa();
      var c = koa();

      a.use(function *(next) {

        yield *next;
        this.params.id.should.equal("foo");
        should.not.exist(this.params.id2);
        should.not.exist(this.params.id3);
        this.status = 204;
      });

      b.use(function *(next) {

        should.exist(this.params.id);
        yield *next;
        this.params.id.should.equal("foo");
        this.params.id2.should.equal("bar");
        should.not.exist(this.params.id3);
      });

      c.use(function *(next) {

        should.exist(this.params.id);
        should.exist(this.params.id2);
        yield *next;
        this.params.id.should.equal("foo");
        this.params.id2.should.equal("bar");
        this.params.id3.should.equal("baz");
      });

      app.use(mount("/:id", a));
      a.use(mount("/:id2", b, {
        mergeParams: true
      }));
      b.use(mount("/:id3", c, {
        mergeParams: true
      }));

      request(app.listen())
      .get("/foo/bar/baz")
      .expect(204).end(done);
    }); 

    it("should have the correct path", function (done) {

      var app = koa();
      var a = koa();

      a.use(function *(next) {

        this.path.should.equal("/");
        yield *next;
        this.path.should.equal("/");
      });

      app.use(function *(next) {

        this.path.should.equal("/foo");
        yield *next;
        this.path.should.equal("/foo");
      });

      app.use(mount("/:id", a));

      request(app.listen())
      .get("/foo").end(done);
    });

    it("should match the correct prefix /prefix/:id", function (done) {

      var app = koa();
      app.use(mount("/prefix/:id", function *() {

        this.status = 204;
      }));

      var client = request(app.listen());
      client.get("/abcds").expect(404, doneIfError(done));
      client.get("/prefixasdf").expect(404, doneIfError(done));
      client.get("/prefix").expect(404, doneIfError(done));
      client.get("/prefix/vcasda").expect(204, doneIfError(done));
      client.get("/prefix/vsfdsf/asdfsaf").expect(204, done);
    });

    it("should match the correct directory /prefix/:id/", function (done) {

      var app = koa();
      app.use(mount("/prefix/:id/", function *() {

        this.status = 204;
      }));

      var client = request(app.listen());
      client.get("/abcds").expect(404, doneIfError(done));
      client.get("/prefixasdf").expect(404, doneIfError(done));
      client.get("/prefix").expect(404, doneIfError(done));
      client.get("/prefix/fafsaf").expect(404, doneIfError(done));
      client.get("/prefix/fafsaf/").expect(204, doneIfError(done));
      client.get("/prefix/vcasdasdf/dfdfd").expect(204, done);
    });

    it("should return original URL params when decodeURIComponent failed", function (done) {

      var app = koa();
      app.use(mount("/:id/:id2", function *() {

        should.exist(this.params);
        this.params.should.have.property("id", "100%");
        this.params.should.have.property("id2", "101%");
        this.status = 204;
      }));

      request(app.listen())
      .get("/100%/101%")
      .expect(204, done);
    });
  });
});