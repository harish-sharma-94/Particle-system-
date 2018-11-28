// @author: Harish Sharma

// Set up three.js global variables
var scene, camera, renderer, container, loadingManager;

// Set up avatar global variables
var bbox;

// Transfer global variables
var i_share = 0, n_share = 1, i_delta = 0.0;

//initialize mean and deviation values of spark variables
var meanInitialSpeed = 7, deviationInitialSpeed = 2; //initial speed of spark projectile
var meanTheta = Math.PI/4, deviationTheta = Math.PI/12; // angle of spark with xz plane 
var meanPhi = Math.PI/2, deviationPhi = Math.PI/8; // angle of sparks component in xz plane and z axis 
var meanTemperature = 50, deviationTemperature = 10;  
var meanRadius = 0.01, deviationRadius = 0.001; // sparks radius
var sparkDensity = 850;

//define the various factors affecting spark velocity
var coefRes = 0.88;
var coefFric = 0.9;
var coefAirDrag = 0.007;

//acceleration due to gravity
var g = 9.8;

//Energy above which spark will split
var coldMinSplitEnergy = 0.004;

//the rate at which spark temperature drops
var rateOfCooling = 0.5; //increase this to reduce spark life 

var countID = 1;
const MAX_COUNT_ID = 10000000;
 
var roomTemp = 20; 
var criticalTemp = 25; //temp at which spark dies 

var xOffset = 0;
var initialSparkPosition = new THREE.Vector3(1.6 + xOffset, 1.25, 0);

var sparks = new Object();//spark particle system

//bounding value of objects
var sphereBoundingBox = [new THREE.Vector3(-1.89571428, 0.00212645531, -0.699999988), new THREE.Vector3(-0.50428581, 1.39787352, 0.699999988)];
var givenSphereCenter = new THREE.Vector3(-1.2, 0.7, 0);
var givenSphereRadius = 0.7;
var cubeBoundingBox = [new THREE.Vector3(-2.5, 0, 0.6), new THREE.Vector3(-1.5, 1, 1.6)];
var bunnyBoundingBox =  [new THREE.Vector3(-3.54767966, -0.0152608985, -0.817885876), new THREE.Vector3(-2.32148647, 1.51865304, 0.724156618)];
var bunnyGeometry;

//initial setup
init();
animate();

function animate()
{
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
    postProcess();
}

//changes to make to spark after it bounces from bunny
function bounceSparkFromBunny(spark, touchData)
{
    var normalVec = bunnyGeometry.faces[touchData.faceIndex].normal.clone();
    spark.prePos = touchData.position;
    spark.position.copy(touchData.poi);
    
    normalVec.normalize();
    var projMagOnNormal = spark.currVelocity.dot(normalVec)*(coefRes+coefFric);
    spark.currVelocity.add(normalVec.multiplyScalar(-1*projMagOnNormal));
    spark.initialPos = spark.position.clone();
    spark.initialVelocity = spark.currVelocity.clone(); 
    spark.birthTime = clock.getElapsedTime();
}

//changes to make to spark after it bounces from cube
function bounceSparkFromCube(spark)
{
    var face = getCubeCollisionFace(spark);// face of cube with which collision took place
    var box = cubeBoundingBox;
    var normal = new THREE.Vector3(0,0,0);
    switch(face) {
        case "top":
            spark.position.y = box[1].y;
            spark.currVelocity.y *= -1*coefRes;
            spark.currVelocity.x *= coefFric;
            spark.currVelocity.z *= coefFric;
            normal.set(0,1,0);
            break;
        case "left":
            spark.position.x = box[1].x;
            spark.currVelocity.y *= coefFric;
            spark.currVelocity.x *= -1*coefRes;
            spark.currVelocity.z *= coefFric;
            normal.set(1,0,0);
            break;
        case "right":
            spark.position.x = box[0].x;
            spark.currVelocity.y *= coefFric;
            spark.currVelocity.x *= -1*coefRes;
            spark.currVelocity.z *= coefFric;
            normal.set(-1,0,0);
            break;
        case "back":
            spark.position.z = box[0].z;
            spark.currVelocity.y *= coefFric;
            spark.currVelocity.x *= coefFric;
            spark.currVelocity.z *= -1*coefRes;
            normal.set(0,0,-1);
            break;
        case "front":
            spark.position.z = box[1].z;
            spark.currVelocity.y *= coefFric;
            spark.currVelocity.x *= coefFric;
            spark.currVelocity.z *= -1*coefRes;
            normal.set(0,0,1);
            break;
    }
    
        
    spark.prePos = new THREE.Vector3(spark.position.x, spark.position.y, spark.position.z);
    spark.initialPos = spark.position.clone();
    spark.initialVelocity = spark.currVelocity.clone(); 
    spark.birthTime = clock.getElapsedTime();
    return normal.normalize();
}

