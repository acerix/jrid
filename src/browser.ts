import Jrid from './jrid'

if (typeof window !== "undefined") {
  // eslint-disable-next-line
  (window as any).Jrid = Jrid
}

// console.log(`Jrid v${Jrid.version}`)
