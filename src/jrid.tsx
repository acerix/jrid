import VERSION from './version'
import { createRef, FunctionalComponent, h, render } from 'preact'
import { useEffect } from 'preact/hooks'
import Canvas, { CanvasMethods } from './canvas'
// import style from './style.css'

const logBase = 10
const zoomFactor = logBase**(1/13)
const microZoomFactor = zoomFactor**(1/32)
const minimumJridSpacing = 24
const μ = .75
const translateFactor = 16
let free = true

export const axisLabelFormat = (coefficient: number, exponent: number): string => {
  if (coefficient === 0) return '0'
  // simple notation for small exponents
  if (exponent < 5) {
    // @todo i18n eg. toLocaleString
    if (exponent >= 0) {
      // 1...10,000
      return `${coefficient}${'0'.repeat(exponent)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
    if (exponent > -5) {
      // 0...0.0001
      return (coefficient*logBase**exponent).toFixed(-exponent)
    }
  }
  // pseudoscientific notation, eg. 5×⏨42 for 5*10^42
  return `${coefficient}×⏨${exponent}`
}

type TranslateFunction = (x: number, y: number) => void

type ScaleFunction = (x: number, y: number) => void

export interface JridOverlayProps {
  canvasMethodRefs?: CanvasMethods;
  setTranslate?: TranslateFunction;
  setScale?: ScaleFunction;
  initialScale?: number;
}

export const JridOverlay: FunctionalComponent<JridOverlayProps> = (props: JridOverlayProps) => {
  const { setTranslate, setScale, ...rest } = props
  const ref = createRef()
  const canvasCenter = [0, 0]
  const translate = [0, 0]
  const scale = [1, 1]
  const velocity = [0, 0]
  const fontSize = 12
  const axisLabelMargin = 4
  // const xLabelOffset = [-axisLabelMargin, fontSize+axisLabelMargin] // incorrect with rotation
  const xLabelOffset = [-2, 10]
  const yLabelOffset = [-axisLabelMargin, -axisLabelMargin]
  let contextHeight = 0

  const init = (ctx: CanvasRenderingContext2D): void => {
    const initialScale = rest.initialScale ?? 16/ctx.canvas.width
    scale[0] = scale[1] = initialScale
    if (setScale) {
      setScale(scale[0], scale[1])
    }
    draw(ctx)
  }

  const onResize = (ctx: CanvasRenderingContext2D): void => {

    // line styles
    ctx.strokeStyle = '#999'
    ctx.lineWidth = 1
    
    // text styles
    ctx.fillStyle = '#999'
    ctx.textAlign = 'right'
    ctx.font = `${fontSize}px monospace`
    // @todo white on white bg in unreadable
    // shadowBlur works ok but is too slow in Firefox
    // ctx.shadowColor = 'rgba(0,0,0,1)'
    // ctx.shadowBlur = 4

    contextHeight = ctx.canvas.height
    const halfWidth = ctx.canvas.width/2
    const halfHeight = ctx.canvas.height/2  
    if (canvasCenter[0] === 0) {
      // initially translate (0,0) to center of canvas
      canvasCenter[0] = halfWidth
      canvasCenter[1] = halfHeight
      translate[0] = -canvasCenter[0]
      translate[1] = -canvasCenter[1]
    }
    else {
      // adjust translation by difference in canvas size
      const dx = halfWidth - canvasCenter[0]
      const dy = halfHeight - canvasCenter[1]
      translate[0] -= dx
      translate[1] -= dy
      canvasCenter[0] = halfWidth
      canvasCenter[1] = halfHeight
    }
    draw(ctx)
  }

  const render = (): void => {
    void(0)
  }

  const draw = (ctx: CanvasRenderingContext2D): void => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // slow down due to friction
    velocity[0] *= μ
    velocity[1] *= μ

    // glide
    if (free) {
      translate[0] += velocity[0]
      translate[1] -= velocity[1]
    }
    
    // exponent for axis labels ⏨(n+x)
    const powerX = Math.ceil(Math.log10(minimumJridSpacing * scale[0]))
    const powerY = Math.ceil(Math.log10(minimumJridSpacing * scale[1]))
    const factorX = 10**powerX
    const factorY = 10**powerY

    // set space between lines
    const spaceX = factorX / scale[0]
    const spaceY = factorY / scale[1]

    // get first lines by rounding up
    const xIndexOffset = Math.ceil(translate[0] * scale[0] / factorX)
    const yIndexOffset = Math.ceil(translate[1] * scale[1] / factorY) 
    const firstXValue = xIndexOffset * factorX
    const firstYValue = yIndexOffset * factorY
    const firstXPosition = firstXValue / scale[0] - translate[0]
    const firstYPosition = translate[1] - firstYValue / scale[1]
    
    // lines to write labels on
    const xLineCount = Math.floor(ctx.canvas.width / spaceX)
    const yLineCount = Math.floor(ctx.canvas.height / spaceY)
    const xMiddleLineIndex = Math.floor(xLineCount / 2)
    const yMiddleLineIndex = Math.floor(yLineCount / 2)

    ctx.beginPath()
    // draw x-axis Jrid lines
    for (let i=0; i<=xLineCount; i++) {
      const x = firstXPosition + i * spaceX
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ctx.canvas.height)
      // draw y-axis labels up the middle line
      if (i === xMiddleLineIndex) {
        for (let j=0; j<=yLineCount; j++) {
          const label = axisLabelFormat(j + yIndexOffset, powerY)
          const y = firstYPosition + ctx.canvas.height - j * spaceY
          ctx.fillText(label, x + yLabelOffset[0], y + yLabelOffset[1])
        }
      }
    }
    // draw y-axis Jrid lines
    for (let i=0; i<=yLineCount; i++) {
      const y = firstYPosition + ctx.canvas.height - i * spaceY
      ctx.moveTo(0, y)
      ctx.lineTo(ctx.canvas.width, y)
      // draw x-axis labels below the middle line
      if (i === yMiddleLineIndex) {
        for (let j=0; j<=xLineCount; j++) {
          const label = axisLabelFormat(j + xIndexOffset, powerX)
          const x = firstXPosition + j * spaceX

          // rotate: to avoid overlap with long labels and small Jrid
          // @todo better to rotate once then draw all labels?
          ctx.save()
          ctx.translate(x + xLabelOffset[0], y + xLabelOffset[1])
          ctx.rotate(-Math.PI/6)
          ctx.fillText(label, 0, 0)
          ctx.restore()

          // without rotate:
          // ctx.fillText(label, x + xLabelOffset[0], y + xLabelOffset[1])

        }
      }
    }
    ctx.stroke()

    // update position of main canvas
    if (setTranslate) {
      setTranslate(translate[0], translate[1])
    }
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const canvasEl = ref.current.base as HTMLCanvasElement
    let mouseDown = 0
    let renderCallbackID: number
    const lastMousePosition = [0, 0]
    const lastTouch1Position = [-1, -1]
    const lastTouch2Position = [-1, -1]

    const handleMouseDown = (event: MouseEvent): boolean => {
      mouseDown |= (1<<event.button)
      lastMousePosition[0] = event.clientX
      lastMousePosition[1] = event.clientY
      velocity[0] = velocity[1] = 0
      free = !(mouseDown&1)
      event.preventDefault()
      return false
    }
    canvasEl.addEventListener('mousedown', handleMouseDown)

    const handleMouseUp = (event: MouseEvent): boolean => {
      mouseDown ^= (1<<event.button)
      event.preventDefault()
      free = !(mouseDown&1)
      return false
    }
    canvasEl.addEventListener('mouseup', handleMouseUp)

    const handleContextMenu = (event: MouseEvent): boolean => {
      event.preventDefault()
      return false
    }
    canvasEl.addEventListener('contextmenu', handleContextMenu)

    const handleMouseMove = (event: MouseEvent): void => {
      const dx = lastMousePosition[0] - event.clientX
      const dy = lastMousePosition[1] - event.clientY
      const flingFactor = 4
      // left-clicked, translate
      if (mouseDown&1) {
        velocity[0] = dx * flingFactor
        velocity[1] = dy * flingFactor
        translate[0] += dx
        translate[1] -= dy
        if (setTranslate) {
          setTranslate(translate[0], translate[1])
          render()
        }
      }
      // middle-clicked, scale all axes
      if (mouseDown&2) {
        const f = microZoomFactor**-dy
        scale[0] *= f
        scale[1] *= f
        if (setScale) {
          setScale(scale[0], scale[1])
          render()
        } 
      }
      // right-clicked, scale individual axes
      if (mouseDown&4) {
        const zoomTo = [
          (lastMousePosition[0] + translate[0]) * scale[0],
          (contextHeight - lastMousePosition[1] + translate[1]) * scale[1]
        ]
        const zoomLastPosition = [
          zoomTo[0] / scale[0] - translate[0],
          zoomTo[1] / scale[1] - translate[1]
        ]
        scale[0] *= microZoomFactor**dx
        scale[1] *= microZoomFactor**-dy
        if (setScale) {
          setScale(scale[0], scale[1])
        }
        const zoomToPosition = [
          zoomTo[0] / scale[0] - translate[0],
          zoomTo[1] / scale[1] - translate[1]
        ]
        translate[0] -= zoomLastPosition[0] - zoomToPosition[0] - dx
        translate[1] += zoomToPosition[1] - zoomLastPosition[1] - dy
        if (setTranslate) {
          setTranslate(translate[0], translate[1])
        }
        render()
      }
      lastMousePosition[0] = event.clientX
      lastMousePosition[1] = event.clientY
    }
    canvasEl.addEventListener('mousemove', handleMouseMove)

    const handleTouchDown = (event: TouchEvent): boolean => {
      lastTouch1Position[0] = event.touches[0].pageX
      lastTouch1Position[1] = event.touches[0].pageY
      velocity[0] = velocity[1] = 0
      free = false
      return false
    }
    canvasEl.addEventListener('touchstart', handleTouchDown)

    const handleTouchUp = (event: TouchEvent): boolean => {
      void(event)
      lastTouch1Position[0] = lastTouch1Position[1] = -1
      free = true
      return false
    }
    canvasEl.addEventListener('touchend', handleTouchUp)

    const handleTouchMove = (event: TouchEvent): void => {
      if (lastTouch1Position[0] > -1) {
        if (event.touches.length===1) {
          const dx = lastTouch1Position[0] - event.touches[0].pageX
          const dy = lastTouch1Position[1] - event.touches[0].pageY
          velocity[0] = dx
          velocity[1] = dy
          translate[0] += dx
          translate[1] -= dy
          lastTouch2Position[0] = lastTouch2Position[1] = -1
          if (setTranslate) {
            setTranslate(translate[0], translate[1])
            render()
          }
        }
        else {
          if (lastTouch2Position[0] > -1) {
            const x1 = event.touches[0].pageX
            const y1 = event.touches[0].pageY
            const x2 = event.touches[1].pageX
            const y2 = event.touches[1].pageY
            const q1 = (lastTouch1Position[0] - lastTouch2Position[0])**2 + (lastTouch1Position[1] - lastTouch2Position[1])**2
            const q2 = (x1 - x2)**2 + (y1 - y2)**2
            const zoomModifier = q1 / q2
            const touchMidpoint = [
              (x1 + x2) / 2,
              (y1 + y2) / 2
            ]
            const zoomTo = [
              (touchMidpoint[0] + translate[0]) * scale[0],
              (contextHeight - touchMidpoint[1] + translate[1]) * scale[1]
            ]
            const zoomLastPosition = [
              zoomTo[0] / scale[0] - translate[0],
              zoomTo[1] / scale[1] - translate[1]
            ]
            scale[0] *= zoomModifier
            scale[1] *= zoomModifier
            if (setScale) {
              setScale(scale[0], scale[1])
            }
            const zoomToPosition = [
              zoomTo[0] / scale[0] - translate[0],
              zoomTo[1] / scale[1] - translate[1]
            ]
            translate[0] -= zoomLastPosition[0] - zoomToPosition[0]
            translate[1] += zoomToPosition[1] - zoomLastPosition[1]
            if (setTranslate) {
              setTranslate(translate[0], translate[1])
            }
            render()
          }
          lastTouch2Position[0] = event.touches[1].pageX
          lastTouch2Position[1] = event.touches[1].pageY
        }
      }
      lastTouch1Position[0] = event.touches[0].pageX
      lastTouch1Position[1] = event.touches[0].pageY
    }
    canvasEl.addEventListener('touchmove', handleTouchMove)

    const handleWheel = (event: WheelEvent): void => {
      const zoomModifier = event.deltaY > 0 ? zoomFactor : 1/zoomFactor
      const zoomTo = [
        (lastMousePosition[0] + translate[0]) * scale[0],
        (contextHeight - lastMousePosition[1] + translate[1]) * scale[1]
      ]
      const zoomLastPosition = [
        zoomTo[0] / scale[0] - translate[0],
        zoomTo[1] / scale[1] - translate[1]
      ]
      scale[0] *= zoomModifier
      scale[1] *= zoomModifier
      if (setScale) {
        setScale(scale[0], scale[1])
      }
      const zoomToPosition = [
        zoomTo[0] / scale[0] - translate[0],
        zoomTo[1] / scale[1] - translate[1]
      ]
      translate[0] -= zoomLastPosition[0] - zoomToPosition[0]
      translate[1] += zoomToPosition[1] - zoomLastPosition[1]
      if (setTranslate) {
        setTranslate(translate[0], translate[1])
      }
      render()
    }
    canvasEl.addEventListener('wheel', handleWheel)

    const handleKeyDown = (event: KeyboardEvent): void => {
      switch (event.code) {
  
      case 'KeyW':
      case 'ArrowUp':
      case 'Numpad8':
        translate[1] -= translateFactor * zoomFactor
        break
            
      case 'KeyS':
      case 'ArrowDown':
      case 'Numpad2':
        translate[1] += translateFactor * zoomFactor
        break
             
      case 'KeyA':
      case 'ArrowLeft':
      case 'Numpad4':
        translate[0] += translateFactor * zoomFactor
        break
            
      case 'KeyD':
      case 'ArrowRight':
      case 'Numpad6':
        translate[0] -= translateFactor * zoomFactor
        break

      case 'KeyE':
      case 'Numpad9':
        translate[1] -= translateFactor * zoomFactor
        translate[0] -= translateFactor * zoomFactor
        break
            
      case 'KeyC':
      case 'Numpad3':
        translate[1] += translateFactor * zoomFactor
        translate[0] -= translateFactor * zoomFactor
        break
              
      case 'KeyZ':
      case 'Numpad1':
        translate[0] += translateFactor * zoomFactor
        translate[1] += translateFactor * zoomFactor
        break
            
      case 'KeyQ':
      case 'Numpad7':
        translate[0] += translateFactor * zoomFactor
        translate[1] -= translateFactor * zoomFactor
        break

      case 'Space':
      case 'KeyO':
      case 'Numpad5':
        translate[0] = -canvasCenter[0]
        translate[1] = -canvasCenter[1]
        break
    
      case 'KeyX':
      case 'Numpad0':
        translate[0] = translate[1] = 0
        break

      case 'NumpadSubtract':
      case 'Minus':
        scale[0] *= zoomFactor
        scale[1] *= zoomFactor
        if (setScale) {
          setScale(scale[0], scale[1])
          render()
        } 
        break
 
      case 'NumpadAdd':
      case 'Equal':
        scale[0] /= zoomFactor
        scale[1] /= zoomFactor
        if (setScale) {
          setScale(scale[0], scale[1])
          render()
        } 
        break

      case 'NumpadDivide':
      case 'BracketRight':
        scale[0] /= logBase
        scale[1] /= logBase
        if (setScale) {
          setScale(scale[0], scale[1])
          render()
        }
        break
    
      case 'NumpadMultiply':
      case 'BracketLeft':
        scale[0] *= logBase
        scale[1] *= logBase
        if (setScale) {
          setScale(scale[0], scale[1])
          render()
        } 
        break
  
      case 'Period':
      case 'NumpadDecimal':
        {
          const initialScale = rest.initialScale ?? 8/canvasCenter[0]
          scale[0] = scale[1] = initialScale
          if (setScale) {
            setScale(scale[0], scale[1])
          }
        }
        break
        

      case 'Escape':
      case 'Backspace':
        window.location.reload()
        break
                
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return (): void => {
      window.cancelAnimationFrame(renderCallbackID)
      canvasEl.removeEventListener('mousedown', handleMouseDown)
      canvasEl.removeEventListener('mouseup', handleMouseUp)
      canvasEl.removeEventListener('contextmenu', handleContextMenu)
      canvasEl.removeEventListener('mousemove', handleMouseMove)
      canvasEl.removeEventListener('touchstart', handleTouchDown)
      canvasEl.removeEventListener('touchend', handleTouchUp)
      canvasEl.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('keydown', handleKeyDown)
    }

  }, [ref])

  return (
    <Canvas 
      ref={ref}
      className="jrid"
      init={init}
      onResize={onResize}
      draw={draw}
      animate={true}
      {...rest}
    />
  )
}

interface JridState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any;
  locale: string;
  setTranslate?: TranslateFunction;
  setScale?: ScaleFunction;
}

const JridDefaultState: JridState = {
  locale: 'en-CA',
  setTranslate: undefined,
  setScale: undefined
}

export interface JridSettings {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any;
  locale?: string;
  setTranslate?: TranslateFunction;
  setScale?: ScaleFunction;
}

/**
 * @class Jrid
 * @name Jrid
 */
class Jrid {
  el: HTMLElement
  state: JridSettings = JridDefaultState

  constructor(el: HTMLElement, settings: JridSettings = {}) {
    // super()
    this.el = el
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    for (const k in settings) this.state[k] = settings[k]
    render(
      <JridOverlay setTranslate={this.state.setTranslate} setScale={this.state.setScale} />,
      this.el
    )
  }

  static get version(): string {
    return VERSION
  }

}

export default Jrid