//changes to make to spark after it bounces from ground
function bounceSparkFromGround(spark) 
{
    spark.prePos = new THREE.Vector3(spark.position.x, spark.position.y, spark.position.z);
    spark.initialPos.y = 0;
    spark.initialPos.x = spark.position.x;
    spark.initialPos.z = spark.position.z;
    spark.prePos.y = spark.initialPos.y;
    spark.initialVelocity.y =  -1*spark.currVelocity.y*coefRes;
    spark.initialVelocity.x =  spark.currVelocity.x*coefFric;
    spark.initialVelocity.z =  spark.currVelocity.z*coefFric;
    spark.currVelocity = spark.initialVelocity.clone();
    spark.birthTime = clock.getElapsedTime();
}

//changes to make to spark after it bounces from sphere
function bounceSparkFromSphere(spark)
{ 
    var normalVec = new THREE.Vector3(0,0,0);
    normalVec.subVectors(spark.position, givenSphereCenter);
    normalVec.setLength(givenSphereRadius);
    var normal = normalVec.clone().normalize();
    spark.prePos = new THREE.Vector3(spark.position.x, spark.position.y, spark.position.z);
    spark.position.addVectors(normalVec, givenSphereCenter);
    spark.initialPos = spark.position.clone();
    normalVec.normalize();
    var projMagOnNormal = spark.currVelocity.dot(normalVec)*(coefRes+coefFric);
    spark.currVelocity.add(normalVec.multiplyScalar(-1*projMagOnNormal));
    spark.initialVelocity = spark.currVelocity.clone(); 
    spark.birthTime = clock.getElapsedTime();
    return normal;
}

//changes in spark after every iteration 
function changeSparkAndLinePos(spark, line, pos)
{
    spark.prePos = spark.position.clone(); 
    spark.position.set(pos[0], pos[1], pos[2]);
    var tempVertex = new THREE.Vector3().subVectors(spark.position, spark.currVelocity.clone().multiplyScalar(0.05));
    line.geometry.vertices[0].set(tempVertex.x, tempVertex.y, tempVertex.z);
    line.geometry.vertices[1].set(spark.position.x, spark.position.y, spark.position.z);
    line.geometry.verticesNeedUpdate = true;
}

//returns the face of cube with which collision took place 
function getCubeCollisionFace(spark)
{
    var box = cubeBoundingBox;
    var faces = ["top", "left", "right", "back", "front"];
    var a = [box[1].y, box[1].x, box[0].x, box[0].z, box[1].z];
    var b = [spark.position.y,spark.position.x,spark.position.x,spark.position.z,spark.position.z ]
    var minIndex = 0;
    for(var i=0; i<5; i++) {
        if(Math.abs(a[i] - b[i]) < Math.abs(a[minIndex] - b[minIndex])) {
            minIndex = i;
        }
    }
    return faces[minIndex];
}

//generating random normal distribution 
function genGaussian(mean, stdev)
{
    var x1 = Math.random();
    var x2 = Math.random();

    var y1 = Math.sqrt(-2*Math.log(x1))*Math.cos(2*Math.PI*x2);
    var y2 = Math.sqrt(-2*Math.log(x1))*Math.sin(2*Math.PI*x2);

    if(x1 > x2) {
        return y2*stdev + mean;
    } else {
        return y1*stdev + mean;
    }
}

//returns 2 vectors perpendicular to each other and the normal at the point of collision
function get2RandomVecCompsInPlane(vec, planeN)
{
    var phi = Math.random()*2*Math.PI;
    
    var firstDirn = vec.clone();
    firstDirn.applyAxisAngle(planeN, phi);
    firstDirn.normalize();
    var firstComp = vec.clone();
    firstComp.projectOnVector(firstDirn);

    var secondComp = vec.clone();
    secondComp.sub(firstComp);
    return [firstComp, secondComp];
}

