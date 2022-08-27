import { h } from 'preact'
import { shallow } from 'enzyme'

import App from '../src/component'
import React from 'react'

describe('App', () => {
  it('should be able to run tests', () => {
    expect(1 + 2).toEqual(3)
  })
})

describe('Browser Test Template', () => {
  it('should render a canvas element', () => {
    const tree = shallow(<App />)
    expect(tree.html()).toBe('<canvas></canvas>')
  })
})
