'use strict';
import * as Shaders from "./shaders.js";

const numParticles = 200000;
const maxAttractorForce = 100000;
const maxIterations = 150;

let gl;
let updatePositionProgram, drawParticlesProgram;
let iterations = 0;
let current, next;
let updatePositionPrgLocs, drawParticlesProgLocs;

window.onload = initialize();
window.addEventListener('click', () => { reset() });

function initialize() {
    gl = createWebGL2Context();

    updatePositionProgram = createProgram(gl, Shaders.updatePositionVS, Shaders.updatePositionFS, ['newPosition']);
    drawParticlesProgram = createProgram(gl, Shaders.drawParticlesVS, Shaders.drawParticlesFS);

    updatePositionPrgLocs = {
        oldPosition: gl.getAttribLocation(updatePositionProgram, 'oldPosition'),
        attractorType: gl.getUniformLocation(updatePositionProgram, 'attractorType'),
        attractor1: gl.getUniformLocation(updatePositionProgram, 'attractor1'),
        attractor2: gl.getUniformLocation(updatePositionProgram, 'attractor2'),
        attractor3: gl.getUniformLocation(updatePositionProgram, 'attractor3'),
        attractor4: gl.getUniformLocation(updatePositionProgram, 'attractor4'),
        attractor5: gl.getUniformLocation(updatePositionProgram, 'attractor5'),
        attractor6: gl.getUniformLocation(updatePositionProgram, 'attractor6'),
        attractor7: gl.getUniformLocation(updatePositionProgram, 'attractor7'),
        attractor8: gl.getUniformLocation(updatePositionProgram, 'attractor8'),
        attractor9: gl.getUniformLocation(updatePositionProgram, 'attractor9'),
    };

    drawParticlesProgLocs = {
        position: gl.getAttribLocation(drawParticlesProgram, 'position'),
        matrix: gl.getUniformLocation(drawParticlesProgram, 'matrix'),
    };

    // resize canvas BEFORE creating particles, otherwise the random area size may be incorrect
    resizeCanvasToDisplaySize(gl.canvas);
    const positions = createParticles(gl, numParticles);

    // we need 2 position buffers - one for reading and one for writing, 
    // these will be rotated each frame
    const position1Buffer = makeArrayBuffer(gl, positions, gl.DYNAMIC_DRAW);
    const position2Buffer = makeArrayBuffer(gl, positions, gl.DYNAMIC_DRAW);

    // the same goes goes for vertex arrays and transform feedbacks
    const updatePositionVA1 = makeVertexArray(gl, position1Buffer, updatePositionPrgLocs.oldPosition);
    const updatePositionVA2 = makeVertexArray(gl, position2Buffer, updatePositionPrgLocs.oldPosition);

    const drawVA1 = makeVertexArray(gl, position1Buffer, drawParticlesProgLocs.position);
    const drawVA2 = makeVertexArray(gl, position2Buffer, drawParticlesProgLocs.position);

    const tf1 = makeTransformFeedback(gl, position1Buffer);
    const tf2 = makeTransformFeedback(gl, position2Buffer);

    createStaticAttractorUniforms();

    // Create 2 data structures to switch between
    current = {
        updateVA: updatePositionVA1,  // read from position1
        writeTF: tf2,                 // write to position2
        drawVA: drawVA2,              // draw with position2
    };
    next = {
        updateVA: updatePositionVA2,  // read from position2
        writeTF: tf1,                 // write to position1
        drawVA: drawVA1,              // draw with position1
    };

    // unbind buffers to avoid accidentally modifying those
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);

    render();
}

function render() {
    resizeCanvasToDisplaySize(gl.canvas);

    // disable fragment shader - not used for first compute step
    gl.enable(gl.RASTERIZER_DISCARD);

    gl.useProgram(updatePositionProgram);
    gl.bindVertexArray(current.updateVA);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, current.writeTF);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, numParticles);
    gl.endTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // enable fragment shader again
    gl.disable(gl.RASTERIZER_DISCARD);

    // draw particles - do NOT clear screen and make sure we enable blending
    gl.useProgram(drawParticlesProgram);
    gl.bindVertexArray(current.drawVA);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.uniformMatrix4fv(
        drawParticlesProgLocs.matrix,
        false,
        orthographicProjection(0, gl.canvas.width, 0, gl.canvas.height, -1, 1));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_DST_ALPHA);
    gl.drawArrays(gl.POINTS, 0, numParticles);

    swapReadWriteBuffers();

    if (iterations++ < maxIterations)
        requestAnimationFrame(render);
}

