#version 120

#extension GL_ARB_draw_buffers : enable

// Hmm, do we really need to give the path to the shader if it's in the same folder?
#pragma include "Shaders/Common/ShaderHelpers.glslinc"
#pragma include "Shaders/Common/SimplexNoiseDerivatives4D.glslinc"

uniform sampler2D positionAndAgeTex;
//uniform sampler2D velocityTex;

uniform float time;
uniform float timeStep;

uniform float particleMaxAge;

uniform float noisePositionScale = 1.5;
uniform float noiseMagnitude = 0.075;
uniform float noiseTimeScale = 1.0 / 4000.0;
uniform float noisePersistence = 0.2;
uniform vec3 baseSpeed = vec3( 0.5, 0.0, 0.0 );

const int OCTAVES = 3;

// -----------------------------------------------------------
void main (void)
{
	vec2 texCoord = gl_TexCoord[0].st;
	
	vec4 posAndAge = texture2D( positionAndAgeTex, texCoord );
	
	vec3 pos = posAndAge.xyz;
	float age = posAndAge.w;
	
	age += timeStep;
	
	if( age > particleMaxAge )
	{
		age = 0.0;
		
		float spawnRadius = 0.1;
		pos = randomPointOnSphere( vec3( rand( texCoord + pos.xy ), rand( texCoord.xy + pos.yz ), rand( texCoord.yx + pos.yz ))) * spawnRadius;
	}
	
	vec3 noisePosition = pos  * noisePositionScale;
	float noiseTime    = time * noiseTimeScale;
	
	vec4 xNoisePotentialDerivatives = vec4(0.0);
	vec4 yNoisePotentialDerivatives = vec4(0.0);
	vec4 zNoisePotentialDerivatives = vec4(0.0);
	
	float tmpPersistence = noisePersistence;
	
	for (int i = 0; i < OCTAVES; ++i)
	{
		float scale = (1.0 / 2.0) * pow(2.0, float(i));
		
		float noiseScale = pow(tmpPersistence, float(i));
		if (tmpPersistence == 0.0 && i == 0) //fix undefined behaviour
		{
			noiseScale = 1.0;
		}
		
		xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(noisePosition * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
		yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((noisePosition + vec3(123.4, 129845.6, -1239.1)) * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
		zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((noisePosition + vec3(-9519.0, 9051.0, -123.0))  * pow(2.0, float(i)), noiseTime)) * noiseScale * scale;
	}
	
	//compute curl
	vec3 noiseVelocity = vec3( zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
							   xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
							   yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1] ) * noiseMagnitude;
	
	vec3 totalVelocity = baseSpeed + noiseVelocity;
	
	vec3 newPos = pos + totalVelocity * timeStep;
	
	pos = newPos;
	
	gl_FragData[0] = vec4( pos, age );
	
	// If we had multiple color buffers in our fbo and they were bound for writing, this would be how we write to them from this shader
	//gl_FragData[1] = vec4( vel, 1.0 );
	//gl_FragData[2] = vec4( particleAge, particleDat.y, particleDat.z, 1.0 );
	
}

