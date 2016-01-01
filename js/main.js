(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Util = require('./modules/util');
var Force2 = require('./modules/force2');
var Mover = require('./modules/mover');

var Points = require('./modules/points.js');
var vs = "#define GLSLIFY 1\nattribute vec3 customColor;\nattribute float vertexOpacity;\nattribute float size;\n\nvarying vec3 vColor;\nvarying float fOpacity;\n\nvoid main() {\n  vColor = customColor;\n  fOpacity = vertexOpacity;\n  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n  gl_PointSize = size * (300.0 / length(mvPosition.xyz));\n  gl_Position = projectionMatrix * mvPosition;\n}\n";
var fs = "#define GLSLIFY 1\nuniform vec3 color;\nuniform sampler2D texture;\n\nvarying vec3 vColor;\nvarying float fOpacity;\n\nvoid main() {\n  gl_FragColor = vec4(color * vColor, fOpacity);\n  gl_FragColor = gl_FragColor * texture2D(texture, gl_PointCoord);\n}\n";

var exports = function(){
  var Sketch = function() {};
  var images = [];
  var image_files = [
    './img/monkey.png'
  ];
  var image_vertices = [];
  var movers = [];
  var positions = null;
  var colors = null;
  var opacities = null;
  var sizes = null;
  var length_side = 400;
  var points = new Points();
  var created_points = false;
  var last_time_bounce_mover = Date.now();

  var loadImage = function(callback) {
    var finished_count = 0;
    for (var i = 0; i < image_files.length; i++) {
      images[i] = new Image();
      images[i].src = image_files[i];
      images[i].onload = function() {
        finished_count += 1;
        if (image_files.length >= finished_count) {
          callback();
        }
      };
    }
  };

  var getImageData = function(i) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    image_vertices[i] = [];
    canvas.width = length_side;
    canvas.height = length_side;
    ctx.drawImage(images[i], 0, 0);
    var image_data = ctx.getImageData(0, 0, length_side, length_side);
    for (var y = 0; y < length_side; y++) {
      if (y % 3 > 0) continue;
      for (var x = 0; x < length_side; x++) {
        if (x % 3 > 0) continue;
        if(image_data.data[(x + y * length_side) * 4 - 1] > 0) {
          image_vertices[i].push(0, (y - length_side / 2) * -1.7, (x - length_side/ 2) * -1.7);
        }
      }
    }
  };

  var buildPoints = function(scene) {
    positions = new Float32Array(image_vertices[0]);
    colors = new Float32Array(image_vertices[0].length);
    opacities = new Float32Array(image_vertices[0].length / 3);
    sizes = new Float32Array(image_vertices[0].length / 3);
    for (var i = 0; i < image_vertices[0].length / 3; i++) {
      var mover = new Mover();
      var color = new THREE.Color(
        'hsl(0, 100%, 80%)'
      );
      mover.init(new THREE.Vector3(image_vertices[0][i * 3], image_vertices[0][i * 3 + 1], image_vertices[0][i * 3 + 2]));
      mover.size = new Force2();
      mover.size.anchor.set(8, 0);
      mover.size.velocity.set(8, 0);
      mover.size.position.set(8, 0);
      mover.is_activate = true;
      movers.push(mover);
      color.toArray(colors, i * 3);
      opacities[i] = 1;
    }
    points.init({
      scene: scene,
      vs: vs,
      fs: fs,
      positions: positions,
      colors: colors,
      opacities: opacities,
      sizes: sizes,
      texture: createTexture(),
      blending: THREE.NormalBlending
    });
    created_points = true;
  };

  var applyForceToPoints = function() {
    for (var i = 0; i < movers.length; i++) {
      var mover = movers[i];
      var rad1 = Util.getRadian(Util.getRandomInt(0, 360));
      var rad2 = Util.getRadian(Util.getRandomInt(0, 360));
      var scalar = 12 * Util.getRandomInt(8, 12);
      mover.is_activate = false;
      mover.applyForce(Util.getSpherical(rad1, rad2, scalar));
    }
  };

  var updateMover =  function() {
    for (var i = 0; i < movers.length; i++) {
      var mover = movers[i];
      mover.time++;
      if (mover.acceleration.length() < 0.1) {
        mover.is_activate = true;
      }
      if (mover.is_activate) {
        mover.applyHook(0, 0.5);
        mover.applyDrag(0.4);
      } else {
        mover.applyDrag(0.1);
      }
      mover.updateVelocity();
      mover.updatePosition();
      mover.position.sub(points.position);
      positions[i * 3 + 0] = mover.position.x - points.position.x;
      positions[i * 3 + 1] = mover.position.y - points.position.x;
      positions[i * 3 + 2] = mover.position.z - points.position.x;
      //mover.size = Math.log(Util.getRandomInt(1, 128)) / Math.log(128) * Math.sqrt(document.body.clientWidth) / 2;
      if (Util.getRandomInt(0, 1000) < 50) {
        mover.size.applyForce(new THREE.Vector2(
          (1 - Math.log(Util.getRandomInt(1, 512)) / Math.log(512))
          * (1 - Math.log(Util.getRandomInt(1, 128)) / Math.log(128)) * Math.log(window.innerWidth) * 3,
        0));
      }
      mover.size.applyHook(0, 0.02);
      mover.size.applyDrag(0.02);
      mover.size.updateVelocity();
      mover.size.updatePosition();
      sizes[i] = Math.abs(mover.size.position.x) + 8;
    }
    points.updatePoints();
  };

  var createTexture = function() {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var grad = null;
    var texture = null;

    canvas.width = 200;
    canvas.height = 200;
    ctx.fillStyle = '#ffffff';
    ctx.arc(100, 100, 100, 0, Math.PI * 2, false);
    ctx.fill();

    texture = new THREE.Texture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  };

  Sketch.prototype = {
    init: function(scene, camera) {
      loadImage(function() {
        for (var i = 0; i < images.length; i++) {
          getImageData(i);
        }
        // ここにどの画像の頂点数が一番多いかを判定するロジックを追加する必要あり。
        buildPoints(scene);
      });
      camera.range = 1400;
      camera.rad1_base = Util.getRadian(0);
      camera.rad1 = camera.rad1_base;
      camera.rad2 = Util.getRadian(0);
      camera.setPositionSpherical();
    },
    remove: function(scene, camera) {
      points.geometry.dispose();
      points.material.dispose();
      scene.remove(points.obj);
      image_vertices = [];
      movers = [];
      camera.range = 1000;
    },
    render: function(scene, camera) {
      if (created_points) {
        updateMover();
        points.updatePoints();
      }
      camera.applyHook(0, 0.025);
      camera.applyDrag(0.2);
      camera.updateVelocity();
      camera.updatePosition();
      camera.lookAtCenter();

    },
    touchStart: function(scene, camera, vector_mouse_down, vector_mouse_move) {

      applyForceToPoints();
    },
    touchMove: function(scene, camera, vector_mouse_down, vector_mouse_move) {
      camera.anchor.z = vector_mouse_move.x * 1000;
      camera.anchor.y = vector_mouse_move.y * -1000;
    },
    touchEnd: function(scene, camera, vector_mouse_end) {
      camera.anchor.z = 0;
      camera.anchor.y = 0;
    }
  };

  return Sketch;
};

