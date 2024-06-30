const vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
        gl_FragColor = u_color;
    }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function initWebGL() {
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl");

  if (!gl) {
    alert("WebGL isn't available");
    return;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );
  const program = createProgram(gl, vertexShader, fragmentShader);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const colorLocation = gl.getUniformLocation(program, "u_color");

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

  return { gl, positionBuffer, colorLocation };
}

function drawLine(gl, positionBuffer, colorLocation, line, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);

  gl.uniform4fv(colorLocation, color);
  gl.drawArrays(gl.LINES, 0, 2);
}

// input

const INSIDE = 0;
const LEFT = 1;
const RIGHT = 2;
const BOTTOM = 4;
const TOP = 8;

const x_max = 700;
const y_max = 500;
const x_min = 100;
const y_min = 100;

function computeCode(x, y) {
  let code = INSIDE;

  if (x < x_min) code |= LEFT;
  else if (x > x_max) code |= RIGHT;
  if (y < y_min) code |= BOTTOM;
  else if (y > y_max) code |= TOP;

  return code;
}

function cohenSutherlandClip(x1, y1, x2, y2) {
  let code1 = computeCode(x1, y1);
  let code2 = computeCode(x2, y2);
  let accept = false;

  while (true) {
    if (code1 === 0 && code2 === 0) {
      accept = true;
      break;
    } else if ((code1 & code2) !== 0) {
      break;
    } else {
      let x, y;
      let outcodeOut = code1 !== 0 ? code1 : code2;

      // Top clipping formula
      if (outcodeOut & TOP) {
        x = x1 + ((x2 - x1) * (y_max - y1)) / (y2 - y1);
        y = y_max;
      }
      // Bottom clipping formula
      else if (outcodeOut & BOTTOM) {
        x = x1 + ((x2 - x1) * (y_min - y1)) / (y2 - y1);
        y = y_min;
      }
      // right clipping
      else if (outcodeOut & RIGHT) {
        y = y1 + ((y2 - y1) * (x_max - x1)) / (x2 - x1);
        x = x_max;
      }
      // left clipping
      else if (outcodeOut & LEFT) {
        y = y1 + ((y2 - y1) * (x_min - x1)) / (x2 - x1);
        x = x_min;
      }

      if (outcodeOut === code1) {
        x1 = x;
        y1 = y;
        code1 = computeCode(x1, y1);
      } else {
        x2 = x;
        y2 = y;
        code2 = computeCode(x2, y2);
      }
    }
  }

  if (accept) {
    return [x1, y1, x2, y2];
  } else {
    return null;
  }
}

function main() {
  const { gl, positionBuffer, colorLocation } = initWebGL();

  const line = [150, 150, 750, 550];
  const clippedLine = cohenSutherlandClip(...line);

  drawLine(gl, positionBuffer, colorLocation, line, [1, 0, 0, 1]);
  if (clippedLine) {
    drawLine(gl, positionBuffer, colorLocation, clippedLine, [0, 0, 1, 1]);
  }

  // Draw clipping rectangle
  const rectLines = [
    [x_min, y_min, x_max, y_min],
    [x_max, y_min, x_max, y_max],
    [x_max, y_max, x_min, y_max],
    [x_min, y_max, x_min, y_min],
  ];

  rectLines.forEach((rectLine) => {
    drawLine(gl, positionBuffer, colorLocation, rectLine, [0, 1, 0, 1]);
  });
}

main();