function reset() {
    iterations = 0;

    createStaticAttractorUniforms();
    gl.clear(gl.COLOR_BUFFER_BIT);
    render();
}

function createWebGL2Context() {
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (!gl)
        throw new Error("Cannot create WebGL2 context");

    return gl;
}

function createProgram(gl, vertSource, fragSource, transformFeedbackVaryings) {
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragSource));

    if (transformFeedbackVaryings) {
        gl.transformFeedbackVaryings(
            program,
            transformFeedbackVaryings,
            gl.SEPARATE_ATTRIBS,
        );
    }

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramParameter(program));

    return program;
}

function createShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(shader));

    return shader;
}

function createStaticAttractorUniforms() {
    gl.useProgram(updatePositionProgram);
    const attractorType = Math.floor(Math.random() * 2) + 1;
    gl.uniform1i(updatePositionPrgLocs.attractorType, attractorType);
    createAttractorUniform(updatePositionPrgLocs.attractor1);
    createAttractorUniform(updatePositionPrgLocs.attractor2);
    createAttractorUniform(updatePositionPrgLocs.attractor3);
    createAttractorUniform(updatePositionPrgLocs.attractor4);
    createAttractorUniform(updatePositionPrgLocs.attractor5);
    createAttractorUniform(updatePositionPrgLocs.attractor6);
    createAttractorUniform(updatePositionPrgLocs.attractor7);
    createAttractorUniform(updatePositionPrgLocs.attractor8);
    createAttractorUniform(updatePositionPrgLocs.attractor9);
}

function createAttractorUniform(attractorLocation) {
    // randomly disable some attractors
    const force = Math.random() * (Math.random() < 0.2 ? 0.0 : maxAttractorForce);
    gl.uniform4f(attractorLocation, Math.random() * gl.canvas.width, Math.random() * gl.canvas.height, force, 0);
}

// 4-by-4 orthographic projection matrix
function orthographicProjection(left, right, bottom, top, near, far) {
    const dst = new Float32Array(16);

    dst[0] = 2 / (right - left);
    dst[1] = 0;
    dst[2] = 0;
    dst[3] = 0;
    dst[4] = 0;
    dst[5] = 2 / (top - bottom);
    dst[6] = 0;
    dst[7] = 0;
    dst[8] = 0;
    dst[9] = 0;
    dst[10] = 2 / (near - far);
    dst[11] = 0;
    dst[12] = (left + right) / (left - right);
    dst[13] = (bottom + top) / (bottom - top);
    dst[14] = (near + far) / (near - far);
    dst[15] = 1;

    return dst;
}

function resizeCanvasToDisplaySize(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }

    return false;
}

function createParticles(gl, count) {
    // Randomize initial particle positions, spread out over the entire canvas
    // Note: particles use 4 floats, 2 for x/y and 2 for extra data passed around in shaders
    const points = new Array(count * 4);
    for (let index = 0; index < points.length; index = index + 4) {
        points[index] = Math.random() * gl.canvas.width;
        points[index + 1] = Math.random() * gl.canvas.height;
        points[index + 2] = 0.0;
        points[index + 3] = 0.0;
    }

    return new Float32Array(points);
}

function makeArrayBuffer(gl, data, usage) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);

    return buffer;
}

// we only support one kind of pointer layout here
function makeVertexArray(gl, buffer, attribLocation) {
    const va = gl.createVertexArray();
    gl.bindVertexArray(va);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(attribLocation);
    gl.vertexAttribPointer(
        attribLocation, // attribute location
        4,              // number of elements
        gl.FLOAT,       // type of data
        false,          // normalize
        0,              // stride (0 = auto)
        0,              // offset
    );

    return va;
}

function makeTransformFeedback(gl, buffer) {
    const tf = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);

    return tf;
}

function swapReadWriteBuffers() {
    const temp = current;
    current = next;
    next = temp;
}