//spark color with respect to its temperature
function getHexColorFromTemp( temperature, maxTemp )
{
    var color = [0xFEF5DF, 0xFEE9AA, 0xFECA83, 0xFEA865, 0xFD854E, 0xF4694F, 0xEC453A, 0xC51120, 0xAC1622];
    var factor = (maxTemp - roomTemp)/9.0;
    var index = Math.floor((maxTemp - temperature)/factor);
    if(index < 0 || index > 8) {
        index = 2;
    }
    return color[index];
}

//get new properties for spark, required at spark generation
function getNewProperties()
{
    var properties = new Object();
    properties.initialSpeed = genGaussian(meanInitialSpeed, deviationInitialSpeed);
    properties.initialTheta = genGaussian(meanTheta, deviationTheta);
    properties.initialPhi = genGaussian(meanPhi, deviationPhi);
    properties.initialTemperature = genGaussian(meanTemperature, deviationTemperature);
    properties.radius = genGaussian(meanRadius, deviationRadius);
    properties.mass = (4.0*sparkDensity*Math.PI*Math.pow(properties.radius, 3)) / 3.0;
    properties.initialPos = new THREE.Vector3(initialSparkPosition.x, initialSparkPosition.y, initialSparkPosition.z);
    properties.splittable = true;
    properties.birthTime = clock.getElapsedTime();
    properties.mainBirthTime = properties.birthTime;
    return properties;
}

//returns an ID for each spark
function getNewSparkID()
{
    if(countID >= MAX_COUNT_ID) {
        countID = 1;
    }
    return countID++;
}

//returns spark properties
function getSparkProperties(spark)
{
    var properties = new Object();
    properties.mass = spark.mass;
    properties.initialSpeed = spark.initialSpeed;
    properties.initialTheta = spark.initialTheta;
    properties.initialPhi = spark.initialPhi;
    properties.initialPos = spark.initialPos;
    properties.radius = spark.radius;
    properties.splittable = spark.splittable;
    properties.name = spark.name;
    properties.initialTemperature = spark.initialTemperature;
    properties.birthTime = spark.birthTime;
    properties.mainBirthTime = spark.mainBirthTime;
    return properties; 
}


//get the splitted sparks at collision
function getSplitSparksForPlane(spark, sparkKE, planeUnitNormal)
{
    var numParts = Math.ceil(sparkKE/coldMinSplitEnergy); // number of splitted sparks
    
    if(numParts > 3) {
        numParts = 3;
    }

    var P = spark.currVelocity.clone();
    P.multiplyScalar(spark.mass); // Spark Momentum
    var n = planeUnitNormal.clone(); //normal vector to spark collision plane
    var PPerp = P.clone();
    PPerp.projectOnVector(n); // Perpendicular to plane component
    var PPar = P.clone();
    PPar.sub(PPerp); // Parallel to plane component
    var pPerp = PPerp.clone();
    pPerp.multiplyScalar(1.0/numParts); // Final perp momentum for each subSpark
    var pPars = [];
    pPars[0] = PPar.clone();
    
    for (var i = 0; i < numParts-1; i++) {
        var temp = get2RandomVecCompsInPlane(pPars[i], n);
        pPars[i] = temp[0];
        pPars[i+1] = temp[1];
    }

    var vs = [];
    var m = spark.mass/numParts;
    
    for (var i = 0; i < numParts; i++) {
        vs[i] = new THREE.Vector3().addVectors(pPerp, pPars[i]);
        vs[i].multiplyScalar(1/m); // velocity from momentum.
    }

    var splitSparks = new Set();
    var properties = getSparkProperties(spark);
    
    //set properties for splitted sparks
    properties.mass = m;
    properties.radius /= Math.pow(numParts, 1.0/3.0 ); // Volume conservation.
    properties.initialPos.x = spark.position.x;
    properties.initialPos.y = spark.position.y;
    properties.initialPos.z = spark.position.z;
    properties.splittable = false;
    properties.initialTemperature = spark.currentTemperature;
    properties.birthTime = clock.getElapsedTime();
    
    for(var i = 0; i < numParts; i++) {
        var id = getNewSparkID();
        var tempVec = vs[i].clone();
        tempVec.normalize();
        properties.name = "Spark" + id;
        properties.initialSpeed = vs[i].length();
        properties.initialTheta = Math.asin(tempVec.y);
        properties.initialPhi = (tempVec.z != 0) ? Math.atan(tempVec.x/tempVec.z) : Math.PI/2;
        var subSpark = makeSpark(properties);
        splitSparks.add(subSpark);
    }        
    
    return splitSparks;
}

