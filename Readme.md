# An mounting middleware for [koa](https://github.com/koajs/koa)

[![Build Status](https://secure.travis-ci.org/TerenceZ/siren-mount.png)](http://travis-ci.org/TerenceZ/siren-mount)

siren-mount is modified from the [koa-mount](https://github.com/koajs/mount) by:
* Support for express path using [path-to-regexp](https://github.com/pillarjs/path-to-regexp).

## Installation

```js
npm install --save siren-mount
```

## Usage

The usage is the same as [koa-mount](https://github.com/koajs/mount), except:

## Regular Expression Path

You can use regular expression as prefix:

```js
var app = koa();
var router = koa();

app.use(mount(/\/([^\/]+)\/?/i, function *() {
  // Matches /abc, /abc/, /abcdadc/dsd
}));
```

## Parameter Access

You can use `ctx.params` to access the URL parameters:

```js
var app = koa();
var router = koa();

app.use('/:id', function *() {
  console.log(this.params.id);
}));
```

## License

  MIT
