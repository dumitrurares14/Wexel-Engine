
struct Uniforms {
  modelViewProjectionMatrix : mat4x4f,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;


struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragUV : vec2f,
  @location(1) fragPosition: vec4f,
}

@vertex
fn vertexMain(
  @location(0) position : vec4f,
  @location(1) uv : vec2f
) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix * position;
  output.fragUV = uv;
  output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
  return output;
}

//3d texture
@binding(1) @group(0) var texture : texture_3d<f32>;
@binding(2) @group(0) var sampler0 : sampler;

// Define the slab function
fn slab(
    p0: vec3<f32>,
    p1: vec3<f32>,
    rayOrigin: vec3<f32>,
    invRaydir: vec3<f32>,
    outTMin: ptr<function, f32>,
    outTMax: ptr<function, f32>
) -> bool {
    let t0 = (p0 - rayOrigin) * invRaydir;
    let t1 = (p1 - rayOrigin) * invRaydir;
    
    let tmin = min(t0, t1);
    let tmax = max(t0, t1);
    
    let maxtmin = max(max(tmin.x, tmin.y), tmin.z);
    let mintmax = min(min(tmax.x, tmax.y), tmax.z);
    
    // Write to output pointers
    *outTMin = maxtmin;
    *outTMax = mintmax;
    
    // Return the boolean result
    return maxtmin <= mintmax;
}

@fragment
fn fragmentMain(
  @location(0) fragUV: vec2f,
  @location(1) fragPosition: vec4f
) -> @location(0) vec4f 
{

  //let color = textureSample(texture, sampler0, vec3( fragUV.x, fragUV.y, 0.7));

  return fragPosition;
}