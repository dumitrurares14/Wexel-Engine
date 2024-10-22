struct Uniforms {
  modelViewProjectionMatrix : mat4x4f,
   viewMatrix : mat4x4f,
   modelMatrix: mat4x4f,
  screenX : f32,
  screenY : f32,
  dummy: f32,
   dummy2: f32,
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

struct SlabReturn {
  tMin: f32,
  tMax: f32
}
// Define the slab function
fn slab(
    p0: vec3<f32>,
    p1: vec3<f32>,
    rayOrigin: vec3<f32>,
    invRaydir: vec3<f32>
) -> SlabReturn {
    let t0 = (p0 - rayOrigin) * invRaydir;
    let t1 = (p1 - rayOrigin) * invRaydir;
    
     let tmin = vec3<f32>(
        min(t0.x, t1.x),
        min(t0.y, t1.y),
        min(t0.z, t1.z)
    );

    let tmax = vec3<f32>(
        max(t0.x, t1.x),
        max(t0.y, t1.y),
        max(t0.z, t1.z)
    );
    
    let maxtmin = max(max(tmin.x, tmin.y), tmin.z);
    let mintmax = min(min(tmax.x, tmax.y), tmax.z);
    
    let slabReturn = SlabReturn(maxtmin, mintmax);
     let intersects = maxtmin < mintmax && mintmax > 0.0;
     if(intersects){
         return slabReturn;
     }else{
          return SlabReturn(0.0, 0.0);
     }
    
    
}

fn debugSlab(
    p0: vec3<f32>,
    p1: vec3<f32>,
    rayOrigin: vec3<f32>,
    invRaydir: vec3<f32>
) -> vec3<f32> {
    let t0 = (p0 - rayOrigin) * invRaydir;
    let t1 = (p1 - rayOrigin) * invRaydir;
    
     let tmin = vec3<f32>(
        min(t0.x, t1.x),
        min(t0.y, t1.y),
        min(t0.z, t1.z)
    );

    let tmax = vec3<f32>(
        max(t0.x, t1.x),
        max(t0.y, t1.y),
        max(t0.z, t1.z)
    );
    
    let maxtmin = max(max(tmin.x, tmin.y), tmin.z);
    let mintmax = min(min(tmax.x, tmax.y), tmax.z);
    
    let slabReturn = SlabReturn(maxtmin, mintmax);
    
    return t0;
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

  var pixelRayDirection = rayDirection(90.0, vec2<f32>(uniforms.screenX, uniforms.screenY), fragCoord.xy);
  pixelRayDirection.y = -pixelRayDirection.y;
  //pixelRayDirection.y = pixelRayDirection.y * -1.0 + uniforms.screenY;

  let worldRayDirection = normalize(uniforms.viewMatrix * vec4<f32>(pixelRayDirection, 0.0)).xyz;
  let modelRayDirection = (uniforms.modelMatrix * vec4<f32>(worldRayDirection, 0.0)).xyz;
  let modelCamPos = (uniforms.modelMatrix * vec4<f32>(uniforms.cameraPos, 1.0)).xyz;

  let invModelRayDirection = 1.0 / modelRayDirection;
  let testCamPos = modelCamPos;
let slabReturn = slab(vec3<f32>(-1.0),vec3<f32>(1.0), testCamPos,invModelRayDirection);
//let slabReturn = debugSlab(vec3(0.0),vec3(1.0), testCamPos+0.5,invModelRayDirection);

var tMin = slabReturn.tMin;
var tMax = slabReturn.tMax;

  //let rayPosOnMeshSurface = modelCamPos + modelRayDirection
   
//* max(mint - (mint / 100.0), 0);
  //let rayPosOnMeshSurface = modelCamPos +0.5+ modelRayDirection * max(tMin - (tMin / 100.0), 0);

  //let color = textureSample(texture, sampler0, vec3( fragUV.x, fragUV.y, 0.3));
  //let vec4Test = vec4<f32>(pixelRayDirection.x, pixelRayDirection.y, pixelRayDirection.z, 1.0);

  //let vec4Test = vec4<f32>(modelCamPos.x,modelCamPos.y,modelCamPos.z, 1.0);
  //let invModelRayDirection = 1.0 / modelRayDirection;
  //let vec4Test = vec4<f32>(slabReturn.xyz, 1.0);
  let vec4Test = vec4<f32>(tMin,tMin,tMin, 1.0);

  return vec4Test;
}