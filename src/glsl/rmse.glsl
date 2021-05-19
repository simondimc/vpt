// #package glsl/shaders

// #section rmse/vertex

#version 300 es
precision mediump float;

layout(location = 0) in vec2 aPosition;
out vec2 vFragmentPosition;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vFragmentPosition = (aPosition + vec2(1.0, 1.0)) * 0.5;
}

// #section rmse/fragment

#version 300 es
precision mediump float;

uniform mediump sampler3D uTexture;

in vec2 vFragmentPosition;
out vec4 color;

void main() {
    int images = 10;
    float avg = 0.0;
    float gray[10];

    for (int i = 0; i < images; i++) {
        vec4 pixel = texture(uTexture, vec3(vFragmentPosition, float(i) / float(images)) * 2.0);
        gray[i] = pixel.r;
        avg += pixel.r;
    }

    avg /= float(images);

    float rmse = 0.0;

    for (int i = 0; i < images; i++) {
        rmse += pow(gray[i] - avg, 2.0);
    }

    rmse = sqrt(rmse / float(images));

    color = vec4(rmse, rmse, rmse, 1.0);
}
