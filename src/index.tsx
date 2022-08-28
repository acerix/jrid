import { h, render as preactRender } from 'preact'
import habitat from 'preact-habitat'

import Widget, { Props } from './component'
import version from './version'

habitat(Widget).render({
  selector: '[data-widget-host="jrid"]',
  clean: true
})

class jrid {
  static get version(): string {
    return version
  }
}

function init(el: HTMLElement, props: Props) {
  preactRender(<Widget {...props} />, el)
}

export { jrid, version, init, Widget }
