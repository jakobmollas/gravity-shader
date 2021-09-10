export const updatePositionVS =
    `#version 300 es
    in vec4 oldPosition;

    // This could be simplified using a (fixed) vec4 array instead
    uniform int attractorType;
    uniform vec4 attractor1;
    uniform vec4 attractor2;
    uniform vec4 attractor3;
    uniform vec4 attractor4;
    uniform vec4 attractor5;
    uniform vec4 attractor6;
    uniform vec4 attractor7;
    uniform vec4 attractor8;
    uniform vec4 attractor9;

    out vec4 newPosition;

    vec2 calculateForce(vec4 attractor, vec2 position) {
        vec2 pull = attractor.xy - position.xy;
        float squareDistance = pull.x * pull.x + pull.y * pull.y;
        vec2 force = pull * attractor.z / squareDistance;
        return force;
    }

    void main() {
        vec2 op = oldPosition.xy;
        vec2 np = oldPosition.xy;
        
        bool one = attractorType == 1;
        np = np + calculateForce(attractor1, op);
        np = np + calculateForce(attractor2, one ? np : op);
        np = np + calculateForce(attractor3, one ? np : op);
        np = np + calculateForce(attractor4, one ? np : op);
        np = np + calculateForce(attractor5, one ? np : op);
        np = np + calculateForce(attractor6, one ? np : op);
        np = np + calculateForce(attractor7, one ? np : op);
        np = np + calculateForce(attractor8, one ? np : op);
        np = np + calculateForce(attractor9, one ? np : op);
        
        //float speed = abs(length(np - op));
        newPosition = vec4(np, 0.0, 0.0);
    }`;

export const updatePositionFS =
    `#version 300 es
    precision highp float;

    void main() { }`;

export const drawParticlesVS =
    `#version 300 es
    
    in vec4 position;
    uniform mat4 matrix;
    out vec4 positionData;

    void main() {
        gl_PointSize = 1.0;
        gl_Position = matrix * vec4(position.xy, 1.0, 1.0);
        positionData = position;
    }`;

export const drawParticlesFS =
    `#version 300 es
    precision highp float;

    in vec4 positionData;
    uniform float r;
    uniform float g;
    uniform float b;
    out vec4 outColor;

    void main() {
        outColor = vec4(1.0, 0.8, 0.8, 0.01);
        //outColor = vec4(0.0, 0., 0., 0.5);
    }`;