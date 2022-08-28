export * from 'preact/hooks'
import { VNode, h, RefObject } from 'preact'
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'
import VERSION from './version'

import './style.css'

const logBase = 10
const zoomFactor = logBase**(1/13)
const microZoomFactor = zoomFactor**(1/32)
const minimumJridSpacing = 24
const μ = .75
const translateFactor = 16

const fontSize = 12
const axisLabelMargin = 4
// const xLabelOffset = [-axisLabelMargin, fontSize+axisLabelMargin] // wrong for rotated labels
const xLabelOffset = [-6, 10]
const yLabelOffset = [axisLabelMargin, -axisLabelMargin]


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

type GetContextFunction = (canvas: HTMLCanvasElement) => CanvasRenderingContext2D

type InitFunction = (ctx: CanvasRenderingContext2D) => void

type ReadyFunction = (whenReady: VoidFunction) => void

type DrawFunction = (ctx: CanvasRenderingContext2D, frameCount: number) => void

type ResizeFunction = (ctx: CanvasRenderingContext2D) => void

type RenderFunction = () => void

export interface CanvasOptions {
  contextType?: string;
  framesPerSecond?: number;
}

export interface CanvasMethods {
  render: RenderFunction;
}

export interface CanvasProps {
  ref?: RefObject<HTMLCanvasElement>;
  className?: string;
  getContext?: GetContextFunction;
  init?: InitFunction;
  ready?: ReadyFunction;
  draw: DrawFunction;
  onResize?: ResizeFunction;
  animate?: boolean;
  options?: CanvasOptions;
  canvasMethodRefs?: CanvasMethods;
}

export interface Props {
  locale?: string;
  canvasMethodRefs?: CanvasMethods;
  setTranslate?: TranslateFunction;
  setScale?: ScaleFunction;
  initialScale?: number;
  framesPerSecond?: number;
}

function defaultVec2UpdateHandler(x: number, y: number): void {
  // console.log('Update', x, y)
  void(x | y)
}