module.exports = exports();

},{"./modules/force2":5,"./modules/mover":7,"./modules/points.js":8,"./modules/util":9}],2:[function(require,module,exports){
var Util = require('./modules/util');
var debounce = require('./modules/debounce');
var Camera = require('./modules/camera');
var ImageData = require('./image_data');

var body_width = document.body.clientWidth;
var body_height = document.body.clientHeight;
var vector_mouse_down = new THREE.Vector2();
var vector_mouse_move = new THREE.Vector2();
var vector_mouse_end = new THREE.Vector2();

var canvas = null;
var renderer = null;
var scene = null;
var camera = null;
var running = new ImageData();

var initThree = function() {
  canvas = document.getElementById('canvas');
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  if (!renderer) {
    alert('Three.jsの初期化に失敗しました。');
  }
  renderer.setSize(body_width, body_height);
  canvas.appendChild(renderer.domElement);
  renderer.setClearColor(0xefefef, 1.0);

  scene = new THREE.Scene();

  camera = new Camera();
  camera.init(body_width, body_height);
};

var init = function() {
  initThree();
  running.init(scene, camera);
  renderloop();
  setEvent();
  debounce(window, 'resize', function(event){
    resizeRenderer();
  });
};

var render = function() {
  renderer.clear();
  running.render(scene, camera, vector_mouse_move);
  renderer.render(scene, camera.obj);
};

var renderloop = function() {
  var now = Date.now();
  requestAnimationFrame(renderloop);
  render();
};

var resizeRenderer = function() {
  body_width  = document.body.clientWidth;
  body_height = document.body.clientHeight;
  renderer.setSize(body_width, body_height);
  camera.resize(body_width, body_height);
};

var setEvent = function () {
  canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault();
  });

  canvas.addEventListener('selectstart', function (event) {
    event.preventDefault();
  });

  canvas.addEventListener('mousedown', function (event) {
    event.preventDefault();
    touchStart(event.clientX, event.clientY, false);
  });

  canvas.addEventListener('mousemove', function (event) {
    event.preventDefault();
    touchMove(event.clientX, event.clientY, false);
  });

  canvas.addEventListener('mouseup', function (event) {
    event.preventDefault();
    touchEnd(event.clientX, event.clientY, false);
  });

  canvas.addEventListener('touchstart', function (event) {
    event.preventDefault();
    touchStart(event.touches[0].clientX, event.touches[0].clientY, true);
  });

  canvas.addEventListener('touchmove', function (event) {
    event.preventDefault();
    touchMove(event.touches[0].clientX, event.touches[0].clientY, true);
  });

  canvas.addEventListener('touchend', function (event) {
    event.preventDefault();
    touchEnd(event.changedTouches[0].clientX, event.changedTouches[0].clientY, true);
  });

  window.addEventListener('mouseout', function () {
    event.preventDefault();
    touchEnd(0, 0, false);
  });
};

var transformVector2d = function(vector) {
  vector.x = (vector.x / body_width) * 2 - 1;
  vector.y = - (vector.y / body_height) * 2 + 1;
};

var touchStart = function(x, y, touch_event) {
  vector_mouse_down.set(x, y);
  transformVector2d(vector_mouse_down);
  if (running.touchStart) running.touchStart(scene, camera, vector_mouse_down);
};

var touchMove = function(x, y, touch_event) {
  vector_mouse_move.set(x, y);
  transformVector2d(vector_mouse_move);
  if (running.touchMove) running.touchMove(scene, camera, vector_mouse_down, vector_mouse_move);
};

var touchEnd = function(x, y, touch_event) {
  vector_mouse_end.set(x, y);
  if (running.touchEnd) running.touchEnd(scene, camera, vector_mouse_end);
};

var switchMenu = function() {
  btn_toggle_menu.classList.toggle('is-active');
  menu.classList.toggle('is-active');
  document.body.classList.remove('is-pointed');
};

init();

},{"./image_data":1,"./modules/camera":3,"./modules/debounce":4,"./modules/util":9}],3:[function(require,module,exports){
var Util = require('../modules/util');
var Force3 = require('../modules/force3');

var exports = function(){
  var Camera = function() {
    this.rad1_base = Util.getRadian(10);
    this.rad1 = this.rad1_base;
    this.rad2 = Util.getRadian(0);
    this.look = new Force3();
    this.rotate_rad1_base = 0;
    this.rotate_rad1 = 0;
    this.rotate_rad2_base = 0;
    this.rotate_rad2 = 0;
    this.range = 1000;
    this.obj;
    Force3.call(this);
  };
  Camera.prototype = Object.create(Force3.prototype);
  Camera.prototype.constructor = Camera;
  Camera.prototype.init = function(width, height) {
    this.obj = new THREE.PerspectiveCamera(35, width / height, 1, 10000);
    this.obj.up.set(0, 1, 0);
    this.position = this.obj.position;
    this.setPositionSpherical();
    this.velocity.copy(this.anchor);
    this.lookAtCenter();
  };
  Camera.prototype.reset = function() {
    this.setPositionSpherical();
    this.lookAtCenter();
  };
  Camera.prototype.resize = function(width, height) {
    this.obj.aspect = width / height;
    this.obj.updateProjectionMatrix();
  };
  Camera.prototype.setPositionSpherical = function() {
    var vector = Util.getSpherical(this.rad1, this.rad2, this.range);
    this.anchor.copy(vector);
  };
  Camera.prototype.lookAtCenter = function() {
    this.obj.lookAt({
      x: 0,
      y: 0,
      z: 0
    });
  };
  return Camera;
};

module.exports = exports();

},{"../modules/force3":6,"../modules/util":9}],4:[function(require,module,exports){
module.exports = function(object, eventType, callback){
  var timer;

  object.addEventListener(eventType, function(event) {
    clearTimeout(timer);
    timer = setTimeout(function(){
      callback(event);
    }, 500);
  }, false);
};

},{}],5:[function(require,module,exports){
var Util = require('../modules/util');

var exports = function(){
  var Force2 = function() {
    this.position = new THREE.Vector2();
    this.velocity = new THREE.Vector2();
    this.acceleration = new THREE.Vector2();
    this.anchor = new THREE.Vector2();
    this.mass = 1;
  };
  
  Force2.prototype.updatePosition = function() {
    this.position.copy(this.velocity);
  };
  Force2.prototype.updateVelocity = function() {
    this.acceleration.divideScalar(this.mass);
    this.velocity.add(this.acceleration);
  };
  Force2.prototype.applyForce = function(vector) {
    this.acceleration.add(vector);
  };
  Force2.prototype.applyFriction = function(mu, normal) {
    var force = this.acceleration.clone();
    if (!normal) normal = 1;
    force.multiplyScalar(-1);
    force.normalize();
    force.multiplyScalar(mu);
    this.applyForce(force);
  };
  Force2.prototype.applyDrag = function(value) {
    var force = this.acceleration.clone();
    force.multiplyScalar(-1);
    force.normalize();
    force.multiplyScalar(this.acceleration.length() * value);
    this.applyForce(force);
  };
  Force2.prototype.applyHook = function(rest_length, k) {
    var force = this.velocity.clone().sub(this.anchor);
    var distance = force.length() - rest_length;
    force.normalize();
    force.multiplyScalar(-1 * k * distance);
    this.applyForce(force);
  };

  return Force2;
};

module.exports = exports();

},{"../modules/util":9}],6:[function(require,module,exports){
var Util = require('../modules/util');

var exports = function(){
  var Force = function() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.anchor = new THREE.Vector3();
    this.mass = 1;
  };
  
  Force.prototype.updatePosition = function() {
    this.position.copy(this.velocity);
  };
  Force.prototype.updateVelocity = function() {
    this.acceleration.divideScalar(this.mass);
    this.velocity.add(this.acceleration);
  };
  Force.prototype.applyForce = function(vector) {
    this.acceleration.add(vector);
  };
  Force.prototype.applyFriction = function(mu, normal) {
    var force = this.acceleration.clone();
    if (!normal) normal = 1;
    force.multiplyScalar(-1);
    force.normalize();
    force.multiplyScalar(mu);
    this.applyForce(force);
  };
  Force.prototype.applyDrag = function(value) {
    var force = this.acceleration.clone();
    force.multiplyScalar(-1);
    force.normalize();
    force.multiplyScalar(this.acceleration.length() * value);
    this.applyForce(force);
  };
  Force.prototype.applyHook = function(rest_length, k) {
    var force = this.velocity.clone().sub(this.anchor);
    var distance = force.length() - rest_length;
    force.normalize();
    force.multiplyScalar(-1 * k * distance);
    this.applyForce(force);
  };

  return Force;
};

module.exports = exports();

},{"../modules/util":9}],7:[function(require,module,exports){
var Util = require('../modules/util');
var Force3 = require('../modules/force3');

var exports = function(){
  var Mover = function() {
    this.size = 0;
    this.time = 0;
    this.is_active = false;
    Force3.call(this);
  };
  Mover.prototype = Object.create(Force3.prototype);
  Mover.prototype.constructor = Mover;
  Mover.prototype.init = function(vector) {
    this.position = vector.clone();
    this.velocity = vector.clone();
    this.anchor = vector.clone();
    this.acceleration.set(0, 0, 0);
    this.time = 0;
  };
  Mover.prototype.activate = function() {
    this.is_active = true;
  };
  Mover.prototype.inactivate = function() {
    this.is_active = false;
  };
  return Mover;
};

module.exports = exports();

},{"../modules/force3":6,"../modules/util":9}],8:[function(require,module,exports){
var Util = require('../modules/util');
var Force3 = require('../modules/force3');

var exports = function(){
  var Points = function() {
    this.geometry = new THREE.BufferGeometry();
    this.material = null;
    this.obj = null;
    Force3.call(this);
  };
  Points.prototype = Object.create(Force3.prototype);
  Points.prototype.constructor = Points;
  Points.prototype.init = function(param) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        color: { type: 'c', value: new THREE.Color(0xffffff) },
        texture: { type: 't', value: param.texture }
      },
      vertexShader: param.vs,
      fragmentShader: param.fs,
      transparent: true,
      depthWrite: false,
      blending: param.blending
    });
    this.geometry.addAttribute('position', new THREE.BufferAttribute(param.positions, 3));
    this.geometry.addAttribute('customColor', new THREE.BufferAttribute(param.colors, 3));
    this.geometry.addAttribute('vertexOpacity', new THREE.BufferAttribute(param.opacities, 1));
    this.geometry.addAttribute('size', new THREE.BufferAttribute(param.sizes, 1));
    this.obj = new THREE.Points(this.geometry, this.material);
    param.scene.add(this.obj);
    this.position = this.obj.position;
  };
  Points.prototype.updatePoints = function() {
    this.obj.geometry.attributes.position.needsUpdate = true;
    this.obj.geometry.attributes.vertexOpacity.needsUpdate = true;
    this.obj.geometry.attributes.size.needsUpdate = true;
    this.obj.geometry.attributes.customColor.needsUpdate = true;
  };
  return Points;
};

