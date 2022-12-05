"use strict";

import * as cg from "./cg.js";
import * as m4 from "./glmjs/mat4.js"
import * as v3 from "./glmjs/vec3.js";
import * as v4 from "./glmjs/vec4.js";
import * as twgl from "./twgl-full.module.js"
import * as kctrl from "./key-controller.js"

function createTerrain(div, size, color, noiseFunction, noiseNormal, tex_s, tex_o){
	const s = size / div;
	const data = {
		color: color,
		position: ((d)=>{
			const array = [];
			for(let i=0; i<d; i++){
				for(let j=0; j<d; j++){
					noiseFunction((j+1)*s, i*s, d).forEach(x => array.push(x));
					noiseFunction(j*s, i*s, d).forEach(x => array.push(x));
					noiseFunction(j*s, (i+1)*s, d).forEach(x => array.push(x));

					noiseFunction((j+1)*s, (i+1)*s, d).forEach(x => array.push(x));
					noiseFunction((j+1)*s, i*s, d).forEach(x => array.push(x));
					noiseFunction(j*s, (i+1)*s, d).forEach(x => array.push(x));
				}
			}
			return array;
		}
		)(div),
		texcoord: ((d)=>{
			const array = [];
			for(let i=0; i<d; i++){
				for(let j=0; j<d; j++){
					[(j+1)*s*tex_s[0] + tex_o[0], i*s*tex_s[1] + tex_o[1]].forEach(x => array.push(x));
					[j*s*tex_s[0] + tex_o[0], i*s*tex_s[1] + tex_o[1]].forEach(x => array.push(x));
					[j*s*tex_s[0] + tex_o[0], (i+1)*s*tex_s[1] + tex_o[1]].forEach(x => array.push(x));

					[(j+1)*s*tex_s[0] + tex_o[0], (i+1)*s*tex_s[1] + tex_o[1]].forEach(x => array.push(x));
					[(j+1)*s*tex_s[0] + tex_o[0], i*s*tex_s[1] + tex_o[1]].forEach(x => array.push(x));
					[j*s*tex_s[0] + tex_o[0], (i+1)*s*tex_s[1] + tex_o[1]].forEach(x => array.push(x));
				}
			}
			return array;
		}
		)(div),
		normal: ((d)=>{
			const array = [];
			for(let i=0; i<d; i++){
				for(let j=0; j<d; j++){
					noiseNormal((j+1)*s, i*s, d).forEach(x => array.push(x));
					noiseNormal(j*s, i*s, d).forEach(x => array.push(x));
					noiseNormal(j*s, (i+1)*s, d).forEach(x => array.push(x));

					noiseNormal((j+1)*s, (i+1)*s, d).forEach(x => array.push(x));
					noiseNormal((j+1)*s, i*s, d).forEach(x => array.push(x));
					noiseNormal(j*s, (i+1)*s, d).forEach(x => array.push(x));
				}
			}
			return array;
		}
		)(div),
	};

	return data;
}

async function generateChunk(gl, programInfo, material, size, div, position, perlin){
	const perlinp = (j, i, a) => {
		const h1 = perlin(j+a, i, position);
		const h2 = perlin(j, i+a, position);
		const out = v3.create();
		v3.cross(out, [0, 0, a], [a, h1-h2, 0]);
		return out;
	}

	const terrainData = createTerrain(div, size, [1, 1, 1, 1], 
		(j, i, d)=>[j, perlin(j, i, position)*2, i],
		(j, i, d)=>perlinp(j, i, size/div),
		//(j, i, d)=>[0, 1, 0],
		[.2, .2],
		[0, 0]
	);
	const numbers = 1;
	const transforms = new Float32Array(numbers * 16);
	const subarrays = new Array(numbers);
	for (let i = 0; i < numbers; i++) {
		subarrays[i] = {
			transform: transforms.subarray(i * 16, i * 16 + 16),
			rotationSpeed: 0,
		};
		m4.identity(subarrays[i].transform); // identity matrix
		m4.translate(subarrays[i].transform, subarrays[i].transform, position);
	}
	const objGene = cg.generateObj(gl, terrainData, programInfo, material, transforms);
	return {
		instances: numbers,
		programInfo: programInfo,
		transforms: transforms,
		subarrays: subarrays,
		objectGen: objGene
	}
}

