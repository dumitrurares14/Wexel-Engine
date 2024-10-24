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
  tMax: f32,
  intersects: bool
}

struct TraverseVoxelReturn
{
  hit: bool,
  normal: vec3<f32>,
  outMinT: f32,
  voxelLocationInGrid: vec3<f32>
}

fn traverse_voxel(
  ro: vec3<f32>,
  rd_in: vec3<f32>,
  maximumDistance: f32
) -> TraverseVoxelReturn
{

 // var test = vec3<f32>(0.0,0.0,0.0);
  var result = TraverseVoxelReturn(false,vec3<f32>(0.0,0.0,0.0),0.0,vec3<f32>(0.0,0.0,0.0));
  var rd = normalize(rd_in);
  
  var tDelta = abs(1.0 /rd);
  var tMax = tDelta - fract(ro * clamp( sign(rd),vec3<f32>(-1,-1,-1),vec3<f32>(1,1,1))) * tDelta;
  var steps = vec3<i32>(sign(rd));
  var pos = vec3<f32>(floor(ro));

  for(var i: i32 = 0;i<128;i++)
  {
    if (pos.x < -1 || pos.x > 129 || pos.y < -1 || pos.y > 129 || pos.z < -1 || pos.z > 129)
        {
          result.hit = false;
          return result;
        }

        if (tMax.x < tMax.y && tMax.x < tMax.z)
        {
            pos.x += f32(steps.x);
            tMax.x += tDelta.x;
            result.normal = vec3<f32>( f32(-steps.x), 0.0, 0.0);
        }
        else if (tMax.y < tMax.z)
        {
            pos.y += f32(steps.y);
            tMax.y += tDelta.y;
            result.normal = vec3<f32>(0.0, f32(-steps.y), 0.0);
        }
        else
        {
            pos.z += f32(steps.z);
            tMax.z += tDelta.z;
            result.normal = vec3<f32>(0.0, 0.0, f32(-steps.z));
        }

        var res = textureLoad(texture, vec3<i32>(pos),0).w;
        if (res > 0.75)
        {
          result.hit = true;
          let slabReturn = slab(pos,pos+1.0,ro,1.0/rd);
          result.outMinT = slabReturn.tMin;
          result.voxelLocationInGrid = pos;
          return result;
        }
  }

  
  return result;
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
    
     let intersects = maxtmin < mintmax && mintmax > 0.0;
    let slabReturn = SlabReturn(maxtmin, mintmax,intersects);
     if(intersects){
         return slabReturn;
     }else{
          return SlabReturn(0.0, 0.0,intersects);
     }
    
    
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
  let testCamPos = modelCamPos+0.5;
let slabReturn = slab(vec3<f32>(0.0),vec3<f32>(1.0), testCamPos,invModelRayDirection);
//let slabReturn = debugSlab(vec3(0.0),vec3(1.0), testCamPos+0.5,invModelRayDirection);

var tMin = slabReturn.tMin;
var tMax = slabReturn.tMax;
var intersects = slabReturn.intersects;
if(!intersects)
{
  discard;
}


  //let rayPosOnMeshSurface = modelCamPos + modelRayDirection
   
//* max(mint - (mint / 100.0), 0);
  let rayPosOnMeshSurface = modelCamPos+0.5+ modelRayDirection * max(tMin - 1.0/300.0,0);
  var distanceToVoxelSurface = 0.0;

var traverseVoxelReturn = traverse_voxel(rayPosOnMeshSurface*128.0, modelRayDirection, 128.0);
let norm = normalize(traverseVoxelReturn.normal);
distanceToVoxelSurface = traverseVoxelReturn.outMinT;
let worldHitLocation = uniforms.cameraPos + worldRayDirection * (traverseVoxelReturn.outMinT + max(tMin,0.0));
//let impactPoint = ((modelCamPos + 0.5 + modelRayDirection * (traverseVoxelReturn.outMinT + max(tMin, 0)))) * 128 + (norm * 0.0001);
//let impactPointws = uniforms.cameraPos + worldRayDirection * (traverseVoxelReturn.outMinT + max(tMin,0.0));

//let impactPoint = ((uniforms.cameraPos +worldRayDirection* (distanceToVoxelSurface + max(tMin,0.0))));

let newSlabReturn = slab((traverseVoxelReturn.voxelLocationInGrid/128.0) - 0.5,((traverseVoxelReturn.voxelLocationInGrid / 128.0) - 0.5) + 1 / 128.0, modelCamPos,
         1 / modelRayDirection);

let impactPoint = ((modelCamPos + 0.5 + modelRayDirection * (newSlabReturn.tMin))) * 128.0 + (norm * 0.0001);

let lightD = vec3<f32>(0.3,0.1,-0.2);

var diffuse = max(dot(norm,lightD),0.0);
var diffuseu = diffuse * vec3<f32>(1.0,1.0,1.0);

if(!traverseVoxelReturn.hit)
{
  discard;
}
  //let color = textureSample(texture, sampler0, vec3( fragUV.x, fragUV.y, 0.3));
  //let vec4Test = vec4<f32>(pixelRayDirection.x, pixelRayDirection.y, pixelRayDirection.z, 1.0);

  //let vec4Test = vec4<f32>(modelCamPos.x,modelCamPos.y,modelCamPos.z, 1.0);
  //let invModelRayDirection = 1.0 / modelRayDirection;
  //let vec4Test = vec4<f32>(rayPosOnMeshSurface.xyz, 1.0);
  //let vec4Test = vec4<f32>(tMin,tMin,tMin, 1.0);


  let traverseShadow = traverse_voxel((impactPoint)  , lightD, 128.0);
  var shadow = 1.0;
  if(traverseShadow.hit)
  {
    shadow = 0.0;
  }

  let vec4Test = vec4<f32>(diffuseu * shadow  ,1.0);
  return vec4<f32>(vec4Test);


  //return vec4Test;
}