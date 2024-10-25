
const PI: f32 = 3.14159265359;

fn saturate(value: f32) -> f32 
{
    return clamp(value, 0.0, 1.0);
}

fn dot_Saturate(a: vec3<f32>, b: vec3<f32>) -> f32 
{
    return saturate(dot(a, b));
}


fn fresnel_Schlick(cos_theta: f32, F0: vec3<f32>) -> vec3<f32> 
{
    return F0 + (vec3<f32>(1.0) - F0) * pow(1.0 - cos_theta, 5.0);
}

fn ndf_GGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32
 {
    let a = roughness * roughness;
    let NdotH = dot_Saturate(N, H);
    let denom = (NdotH * NdotH) * (a * a - 1.0) + 1.0;
    return (a * a) / (PI * denom * denom);
}


fn geometry_Schlick_GGX(NdotV: f32, roughness: f32) -> f32 
{
    let r = roughness + 1.0;
    let k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}

fn geometry_Smith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 
{
    let NdotV = dot_Saturate(N, V);
    let NdotL = dot_Saturate(N, L);
    let ggx1 = geometry_Schlick_GGX(NdotV, roughness);
    let ggx2 = geometry_Schlick_GGX(NdotL, roughness);
    return ggx1 * ggx2;
}


fn cook_Torrance_BRDF(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, albedo: vec3<f32>, metallic: f32, roughness: f32) -> vec3<f32> 
{
    
    let H = normalize(V + L);

    let NdotL = dot_Saturate(N, L);
    let NdotV = dot_Saturate(N, V);
    let NdotH = dot_Saturate(N, H);
    let VdotH = dot_Saturate(V, H);


    let F0 = mix(vec3<f32>(0.04), albedo, metallic);
    let F = fresnel_Schlick(VdotH, F0);


    let D = ndf_GGX(N, H, roughness);


    let G = geometry_Smith(N, V, L, roughness);


    let num = D * G * F;
    let denom = 4.0 * NdotV * NdotL + 0.0001; 
    let specular = num / denom;

   
    let kD = (vec3<f32>(1.0) - F) * (1.0 - metallic);

    let diffuse = kD * albedo / PI;

    return (diffuse + specular) * NdotL;
}