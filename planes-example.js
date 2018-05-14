var randomColors = ['red', 'orange', /* 'yellow', */ 'green', 'blue', 'violet'];

var raycasterUpdateNeeded = false;
var raycasterInterval;

function raycasterNeedsUpdate() {
  raycasterUpdateNeeded = true;
  if (!raycasterInterval) {
    // NOTE: Assumes raycaster doesn't change.
    var raycaster = sc.querySelector('[raycaster]').components.raycaster;          
    raycasterInterval = setInterval(function() {
      if (raycasterUpdateNeeded) {
        raycaster.refreshObjects();                      
        raycasterUpdateNeeded = false;
      }
    }, raycaster.interval);
  }
}

var tempMat4 = new THREE.Matrix4();
var tempScale = new THREE.Vector3();

function onAddedOrUpdatedPlanes(evt) {
  var sc = AFRAME.scenes[0];
  evt.detail.anchors.forEach(function (anchor) {
    var created = false;
    var colorToUse;
    var plane = sc.querySelector('#plane_' + anchor.identifier);
    if (!plane) {
      // Create and append the plane.
      created = true;
      colorToUse = randomColors[Math.floor(Math.random() * randomColors.length)];
      plane = document.createElement('a-entity');
      plane.setAttribute('id', 'plane_' + anchor.identifier);
      plane.setAttribute('class', 'plane');

      plane.setAttribute('material', 'shader:grid;interval:0.1;side:double;opacity:0.5;color:' + colorToUse);

      sc.appendChild(plane);

      plane.insertAdjacentHTML('beforeend',                   

        // Add a plane label (which needs to be rotated to match a-box).
        '<a-entity class="label" rotation="-90 0 0"></a-entity>' +             

        // Add bounding box.
// NOTE: for A-Frame 0.8.x, using zero height results in the default value of 1 unit                               
        '<a-box class="bbox" position="0 0 0" height="0.001" material="wireframe:true;opacity:0.5;color:' + colorToUse + '"></a-box>' +
        // Add a thing to mark the center of the plane.
        '<a-entity thing></a-entity>');

      // Create the temp objects we will use when updating.
      plane.tempPosition = new THREE.Vector3();
      plane.tempQuaternion = new THREE.Quaternion();
      plane.tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
      plane.tempRotation = new THREE.Vector3();            
    } else {
      colorToUse = plane.getAttribute('material', 'color');
    }

    // Update the plane.
    var dx = anchor.extent[0];
    var dz = anchor.extent[1];
    tempMat4.fromArray(anchor.modelMatrix);
    tempMat4.decompose(plane.tempPosition, plane.tempQuaternion, tempScale);
    plane.tempEuler.setFromQuaternion(plane.tempQuaternion);
    plane.tempRotation.set(
      plane.tempEuler.x * THREE.Math.RAD2DEG,
      plane.tempEuler.y * THREE.Math.RAD2DEG,
      plane.tempEuler.z * THREE.Math.RAD2DEG);
    plane.setAttribute('position', plane.tempPosition);
    plane.setAttribute('rotation', plane.tempRotation);
    // Currently, scale is always 1... 
    // plane.setAttribute('scale', evt.detail.scale);

    // If we have vertices, use polygon geometry
    if (anchor.vertices) {
      // anchor.vertices works for latest ARKit but not for latest ARCore; Float32Array issue?
      plane.setAttribute('geometry', {primitive:'polygon', vertices: anchor.vertices.join(',')});
    } else {
      plane.setAttribute('geometry', 'primitive:box; width:' + dx +
                                     '; height:0.001; depth:' + dz);                    
    }

    // Update the bounding box.
    var bbox = plane.querySelector('.bbox');
    bbox.setAttribute('width', dx);
    bbox.setAttribute('depth', dz);

    // Fill out the plane label with informative text.
    // DETAIL: when creating, getAttribute doesn't work this tick
    plane.querySelector('.label').setAttribute('text', {
     width: dx, 
     height: dz, 
     color: 'gray',
     align: 'left',
     zOffset: 0.01,
     wrapCount: 100, value: 
      'id: ' + anchor.identifier
    + '\nwidth: ' + dx
    + '\ndepth: ' + dz
    + '\nposition x: ' + plane.tempPosition.x
    + '\nposition y: ' + plane.tempPosition.y
    + '\nposition z: ' + plane.tempPosition.z
    + '\nrotation x: ' + plane.tempRotation.x
    + '\nrotation y: ' + plane.tempRotation.y
    + '\nrotation z: ' + plane.tempRotation.z
    // Currently, scale is always 1... 
    //+ '\nscale x: ' + plane.getAttribute('scale').x
    //+ '\nscale y: ' + plane.getAttribute('scale').y
    //+ '\nscale z: ' + plane.getAttribute('scale').z
    });

    // We updated the plane (or added it), so update the raycaster.
    // Because there may be a DOM change, we need to wait a tick.
    if (created) { setTimeout(raycasterNeedsUpdate); } else { raycasterNeedsUpdate(); }

    return plane;
  });                  
}

function onRemovedPlanes(evt) {
  var sc = AFRAME.scenes[0];
  evt.detail.anchors.forEach(function (anchor) {
    var plane = sc.querySelector('#plane_' + anchor.identifier);
    if (plane && plane.parentElement) {
      plane.parentElement.removeChild(plane);
    }          
  });
}            

function addPlaneListeners() {
  var sc = AFRAME.scenes[0];
  // Listen for plane events that aframe-ar generates.
  sc.addEventListener('anchorsadded', onAddedOrUpdatedPlanes);
  sc.addEventListener('anchorsupdated', onAddedOrUpdatedPlanes);
  sc.addEventListener('anchorsremoved', onRemovedPlanes);
}
