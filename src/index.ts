import version from './version'

class jrid {
  static get version(): string {
    return version
  }
}

export default jrid
export { version }
export * from './jrid'
