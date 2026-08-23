export class InputManager {
  keys = new Set<string>();
  mouseDown = false;
  rightDown = false;
  dx = 0;
  dy = 0;
  locked = false;
  private canvas: HTMLCanvasElement | null = null;
  private onLock: (() => void) | null = null;
  private onUnlock: (() => void) | null = null;
  private justPressed = new Set<string>();
  private justClicked = false;

  bind(
    canvas: HTMLCanvasElement,
    handlers: { onLock?: () => void; onUnlock?: () => void },
  ) {
    this.canvas = canvas;
    this.onLock = handlers.onLock ?? null;
    this.onUnlock = handlers.onUnlock ?? null;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerlockchange", this.onPointerLock);
    canvas.addEventListener("contextmenu", this.onContext);
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas?.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onPointerLock);
    this.canvas?.removeEventListener("contextmenu", this.onContext);
  }

  requestLock() {
    if (!this.canvas) return;
    try {
      const p = this.canvas.requestPointerLock() as unknown;
      if (p instanceof Promise) p.catch(() => {});
    } catch {
      /* lock refused (cooldown or unsupported) — click-to-relock recovers */
    }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  pressed(code: string) {
    return this.keys.has(code);
  }

  consume(code: string) {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  consumeClick() {
    if (this.justClicked) {
      this.justClicked = false;
      return true;
    }
    return false;
  }

  endFrame() {
    this.dx = 0;
    this.dy = 0;
    this.justPressed.clear();
    this.justClicked = false;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) {
      this.keys.add(e.code);
      return;
    }
    if (e.code === "Tab") e.preventDefault();
    this.keys.add(e.code);
    this.justPressed.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseDown = true;
      this.justClicked = true;
    }
    if (e.button === 2) this.rightDown = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this.rightDown = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.dx += e.movementX;
    this.dy += e.movementY;
  };

  private onPointerLock = () => {
    this.locked = document.pointerLockElement === this.canvas;
    if (this.locked) this.onLock?.();
    else this.onUnlock?.();
  };

  private onContext = (e: Event) => e.preventDefault();
}
