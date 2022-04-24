# Jrid

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][build-image]][build-url]
[![Build Size][size-image]][size-url]
[![Code Coverage][coverage-image]][coverage-url]
[![Scrutinizer Code Quality][scrutinizer-image]][scrutinizer-url]
[![Language Grade][lgtm-image]][lgtm-url]
[![GPL 3.0][license-image]](LICENSE)

A dynamic grid overlay.


## Install

```bash
yarn add jrid
```

## Usage

### Build System

```typescript
import {Jrid} from 'jrid'
const jrid = new Jrid()
```

### Script Tags

```html
<script src="https://unpkg.com/jrid"></script>
<script>
const jrid = new Jrid(
  document.getElementById('jrid'),
  {
    locale: 'fr-CA',
    fpsLimit: 10
  }
)
</script>
```


[CodePen Demo](https://codepen.io/acerix/pen/ZEyxZvM?editors=0010)

## Screenshots

![Screenshot of basic demo](/screenshot.png?raw=true "Screenshot of basic demo")

## Read the Docs

[Documentation](https://acerix.github.io/jrid/)

## CLI Commands

*   `yarn install`: Install dependencies
*   `yarn dev`: Run tests when source files are changed
*   `yarn cli`: Start a command line interface
*   `yarn lint`: Lint with ESLint
*   `yarn test`: Run Jest and Enzyme tests
*   `yarn clean`: Delete previous build
*   `yarn docs`: Build documentation
*   `yarn build`: Production build
*   `yarn build-all`: Production build all the things
*   `yarn prepublish`: Prepare for publishing
*   `yarn publish`: Publish to npm

## Feedback

* Please report bug and feature requests as [GitHub Issues](https://github.com/acerix/jrid/issues)

[npm-image]: https://img.shields.io/npm/v/jrid.svg
[npm-url]: https://npmjs.org/package/jrid
[downloads-image]: https://img.shields.io/npm/dm/jrid.svg
[downloads-url]: https://npmjs.org/package/jrid
[build-image]: https://github.com/acerix/jrid/workflows/Test/badge.svg
[build-url]: https://github.com/acerix/jrid/actions?query=workflow%2ATest
[size-image]: https://badgen.net/bundlephobia/min/jrid
[size-url]: https://bundlephobia.com/result?p=jrid
[coverage-image]: https://scrutinizer-ci.com/g/acerix/jrid/badges/coverage.png?b=main
[coverage-url]: https://scrutinizer-ci.com/g/acerix/jrid/?branch=main
[scrutinizer-image]: https://scrutinizer-ci.com/g/acerix/jrid/badges/quality-score.png?b=main
[scrutinizer-url]: https://scrutinizer-ci.com/g/acerix/jrid/?branch=main
[lgtm-image]: https://img.shields.io/lgtm/alerts/g/acerix/jrid.svg
[lgtm-url]: https://lgtm.com/projects/g/acerix/jrid/
[license-image]: https://img.shields.io/npm/l/jrid.svg
