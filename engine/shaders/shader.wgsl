
struct Uniforms {
  modelViewProjectionMatrix : mat4x4f,
   viewMatrix : mat4x4f,
   modelMatrix: mat4x4f,
  screenX : f32,
  screenY : f32,
  dummy: f32,
  cameraPos : vec3<f32>
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

fn rayDirection(fieldOfView: f32, size: vec2<f32>, fragCoord: vec2<f32>) -> vec3<f32> {
    let xy = fragCoord - size / 2.0;
    let z = (size.y / 2.0) / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3<f32>(xy, -z));
}


@fragment
fn fragmentMain(
  @location(0) fragUV: vec2f,
  @location(1) fragPosition: vec4f,
  @builtin(position) fragCoord: vec4<f32>
) -> @location(0) vec4f 
{

  let pixelRayDirection = rayDirection(60.0, vec2<f32>(uniforms.screenX, uniforms.screenY), fragCoord.xy);
  let worldRayDirection = normalize(uniforms.viewMatrix * vec4<f32>(pixelRayDirection, 0.0)).xyz;
  let modelRayDirection = (uniforms.modelMatrix * vec4<f32>(worldRayDirection, 0.0)).xyz;

  let modelCamPos = (uniforms.modelMatrix * vec4<f32>(uniforms.cameraPos, 1.0)).xyz;
 // Output variables
    var tMin: f32;
    var tMax: f32;

    // Call the slab function
    let hit: bool = slab(vec3<f32>(0,0,0),vec3<f32>(1,1,1), modelCamPos+0.5, 1.0/modelRayDirection, &tMin, &tMax);

  let rayPosOnMeshSurface = modelCamPos+ 0.5 + modelRayDirection * max(tMin-1.0/300,0.0);

  let color = textureSample(texture, sampler0, vec3( fragUV.x, fragUV.y, 0.3));
  //let vec4Test = vec4<f32>(pixelRayDirection.x, pixelRayDirection.y, pixelRayDirection.z, 1.0);
  
  let vec4Test = vec4<f32>(rayPosOnMeshSurface.x, rayPosOnMeshSurface.y, rayPosOnMeshSurface.z, 1.0);
  return vec4Test;
}