//returns the initial velocity of spark projectile
function getVelocity(speed, theta, phi)
{
    velocityX = -1*speed*Math.cos(theta)*Math.sin(phi);
    velocityY = speed*Math.sin(theta);
    velocityZ = speed*Math.cos(theta)*Math.cos(phi);
    var velocity = new THREE.Vector3(velocityX, velocityY, velocityZ);
    return velocity;
}

function init()
{
    
    scene = new THREE.Scene(); // Create the scene and set the scene size.
    loadingManager = new THREE.LoadingManager(); // keep a loading manager
    container = document.createElement( 'div' ); // Get container information
    document.body.appendChild( container ); 
        
    var WIDTH = window.innerWidth, HEIGHT = window.innerHeight; //in case rendering in body
    
    // Create a renderer and add it to the DOM.
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(WIDTH, HEIGHT);
    renderer.setClearColor(0x000000, 1);
    container.appendChild( renderer.domElement );

    // Create a camera, zoom it out from the model a bit, and add it to the scene.
    camera = new THREE.PerspectiveCamera(45.0, WIDTH / HEIGHT, 0.01, 100);
    camera.position.set(0, 3, -8);
    camera.name = "myCamera";
    scene.add(camera);
  
    // Create an event listener that resizes the renderer with the browser window.
    window.addEventListener('resize',
        function ()
        {
            var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
            renderer.setSize(WIDTH, HEIGHT);
            camera.aspect = WIDTH / HEIGHT;
            camera.updateProjectionMatrix();
        }
    );

    // Create a light, set its position, and add it to the scene.
    var directionalLight = new THREE.DirectionalLight( 0xffeedd , 0.75);
    directionalLight.position.set( 0, 5, 0 );
    directionalLight.castShadow = true;
    scene.add( directionalLight );

    var plight = new THREE.PointLight( 0xFEF5DF , 10, 15, 20 );
    plight.position.set( initialSparkPosition.x + 0.3, initialSparkPosition.y + 0.3, initialSparkPosition.z  );
    scene.add( plight );

    var plight1 = new THREE.PointLight( 0xFEF5DF , 2, 7, 10 );
    plight1.position.set( 2+xOffset, 1.5, -0.1 );
    scene.add( plight1 );

    var plight2 = new THREE.PointLight( 0xFEF5DF , 2, 7, 10 );
    plight2.position.set( 2+xOffset, 1.5, 0.1 );
    scene.add( plight2 );

    // Load in the mesh and add it to the scene.
    var sawBlade_texPath = 'assets/sawblade.jpg';
    var sawBlade_objPath = 'assets/sawblade.obj';
    OBJMesh(sawBlade_objPath, sawBlade_texPath, "sawblade");

    var ground_texPath = 'assets/ground_tile.jpg';
    var ground_objPath = 'assets/ground.obj';
    OBJMesh(ground_objPath, ground_texPath, "ground");

    var slab_texPath = 'assets/slab.jpg';
    var slab_objPath = 'assets/slab.obj';
    OBJMesh(slab_objPath, slab_texPath, "slab");

    //Sphere
    var sphere_texPath = 'assets/rocky.jpg';
    var sphere_objPath = 'assets/sphere.obj';
    OBJMesh(sphere_objPath, sphere_texPath, "sphere");
    
    //Cube
    var cube_texPath = 'assets/rocky.jpg';
    var cube_objPath = 'assets/cube.obj';
    OBJMesh(cube_objPath, cube_texPath, "cube");

    //Stanford Bunny
    var bunny_texPath = 'assets/rabbitFur2.jpg';
    var bunny_objPath = 'assets/stanford_bunny.obj';
    OBJMesh(bunny_objPath, bunny_texPath, "bunny");

    // Add OrbitControls so that we can pan around with the mouse.
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.4;
    controls.userPanSpeed = 0.01;
    controls.userZoomSpeed = 0.01;
    controls.userRotateSpeed = 0.01;
    controls.minPolarAngle = -Math.PI/2;
    controls.maxPolarAngle = Math.PI/2;
    controls.minDistance = 0.01;
    controls.maxDistance = 30;

    clock = new THREE.Clock();
    var delta = clock.getDelta();
}

