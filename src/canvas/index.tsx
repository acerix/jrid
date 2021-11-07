import { FunctionalComponent, createRef, h } from 'preact'
import { useEffect } from 'preact/hooks'

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
  className?: string;
  getContext?: GetContextFunction;
  init?: InitFunction;
  ready?: ReadyFunction;
  draw: DrawFunction;
  onResize?: ResizeFunction;
  animate?: boolean;
  framesPerSecond?: number;
  options?: CanvasOptions;
  canvasMethodRefs?: CanvasMethods;
}

const Canvas: FunctionalComponent<CanvasProps> = (props: CanvasProps) => {
  const { className, getContext, init, ready, draw, onResize, animate, framesPerSecond, ...rest } = props
  const ref = createRef()
  const frameMilliseconds = framesPerSecond ? 1000 / framesPerSecond : undefined

  useEffect(() => {
    const canvas = ref.current as HTMLCanvasElement
    let paused = false
    let frameCount = -1
    let loopCallbackID: number
    const ctx = getContext ? getContext(canvas) : canvas.getContext('2d') as CanvasRenderingContext2D

    const handleResize = (): void => {
      if (canvas.parentElement) {
        ctx.canvas.width = canvas.parentElement.clientWidth
        ctx.canvas.height = canvas.parentElement.clientHeight
      }
      else {
        ctx.canvas.width = window.innerWidth
        ctx.canvas.height = window.innerHeight
      }
      if (onResize) onResize(ctx)
    }
    window.addEventListener('resize', handleResize)
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(canvas.parentElement||canvas)
    handleResize()

    const handleBlur = (): void => {
      paused = true
    }
    canvas.addEventListener('blur', handleBlur)

    const handleFocus = (): void => {
      paused = false
    }
    canvas.addEventListener('focus', handleFocus)

    const setFullscreen = (): void => {
      if (!document.fullscreenElement) {
        document.body.requestFullscreen().catch(err => {
          console.error('requestFullscreen', err)
        })
        ctx.canvas.width = window.innerWidth
        ctx.canvas.height = window.innerHeight
        handleResize()
      }
    }
    canvas.addEventListener('dblclick', setFullscreen)

    if (init) init(ctx)

    const render = (): void => {
      draw(ctx, frameCount++)
    }

    const loop = (): void => {
      if (paused) {
        setTimeout(loop, 128)
        return
      }
      frameCount++
      if (frameMilliseconds) {
        loopCallbackID = window.setTimeout(loop, frameMilliseconds)
      }
      else {
        loopCallbackID = window.requestAnimationFrame(loop)
      }
      draw(ctx, frameCount)
    }

    // expose methods to parent
    // @todo seems parents calling their children's methods is react antipattern, better way?
    if (props.canvasMethodRefs) {
      props.canvasMethodRefs.render = render
    }

    const whenReady = (): void => {
      if (animate===false) {
        setTimeout(render)
      }
      else {
        setTimeout(loop)
      }
    }

    if (ready===undefined) whenReady()
    else ready(whenReady)

    return (): void => {
      if (frameMilliseconds) {
        window.clearTimeout(loopCallbackID)
      }
      else {
        window.cancelAnimationFrame(loopCallbackID)
      }
      window.removeEventListener('resize', handleResize)
      resizeObserver.unobserve(canvas)
      canvas.removeEventListener('blur', handleBlur)
      canvas.removeEventListener('focus', handleFocus)
      canvas.removeEventListener('dblclick', setFullscreen)
    }

  }, [getContext, init, ready, draw, onResize, ref, props.canvasMethodRefs, animate, frameMilliseconds])

  return <canvas class={className} ref={ref} {...rest} />
}

export default Canvas
