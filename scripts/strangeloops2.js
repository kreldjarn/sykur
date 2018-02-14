var m_container;
var m_camera, m_renderer;
var m_controls;

var m_scene;

var m_particle_count = 3000;
var m_particle_system;

var m_time = 0.0;

window.onload = function () {
  init();
};

function init() {
  initTHREE('three-container');
  initControls();
  m_particle_system = init_particle_system();

  requestAnimationFrame(tick);
  window.addEventListener('resize', resize, false);
}

function initTHREE(container) {
  m_renderer = new THREE.WebGLRenderer({antialias: false, alpha: true});
  m_renderer.setSize(window.innerWidth, window.innerHeight);

  m_container = document.getElementById(container);
  m_container.appendChild(m_renderer.domElement);

  m_camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 1000);
  m_camera.position.set(20, 100, 400);

  m_scene = new THREE.Scene();
  m_scene.background = new THREE.Color( 0xff0000 );

  //var ground = new THREE.Mesh(
    //new THREE.PlaneBufferGeometry(1200, 1200),
    //new THREE.MeshPhongMaterial({
      //color:0x888888
    //})
  //);
  //ground.rotation.x = Math.PI * 1.5;
  //m_scene.add(ground);

  var light;

  light = new THREE.SpotLight(0xffffff, 4, 1600, Math.PI * 0.15, 24, 2);
  light.position.set(0, 1000, 0);

  m_scene.add(light);
}

function initControls() {
  m_controls = new THREE.OrbitControls(m_camera, m_renderer.domElement);
  m_controls.enabled = false;
  m_controls.target.y = 300;
}

