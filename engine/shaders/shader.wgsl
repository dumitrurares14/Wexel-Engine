
struct Uniforms {
  modelViewProjectionMatrix : mat4x4f,
   viewMatrix : mat4x4f,
   modelMatrix: mat4x4f,
  screenX : f32,
  screenY : f32,
  time: f32,
   dummy2: f32,
  cameraPos : vec3<f32>,
  dummy3: f32,
  lightDirection : vec3<f32>,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;


fn hash12(p: vec2<f32>)->f32
{
    var p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn hash13(p3: vec3<f32>) -> f32
{
    var p3New = fract(p3 * .1031);
    p3New += dot(p3New, p3New.zyx + 31.32);
    return fract((p3New.x + p3New.y) * p3New.z);
}


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


struct Material {
  color: vec4<f32>,
  metallic: f32,
  roughness: f32,
  padding: array<f32, 2>,
};

struct MaterialBuffer {
  materials: array<Material>,
};

@binding(3) @group(0)
var<storage, read> materialBuffer: MaterialBuffer;


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
  matIndex:i32,
  voxelLocationInGrid: vec3<f32>
}

fn traverse_voxel(
  ro: vec3<f32>,
  rd_in: vec3<f32>,
  maximumDistance: f32
) -> TraverseVoxelReturn
{

 // var test = vec3<f32>(0.0,0.0,0.0);
  var result = TraverseVoxelReturn(false,vec3<f32>(0.0,0.0,0.0),0.0,0,vec3<f32>(0.0,0.0,0.0));
  var rd = normalize(rd_in);
  
  var tDelta = abs(1.0 /rd);
  var tMax = tDelta - fract(ro * clamp( sign(rd),vec3<f32>(-1,-1,-1),vec3<f32>(1,1,1))) * tDelta;
  var steps = vec3<i32>(sign(rd));
  var pos = vec3<f32>(floor(ro));

  for(var i: i32 = 0;i<i32(maximumDistance);i++)
  {
    if (pos.x < -1 || pos.x > maximumDistance+1 || pos.y < -1 || pos.y > maximumDistance+1 || pos.z < -1 || pos.z > maximumDistance+1)
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

        var res = textureLoad(texture, vec3<i32>(pos),0);
        var mat = res.r;
        if (res.w > 0.75)
        {
          result.hit = true;
          let slabReturn = slab(pos,pos+1.0,ro,1.0/rd);
          result.outMinT = slabReturn.tMin;
          result.matIndex = i32(mat);
          result.voxelLocationInGrid = pos;
          if(slabReturn.tMin > maximumDistance * 128.0) 
          {
            result.hit = false;
          }
          return result;
        }
  }

  
  return result;
}



fn noise(x: vec3<f32>) -> f32
{
    var p = floor(x);
    var f = fract(x);
	  f = f*f*(3.0-2.0*f);
    var pos = p + f;
    
    //var density = textureLoad(texture, vec3<i32>(currentPos),0).w;

    var result =  textureLoad(texture,vec3<i32>((pos+0.5)/32.0),0).w * 2.0-1.0;
    return result;
}

fn map(p: vec3<f32>, oct: i32) -> f32 {
    // Adjust position by time
    var q = p - vec3<f32>(0.0, 0.1, 1.0) * 124.0; // should be * time
    
    // g factor based on noise
    let g = 0.5 + 0.5 * noise(q * 0.3);

    // Accumulate noise at different scales
    var f = 0.5 * noise(q);
    q = q * 2.02;

    if (oct >= 2) {
        f = f + 0.25 * noise(q);
    }
    q = q * 2.23;

    if (oct >= 3) {
        f = f + 0.125 * noise(q);
    }
    q = q * 2.41;

    if (oct >= 4) {
        f = f + 0.0625 * noise(q);
    }
    q = q * 2.62;

    if (oct >= 5) {
        f = f + 0.03125 * noise(q);
    }

    // Equivalent of mix( f*0.1 - 0.5, f, g*g )
    // mix(a, b, t) = a*(1-t) + b*t
    let t = g * g;
    let lowVal = f * 0.1 - 0.5;
    f = lowVal * (1.0 - t) + f * t;

    // Final return
    return 1.5 * f - 0.5 - p.y;
}

fn RayMarchCloud(
    rayOrigin: vec3<f32>,
    rayDirection: vec3<f32>,
    stepCount: u32,
    stepSize: f32,
    lightDirection: vec3<f32>
) -> vec4<f32> {
    // Accumulated color and alpha
    var accumColor = vec3<f32>(0.0, 0.0, 0.0);
    var accumAlpha = 0.0;

    // Current ray position
    var currentPos = rayOrigin;

    // Ensure the direction is normalized
    let dir = normalize(rayDirection);
    let lightDir = normalize(lightDirection);

     for (var i = 0u; i < stepCount; i = i + 1u) {
      // Sample the texture
       var density = textureLoad(texture, vec3<i32>(currentPos),0).w;
       if density > 0.8 {
        density = 0.0;
       }
      // Basic alpha accumulation (compositing)
        let alpha = density * stepSize;
         // ===== Directional Lighting Approximation =====
        // We use a simple forward-scattering phase function
        // that depends on the dot between the view ray and the light direction.

        let dotPrd = max(dot(dir, lightDir),0.0);
        let phaseTerm = 0.5 + 0.5 * pow(dotPrd, 8.0);

        // White base color modulated by the phase term
        var color = vec3<f32>(1.0, 1.0, 1.0) * phaseTerm;
      //float dif = clamp((den - map(pos+0.3*sundir,oct))/0.25, 0.0, 1.0 );
       //vec3  lin = vec3(0.65,0.65,0.75)*1.1 + 0.8*vec3(1.0,0.6,0.3)*dif;
           //vec4  col = vec4( mix( vec3(1.0,0.93,0.84), vec3(0.25,0.3,0.4), den ), den );
      var dif = clamp((density - map(currentPos + 0.3 * lightDir,5))/0.25, 0.0, 1.0);
      var lin = vec3<f32>(0.65,0.65,0.75)*1.1 + 0.8*vec3<f32>(1.0,0.6,0.3)*dif;
      var col = vec4<f32>(mix(vec3<f32>(1.0,0.93,0.84), vec3<f32>(0.25,0.3,0.4), density), density);

      color = col.xyz;
      //hcolor *=lin;

      //float sun = clamp( dot(sundir,rd), 0.0, 1.0 );    
    //vec3 col = vec3(0.6,0.71,0.75) - rd.y*0.2*vec3(1.0,0.5,1.0) + 0.15*0.5;    
    //col += 0.2*vec3(1.0,.6,0.1)*pow( sun, 8.0 );    
    var sun = clamp(dot(lightDir,dir),0.0,1.0);
    var bgColor = vec3<f32>(0.7,0.71,0.75) - dir.y*0.2*vec3<f32>(1.0,0.5,1.0) + 0.15*0.5;
    bgColor += 0.6*vec3<f32>(1.0,0.6,0.1)*pow(sun,8.0);
      color = mix(color,bgColor,1.0-exp2(-0.1*f32(i)));
        // Blend color and alpha (premultiplied alpha)
        accumColor = accumColor + (1.0 - accumAlpha) * color.xyz * alpha;
        accumAlpha = accumAlpha + (1.0 - accumAlpha) * alpha;

        // Move the sample along the ray
        currentPos = currentPos + dir * stepSize;

        // Early-out if fully opaque
        if (accumAlpha >= 0.99) {
            break;
        }
     }

    return vec4<f32>(accumColor.xyz, accumAlpha);
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
//return vec4<f32>(1.0,1.0,1.0,0.25);
  var pixelRayDirection = rayDirection(90.0, vec2<f32>(uniforms.screenX, uniforms.screenY), fragCoord.xy);
  pixelRayDirection.y = -pixelRayDirection.y;
  
  let worldRayDirection = normalize(uniforms.viewMatrix * vec4<f32>(pixelRayDirection, 0.0)).xyz;
  let modelRayDirection = (uniforms.modelMatrix * vec4<f32>(worldRayDirection, 0.0)).xyz;
  let modelCamPos = (uniforms.modelMatrix * vec4<f32>(uniforms.cameraPos, 1.0)).xyz;

  let invModelRayDirection = 1.0 / modelRayDirection;
  let testCamPos = modelCamPos+0.5;
  let slabReturn = slab(vec3<f32>(0.0),vec3<f32>(1.0), testCamPos,invModelRayDirection);

  let tMin = slabReturn.tMin;
  let tMax = slabReturn.tMax;
  // if(!slabReturn.intersects)
  // {
  //   discard;
  // }
let lightD = normalize(-uniforms.lightDirection);
let rayPosOnMeshSurface = modelCamPos+0.5+ modelRayDirection * max(tMin - 1.0/300.0,0);
var finalColor =  RayMarchCloud(rayPosOnMeshSurface*128.0, modelRayDirection, 128,1.0,lightD);
finalColor.w *= 0.5;
return finalColor;
//return vec4<f32>(1.0,1.0,1.0,0.25);


  

}