//introduce sparks in positive x and add them to scene
function introduceOppositeSparkIfHead()
{
    var tossHead = Math.random() > 0.5;
    if(tossHead) {
        var props = getNewProperties(); //new spark properties
        var id = getNewSparkID(); //spark ID
        props.name = "Spark" + id;
        
        //sparks in this direction have low speed and high PI
        props.initialTheta += Math.PI;
        props.initialSpeed /= 4;
        
        var spark = makeSpark(props);// generate spark object
        scene.add(spark);
        scene.add(spark.line);
        sparks[spark.name] = spark;
    }
}

//introduce sparks in negative x and add them to scene
function introduceSparkIfHead()
{
    var tossHead = Math.random() >= 0;
    if(tossHead) {
            var props = getNewProperties();
            var id = getNewSparkID();
            props.name = "Spark" + id;
        
            var spark = makeSpark(props); // generate spark object
            spark.position.set(spark.initialPos.x,spark.initialPos.y,spark.initialPos.z );
            scene.add(spark);
            scene.add(spark.line);
            sparks[spark.name] = spark;
    }
}

//generates spark
function makeSpark(properties)
{
    var sparkSphere = new THREE.SphereBufferGeometry(properties.radius);
    var sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    var spark = new THREE.Mesh(sparkSphere, sparkMaterial);
    
    spark.name = properties.name;
    spark.mass = properties.mass;
    spark.initialSpeed = properties.initialSpeed;
    spark.initialTheta = properties.initialTheta;
    spark.initialPhi = properties.initialPhi;
    spark.currVelocity = getVelocity(properties.initialSpeed, properties.initialTheta, properties.initialPhi);
    spark.initialVelocity = getVelocity(properties.initialSpeed, properties.initialTheta, properties.initialPhi);
    spark.initialPos = properties.initialPos;
    spark.prePos = spark.initialPos;
    spark.splittable = properties.splittable;
    spark.initialTemperature = properties.initialTemperature;
    spark.currentTemperature = properties.initialTemperature;
    spark.material.color.setHex( getHexColorFromTemp(spark.currentTemperature, spark.initialTemperature) );
    spark.radius = properties.radius;
    spark.atRest = false;
    spark.birthTime = properties.birthTime;
    spark.mainBirthTime = properties.mainBirthTime;
    
    var material = new THREE.LineBasicMaterial({color: 0xFECA83, linewidth:3, fog:true});
    var geometry = new THREE.Geometry();
    geometry.vertices.push(spark.prePos.clone());
    geometry.vertices.push(spark.initialPos.clone());
    spark.line = new THREE.Line(geometry, material);
    spark.line.material.color.setHex(getHexColorFromTemp(spark.currentTemperature, spark.initialTemperature));
    spark.line.name = spark.name + "line";
    
    return spark;
}

//Object loader 
function OBJMesh(objpath, texpath, objName)
{
    var texture = new THREE.TextureLoader( loadingManager ).load(texpath, onLoad, onProgress, onError);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    var loader  = new THREE.OBJLoader( loadingManager ).load(objpath,  
        function ( object )
        {
            object.traverse(
                function ( child )
                {
                    if(child instanceof THREE.Mesh)
                    {
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                    }
                }
            );

            object.name = objName;
            scene.add( object );
            //convertimg bufferGeometry of objects to geometry for getting vertexNormals 
            if(objName != "sawblade" && objName != "bunny" ) {
                var geometry = new THREE.Geometry().fromBufferGeometry( object.children[0].geometry );
                geometry.computeFaceNormals();
                geometry.mergeVertices();
                geometry.computeVertexNormals();
                object.children[0].geometry = geometry;
            }
            if(objName == "bunny") {
                var geometry = new THREE.Geometry().fromBufferGeometry( object.children[0].geometry );
                geometry.computeFaceNormals();
                geometry.mergeVertices();
                geometry.computeVertexNormals();
                object.children[0].geometry = geometry;
                bunnyGeometry = geometry;
            }
            //setting objects position in scene
            if(objName == "sawblade" || objName == "slab" || objName == "sphere") {
                translate(object, 2, 0, 0);
            }
            
            if (objName == "sawblade" || objName == "slab")
                translate(object, xOffset, 0, 0);
                
            if(objName == "cube") {
                translate(object, 1, 0, 1.1);    
            }
            onLoad( object );
        },
    onProgress, onError);
}

function onError( xhr )
{
    putText(0, "Error", 10, 10);
}

