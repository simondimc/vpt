// #package glsl/shaders

// #section grayscale/vertex

#version 300 es
precision mediump float;

layout(location = 0) in vec2 aPosition;
out vec2 vFragmentPosition;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vFragmentPosition = (aPosition + vec2(1.0, 1.0)) * 0.5;
}

// #section grayscale/fragment

#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vFragmentPosition;
out vec4 color;

void main() {
    vec4 pixel = texture(uTexture, vFragmentPosition * 2.0);

    float r = pixel.r;
    float g = pixel.g;
    float b = pixel.b;
    float a = pixel.a;

    float rb = 1.0;
    float gb = 1.0;
    float bb = 1.0;

    float r2 = (1.0 - a) * rb + a * r;
    float g2 = (1.0 - a) * gb + a * g;
    float b2 = (1.0 - a) * bb + a * b;

    float gs = (r2 + g2 + b2) / 3.0;

    color = vec4(gs, gs, gs, 1.0);
}