module.exports = exports();

},{"../modules/force3":6,"../modules/util":9}],9:[function(require,module,exports){
var exports = {
  getRandomInt: function(min, max){
    return Math.floor(Math.random() * (max - min)) + min;
  },
  getDegree: function(radian) {
    return radian / Math.PI * 180;
  },
  getRadian: function(degrees) {
    return degrees * Math.PI / 180;
  },
  getSpherical: function(rad1, rad2, r) {
    var x = Math.cos(rad1) * Math.cos(rad2) * r;
    var z = Math.cos(rad1) * Math.sin(rad2) * r;
    var y = Math.sin(rad1) * r;
    return new THREE.Vector3(x, y, z);
  }
};

module.exports = exports;

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvaW1hZ2VfZGF0YS5qcyIsInNyYy9qcy9tYWluLmpzIiwic3JjL2pzL21vZHVsZXMvY2FtZXJhLmpzIiwic3JjL2pzL21vZHVsZXMvZGVib3VuY2UuanMiLCJzcmMvanMvbW9kdWxlcy9mb3JjZTIuanMiLCJzcmMvanMvbW9kdWxlcy9mb3JjZTMuanMiLCJzcmMvanMvbW9kdWxlcy9tb3Zlci5qcyIsInNyYy9qcy9tb2R1bGVzL3BvaW50cy5qcyIsInNyYy9qcy9tb2R1bGVzL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBVdGlsID0gcmVxdWlyZSgnLi9tb2R1bGVzL3V0aWwnKTtcbnZhciBGb3JjZTIgPSByZXF1aXJlKCcuL21vZHVsZXMvZm9yY2UyJyk7XG52YXIgTW92ZXIgPSByZXF1aXJlKCcuL21vZHVsZXMvbW92ZXInKTtcblxudmFyIFBvaW50cyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wb2ludHMuanMnKTtcbnZhciB2cyA9IFwiI2RlZmluZSBHTFNMSUZZIDFcXG5hdHRyaWJ1dGUgdmVjMyBjdXN0b21Db2xvcjtcXG5hdHRyaWJ1dGUgZmxvYXQgdmVydGV4T3BhY2l0eTtcXG5hdHRyaWJ1dGUgZmxvYXQgc2l6ZTtcXG5cXG52YXJ5aW5nIHZlYzMgdkNvbG9yO1xcbnZhcnlpbmcgZmxvYXQgZk9wYWNpdHk7XFxuXFxudm9pZCBtYWluKCkge1xcbiAgdkNvbG9yID0gY3VzdG9tQ29sb3I7XFxuICBmT3BhY2l0eSA9IHZlcnRleE9wYWNpdHk7XFxuICB2ZWM0IG12UG9zaXRpb24gPSBtb2RlbFZpZXdNYXRyaXggKiB2ZWM0KHBvc2l0aW9uLCAxLjApO1xcbiAgZ2xfUG9pbnRTaXplID0gc2l6ZSAqICgzMDAuMCAvIGxlbmd0aChtdlBvc2l0aW9uLnh5eikpO1xcbiAgZ2xfUG9zaXRpb24gPSBwcm9qZWN0aW9uTWF0cml4ICogbXZQb3NpdGlvbjtcXG59XFxuXCI7XG52YXIgZnMgPSBcIiNkZWZpbmUgR0xTTElGWSAxXFxudW5pZm9ybSB2ZWMzIGNvbG9yO1xcbnVuaWZvcm0gc2FtcGxlcjJEIHRleHR1cmU7XFxuXFxudmFyeWluZyB2ZWMzIHZDb2xvcjtcXG52YXJ5aW5nIGZsb2F0IGZPcGFjaXR5O1xcblxcbnZvaWQgbWFpbigpIHtcXG4gIGdsX0ZyYWdDb2xvciA9IHZlYzQoY29sb3IgKiB2Q29sb3IsIGZPcGFjaXR5KTtcXG4gIGdsX0ZyYWdDb2xvciA9IGdsX0ZyYWdDb2xvciAqIHRleHR1cmUyRCh0ZXh0dXJlLCBnbF9Qb2ludENvb3JkKTtcXG59XFxuXCI7XG5cbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIFNrZXRjaCA9IGZ1bmN0aW9uKCkge307XG4gIHZhciBpbWFnZXMgPSBbXTtcbiAgdmFyIGltYWdlX2ZpbGVzID0gW1xuICAgICcuL2ltZy9tb25rZXkucG5nJ1xuICBdO1xuICB2YXIgaW1hZ2VfdmVydGljZXMgPSBbXTtcbiAgdmFyIG1vdmVycyA9IFtdO1xuICB2YXIgcG9zaXRpb25zID0gbnVsbDtcbiAgdmFyIGNvbG9ycyA9IG51bGw7XG4gIHZhciBvcGFjaXRpZXMgPSBudWxsO1xuICB2YXIgc2l6ZXMgPSBudWxsO1xuICB2YXIgbGVuZ3RoX3NpZGUgPSA0MDA7XG4gIHZhciBwb2ludHMgPSBuZXcgUG9pbnRzKCk7XG4gIHZhciBjcmVhdGVkX3BvaW50cyA9IGZhbHNlO1xuICB2YXIgbGFzdF90aW1lX2JvdW5jZV9tb3ZlciA9IERhdGUubm93KCk7XG5cbiAgdmFyIGxvYWRJbWFnZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIGZpbmlzaGVkX2NvdW50ID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlX2ZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpbWFnZXNbaV0gPSBuZXcgSW1hZ2UoKTtcbiAgICAgIGltYWdlc1tpXS5zcmMgPSBpbWFnZV9maWxlc1tpXTtcbiAgICAgIGltYWdlc1tpXS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZmluaXNoZWRfY291bnQgKz0gMTtcbiAgICAgICAgaWYgKGltYWdlX2ZpbGVzLmxlbmd0aCA+PSBmaW5pc2hlZF9jb3VudCkge1xuICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9O1xuXG4gIHZhciBnZXRJbWFnZURhdGEgPSBmdW5jdGlvbihpKSB7XG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBpbWFnZV92ZXJ0aWNlc1tpXSA9IFtdO1xuICAgIGNhbnZhcy53aWR0aCA9IGxlbmd0aF9zaWRlO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBsZW5ndGhfc2lkZTtcbiAgICBjdHguZHJhd0ltYWdlKGltYWdlc1tpXSwgMCwgMCk7XG4gICAgdmFyIGltYWdlX2RhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGxlbmd0aF9zaWRlLCBsZW5ndGhfc2lkZSk7XG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCBsZW5ndGhfc2lkZTsgeSsrKSB7XG4gICAgICBpZiAoeSAlIDMgPiAwKSBjb250aW51ZTtcbiAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgbGVuZ3RoX3NpZGU7IHgrKykge1xuICAgICAgICBpZiAoeCAlIDMgPiAwKSBjb250aW51ZTtcbiAgICAgICAgaWYoaW1hZ2VfZGF0YS5kYXRhWyh4ICsgeSAqIGxlbmd0aF9zaWRlKSAqIDQgLSAxXSA+IDApIHtcbiAgICAgICAgICBpbWFnZV92ZXJ0aWNlc1tpXS5wdXNoKDAsICh5IC0gbGVuZ3RoX3NpZGUgLyAyKSAqIC0xLjcsICh4IC0gbGVuZ3RoX3NpZGUvIDIpICogLTEuNyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgdmFyIGJ1aWxkUG9pbnRzID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgICBwb3NpdGlvbnMgPSBuZXcgRmxvYXQzMkFycmF5KGltYWdlX3ZlcnRpY2VzWzBdKTtcbiAgICBjb2xvcnMgPSBuZXcgRmxvYXQzMkFycmF5KGltYWdlX3ZlcnRpY2VzWzBdLmxlbmd0aCk7XG4gICAgb3BhY2l0aWVzID0gbmV3IEZsb2F0MzJBcnJheShpbWFnZV92ZXJ0aWNlc1swXS5sZW5ndGggLyAzKTtcbiAgICBzaXplcyA9IG5ldyBGbG9hdDMyQXJyYXkoaW1hZ2VfdmVydGljZXNbMF0ubGVuZ3RoIC8gMyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbWFnZV92ZXJ0aWNlc1swXS5sZW5ndGggLyAzOyBpKyspIHtcbiAgICAgIHZhciBtb3ZlciA9IG5ldyBNb3ZlcigpO1xuICAgICAgdmFyIGNvbG9yID0gbmV3IFRIUkVFLkNvbG9yKFxuICAgICAgICAnaHNsKDAsIDEwMCUsIDgwJSknXG4gICAgICApO1xuICAgICAgbW92ZXIuaW5pdChuZXcgVEhSRUUuVmVjdG9yMyhpbWFnZV92ZXJ0aWNlc1swXVtpICogM10sIGltYWdlX3ZlcnRpY2VzWzBdW2kgKiAzICsgMV0sIGltYWdlX3ZlcnRpY2VzWzBdW2kgKiAzICsgMl0pKTtcbiAgICAgIG1vdmVyLnNpemUgPSBuZXcgRm9yY2UyKCk7XG4gICAgICBtb3Zlci5zaXplLmFuY2hvci5zZXQoOCwgMCk7XG4gICAgICBtb3Zlci5zaXplLnZlbG9jaXR5LnNldCg4LCAwKTtcbiAgICAgIG1vdmVyLnNpemUucG9zaXRpb24uc2V0KDgsIDApO1xuICAgICAgbW92ZXIuaXNfYWN0aXZhdGUgPSB0cnVlO1xuICAgICAgbW92ZXJzLnB1c2gobW92ZXIpO1xuICAgICAgY29sb3IudG9BcnJheShjb2xvcnMsIGkgKiAzKTtcbiAgICAgIG9wYWNpdGllc1tpXSA9IDE7XG4gICAgfVxuICAgIHBvaW50cy5pbml0KHtcbiAgICAgIHNjZW5lOiBzY2VuZSxcbiAgICAgIHZzOiB2cyxcbiAgICAgIGZzOiBmcyxcbiAgICAgIHBvc2l0aW9uczogcG9zaXRpb25zLFxuICAgICAgY29sb3JzOiBjb2xvcnMsXG4gICAgICBvcGFjaXRpZXM6IG9wYWNpdGllcyxcbiAgICAgIHNpemVzOiBzaXplcyxcbiAgICAgIHRleHR1cmU6IGNyZWF0ZVRleHR1cmUoKSxcbiAgICAgIGJsZW5kaW5nOiBUSFJFRS5Ob3JtYWxCbGVuZGluZ1xuICAgIH0pO1xuICAgIGNyZWF0ZWRfcG9pbnRzID0gdHJ1ZTtcbiAgfTtcblxuICB2YXIgYXBwbHlGb3JjZVRvUG9pbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb3ZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBtb3ZlciA9IG1vdmVyc1tpXTtcbiAgICAgIHZhciByYWQxID0gVXRpbC5nZXRSYWRpYW4oVXRpbC5nZXRSYW5kb21JbnQoMCwgMzYwKSk7XG4gICAgICB2YXIgcmFkMiA9IFV0aWwuZ2V0UmFkaWFuKFV0aWwuZ2V0UmFuZG9tSW50KDAsIDM2MCkpO1xuICAgICAgdmFyIHNjYWxhciA9IDEyICogVXRpbC5nZXRSYW5kb21JbnQoOCwgMTIpO1xuICAgICAgbW92ZXIuaXNfYWN0aXZhdGUgPSBmYWxzZTtcbiAgICAgIG1vdmVyLmFwcGx5Rm9yY2UoVXRpbC5nZXRTcGhlcmljYWwocmFkMSwgcmFkMiwgc2NhbGFyKSk7XG4gICAgfVxuICB9O1xuXG4gIHZhciB1cGRhdGVNb3ZlciA9ICBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1vdmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG1vdmVyID0gbW92ZXJzW2ldO1xuICAgICAgbW92ZXIudGltZSsrO1xuICAgICAgaWYgKG1vdmVyLmFjY2VsZXJhdGlvbi5sZW5ndGgoKSA8IDAuMSkge1xuICAgICAgICBtb3Zlci5pc19hY3RpdmF0ZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAobW92ZXIuaXNfYWN0aXZhdGUpIHtcbiAgICAgICAgbW92ZXIuYXBwbHlIb29rKDAsIDAuNSk7XG4gICAgICAgIG1vdmVyLmFwcGx5RHJhZygwLjQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW92ZXIuYXBwbHlEcmFnKDAuMSk7XG4gICAgICB9XG4gICAgICBtb3Zlci51cGRhdGVWZWxvY2l0eSgpO1xuICAgICAgbW92ZXIudXBkYXRlUG9zaXRpb24oKTtcbiAgICAgIG1vdmVyLnBvc2l0aW9uLnN1Yihwb2ludHMucG9zaXRpb24pO1xuICAgICAgcG9zaXRpb25zW2kgKiAzICsgMF0gPSBtb3Zlci5wb3NpdGlvbi54IC0gcG9pbnRzLnBvc2l0aW9uLng7XG4gICAgICBwb3NpdGlvbnNbaSAqIDMgKyAxXSA9IG1vdmVyLnBvc2l0aW9uLnkgLSBwb2ludHMucG9zaXRpb24ueDtcbiAgICAgIHBvc2l0aW9uc1tpICogMyArIDJdID0gbW92ZXIucG9zaXRpb24ueiAtIHBvaW50cy5wb3NpdGlvbi54O1xuICAgICAgLy9tb3Zlci5zaXplID0gTWF0aC5sb2coVXRpbC5nZXRSYW5kb21JbnQoMSwgMTI4KSkgLyBNYXRoLmxvZygxMjgpICogTWF0aC5zcXJ0KGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpIC8gMjtcbiAgICAgIGlmIChVdGlsLmdldFJhbmRvbUludCgwLCAxMDAwKSA8IDUwKSB7XG4gICAgICAgIG1vdmVyLnNpemUuYXBwbHlGb3JjZShuZXcgVEhSRUUuVmVjdG9yMihcbiAgICAgICAgICAoMSAtIE1hdGgubG9nKFV0aWwuZ2V0UmFuZG9tSW50KDEsIDUxMikpIC8gTWF0aC5sb2coNTEyKSlcbiAgICAgICAgICAqICgxIC0gTWF0aC5sb2coVXRpbC5nZXRSYW5kb21JbnQoMSwgMTI4KSkgLyBNYXRoLmxvZygxMjgpKSAqIE1hdGgubG9nKHdpbmRvdy5pbm5lcldpZHRoKSAqIDMsXG4gICAgICAgIDApKTtcbiAgICAgIH1cbiAgICAgIG1vdmVyLnNpemUuYXBwbHlIb29rKDAsIDAuMDIpO1xuICAgICAgbW92ZXIuc2l6ZS5hcHBseURyYWcoMC4wMik7XG4gICAgICBtb3Zlci5zaXplLnVwZGF0ZVZlbG9jaXR5KCk7XG4gICAgICBtb3Zlci5zaXplLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICBzaXplc1tpXSA9IE1hdGguYWJzKG1vdmVyLnNpemUucG9zaXRpb24ueCkgKyA4O1xuICAgIH1cbiAgICBwb2ludHMudXBkYXRlUG9pbnRzKCk7XG4gIH07XG5cbiAgdmFyIGNyZWF0ZVRleHR1cmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHZhciBncmFkID0gbnVsbDtcbiAgICB2YXIgdGV4dHVyZSA9IG51bGw7XG5cbiAgICBjYW52YXMud2lkdGggPSAyMDA7XG4gICAgY2FudmFzLmhlaWdodCA9IDIwMDtcbiAgICBjdHguZmlsbFN0eWxlID0gJyNmZmZmZmYnO1xuICAgIGN0eC5hcmMoMTAwLCAxMDAsIDEwMCwgMCwgTWF0aC5QSSAqIDIsIGZhbHNlKTtcbiAgICBjdHguZmlsbCgpO1xuXG4gICAgdGV4dHVyZSA9IG5ldyBUSFJFRS5UZXh0dXJlKGNhbnZhcyk7XG4gICAgdGV4dHVyZS5taW5GaWx0ZXIgPSBUSFJFRS5OZWFyZXN0RmlsdGVyO1xuICAgIHRleHR1cmUubmVlZHNVcGRhdGUgPSB0cnVlO1xuICAgIHJldHVybiB0ZXh0dXJlO1xuICB9O1xuXG4gIFNrZXRjaC5wcm90b3R5cGUgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oc2NlbmUsIGNhbWVyYSkge1xuICAgICAgbG9hZEltYWdlKGZ1bmN0aW9uKCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltYWdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGdldEltYWdlRGF0YShpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyDjgZPjgZPjgavjganjga7nlLvlg4/jga7poILngrnmlbDjgYzkuIDnlarlpJrjgYTjgYvjgpLliKTlrprjgZnjgovjg63jgrjjg4Pjgq/jgpLov73liqDjgZnjgovlv4XopoHjgYLjgorjgIJcbiAgICAgICAgYnVpbGRQb2ludHMoc2NlbmUpO1xuICAgICAgfSk7XG4gICAgICBjYW1lcmEucmFuZ2UgPSAxNDAwO1xuICAgICAgY2FtZXJhLnJhZDFfYmFzZSA9IFV0aWwuZ2V0UmFkaWFuKDApO1xuICAgICAgY2FtZXJhLnJhZDEgPSBjYW1lcmEucmFkMV9iYXNlO1xuICAgICAgY2FtZXJhLnJhZDIgPSBVdGlsLmdldFJhZGlhbigwKTtcbiAgICAgIGNhbWVyYS5zZXRQb3NpdGlvblNwaGVyaWNhbCgpO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihzY2VuZSwgY2FtZXJhKSB7XG4gICAgICBwb2ludHMuZ2VvbWV0cnkuZGlzcG9zZSgpO1xuICAgICAgcG9pbnRzLm1hdGVyaWFsLmRpc3Bvc2UoKTtcbiAgICAgIHNjZW5lLnJlbW92ZShwb2ludHMub2JqKTtcbiAgICAgIGltYWdlX3ZlcnRpY2VzID0gW107XG4gICAgICBtb3ZlcnMgPSBbXTtcbiAgICAgIGNhbWVyYS5yYW5nZSA9IDEwMDA7XG4gICAgfSxcbiAgICByZW5kZXI6IGZ1bmN0aW9uKHNjZW5lLCBjYW1lcmEpIHtcbiAgICAgIGlmIChjcmVhdGVkX3BvaW50cykge1xuICAgICAgICB1cGRhdGVNb3ZlcigpO1xuICAgICAgICBwb2ludHMudXBkYXRlUG9pbnRzKCk7XG4gICAgICB9XG4gICAgICBjYW1lcmEuYXBwbHlIb29rKDAsIDAuMDI1KTtcbiAgICAgIGNhbWVyYS5hcHBseURyYWcoMC4yKTtcbiAgICAgIGNhbWVyYS51cGRhdGVWZWxvY2l0eSgpO1xuICAgICAgY2FtZXJhLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICBjYW1lcmEubG9va0F0Q2VudGVyKCk7XG5cbiAgICB9LFxuICAgIHRvdWNoU3RhcnQ6IGZ1bmN0aW9uKHNjZW5lLCBjYW1lcmEsIHZlY3Rvcl9tb3VzZV9kb3duLCB2ZWN0b3JfbW91c2VfbW92ZSkge1xuXG4gICAgICBhcHBseUZvcmNlVG9Qb2ludHMoKTtcbiAgICB9LFxuICAgIHRvdWNoTW92ZTogZnVuY3Rpb24oc2NlbmUsIGNhbWVyYSwgdmVjdG9yX21vdXNlX2Rvd24sIHZlY3Rvcl9tb3VzZV9tb3ZlKSB7XG4gICAgICBjYW1lcmEuYW5jaG9yLnogPSB2ZWN0b3JfbW91c2VfbW92ZS54ICogMTAwMDtcbiAgICAgIGNhbWVyYS5hbmNob3IueSA9IHZlY3Rvcl9tb3VzZV9tb3ZlLnkgKiAtMTAwMDtcbiAgICB9LFxuICAgIHRvdWNoRW5kOiBmdW5jdGlvbihzY2VuZSwgY2FtZXJhLCB2ZWN0b3JfbW91c2VfZW5kKSB7XG4gICAgICBjYW1lcmEuYW5jaG9yLnogPSAwO1xuICAgICAgY2FtZXJhLmFuY2hvci55ID0gMDtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIFNrZXRjaDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuL21vZHVsZXMvdXRpbCcpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9tb2R1bGVzL2RlYm91bmNlJyk7XG52YXIgQ2FtZXJhID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NhbWVyYScpO1xudmFyIEltYWdlRGF0YSA9IHJlcXVpcmUoJy4vaW1hZ2VfZGF0YScpO1xuXG52YXIgYm9keV93aWR0aCA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG52YXIgYm9keV9oZWlnaHQgPSBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcbnZhciB2ZWN0b3JfbW91c2VfZG93biA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG52YXIgdmVjdG9yX21vdXNlX21vdmUgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xudmFyIHZlY3Rvcl9tb3VzZV9lbmQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuXG52YXIgY2FudmFzID0gbnVsbDtcbnZhciByZW5kZXJlciA9IG51bGw7XG52YXIgc2NlbmUgPSBudWxsO1xudmFyIGNhbWVyYSA9IG51bGw7XG52YXIgcnVubmluZyA9IG5ldyBJbWFnZURhdGEoKTtcblxudmFyIGluaXRUaHJlZSA9IGZ1bmN0aW9uKCkge1xuICBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG4gIHJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoe1xuICAgIGFudGlhbGlhczogdHJ1ZVxuICB9KTtcbiAgaWYgKCFyZW5kZXJlcikge1xuICAgIGFsZXJ0KCdUaHJlZS5qc+OBruWIneacn+WMluOBq+WkseaVl+OBl+OBvuOBl+OBn+OAgicpO1xuICB9XG4gIHJlbmRlcmVyLnNldFNpemUoYm9keV93aWR0aCwgYm9keV9oZWlnaHQpO1xuICBjYW52YXMuYXBwZW5kQ2hpbGQocmVuZGVyZXIuZG9tRWxlbWVudCk7XG4gIHJlbmRlcmVyLnNldENsZWFyQ29sb3IoMHhlZmVmZWYsIDEuMCk7XG5cbiAgc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcblxuICBjYW1lcmEgPSBuZXcgQ2FtZXJhKCk7XG4gIGNhbWVyYS5pbml0KGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcbn07XG5cbnZhciBpbml0ID0gZnVuY3Rpb24oKSB7XG4gIGluaXRUaHJlZSgpO1xuICBydW5uaW5nLmluaXQoc2NlbmUsIGNhbWVyYSk7XG4gIHJlbmRlcmxvb3AoKTtcbiAgc2V0RXZlbnQoKTtcbiAgZGVib3VuY2Uod2luZG93LCAncmVzaXplJywgZnVuY3Rpb24oZXZlbnQpe1xuICAgIHJlc2l6ZVJlbmRlcmVyKCk7XG4gIH0pO1xufTtcblxudmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICByZW5kZXJlci5jbGVhcigpO1xuICBydW5uaW5nLnJlbmRlcihzY2VuZSwgY2FtZXJhLCB2ZWN0b3JfbW91c2VfbW92ZSk7XG4gIHJlbmRlcmVyLnJlbmRlcihzY2VuZSwgY2FtZXJhLm9iaik7XG59O1xuXG52YXIgcmVuZGVybG9vcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcmxvb3ApO1xuICByZW5kZXIoKTtcbn07XG5cbnZhciByZXNpemVSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xuICBib2R5X3dpZHRoICA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG4gIGJvZHlfaGVpZ2h0ID0gZG9jdW1lbnQuYm9keS5jbGllbnRIZWlnaHQ7XG4gIHJlbmRlcmVyLnNldFNpemUoYm9keV93aWR0aCwgYm9keV9oZWlnaHQpO1xuICBjYW1lcmEucmVzaXplKGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcbn07XG5cbnZhciBzZXRFdmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdG91Y2hTdGFydChldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZLCBmYWxzZSk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRvdWNoTW92ZShldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZLCBmYWxzZSk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0b3VjaEVuZChldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZLCBmYWxzZSk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0b3VjaFN0YXJ0KGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZLCB0cnVlKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdG91Y2hNb3ZlKGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZLCB0cnVlKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0b3VjaEVuZChldmVudC5jaGFuZ2VkVG91Y2hlc1swXS5jbGllbnRYLCBldmVudC5jaGFuZ2VkVG91Y2hlc1swXS5jbGllbnRZLCB0cnVlKTtcbiAgfSk7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24gKCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdG91Y2hFbmQoMCwgMCwgZmFsc2UpO1xuICB9KTtcbn07XG5cbnZhciB0cmFuc2Zvcm1WZWN0b3IyZCA9IGZ1bmN0aW9uKHZlY3Rvcikge1xuICB2ZWN0b3IueCA9ICh2ZWN0b3IueCAvIGJvZHlfd2lkdGgpICogMiAtIDE7XG4gIHZlY3Rvci55ID0gLSAodmVjdG9yLnkgLyBib2R5X2hlaWdodCkgKiAyICsgMTtcbn07XG5cbnZhciB0b3VjaFN0YXJ0ID0gZnVuY3Rpb24oeCwgeSwgdG91Y2hfZXZlbnQpIHtcbiAgdmVjdG9yX21vdXNlX2Rvd24uc2V0KHgsIHkpO1xuICB0cmFuc2Zvcm1WZWN0b3IyZCh2ZWN0b3JfbW91c2VfZG93bik7XG4gIGlmIChydW5uaW5nLnRvdWNoU3RhcnQpIHJ1bm5pbmcudG91Y2hTdGFydChzY2VuZSwgY2FtZXJhLCB2ZWN0b3JfbW91c2VfZG93bik7XG59O1xuXG52YXIgdG91Y2hNb3ZlID0gZnVuY3Rpb24oeCwgeSwgdG91Y2hfZXZlbnQpIHtcbiAgdmVjdG9yX21vdXNlX21vdmUuc2V0KHgsIHkpO1xuICB0cmFuc2Zvcm1WZWN0b3IyZCh2ZWN0b3JfbW91c2VfbW92ZSk7XG4gIGlmIChydW5uaW5nLnRvdWNoTW92ZSkgcnVubmluZy50b3VjaE1vdmUoc2NlbmUsIGNhbWVyYSwgdmVjdG9yX21vdXNlX2Rvd24sIHZlY3Rvcl9tb3VzZV9tb3ZlKTtcbn07XG5cbnZhciB0b3VjaEVuZCA9IGZ1bmN0aW9uKHgsIHksIHRvdWNoX2V2ZW50KSB7XG4gIHZlY3Rvcl9tb3VzZV9lbmQuc2V0KHgsIHkpO1xuICBpZiAocnVubmluZy50b3VjaEVuZCkgcnVubmluZy50b3VjaEVuZChzY2VuZSwgY2FtZXJhLCB2ZWN0b3JfbW91c2VfZW5kKTtcbn07XG5cbnZhciBzd2l0Y2hNZW51ID0gZnVuY3Rpb24oKSB7XG4gIGJ0bl90b2dnbGVfbWVudS5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnKTtcbiAgbWVudS5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnKTtcbiAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1wb2ludGVkJyk7XG59O1xuXG5pbml0KCk7XG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4uL21vZHVsZXMvdXRpbCcpO1xudmFyIEZvcmNlMyA9IHJlcXVpcmUoJy4uL21vZHVsZXMvZm9yY2UzJyk7XG5cbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIENhbWVyYSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmFkMV9iYXNlID0gVXRpbC5nZXRSYWRpYW4oMTApO1xuICAgIHRoaXMucmFkMSA9IHRoaXMucmFkMV9iYXNlO1xuICAgIHRoaXMucmFkMiA9IFV0aWwuZ2V0UmFkaWFuKDApO1xuICAgIHRoaXMubG9vayA9IG5ldyBGb3JjZTMoKTtcbiAgICB0aGlzLnJvdGF0ZV9yYWQxX2Jhc2UgPSAwO1xuICAgIHRoaXMucm90YXRlX3JhZDEgPSAwO1xuICAgIHRoaXMucm90YXRlX3JhZDJfYmFzZSA9IDA7XG4gICAgdGhpcy5yb3RhdGVfcmFkMiA9IDA7XG4gICAgdGhpcy5yYW5nZSA9IDEwMDA7XG4gICAgdGhpcy5vYmo7XG4gICAgRm9yY2UzLmNhbGwodGhpcyk7XG4gIH07XG4gIENhbWVyYS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZvcmNlMy5wcm90b3R5cGUpO1xuICBDYW1lcmEucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2FtZXJhO1xuICBDYW1lcmEucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdGhpcy5vYmogPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoMzUsIHdpZHRoIC8gaGVpZ2h0LCAxLCAxMDAwMCk7XG4gICAgdGhpcy5vYmoudXAuc2V0KDAsIDEsIDApO1xuICAgIHRoaXMucG9zaXRpb24gPSB0aGlzLm9iai5wb3NpdGlvbjtcbiAgICB0aGlzLnNldFBvc2l0aW9uU3BoZXJpY2FsKCk7XG4gICAgdGhpcy52ZWxvY2l0eS5jb3B5KHRoaXMuYW5jaG9yKTtcbiAgICB0aGlzLmxvb2tBdENlbnRlcigpO1xuICB9O1xuICBDYW1lcmEucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRQb3NpdGlvblNwaGVyaWNhbCgpO1xuICAgIHRoaXMubG9va0F0Q2VudGVyKCk7XG4gIH07XG4gIENhbWVyYS5wcm90b3R5cGUucmVzaXplID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCkge1xuICAgIHRoaXMub2JqLmFzcGVjdCA9IHdpZHRoIC8gaGVpZ2h0O1xuICAgIHRoaXMub2JqLnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcbiAgfTtcbiAgQ2FtZXJhLnByb3RvdHlwZS5zZXRQb3NpdGlvblNwaGVyaWNhbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ZWN0b3IgPSBVdGlsLmdldFNwaGVyaWNhbCh0aGlzLnJhZDEsIHRoaXMucmFkMiwgdGhpcy5yYW5nZSk7XG4gICAgdGhpcy5hbmNob3IuY29weSh2ZWN0b3IpO1xuICB9O1xuICBDYW1lcmEucHJvdG90eXBlLmxvb2tBdENlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub2JqLmxvb2tBdCh7XG4gICAgICB4OiAwLFxuICAgICAgeTogMCxcbiAgICAgIHo6IDBcbiAgICB9KTtcbiAgfTtcbiAgcmV0dXJuIENhbWVyYTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50VHlwZSwgY2FsbGJhY2spe1xuICB2YXIgdGltZXI7XG5cbiAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudCkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBjYWxsYmFjayhldmVudCk7XG4gICAgfSwgNTAwKTtcbiAgfSwgZmFsc2UpO1xufTtcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi4vbW9kdWxlcy91dGlsJyk7XG5cbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIEZvcmNlMiA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgIHRoaXMudmVsb2NpdHkgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICB0aGlzLmFuY2hvciA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgdGhpcy5tYXNzID0gMTtcbiAgfTtcbiAgXG4gIEZvcmNlMi5wcm90b3R5cGUudXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnBvc2l0aW9uLmNvcHkodGhpcy52ZWxvY2l0eSk7XG4gIH07XG4gIEZvcmNlMi5wcm90b3R5cGUudXBkYXRlVmVsb2NpdHkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmFjY2VsZXJhdGlvbi5kaXZpZGVTY2FsYXIodGhpcy5tYXNzKTtcbiAgICB0aGlzLnZlbG9jaXR5LmFkZCh0aGlzLmFjY2VsZXJhdGlvbik7XG4gIH07XG4gIEZvcmNlMi5wcm90b3R5cGUuYXBwbHlGb3JjZSA9IGZ1bmN0aW9uKHZlY3Rvcikge1xuICAgIHRoaXMuYWNjZWxlcmF0aW9uLmFkZCh2ZWN0b3IpO1xuICB9O1xuICBGb3JjZTIucHJvdG90eXBlLmFwcGx5RnJpY3Rpb24gPSBmdW5jdGlvbihtdSwgbm9ybWFsKSB7XG4gICAgdmFyIGZvcmNlID0gdGhpcy5hY2NlbGVyYXRpb24uY2xvbmUoKTtcbiAgICBpZiAoIW5vcm1hbCkgbm9ybWFsID0gMTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSk7XG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIobXUpO1xuICAgIHRoaXMuYXBwbHlGb3JjZShmb3JjZSk7XG4gIH07XG4gIEZvcmNlMi5wcm90b3R5cGUuYXBwbHlEcmFnID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgZm9yY2UgPSB0aGlzLmFjY2VsZXJhdGlvbi5jbG9uZSgpO1xuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xKTtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcih0aGlzLmFjY2VsZXJhdGlvbi5sZW5ndGgoKSAqIHZhbHVlKTtcbiAgICB0aGlzLmFwcGx5Rm9yY2UoZm9yY2UpO1xuICB9O1xuICBGb3JjZTIucHJvdG90eXBlLmFwcGx5SG9vayA9IGZ1bmN0aW9uKHJlc3RfbGVuZ3RoLCBrKSB7XG4gICAgdmFyIGZvcmNlID0gdGhpcy52ZWxvY2l0eS5jbG9uZSgpLnN1Yih0aGlzLmFuY2hvcik7XG4gICAgdmFyIGRpc3RhbmNlID0gZm9yY2UubGVuZ3RoKCkgLSByZXN0X2xlbmd0aDtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSAqIGsgKiBkaXN0YW5jZSk7XG4gICAgdGhpcy5hcHBseUZvcmNlKGZvcmNlKTtcbiAgfTtcblxuICByZXR1cm4gRm9yY2UyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4uL21vZHVsZXMvdXRpbCcpO1xuXG52YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBGb3JjZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICAgIHRoaXMudmVsb2NpdHkgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICAgIHRoaXMuYWNjZWxlcmF0aW9uID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgICB0aGlzLmFuY2hvciA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gICAgdGhpcy5tYXNzID0gMTtcbiAgfTtcbiAgXG4gIEZvcmNlLnByb3RvdHlwZS51cGRhdGVQb3NpdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucG9zaXRpb24uY29weSh0aGlzLnZlbG9jaXR5KTtcbiAgfTtcbiAgRm9yY2UucHJvdG90eXBlLnVwZGF0ZVZlbG9jaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5hY2NlbGVyYXRpb24uZGl2aWRlU2NhbGFyKHRoaXMubWFzcyk7XG4gICAgdGhpcy52ZWxvY2l0eS5hZGQodGhpcy5hY2NlbGVyYXRpb24pO1xuICB9O1xuICBGb3JjZS5wcm90b3R5cGUuYXBwbHlGb3JjZSA9IGZ1bmN0aW9uKHZlY3Rvcikge1xuICAgIHRoaXMuYWNjZWxlcmF0aW9uLmFkZCh2ZWN0b3IpO1xuICB9O1xuICBGb3JjZS5wcm90b3R5cGUuYXBwbHlGcmljdGlvbiA9IGZ1bmN0aW9uKG11LCBub3JtYWwpIHtcbiAgICB2YXIgZm9yY2UgPSB0aGlzLmFjY2VsZXJhdGlvbi5jbG9uZSgpO1xuICAgIGlmICghbm9ybWFsKSBub3JtYWwgPSAxO1xuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xKTtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcihtdSk7XG4gICAgdGhpcy5hcHBseUZvcmNlKGZvcmNlKTtcbiAgfTtcbiAgRm9yY2UucHJvdG90eXBlLmFwcGx5RHJhZyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIGZvcmNlID0gdGhpcy5hY2NlbGVyYXRpb24uY2xvbmUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSk7XG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIodGhpcy5hY2NlbGVyYXRpb24ubGVuZ3RoKCkgKiB2YWx1ZSk7XG4gICAgdGhpcy5hcHBseUZvcmNlKGZvcmNlKTtcbiAgfTtcbiAgRm9yY2UucHJvdG90eXBlLmFwcGx5SG9vayA9IGZ1bmN0aW9uKHJlc3RfbGVuZ3RoLCBrKSB7XG4gICAgdmFyIGZvcmNlID0gdGhpcy52ZWxvY2l0eS5jbG9uZSgpLnN1Yih0aGlzLmFuY2hvcik7XG4gICAgdmFyIGRpc3RhbmNlID0gZm9yY2UubGVuZ3RoKCkgLSByZXN0X2xlbmd0aDtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSAqIGsgKiBkaXN0YW5jZSk7XG4gICAgdGhpcy5hcHBseUZvcmNlKGZvcmNlKTtcbiAgfTtcblxuICByZXR1cm4gRm9yY2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMoKTtcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi4vbW9kdWxlcy91dGlsJyk7XG52YXIgRm9yY2UzID0gcmVxdWlyZSgnLi4vbW9kdWxlcy9mb3JjZTMnKTtcblxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgTW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNpemUgPSAwO1xuICAgIHRoaXMudGltZSA9IDA7XG4gICAgdGhpcy5pc19hY3RpdmUgPSBmYWxzZTtcbiAgICBGb3JjZTMuY2FsbCh0aGlzKTtcbiAgfTtcbiAgTW92ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGb3JjZTMucHJvdG90eXBlKTtcbiAgTW92ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTW92ZXI7XG4gIE1vdmVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgdGhpcy5wb3NpdGlvbiA9IHZlY3Rvci5jbG9uZSgpO1xuICAgIHRoaXMudmVsb2NpdHkgPSB2ZWN0b3IuY2xvbmUoKTtcbiAgICB0aGlzLmFuY2hvciA9IHZlY3Rvci5jbG9uZSgpO1xuICAgIHRoaXMuYWNjZWxlcmF0aW9uLnNldCgwLCAwLCAwKTtcbiAgICB0aGlzLnRpbWUgPSAwO1xuICB9O1xuICBNb3Zlci5wcm90b3R5cGUuYWN0aXZhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzX2FjdGl2ZSA9IHRydWU7XG4gIH07XG4gIE1vdmVyLnByb3RvdHlwZS5pbmFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc19hY3RpdmUgPSBmYWxzZTtcbiAgfTtcbiAgcmV0dXJuIE1vdmVyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4uL21vZHVsZXMvdXRpbCcpO1xudmFyIEZvcmNlMyA9IHJlcXVpcmUoJy4uL21vZHVsZXMvZm9yY2UzJyk7XG5cbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIFBvaW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZ2VvbWV0cnkgPSBuZXcgVEhSRUUuQnVmZmVyR2VvbWV0cnkoKTtcbiAgICB0aGlzLm1hdGVyaWFsID0gbnVsbDtcbiAgICB0aGlzLm9iaiA9IG51bGw7XG4gICAgRm9yY2UzLmNhbGwodGhpcyk7XG4gIH07XG4gIFBvaW50cy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEZvcmNlMy5wcm90b3R5cGUpO1xuICBQb2ludHMucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUG9pbnRzO1xuICBQb2ludHMucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihwYXJhbSkge1xuICAgIHRoaXMubWF0ZXJpYWwgPSBuZXcgVEhSRUUuU2hhZGVyTWF0ZXJpYWwoe1xuICAgICAgdW5pZm9ybXM6IHtcbiAgICAgICAgY29sb3I6IHsgdHlwZTogJ2MnLCB2YWx1ZTogbmV3IFRIUkVFLkNvbG9yKDB4ZmZmZmZmKSB9LFxuICAgICAgICB0ZXh0dXJlOiB7IHR5cGU6ICd0JywgdmFsdWU6IHBhcmFtLnRleHR1cmUgfVxuICAgICAgfSxcbiAgICAgIHZlcnRleFNoYWRlcjogcGFyYW0udnMsXG4gICAgICBmcmFnbWVudFNoYWRlcjogcGFyYW0uZnMsXG4gICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgIGRlcHRoV3JpdGU6IGZhbHNlLFxuICAgICAgYmxlbmRpbmc6IHBhcmFtLmJsZW5kaW5nXG4gICAgfSk7XG4gICAgdGhpcy5nZW9tZXRyeS5hZGRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShwYXJhbS5wb3NpdGlvbnMsIDMpKTtcbiAgICB0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgnY3VzdG9tQ29sb3InLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHBhcmFtLmNvbG9ycywgMykpO1xuICAgIHRoaXMuZ2VvbWV0cnkuYWRkQXR0cmlidXRlKCd2ZXJ0ZXhPcGFjaXR5JywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShwYXJhbS5vcGFjaXRpZXMsIDEpKTtcbiAgICB0aGlzLmdlb21ldHJ5LmFkZEF0dHJpYnV0ZSgnc2l6ZScsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUocGFyYW0uc2l6ZXMsIDEpKTtcbiAgICB0aGlzLm9iaiA9IG5ldyBUSFJFRS5Qb2ludHModGhpcy5nZW9tZXRyeSwgdGhpcy5tYXRlcmlhbCk7XG4gICAgcGFyYW0uc2NlbmUuYWRkKHRoaXMub2JqKTtcbiAgICB0aGlzLnBvc2l0aW9uID0gdGhpcy5vYmoucG9zaXRpb247XG4gIH07XG4gIFBvaW50cy5wcm90b3R5cGUudXBkYXRlUG9pbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vYmouZ2VvbWV0cnkuYXR0cmlidXRlcy5wb3NpdGlvbi5uZWVkc1VwZGF0ZSA9IHRydWU7XG4gICAgdGhpcy5vYmouZ2VvbWV0cnkuYXR0cmlidXRlcy52ZXJ0ZXhPcGFjaXR5Lm5lZWRzVXBkYXRlID0gdHJ1ZTtcbiAgICB0aGlzLm9iai5nZW9tZXRyeS5hdHRyaWJ1dGVzLnNpemUubmVlZHNVcGRhdGUgPSB0cnVlO1xuICAgIHRoaXMub2JqLmdlb21ldHJ5LmF0dHJpYnV0ZXMuY3VzdG9tQ29sb3IubmVlZHNVcGRhdGUgPSB0cnVlO1xuICB9O1xuICByZXR1cm4gUG9pbnRzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XG4iLCJ2YXIgZXhwb3J0cyA9IHtcbiAgZ2V0UmFuZG9tSW50OiBmdW5jdGlvbihtaW4sIG1heCl7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pKSArIG1pbjtcbiAgfSxcbiAgZ2V0RGVncmVlOiBmdW5jdGlvbihyYWRpYW4pIHtcbiAgICByZXR1cm4gcmFkaWFuIC8gTWF0aC5QSSAqIDE4MDtcbiAgfSxcbiAgZ2V0UmFkaWFuOiBmdW5jdGlvbihkZWdyZWVzKSB7XG4gICAgcmV0dXJuIGRlZ3JlZXMgKiBNYXRoLlBJIC8gMTgwO1xuICB9LFxuICBnZXRTcGhlcmljYWw6IGZ1bmN0aW9uKHJhZDEsIHJhZDIsIHIpIHtcbiAgICB2YXIgeCA9IE1hdGguY29zKHJhZDEpICogTWF0aC5jb3MocmFkMikgKiByO1xuICAgIHZhciB6ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLnNpbihyYWQyKSAqIHI7XG4gICAgdmFyIHkgPSBNYXRoLnNpbihyYWQxKSAqIHI7XG4gICAgcmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKHgsIHksIHopO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHM7XG4iXX0=
