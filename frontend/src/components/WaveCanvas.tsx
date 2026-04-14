import { useEffect, useRef } from 'react';

interface WaveCanvasProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * WaveCanvas — WebGL cursor-reactive wave background.
 *
 * Renders a grid of sine-wave-displaced points connected by lines on a
 * dark (#212121) canvas. Mouse movement applies ripples via spring physics.
 * Matching the chkstepan wave canvas aesthetic described in frontend.md.
 */
export function WaveCanvas({ className, style }: WaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      // Fallback: 2D canvas wave
      return runCanvas2DWave(canvas);
    }
    return runWebGLWave(canvas, gl as WebGLRenderingContext);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', ...style }}
      aria-hidden="true"
    />
  );
}

/* ─── 2D Fallback ────────────────────────────────────────────────────── */
function runCanvas2DWave(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')!;
  let W = 0, H = 0;
  let mx = 0, my = 0;
  let rafId = 0;
  const ROWS = 22, COLS = 44;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    W = canvas.width  = rect.width  * devicePixelRatio;
    H = canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const onMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
  };
  window.addEventListener('mousemove', onMove);

  let t = 0;

  const draw = () => {
    t += 0.012;
    const w = W / devicePixelRatio;
    const h = H / devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#212121';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(253,253,253,0.07)';
    ctx.lineWidth = 0.8;

    const xGap = w / COLS;
    const yGap = h / ROWS;

    for (let row = 0; row <= ROWS; row++) {
      ctx.beginPath();
      for (let col = 0; col <= COLS; col++) {
        const bx = col * xGap;
        const by = row * yGap;

        // Distance from cursor
        const dx = bx - mx;
        const dy = by - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 200) * 18;

        const offsetY = Math.sin(col * 0.4 + t + row * 0.3) * 6 + influence * Math.sin(t * 2);
        const offsetX = Math.cos(row * 0.3 + t) * 3 - influence * Math.cos(t * 1.5) * 0.5;

        const px = bx + offsetX;
        const py = by + offsetY;

        if (col === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    for (let col = 0; col <= COLS; col++) {
      ctx.beginPath();
      for (let row = 0; row <= ROWS; row++) {
        const bx = col * xGap;
        const by = row * yGap;
        const dx = bx - mx;
        const dy = by - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 200) * 18;
        const offsetY = Math.sin(col * 0.4 + t + row * 0.3) * 6 + influence * Math.sin(t * 2);
        const offsetX = Math.cos(row * 0.3 + t) * 3;
        const px = bx + offsetX;
        const py = by + offsetY;
        if (row === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    rafId = requestAnimationFrame(draw);
  };

  rafId = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMove);
    ro.disconnect();
  };
}

/* ─── WebGL Wave ─────────────────────────────────────────────────────── */
const VERT_SRC = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    gl_PointSize = 2.0;
  }
`;

const FRAG_SRC = `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    gl_FragColor = u_color;
  }
`;

function runWebGLWave(canvas: HTMLCanvasElement, gl: WebGLRenderingContext): () => void {
  // Compile shaders
  const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vert || !frag) return () => {};

  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};

  const aPos      = gl.getAttribLocation(program,  'a_position');
  const uRes      = gl.getUniformLocation(program, 'u_resolution')!;
  const uColor    = gl.getUniformLocation(program, 'u_color')!;

  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);

  const ROWS = 22, COLS = 44;
  let W = 0, H = 0;
  let mx = 0, my = 0;
  let t   = 0;
  let rafId = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    W = canvas.width  = rect.width  * devicePixelRatio;
    H = canvas.height = rect.height * devicePixelRatio;
    gl.viewport(0, 0, W, H);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const onMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mx = (e.clientX - rect.left) * devicePixelRatio;
    my = (e.clientY - rect.top)  * devicePixelRatio;
  };
  window.addEventListener('mousemove', onMove);

  // Build grid vertex pairs (lines)
  const buildGrid = (): Float32Array => {
    const verts: number[] = [];
    const xGap = W / COLS;
    const yGap = H / ROWS;

    const px = (col: number, row: number): [number, number] => {
      const bx = col * xGap;
      const by = row * yGap;
      const dx = bx - mx;
      const dy = by - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inf  = Math.max(0, 1 - dist / (W * 0.2)) * 22;
      const ox = Math.sin(col * 0.4 + t + row * 0.3) * 7 + inf * Math.sin(t * 2) * 0.4;
      const oy = Math.cos(row * 0.3 + t) * 5 + inf * Math.cos(t * 1.8);
      return [bx + ox, by + oy];
    };

    // Horizontal lines
    for (let row = 0; row <= ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const [x1, y1] = px(col,     row);
        const [x2, y2] = px(col + 1, row);
        verts.push(x1, y1, x2, y2);
      }
    }
    // Vertical lines
    for (let col = 0; col <= COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const [x1, y1] = px(col, row);
        const [x2, y2] = px(col, row + 1);
        verts.push(x1, y1, x2, y2);
      }
    }
    return new Float32Array(verts);
  };

  const draw = () => {
    t += 0.012;
    gl.clearColor(33 / 255, 33 / 255, 33 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform2f(uRes, W, H);
    gl.uniform4f(uColor, 253 / 255, 253 / 255, 253 / 255, 0.07);

    const data = buildGrid();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINES, 0, data.length / 2);

    rafId = requestAnimationFrame(draw);
  };

  rafId = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMove);
    ro.disconnect();
  };
}

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}