export default function App(props: Props): VNode {
  const ref = useRef(null)
  const scaleRef = useRef([1, 1])
  const translateRef = useRef([0, 0])
  const heightRef = useRef(0)
  const centerRef = useRef([0, 0])
  const velocityRef = useRef([0, 0])
  const freeRef = useRef(true)
  const pausedRef = useRef(false)
  const setScale = props.setScale ?? defaultVec2UpdateHandler
  const setTranslate = props.setTranslate ?? defaultVec2UpdateHandler
  const locale = props.locale ?? 'en'
  const frameMilliseconds = props.framesPerSecond ? 1000 / props.framesPerSecond : undefined
  const lastDrawState = useRef(scaleRef.current.concat(translateRef.current))

  console.log(`jrid ${VERSION} ${locale}`)

  useLayoutEffect(() => {
    if (!ref.current) return console.error('Canvas element is undefined')
    const canvas = ref.current as HTMLCanvasElement
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const container = ctx.canvas.parentNode as HTMLElement

    // set initial scale based on canvas width
    const initialScale = 16/ctx.canvas.width
    scaleRef.current[0] = scaleRef.current[1] = initialScale

    // draw the grid
    const draw = (ctx: CanvasRenderingContext2D): void => {
  
      // slow down due to friction
      velocityRef.current[0] *= μ
      velocityRef.current[1] *= μ
  
      // glide
      if (freeRef.current) {
        translateRef.current[0] += velocityRef.current[0]
        translateRef.current[1] -= velocityRef.current[1]
      }

      // skip drawing if nothing changed
      // @todo better way with preact?
      if (lastDrawState.current[0] === scaleRef.current[0] && lastDrawState.current[1] === scaleRef.current[1] && lastDrawState.current[2] === translateRef.current[0] && lastDrawState.current[3] === translateRef.current[1]) {
        return
      }
      lastDrawState.current[0] = scaleRef.current[0]
      lastDrawState.current[1] = scaleRef.current[1]
      lastDrawState.current[2] = translateRef.current[0]
      lastDrawState.current[3] = translateRef.current[1]
      
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      // exponent for axis labels ⏨(n+x)
      const powerX = Math.ceil(Math.log10(minimumJridSpacing * scaleRef.current[0]))
      const powerY = Math.ceil(Math.log10(minimumJridSpacing * scaleRef.current[1]))
      const factorX = 10**powerX
      const factorY = 10**powerY
  
      // set space between lines
      const spaceX = factorX / scaleRef.current[0]
      const spaceY = factorY / scaleRef.current[1]
  
      // get first lines by rounding up
      const xIndexOffset = Math.ceil(translateRef.current[0] * scaleRef.current[0] / factorX)
      const yIndexOffset = Math.ceil(translateRef.current[1] * scaleRef.current[1] / factorY) 
      const firstXValue = xIndexOffset * factorX
      const firstYValue = yIndexOffset * factorY
      const firstXPosition = firstXValue / scaleRef.current[0] - translateRef.current[0]
      const firstYPosition = translateRef.current[1] - firstYValue / scaleRef.current[1]
      
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
  
            // rotate, to avoid overlap with long labels and small Jrid
            ctx.save()
            ctx.translate(x + xLabelOffset[0] - label.length * 4, y + xLabelOffset[1] + label.length * 3)
            ctx.rotate(-Math.PI/6)
            ctx.fillText(label, 0, 0)
            ctx.restore()
  
            // without rotate:
            // ctx.fillText(label, x + xLabelOffset[0], y + xLabelOffset[1])
  
          }
        }
      }
      ctx.stroke()
  
      setTranslate(translateRef.current[0], translateRef.current[1])
    }
  
    // draw loop
    let loopCallbackID: number
    const loop = (): void => {
      if (pausedRef.current) {
        loopCallbackID = window.setTimeout(loop, 128)
        return
      }
      if (frameMilliseconds) {
        loopCallbackID = window.setTimeout(loop, frameMilliseconds)
      }
      else {
        loopCallbackID = requestAnimationFrame(loop)
      }
      draw(ctx)
    }
    loop()

    // line styles
    ctx.strokeStyle = '#999'
    ctx.lineWidth = 1
    
    // text styles
    ctx.fillStyle = '#999'
    ctx.textAlign = 'right'
    ctx.font = `${fontSize}px monospace`

    const onResize = (ctx: CanvasRenderingContext2D): void => {
      heightRef.current = ctx.canvas.height
      const halfWidth = ctx.canvas.width/2
      const halfHeight = ctx.canvas.height/2
      if (centerRef.current[0] === 0) {
        // initially translate (0,0) to center of canvas
        centerRef.current[0] = halfWidth
        centerRef.current[1] = halfHeight
        translateRef.current[0] = -centerRef.current[0]
        translateRef.current[1] = -centerRef.current[1]
      }
      else {
        // adjust translation by difference in canvas size
        const dx = halfWidth - centerRef.current[0]
        const dy = halfHeight - centerRef.current[1]
        translateRef.current[0] -= dx
        translateRef.current[1] -= dy
        centerRef.current[0] = halfWidth
        centerRef.current[1] = halfHeight
      }
      draw(ctx)
    }

    const handleResize = (): void => {
      ctx.canvas.width = container.clientWidth
      ctx.canvas.height = container.clientHeight
      onResize(ctx)
    }
    const observer = new ResizeObserver(handleResize)
    observer.observe(container)

    return (): void => {
      if (frameMilliseconds) {
        window.clearTimeout(loopCallbackID)
      }
      else {
        cancelAnimationFrame(loopCallbackID)
      }
      observer.disconnect()
    }
  }, [frameMilliseconds, setTranslate])

  // Set fullscreen on double click
  useEffect(() => {
    if (!ref.current) return console.error('Canvas element is undefined')
    const canvas = ref.current as HTMLCanvasElement
    const container = canvas.parentNode as HTMLElement
    const setFullscreen = (): void => {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          console.error('Fullscreen error', err)
        })
      }
    }
    container.addEventListener('dblclick', setFullscreen)
    return (): void => {
      container.removeEventListener('dblclick', setFullscreen)
    }
  }, [])

  // Pause rendering when window is not focused
  useEffect(() => {
    const handleBlur = (): void => {
      pausedRef.current = true
    }
    window.addEventListener('blur', handleBlur)
    const handleFocus = (): void => {
      pausedRef.current = false
    }
    window.addEventListener('focus', handleFocus)
    return (): void => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Interaction listeners
  useEffect(() => {
    if (!ref.current) return console.error('Canvas element is undefined')
    const canvas = ref.current as HTMLCanvasElement

    let mouseDown = 0
    const lastMousePosition = [0, 0]
    const lastTouch1Position = [-1, -1]
    const lastTouch2Position = [-1, -1]

    const handleMouseDown = (event: MouseEvent): boolean => {
      mouseDown |= (1<<event.button)
      lastMousePosition[0] = event.clientX
      lastMousePosition[1] = event.clientY
      velocityRef.current[0] = velocityRef.current[1] = 0
      freeRef.current = !(mouseDown&1)
      event.preventDefault()
      return false
    }
    canvas.addEventListener('mousedown', handleMouseDown)

    const handleMouseUp = (event: MouseEvent): boolean => {
      mouseDown ^= (1<<event.button)
      event.preventDefault()
      freeRef.current = !(mouseDown&1)
      return false
    }
    canvas.addEventListener('mouseup', handleMouseUp)

    const handleContextMenu = (event: MouseEvent): boolean => {
      event.preventDefault()
      return false
    }
    canvas.addEventListener('contextmenu', handleContextMenu)

    const handleMouseMove = (event: MouseEvent): void => {
      if (typeof lastMousePosition[0] === 'undefined' || typeof lastMousePosition[1] === 'undefined') return
      const dx = lastMousePosition[0] - event.clientX
      const dy = lastMousePosition[1] - event.clientY
      const flingFactor = 4
      // left-clicked, translate
      if (mouseDown&1) {
        velocityRef.current[0] = dx * flingFactor
        velocityRef.current[1] = dy * flingFactor
        translateRef.current[0] += dx
        translateRef.current[1] -= dy
        setTranslate(translateRef.current[0], translateRef.current[1])
      }
      // middle-clicked, scale all axes
      if (mouseDown&2) {
        const f = microZoomFactor**-dy
        scaleRef.current[0] *= f
        scaleRef.current[1] *= f
        setScale(scaleRef.current[0], scaleRef.current[1])
      }
      // right-clicked, scale individual axes
      if (mouseDown&4) {
        const zoomTo = [
          (lastMousePosition[0] + translateRef.current[0]) * scaleRef.current[0],
          (heightRef.current - lastMousePosition[1] + translateRef.current[1]) * scaleRef.current[1]
        ]
        if (typeof zoomTo[0] === 'undefined' || typeof zoomTo[1] === 'undefined') return
        const zoomLastPosition = [
          zoomTo[0] / scaleRef.current[0] - translateRef.current[0],
          zoomTo[1] / scaleRef.current[1] - translateRef.current[1]
        ]
        if (typeof zoomLastPosition[0] === 'undefined' || typeof zoomLastPosition[1] === 'undefined') return
        scaleRef.current[0] *= microZoomFactor**dx
        scaleRef.current[1] *= microZoomFactor**-dy
        setScale(scaleRef.current[0], scaleRef.current[1])
        const zoomToPosition = [
          zoomTo[0] / scaleRef.current[0] - translateRef.current[0],
          zoomTo[1] / scaleRef.current[1] - translateRef.current[1]
        ]
        if (typeof zoomToPosition[0] === 'undefined' || typeof zoomToPosition[1] === 'undefined') return
        translateRef.current[0] -= zoomLastPosition[0] - zoomToPosition[0] - dx
        translateRef.current[1] += zoomToPosition[1] - zoomLastPosition[1] - dy
        setTranslate(translateRef.current[0], translateRef.current[1])
      }
      lastMousePosition[0] = event.clientX
      lastMousePosition[1] = event.clientY
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    const handleTouchDown = (event: TouchEvent): boolean => {
      if (typeof event.touches[0] === 'undefined') return false
      lastTouch1Position[0] = event.touches[0].pageX
      lastTouch1Position[1] = event.touches[0].pageY
      velocityRef.current[0] = velocityRef.current[1] = 0
      freeRef.current = false
      return false
    }
    canvas.addEventListener('touchstart', handleTouchDown)

    const handleTouchUp = (event: TouchEvent): boolean => {
      void(event)
      lastTouch1Position[0] = lastTouch1Position[1] = -1
      freeRef.current = true
      return false
    }
    canvas.addEventListener('touchend', handleTouchUp)

    const handleTouchMove = (event: TouchEvent): void => {
      if (typeof lastTouch1Position[0] === 'undefined' || typeof lastTouch1Position[1] === 'undefined') return
      if (typeof lastTouch2Position[0] === 'undefined' || typeof lastTouch2Position[1] === 'undefined') return
      if (typeof event.touches[0] === 'undefined' || typeof event.touches[1] === 'undefined') return
      if (lastTouch1Position[0] > -1) {
        if (event.touches.length===1) {
          const dx = lastTouch1Position[0] - event.touches[0].pageX
          const dy = lastTouch1Position[1] - event.touches[0].pageY
          velocityRef.current[0] = dx
          velocityRef.current[1] = dy
          translateRef.current[0] += dx
          translateRef.current[1] -= dy
          lastTouch2Position[0] = lastTouch2Position[1] = -1
          setTranslate(translateRef.current[0], translateRef.current[1])
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
            if (typeof touchMidpoint[0] === 'undefined' || typeof touchMidpoint[1] === 'undefined') return
            const zoomTo = [
              (touchMidpoint[0] + translateRef.current[0]) * scaleRef.current[0],
              (heightRef.current - touchMidpoint[1] + translateRef.current[1]) * scaleRef.current[1]
            ]
            if (typeof zoomTo[0] === 'undefined' || typeof zoomTo[1] === 'undefined') return
            const zoomLastPosition = [
              zoomTo[0] / scaleRef.current[0] - translateRef.current[0],
              zoomTo[1] / scaleRef.current[1] - translateRef.current[1]
            ]
            if (typeof zoomLastPosition[0] === 'undefined' || typeof zoomLastPosition[1] === 'undefined') return
            scaleRef.current[0] *= zoomModifier
            scaleRef.current[1] *= zoomModifier
            setScale(scaleRef.current[0], scaleRef.current[1])
            const zoomToPosition = [
              zoomTo[0] / scaleRef.current[0] - translateRef.current[0],
              zoomTo[1] / scaleRef.current[1] - translateRef.current[1]
            ]
            if (typeof zoomToPosition[0] === 'undefined' || typeof zoomToPosition[1] === 'undefined') return
            translateRef.current[0] -= zoomLastPosition[0] - zoomToPosition[0]
            translateRef.current[1] += zoomToPosition[1] - zoomLastPosition[1]
            setTranslate(translateRef.current[0], translateRef.current[1])
          }
          lastTouch2Position[0] = event.touches[1].pageX
          lastTouch2Position[1] = event.touches[1].pageY
        }
      }
      lastTouch1Position[0] = event.touches[0].pageX
      lastTouch1Position[1] = event.touches[0].pageY
    }
    canvas.addEventListener('touchmove', handleTouchMove)

    const handleWheel = (event: WheelEvent): void => {
      const zoomModifier = event.deltaY > 0 ? zoomFactor : 1/zoomFactor
      if (typeof lastMousePosition[0] === 'undefined' || typeof lastMousePosition[1] === 'undefined') return
      if (typeof translateRef.current[0] === 'undefined' || typeof translateRef.current[1] === 'undefined') return
      if (typeof scaleRef.current[0] === 'undefined' || typeof scaleRef.current[1] === 'undefined') return
      const zoomTo = [
        (lastMousePosition[0] + translateRef.current[0]) * scaleRef.current[0],
        (heightRef.current - lastMousePosition[1] + translateRef.current[1]) * scaleRef.current[1]
      ]
      if (typeof zoomTo[0] === 'undefined' || typeof zoomTo[1] === 'undefined') return
      const zoomLastPosition = [
        zoomTo[0] / scaleRef.current[0] - translateRef.current[0],
        zoomTo[1] / scaleRef.current[1] - translateRef.current[1]
      ]
      if (typeof zoomLastPosition[0] === 'undefined' || typeof zoomLastPosition[1] === 'undefined') return
      scaleRef.current[0] *= zoomModifier
      scaleRef.current[1] *= zoomModifier
      setScale(scaleRef.current[0], scaleRef.current[1])
      const zoomToPosition = [
        zoomTo[0] / scaleRef.current[0] - translateRef.current[0],
        zoomTo[1] / scaleRef.current[1] - translateRef.current[1]
      ]
      if (typeof zoomToPosition[0] === 'undefined' || typeof zoomToPosition[1] === 'undefined') return
      translateRef.current[0] -= zoomLastPosition[0] - zoomToPosition[0]
      translateRef.current[1] += zoomToPosition[1] - zoomLastPosition[1]
      setTranslate(translateRef.current[0], translateRef.current[1])
    }
    canvas.addEventListener('wheel', handleWheel)

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (typeof scaleRef.current[0] === 'undefined' || typeof scaleRef.current[1] === 'undefined') return
      switch (event.code) {
  
      case 'KeyW':
      case 'ArrowUp':
      case 'Numpad8':
        translateRef.current[1] -= translateFactor * zoomFactor
        break
            
      case 'KeyS':
      case 'ArrowDown':
      case 'Numpad2':
        translateRef.current[1] += translateFactor * zoomFactor
        break
             
      case 'KeyA':
      case 'ArrowLeft':
      case 'Numpad4':
        translateRef.current[0] += translateFactor * zoomFactor
        break
            
      case 'KeyD':
      case 'ArrowRight':
      case 'Numpad6':
        translateRef.current[0] -= translateFactor * zoomFactor
        break

      case 'KeyE':
      case 'Numpad9':
        translateRef.current[1] -= translateFactor * zoomFactor
        translateRef.current[0] -= translateFactor * zoomFactor
        break
            
      case 'KeyC':
      case 'Numpad3':
        translateRef.current[1] += translateFactor * zoomFactor
        translateRef.current[0] -= translateFactor * zoomFactor
        break
              
      case 'KeyZ':
      case 'Numpad1':
        translateRef.current[0] += translateFactor * zoomFactor
        translateRef.current[1] += translateFactor * zoomFactor
        break
            
      case 'KeyQ':
      case 'Numpad7':
        translateRef.current[0] += translateFactor * zoomFactor
        translateRef.current[1] -= translateFactor * zoomFactor
        break

      case 'Space':
      case 'KeyO':
      case 'Numpad5':
        translateRef.current[0] = -centerRef.current[0]
        translateRef.current[1] = -centerRef.current[1]
        break
    
      case 'KeyX':
      case 'Numpad0':
        translateRef.current[0] = translateRef.current[1] = 0
        break

      case 'NumpadSubtract':
      case 'Minus':
        scaleRef.current[0] *= zoomFactor
        scaleRef.current[1] *= zoomFactor
        setScale(scaleRef.current[0], scaleRef.current[1])
        break
 
      case 'NumpadAdd':
      case 'Equal':
        scaleRef.current[0] /= zoomFactor
        scaleRef.current[1] /= zoomFactor
        setScale(scaleRef.current[0], scaleRef.current[1])
        break

      case 'NumpadDivide':
      case 'BracketRight':
        scaleRef.current[0] /= logBase
        scaleRef.current[1] /= logBase
        setScale(scaleRef.current[0], scaleRef.current[1])
        break
    
      case 'NumpadMultiply':
      case 'BracketLeft':
        scaleRef.current[0] *= logBase
        scaleRef.current[1] *= logBase
        setScale(scaleRef.current[0], scaleRef.current[1])
        break
  
      case 'Period':
      case 'NumpadDecimal':
        {
          const initialScale = props.initialScale ?? 8/ ( centerRef.current[0] ?? 1 )
          scaleRef.current[0] = scaleRef.current[1] = initialScale
          setScale(scaleRef.current[0], scaleRef.current[1])
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
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('contextmenu', handleContextMenu)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchstart', handleTouchDown)
      canvas.removeEventListener('touchend', handleTouchUp)
      canvas.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [props.initialScale, setScale, setTranslate])

  return (
    <canvas ref={ref} />
  )
}