function onLoad( object )
{
    putText(0, "", 0, 0);
    i_share ++;
    if(i_share >= n_share)
        i_share = 0;
}

function onProgress( xhr )
{ 
    if ( xhr.lengthComputable )
    {
        var percentComplete = 100 * ((xhr.loaded / xhr.total) + i_share) / n_share;
        putText(0, Math.round(percentComplete, 2) + '%', 10, 10);
    }
}

//processing needed after every iteration
function postProcess()
{
    var delta = clock.getDelta();
    postProcessSawblade(delta); // rotation of sawblade
    for(var i = 0;i<1;i++) {
        for (var j = 0; j < 1; j++) {
        introduceSparkIfHead(); //generate sparks in negative x
        }
        introduceOppositeSparkIfHead(); // generate sparks in positive x
    }
    postProcessSparks(delta); // spark animation
}

//rotate sawBlade to perform cutting
function postProcessSawblade(deltaT)
{
    var asset = scene.getObjectByName( "sawblade" );
    translate(asset, -2-xOffset, -1.5, 0);
    rotate(asset, new THREE.Vector3(0,0,1), -9* deltaT); //rotate sawblade
    translate(asset, 2+xOffset, 1.5, 0);
}

//animation of sparks
function postProcessSparks()
{
    var toAddSparks = new Set(); // set of new sparks to be added to scene
    var toDelSparks = new Set(); // set of sparks to be deleted
    var t = clock.getElapsedTime();
    for(var sparkName in sparks) {
        if(sparks.hasOwnProperty(sparkName)) {
            var spark = scene.getObjectByName(sparkName);
            spark.line = scene.getObjectByName(spark.name + "line");
            
            var pos = updateSparkProperties(spark, spark.line, t);// updates spark positions for animation
            if(spark.currentTemperature < criticalTemp)
            {
                toDelSparks.add(spark); // if spark reaches room temp, it dies
                continue;
            }
            changeSparkAndLinePos(spark, spark.line, pos); //make changes for animation
            
            ////// Ground Collision ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if(sparkTouchesGround(spark)) {
                //bounce spark from ground
                bounceSparkFromGround(spark);
                var toBeSplitData = sparkToBeSplitFromObject(spark, "ground");// spark splitting
                if(toBeSplitData.toBeSplitStatus) {
                    spark.splittable = false;
                    // get the splitted sparks
                    var splitSparks = getSplitSparksForPlane(spark, toBeSplitData.KE, new THREE.Vector3(0,1,0));
                    for(let subSpark of splitSparks) {
                        toAddSparks.add(subSpark);
                    }
                    toDelSparks.add(spark);
                }
            }
            
            ////// Sphere Collision ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if(sparkTouchesSphere(spark)) {
                //bounce spark from ground
                var normal = bounceSparkFromSphere(spark);
                var toBeSplitData = sparkToBeSplitFromObject(spark, "sphere");
                if(toBeSplitData.toBeSplitStatus) {
                    spark.splittable = false;
                    //get tje splitted sparks
                    var splitSparks = getSplitSparksForPlane(spark, toBeSplitData.KE, normal);
                    for(let subSpark of splitSparks) {
                        toAddSparks.add(subSpark);
                    }   
                    toDelSparks.add(spark);
                }
            }

            ////// Cube Collision ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if(sparkTouchesCube(spark)) {
                //bounce spark from cube
                var normal = bounceSparkFromCube(spark);
                var toBeSplitData = sparkToBeSplitFromObject(spark, "cube");
                if(toBeSplitData.toBeSplitStatus) {
                    spark.splittable = false;
                    //get splitted sparks on spark collision
                    var splitSparks = getSplitSparksForPlane(spark, toBeSplitData.KE, normal);
                    for(let subSpark of splitSparks) {
                        toAddSparks.add(subSpark);
                    }   
                    toDelSparks.add(spark);
                }
            }

            ////// Bunny Collision ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            var touchData = sparkTouchesBunny(spark);
            if(touchData.touchStatus) {
                //bounce spark from bunny
                bounceSparkFromBunny(spark, touchData);
                var toBeSplitData = sparkToBeSplitFromBunny(spark, touchData);
                if(toBeSplitData.toBeSplitStatus) {
                    spark.splittable = false;
                    //get splitted sparks on spark collision
                    var splitSparks = getSplitSparksForPlane(spark, toBeSplitData.KE, bunnyGeometry.faces[touchData.faceIndex].normal.clone());
                    for(let subSpark of splitSparks) {
                        toAddSparks.add(subSpark);
                    }   
                    toDelSparks.add(spark);
                }
            }            
            
        }
    }
    //update scene according to changes in spark
    updateSceneSparks(toAddSparks, toDelSparks);
}