function init_particle_system() {
  var prefab_geometry = new THREE.SphereGeometry(10, 2, 2, 0, 1, 1, 0.5);
  var bufferGeometry = new THREE.BAS.PrefabBufferGeometry(prefab_geometry, m_particle_count);

  bufferGeometry.computeVertexNormals();

  // generate additional geometry data
  // used to calculate animation progress
  var aDelayDuration = bufferGeometry.createAttribute('aDelayDuration', 2);
  // used to calculate position on bezier curve
  // all start positions are (0,0,0), no need to fill that buffer, maybe remove it?
  var aStartPosition = bufferGeometry.createAttribute('aStartPosition', 3);
  var aControlPoint1 = bufferGeometry.createAttribute('aControlPoint1', 3);
  var aControlPoint2 = bufferGeometry.createAttribute('aControlPoint2', 3);
  var aEndPosition = bufferGeometry.createAttribute('aEndPosition', 3);
  // rotation
  var a_axis_angle = bufferGeometry.createAttribute('a_axis_angle', 4);
  // the 'color' attribute is used by three.js
  var aColor = bufferGeometry.createAttribute('color', 3);

  var i, j, offset;

  // buffer delay duration
  var delay;
  var duration;

  for (i = 0, offset = 0; i < m_particle_count; i++) {
    delay = THREE.Math.randFloat(0, 20);
    duration =  THREE.Math.randFloat(20, 28);

    for (j = 0; j < prefab_geometry.vertices.length; j++) {
      aDelayDuration.array[offset++] = delay;
      aDelayDuration.array[offset++] = duration;
    }
  }

  // buffer control points
  var x, y, z;

  for (i = 0, offset = 0; i < m_particle_count; i++) {
    x = THREE.Math.randFloat(-100, 100);
    y = THREE.Math.randFloat(600, 1000);
    z = THREE.Math.randFloat(-100, 100);

    for (j = 0; j < prefab_geometry.vertices.length; j++) {
      aControlPoint1.array[offset++] = x;
      aControlPoint1.array[offset++] = y;
      aControlPoint1.array[offset++] = z;
    }
  }

  for (i = 0, offset = 0; i < m_particle_count; i++) {
    x = THREE.Math.randFloat(-800, 800);
    y = THREE.Math.randFloat(200, 1000);
    z = THREE.Math.randFloat(-800, 800);

    for (j = 0; j < prefab_geometry.vertices.length; j++) {
      aControlPoint2.array[offset++] = x;
      aControlPoint2.array[offset++] = y;
      aControlPoint2.array[offset++] = z;
    }
  }

  // buffer end positions

  for (i = 0, offset = 0; i < m_particle_count; i++) {
    x = THREE.Math.randFloatSpread(1000);
    y = 0;
    z = THREE.Math.randFloatSpread(1000);

    for (j = 0; j < prefab_geometry.vertices.length; j++) {
      aEndPosition.array[offset++] = x;
      aEndPosition.array[offset++] = y;
      aEndPosition.array[offset++] = z;
    }
  }

  // buffer axis angle
  var axis = new THREE.Vector3();
  var angle = 0;

  for (i = 0, offset = 0; i < m_particle_count; i++) {
    axis.x = THREE.Math.randFloatSpread(2);
    axis.y = THREE.Math.randFloatSpread(2);
    axis.z = THREE.Math.randFloatSpread(2);
    axis.normalize();

    angle = Math.PI * THREE.Math.randInt(8, 16) + Math.PI * 0.5;

    for (j = 0; j < prefab_geometry.vertices.length; j++) {
      a_axis_angle.array[offset++] = axis.x;
      a_axis_angle.array[offset++] = axis.y;
      a_axis_angle.array[offset++] = axis.z;
      a_axis_angle.array[offset++] = angle;
    }
  }

  // buffer color
  var color = new THREE.Color();
  var h, s, l;

  for (i = 0, offset = 0; i < m_particle_count; i++) {
    h = 0.894;
    s = 0.66;
    l = 0.43;

    color.setHSL(h, s, l);

    for (j = 0; j < prefab_geometry.vertices.length; j++) {
      aColor.array[offset++] = color.r;
      aColor.array[offset++] = color.g;
      aColor.array[offset++] = color.b;
    }
  }


  var material = new THREE.BAS.PhongAnimationMaterial(
    // custom parameters & THREE.MeshPhongMaterial parameters
    {
      vertexColors: THREE.VertexColors,
      shading: THREE.SmoothShading,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: {type: 'f', value: 0}
      },
      shader_functions: [
        THREE.BAS.ShaderChunk['quaternion_rotation'],
        THREE.BAS.ShaderChunk['cubic_bezier'],
        THREE.BAS.ShaderChunk['ease_out_cubic']
      ],
      shader_parameters: [
        'uniform float uTime;',
        'attribute vec2 aDelayDuration;',
        'attribute vec3 aStartPosition;',
        'attribute vec3 aControlPoint1;',
        'attribute vec3 aControlPoint2;',
        'attribute vec3 aEndPosition;',
        'attribute vec4 a_axis_angle;'
      ],
      shader_vertex_init: [
        'float tDelay = aDelayDuration.x;',
        'float tDuration = aDelayDuration.y;',
        'float tTime = mod(uTime - tDelay, tDuration);',
        'float tProgress = ease(tTime, 0.0, 1.0, tDuration);',

        'float angle = a_axis_angle.w * tProgress;',
        'vec4 tQuat = quatFromAxisAngle(a_axis_angle.xyz, angle);'
      ],
      shader_transform_normal: [
        'objectNormal = rotateVector(tQuat, objectNormal);'
      ],
      shader_transform_position: [
        'transformed = rotateVector(tQuat, transformed);',
        'transformed += cubicBezier(aStartPosition, aControlPoint1, aControlPoint2, aEndPosition, tProgress);'
      ]
    },
    // THREE.MeshPhongMaterial uniforms
    {
      shininess: 20
    }
  );

  var particle_system = new THREE.Mesh(bufferGeometry, material);
  particle_system.frustumCulled = false;

  m_scene.add(particle_system);
  return particle_system;
}

function tick() {
  update();
  render();

  m_time += (1 / 60);

  requestAnimationFrame(tick);
}

function update() {
  m_controls.update();

  m_particle_system.material.uniforms['uTime'].value = m_time;
}

function render() {
  m_renderer.render(m_scene, m_camera);
}

function resize() {
  m_camera.aspect = window.innerWidth / window.innerHeight;
  m_camera.updateProjectionMatrix();

  m_renderer.setSize(window.innerWidth, window.innerHeight);
}

/////////////////////////////
// buffer animation system
/////////////////////////////

THREE.BAS = {};

THREE.BAS.ShaderChunk = {};

THREE.BAS.ShaderChunk["animation_time"] = "float tDelay = aAnimation.x;\nfloat tDuration = aAnimation.y;\nfloat tTime = (uTime - tDelay) % tDuration;\nfloat tProgress = ease(tTime, 0.0, 1.0, tDuration);\n";

THREE.BAS.ShaderChunk["cubic_bezier"] = "vec3 cubicBezier(vec3 p0, vec3 c0, vec3 c1, vec3 p1, float t)\n{\n    vec3 tp;\n    float tn = 1.0 - t;\n\n    tp.xyz = tn * tn * tn * p0.xyz + 3.0 * tn * tn * t * c0.xyz + 3.0 * tn * t * t * c1.xyz + t * t * t * p1.xyz;\n\n    return tp;\n}\n";

