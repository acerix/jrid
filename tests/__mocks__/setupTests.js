import { configure } from 'enzyme'
import Adapter from 'enzyme-adapter-preact-pure'
global.ResizeObserver = require('resize-observer-polyfill')

configure({
    adapter: new Adapter()
})