function generateTransforms(numInstances, scale, attribs, fposition){
	const transforms = new Float32Array(numInstances * 16);
	const subarrays = new Array(numInstances);
	for (let i = 0; i < numInstances; i++) {
		subarrays[i] = {
			transform: transforms.subarray(i * 16, i * 16 + 16)
		};
		Object.keys(attribs).forEach(x=>{
			subarrays[i][x] = attribs[x];
		});
		m4.identity(subarrays[i].transform);
		if(fposition!==undefined){
			fposition(subarrays[i]);
		}
		m4.scale(subarrays[i].transform, subarrays[i].transform, v3.fromValues(scale, scale, scale));
	}
	return {
		len: numInstances,
		transforms: transforms,
		subarrays: subarrays
	}
}

async function main(){
	
	const dirpower_ranger = document.querySelector("#dirpower_ranger");
	const dirambient_ranger = document.querySelector("#dirambient_ranger");
	const dirspecular_ranger = document.querySelector("#dirspecular_ranger");
	
	const b_volcan = document.querySelector("#b_volcan");
	const b_tundra = document.querySelector("#b_tundra");
	const b_monta = document.querySelector("#b_monta");
	const b_playa = document.querySelector("#b_playa");
	const b_bosque = document.querySelector("#b_bosque");
	noise.seed(Math.random()*100);
	const canvitas = document.querySelector("#canvitas");
	const gl = canvitas.getContext("webgl2");
	if (!gl) return undefined !== console.log("couldn't create webgl2 context");
	canvitas.requestPointerLock = canvitas.requestPointerLock || canvitas.mozRequestPointerLock || canvitas.webkitRequestPointerLock;
	let aspect = 16.0 / 9.0;
	let deltaTime = 0;
	let lastTime = 0;
	const keyc = new kctrl.KeyController();

	twgl.setDefaults({ attribPrefix: "a_" });

	let vertSrc = await cg.fetchText("glsl/zglsl.vert");
	let fragSrc = await cg.fetchText("glsl/zglsl.frag");
	const objPrgInf = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);

	let vertSrcTerr = await cg.fetchText("glsl/zglsl.vert");
	let fragSrcTerr = await cg.fetchText("glsl/terrain.frag");
	const objPrgInfTerr = twgl.createProgramInfo(gl, [vertSrcTerr, fragSrcTerr]);

	const stoneMaterial = await cg.loadMaterialTextures(gl, {
		ambient: [1, 1, 1],
		diffuse: [0.9, 0.85, 0.85],
		diffuseMap: "texture/redstone.jpg",
		secondMap: "texture/lava.jpg",
		emissive: [0, 0, 0],
		illum: 2,
		opacity: 1,
		opticalDensity: 1,
		shininess: 1.0,
		specular: [1.0, 0.8, 0.8],
		second: 3,
		second_b: 20,
		specularMap: "texture/redstone_spec.jpg",
		secondspecMap: "texture/lava_spec.jpg",
	});
	const stonePerlin = (j, i, position) => {
		const n1 = noise.perlin2((j+position[0])*.1, (i+position[2])*.1)*.5 + .5;
		const n2 = noise.perlin2((j+position[0])*.01, (i+position[2])*.01)*.5 + .5;
		const n3 = noise.perlin2((j+position[0])*.5, (i+position[2])*.5)*.5 + .5;
		return (n1*n1*5)-(n2*n2*n2) + n3;
	};

	const praderaMaterial = await cg.loadMaterialTextures(gl, {
		ambient: [1, 1, 1],
		diffuse: [0.9, 0.85, 0.85],
		diffuseMap: "texture/stone.jpg",
		secondMap: "texture/grass2.jpeg",
		emissive: [0, 0, 0],
		illum: 2,
		opacity: 1,
		opticalDensity: 1,
		shininess: 1.0,
		specular: [1.0, 0.8, 0.8],
		second: 1.8,
		second_b: 1,
		specularMap: "texture/stone_spec.jpg",
		secondspecMap: "texture/grass2_spec.jpeg"
	});
	const praderaPerlin = (j, i, position) => {
		const n1 = noise.perlin2((j+position[0])*.2, (i+position[2])*.2)*.5 + .5;
		const n2 = noise.perlin2((j+position[0])*2, (i+position[2])*2)*.5 + .5;
		const n3 = noise.perlin2((j+position[0])*.04, (i+position[2])*.04)*.5 + .5;
		return ((n1**3)*10 + n2)*n3;
	};

	const mountainMaterial = await cg.loadMaterialTextures(gl, {
		ambient: [1, 1, 1],
		diffuse: [0.9, 0.85, 0.85],
		diffuseMap: "texture/snow.jpeg",
		secondMap: "texture/stone2.jpg",
		emissive: [0, 0, 0],
		illum: 2,
		opacity: 1,
		opticalDensity: 1,
		shininess: 1.0,
		specular: [1.0, 0.8, 0.8],
		second: 2,
		second_b: 1,
		specularMap: "texture/snow_spec.jpeg",
		secondspecMap: "texture/stone2_spec.jpg"
	});
	const mountainPerlin = (j, i, position) => {
		const n1 = noise.perlin2((j+position[0]+10)*.2, (i+position[2]-1)*.2)*.5 + .5;
		const n2 = noise.perlin2((j+position[0]-1)*2, (i+position[2]+2)*2)*.5 + .5;
		const n3 = noise.perlin2((j+position[0]+1)*.04, (i+position[2]-10)*.04)*.5 + .5;
		return ((n1**2)*9 + n2) * ((n3**1.7));
	};

	const sandMaterial = await cg.loadMaterialTextures(gl, {
		ambient: [1, 1, 1],
		diffuse: [0.9, 0.85, 0.85],
		diffuseMap: "texture/sand.jpg",
		secondMap: "texture/water.jpg",
		emissive: [0, 0, 0],
		illum: 2,
		opacity: 1,
		opticalDensity: 1,
		shininess: 1.0,
		specular: [1.0, 0.8, 0.8],
		second: 1.8,
		second_b: 1.3,
		specularMap: "texture/sand_spec.jpg",
		secondspecMap: "texture/water_spec.jpg"
	});
	const sandPerlin = (j, i, position) => {
		const n1 = noise.perlin2((j+position[0])*.07, (i+position[2])*.07)*.5 + .5;
		const n2 = noise.perlin2((j+position[0])*1, (i+position[2])*1)*.5 + .5;
		const n3 = noise.perlin2((j+position[0])*.04, (i+position[2])*.04)*.5 + .5;
		const n4 = ((n1**3)*20 - n2)*n3
		return n4>0.8?n4:0.8;
	};

	const forestMaterial = await cg.loadMaterialTextures(gl, {
		ambient: [1, 1, 1],
		diffuse: [0.9, 0.85, 0.85],
		diffuseMap: "texture/forest.jpg",
		secondMap: "texture/water.jpg",
		emissive: [0, 0, 0],
		illum: 2,
		opacity: 1,
		opticalDensity: 1,
		shininess: 1.0,
		specular: [1.0, 0.8, 0.8],
		second: 1,
		second_b: 1,
		specularMap: "texture/forest_spec.jpg",
		secondspecMap: "texture/water_spec.jpg"
	});
	const forestPerlin = (j, i, position) => {
		const n1 = noise.perlin2((j+position[0]+30)*.07, (i+position[2])*.07)*.5 + .5;
		const n2 = noise.perlin2((j+position[0]+2)*.4, (i+position[2]+2)*.4)*.5 + .5;
		const n3 = noise.perlin2((j+position[0])*.2, (i+position[2])*.2)*.5 + .5;
		const n4 = (n1*n1*10)-(1-n2**2) - (1-n3**7);;
		return (n4<0.45?0.45:n4);
	};

	const infoG = {material: forestMaterial, perlin: forestPerlin};

	const pTransf = generateTransforms(30, 1, {
		vfall: .1,
		hmax: 30
	}, (m)=>{
		m4.translate(m.transform, m.transform, [Math.random()*2, m.hmax, Math.random()*2]);
	});
	const objPla = await cg.loadObj("objects/asteroid/asteroid.obj", gl, objPrgInf, pTransf.transforms);

	const cam = new cg.Cam([-1.84, 4.14, 1.68], 4, canvitas);
	cam.yaw = -0.7037963267943794;
	cam.pitch = -0.74115000000297805;

	const world = m4.create();
	const projection = m4.create();
	const pointLightPosition = v3.fromValues(0, 8, 0);
	//m4.identity(world);

	
	const coords = {
		u_world: world,
		u_projection: projection,
		u_view: cam.viewM4,
		u_viewPosition: cam.pos
	};

	const dirLight = {
		"u_dirLight.direction": v3.fromValues(.4, -1., -.4),
		"u_dirLight.ambient": v3.fromValues(.05, .05, .05),
		"u_dirLight.diffuse": v3.fromValues(.1, .1, .1),
		"u_dirLight.specular": v3.fromValues(.2, .2, .2)
	};
	const pointLight = {
		"u_pointLight.position": pointLightPosition,
		"u_pointLight.ambient": v3.fromValues(.1, .1, .1),
		"u_pointLight.diffuse": v3.fromValues(1., 1., 0.1),
		"u_pointLight.specular": v3.fromValues(1., 1., 1.),
	
		"u_pointLight.constant": .8,
		"u_pointLight.linear": 0.002,
		"u_pointLight.quadratic": 0.02,
	}
	const spotLight = {
		"u_spotLight.enable": true,
		"u_spotLight.ambient": v3.fromValues(.1, .1, .1),
		"u_spotLight.diffuse": v3.fromValues(1.0, 1.0, 1.0),
		"u_spotLight.specular": v3.fromValues(.1, .1, .1),
		"u_spotLight.cutOff": Math.cos(Math.PI / 28.0),
		"u_spotLight.outerCutOff": Math.cos(Math.PI / 12.0),
		"u_spotLight.direction": cam.lookAt,
		"u_spotLight.position": cam.pos,
		"u_spotLight.constant": 1.0,
		"u_spotLight.linear": 0.001,
		"u_spotLight.quadratic": 0.00001
	  };

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	//canvitas.requestPointerLock();

	const chunks_list = [];
	const chunk_size = 8;
	const chunks = {};


	function render(elapsedTime){
		elapsedTime *= 1e-3;
		deltaTime = elapsedTime - lastTime;
		lastTime = elapsedTime;

		if(twgl.resizeCanvasToDisplaySize(gl.canvas)){
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
			aspect = gl.canvas.width / gl.canvas.height;
		}
		gl.clearColor(.05, .05, .05, 1.);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		cam.loopCam(deltaTime);

		pointLightPosition[0] = Math.sin(elapsedTime)*20;
		pointLightPosition[2] = Math.cos(elapsedTime)*20;

		pTransf.subarrays.forEach(m => {
			const vg = v3.create();
			m4.translate(m.transform, m.transform, 
				v3.fromValues(0, -m.vfall, 0)
			);
			m4.getTranslation(vg, m.transform);
			if(vg[1] < 0){
				m4.identity(m.transform);
				m4.translate(m.transform, m.transform, 
					v3.fromValues((Math.random()-.5)*4, m.hmax, (Math.random()-.5)*3)
				);
				m.vfall = 0.5 + Math.random()/8;
			}
		});

		// Chunk Generator
		const chunck_code_ = [Math.floor((cam.pos[0]-chunk_size/2)/chunk_size), Math.floor((cam.pos[2]-chunk_size/2)/chunk_size)];
		for(let i=-2; i<=2; i++){
			for(let j=-2; j<=2; j++){
				const chunck_code = [chunck_code_[0]+i, chunck_code_[1]+j];
				const chunck_key = chunck_code[0] + "|" + chunck_code[1];
				if(chunks[chunck_key] === undefined){
					const position = [ chunck_code[0]*chunk_size, 0, chunck_code[1]*chunk_size];
					chunks[chunck_key] = chunck_code;
					generateChunk(gl, objPrgInfTerr, infoG.material, chunk_size, 40, position, infoG.perlin)
						.then((x)=> {
							chunks[chunck_key] = x;
							chunks_list.push(x);
						});
				}
			}
		}
		

		m4.identity(projection);
		m4.perspective(projection, cam.zoom, aspect, .1, 500);

		gl.useProgram(objPrgInfTerr.program);
		m4.identity(world);
		twgl.setUniforms(objPrgInfTerr, coords);
		twgl.setUniforms(objPrgInfTerr, dirLight);
		twgl.setUniforms(objPrgInfTerr, pointLight);
		twgl.setUniforms(objPrgInfTerr, spotLight);
		
		// Terrain
		for (const { instances, programInfo, objectGen, subarrays, transforms } of chunks_list) {
			for (const { bufferInfo, vertexArrayInfo, vao, material } of objectGen) {
				const f = v3.create();
				m4.getTranslation(f, subarrays[0]['transform']);
				if( Math.hypot(f[0]-cam.pos[0], f[2]-cam.pos[2]) < 100){
					gl.bindVertexArray(vao);
					twgl.setUniforms(programInfo, material);
					gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.a_transform.buffer);
					gl.bufferSubData(gl.ARRAY_BUFFER, 0, transforms);
					//twgl.setBuffersAndAttributes(gl, objPrgInf, vertexArrayInfo);
					twgl.drawBufferInfo(
						gl,
						vertexArrayInfo,
						gl.TRIANGLES,
						vertexArrayInfo.numElements,
						0,
						instances,
					);
				}
			}	
		}

		//objPrgInfTerr
		gl.useProgram(objPrgInf.program);
		m4.identity(world);
		twgl.setUniforms(objPrgInf, coords);
		twgl.setUniforms(objPrgInf, dirLight);
		twgl.setUniforms(objPrgInf, pointLight);
		twgl.setUniforms(objPrgInf, spotLight);
		
		for (const { bufferInfo, vertexArrayInfo, vao, material} of objPla) {
			gl.bindVertexArray(vao);
			twgl.setUniforms(objPrgInf, material);
			gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.a_transform.buffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, pTransf.transforms);
			twgl.drawBufferInfo(gl,
				vertexArrayInfo,
				gl.TRIANGLES,
				vertexArrayInfo.numElements,
				0,
				pTransf.len,
			);
		}
		

		keyc.keyArray.forEach( e => {
			if (e.key === "w") cam.processKeyboard(cg.FORWARD, deltaTime);
			else if (e.key === "a") cam.processKeyboard(cg.LEFT, deltaTime);
			else if (e.key === "s") cam.processKeyboard(cg.BACKWARD, deltaTime);
			else if (e.key === "d") cam.processKeyboard(cg.RIGHT, deltaTime);
		});

		keyc.update();
		requestAnimationFrame(render);	
	}
	requestAnimationFrame(render);


	document.addEventListener("keyup", (e)=>{
		keyc.dropKey(e.key);
		if(e.key == 'w' && cam.last_direction==cg.FORWARD) cam.last_direction = -1;
		if(e.key == 'a' && cam.last_direction==cg.LEFT) cam.last_direction = -1;
		if(e.key == 's' && cam.last_direction==cg.BACKWARD) cam.last_direction = -1;
		if(e.key == 'd' && cam.last_direction==cg.RIGHT) cam.last_direction = -1;
	});

	document.addEventListener("keydown", (e) => {
		keyc.catchKey(e.key);
		if (e.key === "r") autorotate = !autorotate;
		else if (e.key == "e") spotLight["u_spotLight.enable"] = !spotLight["u_spotLight.enable"];
	});
	canvitas.addEventListener("mousemove", (e) => cam.movePov(e, e.x, e.y));
	canvitas.addEventListener("mousedown", (e) => cam.startMove(e.x, e.y));
	canvitas.addEventListener("mouseup", () => cam.stopMove());
	canvitas.addEventListener("wheel", (e) => cam.processScroll(e.deltaY));
	
	dirpower_ranger.addEventListener("input", (e) => {
		const v = dirpower_ranger.value/100;
		dirLight["u_dirLight.diffuse"] = v3.fromValues(v, v, v);
	});
	dirambient_ranger.addEventListener("input", (e)=>{
		const v =dirambient_ranger.value/100;
		dirLight["u_dirLight.ambient"] = v3.fromValues(v, v, v);
	})
	dirspecular_ranger.addEventListener("input", (e)=>{
		const v =dirspecular_ranger.value/100;
		dirLight["u_dirLight.specular"] = v3.fromValues(v, v, v);
	})
	
	function freeChunks(){
		Object.keys(chunks).forEach(x => {
			delete chunks[x];
		});
		while(chunks_list.length)
			chunks_list.pop();
	}
	b_volcan.addEventListener("click", (e)=>{
		freeChunks();
		infoG.material = stoneMaterial;
		infoG.perlin = stonePerlin;
	});
	b_tundra.addEventListener("click", (e)=>{
		freeChunks();
		infoG.material = praderaMaterial;
		infoG.perlin = praderaPerlin;
	});
	b_monta.addEventListener("click", (e)=>{
		freeChunks();
		infoG.material = mountainMaterial;
		infoG.perlin = mountainPerlin;
	});
	b_playa.addEventListener("click", (e)=>{
		freeChunks();
		infoG.material = sandMaterial;
		infoG.perlin = sandPerlin;
	});
	b_bosque.addEventListener("click", (e)=>{
		freeChunks();
		infoG.material = forestMaterial;
		infoG.perlin = forestPerlin;
	});
}

main();