THREE.BAS.ShaderChunk["ease_in_cubic"] = "float ease(float t, float b, float c, float d) {\n  return c*(t/=d)*t*t + b;\n}\n";

THREE.BAS.ShaderChunk["ease_in_quad"] = "float ease(float t, float b, float c, float d) {\n  return c*(t/=d)*t + b;\n}\n";

THREE.BAS.ShaderChunk["ease_out_cubic"] = "float ease(float t, float b, float c, float d) {\n  return c*((t=t/d - 1.0)*t*t + 1.0) + b;\n}\n";

THREE.BAS.ShaderChunk["quaternion_rotation"] = "vec3 rotateVector(vec4 q, vec3 v)\n{\n    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);\n}\n\nvec4 quatFromAxisAngle(vec3 axis, float angle)\n{\n    float halfAngle = angle * 0.5;\n    return vec4(axis.xyz * sin(halfAngle), cos(halfAngle));\n}\n";


THREE.BAS.PrefabBufferGeometry = function (prefab, count) {
  THREE.BufferGeometry.call(this);

  this.prefab_geometry = prefab;
  this.prefab_count = count;
  this.prefab_vertex_count = prefab.vertices.length;

  this.bufferDefaults();
};
THREE.BAS.PrefabBufferGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);
THREE.BAS.PrefabBufferGeometry.prototype.constructor = THREE.BAS.PrefabBufferGeometry;

THREE.BAS.PrefabBufferGeometry.prototype.bufferDefaults = function () {
  var prefab_face_count = this.prefab_geometry.faces.length;
  var prefab_index_count = this.prefab_geometry.faces.length * 3;
  var prefab_vertex_count = this.prefab_vertex_count = this.prefab_geometry.vertices.length;
  var prefab_indices = [];

  //console.log('prefab_count', this.prefab_count);
  //console.log('prefab_face_count', prefab_face_count);
  //console.log('prefab_index_count', prefab_index_count);
  //console.log('prefab_vertex_count', prefab_vertex_count);
  //console.log('triangles', prefab_face_count * this.prefab_count);

  for (var h = 0; h < prefab_face_count; h++) {
    var face = this.prefab_geometry.faces[h];
    prefab_indices.push(face.a, face.b, face.c);
  }

  var index_buffer = new Uint32Array(this.prefab_count * prefab_index_count);
  var position_buffer = new Float32Array(this.prefab_count * prefab_vertex_count * 3);

  this.setIndex(new THREE.BufferAttribute(index_buffer, 1));
  this.addAttribute('position', new THREE.BufferAttribute(position_buffer, 3));

  for (var i = 0, offset = 0; i < this.prefab_count; i++) {
    for (var j = 0; j < prefab_vertex_count; j++, offset += 3) {
      var prefabVertex = this.prefab_geometry.vertices[j];

      position_buffer[offset    ] = prefabVertex.x;
      position_buffer[offset + 1] = prefabVertex.y;
      position_buffer[offset + 2] = prefabVertex.z;
    }

    for (var k = 0; k < prefab_index_count; k++) {
      index_buffer[i * prefab_index_count + k] = prefab_indices[k] + i * prefab_vertex_count;
    }
  }
};

// todo test
THREE.BAS.PrefabBufferGeometry.prototype.bufferUvs = function() {
  var prefab_face_count = this.prefab_geometry.faces.length;
  var prefab_vertex_count = this.prefab_vertex_count = this.prefab_geometry.vertices.length;
  var prefabUvs = [];

  for (var h = 0; h < prefab_face_count; h++) {
    var face = this.prefab_geometry.faces[h];
    var uv = this.prefab_geometry.faceVertexUvs[0][h];

    prefabUvs[face.a] = uv[0];
    prefabUvs[face.b] = uv[1];
    prefabUvs[face.c] = uv[2];
  }

  var uvBuffer = this.createAttribute('uv', 2);

  for (var i = 0, offset = 0; i < this.prefab_count; i++) {
    for (var j = 0; j < prefab_vertex_count; j++, offset += 2) {
      var prefabUv = prefabUvs[j];

      uvBuffer.array[offset] = prefabUv.x;
      uvBuffer.array[offset + 1] = prefabUv.y;
    }
  }
};

/**
 * based on BufferGeometry.computeVertexNormals
 * calculate vertex normals for a prefab, and repeat the data in the normal buffer
 */