//check if spark in bounding box of object
function sparkInBoundingBox(position, box)
{
    var minVector = box[0];
    var maxVector = box[1];
    if(position.x >= minVector.x && position.x <= maxVector.x &&
        position.y >= minVector.y && position.y <= maxVector.y && 
        position.z >= minVector.z && position.z <= maxVector.z ) {
        return true;
    } 
    return false;
}
//spark to be split on collision with bunny
function sparkToBeSplitFromBunny(spark, touchData)
{
    var status = false;
    var normalVec = bunnyGeometry.faces[touchData.faceIndex].normal.clone();
    normalVec.normalize();
    //kinetic energy = 0.5 * mass of object * its velocity
    var sparkKineticEnergy = 0.5*spark.mass * Math.pow(spark.currVelocity.dot(normalVec), 2);

    //condition if spark to be splitted or not
    if(sparkKineticEnergy > coldMinSplitEnergy && spark.splittable == true) {
        status = true;
    }
    return {toBeSplitStatus:status, KE:sparkKineticEnergy};
}

//check spark splitting from some object
function sparkToBeSplitFromObject(spark, object)
{
    var normalVec = new THREE.Vector3(0,0,0);
    var status = false;
    if(object == "ground") {
        normalVec.setY(1);
    } else if(object == "sphere") {
        normalVec.subVectors(spark.position, givenSphereCenter);
        normalVec.normalize();
    } else if(object == "cube") {
        var face = getCubeCollisionFace(spark);
        switch(face){
            case "top" :
                normalVec.set(0,1,0);
                break;
            case "left":
                normalVec.set(1,0,0);
                break;
            case "right":
                normalVec.set(-1,0,0);
                break;
            case "back":
                normalVec.set(0,0,-1);
                break;
            case "front":
                normalVec.set(0,0,1);
                break;
        }
        normalVec.normalize();
    }
    var sparkKineticEnergy = 0.5*spark.mass * Math.pow(spark.currVelocity.dot(normalVec), 2);
    if(sparkKineticEnergy > coldMinSplitEnergy && spark.splittable == true) {
        status = true;
    }
    return {toBeSplitStatus:status, KE:sparkKineticEnergy};
}

//check if spark touches bunny
function sparkTouchesBunny(spark)
{
    var touchData = {touchStatus:false, faceIndex:-1, poi:0};
    if(sparkInBoundingBox(spark.position, bunnyBoundingBox)) 
    {
        touchData = sparkTouchesBunnySurface(spark);
    }
    return touchData;
}

//if spark touches bunny
function sparkTouchesBunnySurface(spark)
{
    var vertices = bunnyGeometry.vertices;
    var faces = bunnyGeometry.faces;
    var prePos = new THREE.Vector3(spark.prePos.x, spark.prePos.y, spark.prePos.z);
    var currPos = new THREE.Vector3(spark.position.x, spark.position.y, spark.position.z);
    var index = -1;
    var flag = false;
    var poInt = new THREE.Vector3(0,0,0);

    for(var i=0; i<faces.length; i++) {
        
        var face = faces[i];
        var vertex1 = vertices[face.a];
        var vertex2 = vertices[face.b];
        var vertex3 = vertices[face.c];

        var a = -1, b = -1, alpha = -1;

        var A = new THREE.Matrix4();
        A.set(vertex2.x - vertex1.x, vertex2.y - vertex1.y, vertex2.z - vertex1.z, 0,
            vertex3.x - vertex1.x, vertex3.y - vertex1.y, vertex3.z - vertex1.z, 0,
            currPos.x - prePos.x, currPos.y - prePos.y, currPos.z - prePos.z, 0,
            0,0,0,1 );
        var C = new THREE.Vector3(prePos.x - vertex1.x, prePos.y - vertex1.y, prePos.z - vertex1.z );

        var AInv = new THREE.Matrix4();
        if(A.determinant() != 0) {
            AInv.getInverse(A); 
            a = C.x*AInv.elements[0] + C.y*AInv.elements[4] + C.z*AInv.elements[8];
            b = C.x*AInv.elements[1] + C.y*AInv.elements[5] + C.z*AInv.elements[9];
            alpha = -1*(C.x*AInv.elements[2] + C.y*AInv.elements[6] + C.z*AInv.elements[10]);
        }
        if(alpha >= 0 && alpha <= 1 && a >= 0 && b >= 0 && a+b <= 1) {
            flag = true;
            index = i;
            var xComp = (1 - a - b)*vertex1.x + a*vertex2.x + b*vertex3.x;
            var yComp = (1 - a - b)*vertex1.y + a*vertex2.y + b*vertex3.y;
            var zComp = (1 - a - b)*vertex1.z + a*vertex2.z + b*vertex3.z;
            var pointInt = new THREE.Vector3(xComp, yComp, zComp);
            poInt = pointInt;
            break;
        }   
    }
    return {touchStatus:flag, faceIndex:index, poi: poInt};
}

