export const vertexShader = `#version 300 es
precision highp float;
out vec2 uv;

void main() {
    vec2 position = vec2(
        gl_VertexID == 1 ? 3.0 : -1.0,
        gl_VertexID == 2 ? 3.0 : -1.0
    );
    uv = position * 0.5 + 0.5;
    uv.y = 1.0 - uv.y;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragmentShader = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D frame;
uniform int mode;
in vec2 uv;
out vec4 color;

vec3 pixel(ivec2 cell) {
    return texelFetch(frame, clamp(cell, ivec2(0), textureSize(frame, 0) - 1), 0).rgb;
}

float difference(vec3 a, vec3 b) {
    return dot(abs(a - b), vec3(0.299, 0.587, 0.114));
}

// Original xBR-style corner smoothing, not the canonical xBR/xBRZ algorithm.
vec3 edgeScaled(vec2 position) {
    ivec2 cell = ivec2(floor(position));
    vec2 local = fract(position) - 0.5;
    ivec2 direction = ivec2(local.x < 0.0 ? -1 : 1, local.y < 0.0 ? -1 : 1);
    vec3 center = pixel(cell);
    vec3 horizontal = pixel(cell + ivec2(direction.x, 0));
    vec3 vertical = pixel(cell + ivec2(0, direction.y));
    vec3 diagonal = pixel(cell + direction);
    float alongEdge = difference(horizontal, vertical);
    float acrossEdge = difference(center, horizontal) + difference(center, vertical);
    if (alongEdge < 0.08 && acrossEdge > 0.2
        && difference(center, diagonal) > 0.1
        && alongEdge < acrossEdge * 0.25) {
        float corner = smoothstep(0.45, 0.85, abs(local.x) + abs(local.y));
        return mix(center, (horizontal + vertical) * 0.5, corner * 0.85);
    }
    return center;
}

vec3 crt(vec2 size) {
    vec2 centered = uv * 2.0 - 1.0;
    vec2 warped = centered * (1.0 + 0.045 * centered.yx * centered.yx);
    vec2 sampleUv = warped * 0.5 + 0.5;
    if (any(lessThan(sampleUv, vec2(0.0))) || any(greaterThan(sampleUv, vec2(1.0)))) {
        return vec3(0.0);
    }
    vec3 signal = texture(frame, sampleUv).rgb;
    float scanline = 0.80 + 0.20 * cos(6.2831853 * (sampleUv.y * size.y - 0.5));
    int stripe = int(mod(gl_FragCoord.x, 3.0));
    vec3 mask = vec3(0.82);
    mask[stripe] = 1.0;
    float vignette = 1.0 - 0.18 * dot(centered, centered);
    return signal * scanline * mask * vignette;
}

void main() {
    vec2 size = vec2(textureSize(frame, 0));
    vec3 rgb;
    if (mode == 1) {
        rgb = edgeScaled(uv * size);
    } else if (mode == 2) {
        rgb = crt(size);
    } else {
        rgb = pixel(ivec2(floor(uv * size)));
    }
    color = vec4(rgb, 1.0);
}
`;