THREE.BAS.PrefabBufferGeometry.prototype.computeVertexNormals = function () {
  var index = this.index;
  var attributes = this.attributes;
  var positions = attributes.position.array;

  if (attributes.normal === undefined) {
    this.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(positions.length), 3));
  }

  var normals = attributes.normal.array;

  var vA, vB, vC,

  pA = new THREE.Vector3(),
  pB = new THREE.Vector3(),
  pC = new THREE.Vector3(),

  cb = new THREE.Vector3(),
  ab = new THREE.Vector3();

  var indices = index.array;
  var prefab_index_count = this.prefab_geometry.faces.length * 3;

  for (var i = 0; i < prefab_index_count; i += 3) {
    vA = indices[i + 0] * 3;
    vB = indices[i + 1] * 3;
    vC = indices[i + 2] * 3;

    pA.fromArray(positions, vA);
    pB.fromArray(positions, vB);
    pC.fromArray(positions, vC);

    cb.subVectors(pC, pB);
    ab.subVectors(pA, pB);
    cb.cross(ab);

    normals[vA] += cb.x;
    normals[vA + 1] += cb.y;
    normals[vA + 2] += cb.z;

    normals[vB] += cb.x;
    normals[vB + 1] += cb.y;
    normals[vB + 2] += cb.z;

    normals[vC] += cb.x;
    normals[vC + 1] += cb.y;
    normals[vC + 2] += cb.z;
  }

  for (var j = 1; j < this.prefab_count; j++) {
    for (var k = 0; k < prefab_index_count; k++) {
      normals[j * prefab_index_count + k] = normals[k];
    }
  }

  this.normalizeNormals();

  attributes.normal.needs_update = true;
};

THREE.BAS.PrefabBufferGeometry.prototype.createAttribute = function (name, itemSize) {
  var buffer = new Float32Array(this.prefab_count * this.prefab_vertex_count * itemSize);
  var attribute = new THREE.BufferAttribute(buffer, itemSize);

  this.addAttribute(name, attribute);

  return attribute;
};

THREE.BAS.PrefabBufferGeometry.prototype.setAttribute4 = function (name, data) {
  var offset = 0;
  var array = this.geometry.attributes[name].array;
  var i, j;

  for (i = 0; i < data.length; i++) {
    var v = data[i];

    for (j = 0; j < this.prefab_vertex_count; j++) {
      array[offset++] = v.x;
      array[offset++] = v.y;
      array[offset++] = v.z;
      array[offset++] = v.w;
    }
  }

  this.geometry.attributes[name].needs_update = true;
};
THREE.BAS.PrefabBufferGeometry.prototype.setAttribute3 = function (name, data) {
  var offset = 0;
  var array = this.geometry.attributes[name].array;
  var i, j;

  for (i = 0; i < data.length; i++) {
    var v = data[i];

    for (j = 0; j < this.prefab_vertex_count; j++) {
      array[offset++] = v.x;
      array[offset++] = v.y;
      array[offset++] = v.z;
    }
  }

  this.geometry.attributes[name].needs_update = true;
};
THREE.BAS.PrefabBufferGeometry.prototype.setAttribute2 = function (name, data) {
  var offset = 0;
  var array = this.geometry.attributes[name].array;
  var i, j;

  for (i = 0; i < this.prefab_count; i++) {
    var v = data[i];

    for (j = 0; j < this.prefab_vertex_count; j++) {
      array[offset++] = v.x;
      array[offset++] = v.y;
    }
  }

  this.geometry.attributes[name].needs_update = true;
};

THREE.BAS.BaseAnimationMaterial = function(parameters) {
    THREE.ShaderMaterial.call(this);

    this.shader_functions = [];
    this.shader_parameters = [];
    this.shader_vertex_init = [];
    this.shader_transform_normal = [];
    this.shader_transform_position = [];

    this.setValues(parameters);
};
THREE.BAS.BaseAnimationMaterial.prototype = Object.create(THREE.ShaderMaterial.prototype);
THREE.BAS.BaseAnimationMaterial.prototype.constructor = THREE.BAS.BaseAnimationMaterial;

// abstract
THREE.BAS.BaseAnimationMaterial.prototype._concatVertexShader = function() {
    return '';
};