//if spark touches cube
function sparkTouchesCube(spark)
{
    if(sparkInBoundingBox(spark.position, cubeBoundingBox)) {
            return true;   
    }
    return false;
}

//if spark touches ground
function sparkTouchesGround(spark)
{
    if(spark.position.y <= 0) {
        return true;
    } else { 
        return false;
    }
}

//if spark touches sphere
function sparkTouchesSphere(spark)
{
    if(sparkInBoundingBox(spark.position, sphereBoundingBox)) {
        return (givenSphereCenter.distanceTo(spark.position) <= givenSphereRadius) ;
    }
    return false;
}

function putText( divid, textStr, x, y )
{
    var text = document.getElementById("avatar_ftxt" + divid);
    text.innerHTML = textStr;
    text.style.left = x + 'px';
    text.style.top  = y + 'px';
}

function putTextExt(dividstr, textStr) //does not need init
{
    var text = document.getElementById(dividstr);
    text.innerHTML = textStr;
}

//rotate object
function rotate(object, axis, radians)
{
    var rotObjectMatrix = new THREE.Matrix4();
    rotObjectMatrix.makeRotationAxis(axis.normalize(), radians);
    object.applyMatrix(rotObjectMatrix);
}

//translate object
function translate(object, x, y, z)
{
    var transObjectMatrix = new THREE.Matrix4();
    transObjectMatrix.makeTranslation(x, y, z);
    object.applyMatrix(transObjectMatrix);
}

//update scene according to changes in sparks
function updateSceneSparks(toAddSparks, toDelSparks)
{
    for(let spark1 of toDelSparks) {
        var spark = scene.getObjectByName(spark1.name);
        scene.remove(spark.line);//delete from scene
        scene.remove(spark);
        delete sparks[spark.name];
    }
    for(let subSpark of toAddSparks) {
        scene.add(subSpark);// add to scene
        scene.add(subSpark.line);
        sparks[subSpark.name] = subSpark;
    }
}

//update spark properties according to projectile
function updateSparkProperties(spark, line, t)
{
    var sparkAge = t - spark.birthTime;

    //velocity components
    var vx0 = spark.initialVelocity.x;
    var vy0 = spark.initialVelocity.y;
    var vz0 = spark.initialVelocity.z;
    
    //mass divided bt drag coefficient
    var mByK = spark.mass/coefAirDrag;
    var e_KTByM = Math.exp(-1*(sparkAge/mByK)); 
    
    //new postition of spark as per projectile, friction, airDrag
    var posX = spark.initialPos.x + mByK*vx0*(1-e_KTByM);
    var posY = spark.initialPos.y -  mByK*g*sparkAge + mByK*(vy0 + mByK*g)*(1 - e_KTByM);
    var posZ = spark.initialPos.z + mByK*vz0*(1-e_KTByM);

    //velocity update of spark according to projectile considering gravity, drag
    spark.currVelocity.x = vx0*e_KTByM;
    spark.currVelocity.y = -1*mByK*g + (vy0 + mByK*g)*e_KTByM;
    spark.currVelocity.z = vz0*e_KTByM;

    //update in spark temperature with respect to time
    spark.currentTemperature = roomTemp + (spark.initialTemperature - roomTemp)*Math.exp(-1*rateOfCooling*(t - spark.mainBirthTime));    
    
    //change spark color
    spark.material.color.setHex(getHexColorFromTemp(spark.currentTemperature, spark.initialTemperature));
    line.material.color.setHex(getHexColorFromTemp(spark.currentTemperature, spark.initialTemperature));

    return [posX, posY, posZ];
}
