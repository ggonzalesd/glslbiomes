#version 300 es

precision highp float;

struct DirLight{
	vec3 direction;
	vec3 ambient;
	vec3 diffuse;
	vec3 specular;
};

struct SpotLight{
	bool enable;

	vec3 position;
	vec3 direction;
	float cutOff;
	float outerCutOff;

	vec3 ambient;
	vec3 diffuse;
	vec3 specular;

	float constant;
	float linear;
	float quadratic;
};

struct PointLight{
	vec3 position;
	vec3 ambient;
	vec3 diffuse;
	vec3 specular;

	float constant;
	float linear;
	float quadratic;
};

in vec4 v_position;
in vec3 v_normal;
in vec2 v_texcoord;
in vec4 v_color;

out vec4 color;

// Material
uniform float shininess;
uniform vec3 diffuse;
uniform sampler2D diffuseMap;
uniform sampler2D secondMap;
uniform sampler2D specularMap;
uniform sampler2D secondspecMap;
uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform float opacity;
uniform float second;
uniform float second_b;

uniform vec3 u_viewPosition; // POV

#define NUM_POINT_LIGHT 4
#define NUM_SPOT_LIGHT 3

uniform DirLight u_dirLight;
uniform PointLight u_pointLight;
uniform SpotLight u_spotLight;

vec3 getDiffise(vec2 texcoord){
	if(second > v_position.y){
		return texture(secondMap, texcoord).rgb*second_b;
	}else{
		return texture(diffuseMap, texcoord).rgb;
	}
}

vec3 getSpecular(vec2 texcoord){
	if(second > v_position.y){
		return texture(secondspecMap, texcoord).rgb;
	}else{
		return texture(specularMap, texcoord).rgb;
	}
}

vec3 calcDirLight(DirLight light, vec3 normal, vec3 viewDir){
	vec3 lightDir = normalize(-light.direction);
	float diff = max(dot(normal, lightDir), 0.0);

	vec3 reflectDir = reflect(-lightDir, normal);
	float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);

	vec3 ambient = light.ambient * getDiffise(v_texcoord);
	vec3 diffuse = light.diffuse * diff * getDiffise(v_texcoord);
	vec3 specular = light.specular * spec * getSpecular(v_texcoord);

	return ambient + diffuse + specular;
}

vec3 calcPointLight(PointLight light, vec3 normal, vec3 viewDir){
	vec3 lightDir = normalize(light.position - v_position.xyz);
	float diff = max(dot(normal, lightDir), 0.0);
	
	vec3 reflectDir = reflect(-lightDir, normal);
	float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);

	float distance_ = length(light.position - v_position.xyz);
	float attenuation = 1.0 / (light.constant + light.linear*distance_ + light.quadratic*(distance_*distance_));

	vec3 ambient = light.ambient * getDiffise(v_texcoord);
	vec3 diffuse = light.diffuse * diff * getDiffise(v_texcoord);
	vec3 specular = light.specular * spec * getSpecular(v_texcoord);

	return (ambient + diffuse + specular) * attenuation;
}

vec3 calcSpotLight(SpotLight light, vec3 normal, vec3 viewDir){
	vec3 lightDir = normalize(light.position - v_position.xyz);
	float diff = max(dot(normal, lightDir), .0);

	vec3 reflectDir = reflect(-lightDir, normal);
	float spec = pow(max(dot(viewDir, reflectDir), .0), shininess);
	float distance_ = length(light.position - v_position.xyz);
	float attenuation = 1.0 / (light.constant + light.linear*distance_ + light.quadratic*(distance_*distance_));

	float theta = dot(lightDir, normalize(-light.direction));
	float epsilon = light.cutOff - light.outerCutOff;
	float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);

	vec3 ambient = light.ambient * getDiffise(v_texcoord);
	vec3 diffuse = light.diffuse * diff * getDiffise(v_texcoord);
	vec3 specular = light.specular * spec * getSpecular(v_texcoord);

	ambient *= attenuation*intensity;
	diffuse *= attenuation*intensity;
	specular *= attenuation*intensity;

	return ambient + diffuse + specular;
}

void main() {
	vec3 viewDir = normalize(u_viewPosition.xyz - v_position.xyz);
	vec3 norm = normalize(v_normal);
	vec3 result = vec3(0.);

	result += calcDirLight(u_dirLight, norm, viewDir);
	
	result += calcPointLight(u_pointLight, norm, viewDir);
	/*for(int i=0; i < NUM_POINT_LIGHT; i++){
		result += calcPointLight(u_pointLight[i], norm, viewDir);
	}*/

	if(u_spotLight.enable)
		result += calcSpotLight(u_spotLight, norm, viewDir);

	/*for(int i=0; i < NUM_SPOT_LIGHT; i++){
		result += calcSpotLight(u_spotLight[i], norm, viewDir);
	}*/

	color = vec4(result * diffuse * ambient, opacity);
}