THREE.BAS.BaseAnimationMaterial.prototype._concatFunctions = function() {
    return this.shader_functions.join('\n');
};
THREE.BAS.BaseAnimationMaterial.prototype._concatParameters = function() {
    return this.shader_parameters.join('\n');
};
THREE.BAS.BaseAnimationMaterial.prototype._concatVertexInit = function() {
    return this.shader_vertex_init.join('\n');
};
THREE.BAS.BaseAnimationMaterial.prototype._concatTransformNormal = function() {
    return this.shader_transform_normal.join('\n');
};
THREE.BAS.BaseAnimationMaterial.prototype._concatTransformPosition = function() {
    return this.shader_transform_position.join('\n');
};


THREE.BAS.BaseAnimationMaterial.prototype.setUniformValues = function(values) {
    for (var key in values) {
        if (key in this.uniforms) {
            var uniform = this.uniforms[key];
            var value = values[key];

            // todo add matrix uniform types
            switch (uniform.type) {
                case 'c': // color
                    uniform.value.set(value);
                    break;
                case 'v2': // vectors
                case 'v3':
                case 'v4':
                    uniform.value.copy(value);
                    break;
                case 'f': // float
                case 't': // texture
                    uniform.value = value;
            }
        }
    }
};

THREE.BAS.PhongAnimationMaterial = function(parameters, uniformValues) {
    THREE.BAS.BaseAnimationMaterial.call(this, parameters);

    var phongShader = THREE.ShaderLib['phong'];

    this.uniforms = THREE.UniformsUtils.merge([phongShader.uniforms, this.uniforms]);
    this.lights = true;
    this.vertexShader = this._concatVertexShader();
    this.fragmentShader = phongShader.fragmentShader;

    // todo add missing default defines
    uniformValues.map && (this.defines['USE_MAP'] = '');
    uniformValues.normalMap && (this.defines['USE_NORMALMAP'] = '');

    this.setUniformValues(uniformValues);
};
THREE.BAS.PhongAnimationMaterial.prototype = Object.create(THREE.BAS.BaseAnimationMaterial.prototype);
THREE.BAS.PhongAnimationMaterial.prototype.constructor = THREE.BAS.PhongAnimationMaterial;

THREE.BAS.PhongAnimationMaterial.prototype._concatVertexShader = function() {
    // based on THREE.ShaderLib.phong
    return [
        "#define PHONG",

        "varying vec3 vViewPosition;",

        "#ifndef FLAT_SHADED",

        "	varying vec3 vNormal;",

        "#endif",

        THREE.ShaderChunk[ "common" ],
        THREE.ShaderChunk[ "uv_pars_vertex" ],
        THREE.ShaderChunk[ "uv2_pars_vertex" ],
        THREE.ShaderChunk[ "displacementmap_pars_vertex" ],
        THREE.ShaderChunk[ "envmap_pars_vertex" ],
        THREE.ShaderChunk[ "lights_phong_pars_vertex" ],
        THREE.ShaderChunk[ "color_pars_vertex" ],
        THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
        THREE.ShaderChunk[ "skinning_pars_vertex" ],
        THREE.ShaderChunk[ "shadowmap_pars_vertex" ],
        THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],

        this._concatFunctions(),

        this._concatParameters(),

        "void main() {",

        this._concatVertexInit(),

        THREE.ShaderChunk[ "uv_vertex" ],
        THREE.ShaderChunk[ "uv2_vertex" ],
        THREE.ShaderChunk[ "color_vertex" ],
        THREE.ShaderChunk[ "beginnormal_vertex" ],

        this._concatTransformNormal(),

        THREE.ShaderChunk[ "morphnormal_vertex" ],
        THREE.ShaderChunk[ "skinbase_vertex" ],
        THREE.ShaderChunk[ "skinnormal_vertex" ],
        THREE.ShaderChunk[ "defaultnormal_vertex" ],

        "#ifndef FLAT_SHADED", // Normal computed with derivatives when FLAT_SHADED

        "	vNormal = normalize( transformedNormal );",

        "#endif",

        THREE.ShaderChunk[ "begin_vertex" ],

        this._concatTransformPosition(),

        THREE.ShaderChunk[ "displacementmap_vertex" ],
        THREE.ShaderChunk[ "morphtarget_vertex" ],
        THREE.ShaderChunk[ "skinning_vertex" ],
        THREE.ShaderChunk[ "project_vertex" ],
        THREE.ShaderChunk[ "logdepthbuf_vertex" ],

        "	vViewPosition = - mvPosition.xyz;",

        THREE.ShaderChunk[ "worldpos_vertex" ],
        THREE.ShaderChunk[ "envmap_vertex" ],
        THREE.ShaderChunk[ "lights_phong_vertex" ],
        THREE.ShaderChunk[ "shadowmap_vertex" ],

        "}"

    ].join( "\n" );
};
