/* global THREE */
/*
Please Import three.js / parser.js / orbitControls.js
EXAMPLE

    var temp = new TDBox(filePath(or fileObject), $('#TDBox'));
    temp.setCamera();
    temp.addCameraControl();
    temp.setPlane(plane_size.x, plane_size.y, plane_size.z);
    temp.setGuide(plane_size.x, plane_size.y, plane_size.z);
    temp.setbgImg("/static/img/TDBox-bg3.png");
    temp.startAnimate();
*/
var TDBox = function (model, container) {
    var self = this;
    var cancel_download=false;
    if (typeof container != "object") {
        throw "Container";
    }
    this.container = container;
    this.scene = new THREE.Scene();
    this.windowHeight = window.innerHeight;
    //URL CASE
    if (typeof model =="string") {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', model, true);
        xhr.contentType = 'text/plain';
        xhr.responseType = 'blob';
        xhr.onload = function(e) {
            if (this.readyState == 4 && this.status == 200) {
                blob = this.response;
                if (blob.type == "application/x-tgif") {
                    blob.name = "test.obj";
                }
                else {
                    blob.name = "test.stl";
                }
                console.log(blob)
                upload_file(blob)
            }
        };
        xhr.send();
    }
    //FILE CASE
    else if (typeof model == "object") {
        upload_file(model);
    }
    else {
        alert ("ERROR");
    }
    //RENDERER SETTING
    try {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha : true, preserveDrawingBuffer: true });
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;
        this.renderer.shadowMapEnabled = true;
        this.renderer.shadowMapSoft = true;
        this.renderer.shadowCameraNear = 3;
        this.renderer.shadowCameraFar = 100000;
        this.renderer.shadowCameraFov = 50;
        this.renderer.shadowMapBias = 0.0039;
        this.renderer.shadowMapDarkness = 0.5;
        this.renderer.shadowMapWidth = 1024;
        this.renderer.shadowMapHeight = 1024;
        this.renderer.setClearColor( 0x000000, 0);
        this.renderer.setViewport(0,0,this.container.width() , this.container.height())
    }
    //NOT SUPPORT WEBGL
    catch (err) {
        alert("Your Browser is not support webGL\nVisit https://get.webgl.org.")
        location.reload()
    }
    //FILE PROCESSING
    function upload_file(f) {
        if (f.size>41943040)
        {
            alert('File is too big - maximum allowed size is 40mb');
            return false;
        }

        read_file(f);
    }
    function read_file(f) {
        waiting=true;

        var reader = new FileReader()

        reader.onerror = function(e) {
        var error_str="";
        switch(e.target.error.code) {
            case e.target.error.NOT_FOUND_ERR:
                error_str="File not found";
            break;

            case e.target.error.NOT_READABLE_ERR:
                error_str="Can't read file - too large?";
            break;

            case e.target.error.ABORT_ERR:
                error_str="Read operation aborted";
            break;

            case e.target.error.SECURITY_ERR:
                error_str="File is locked";
            break;

            case e.target.error.ENCODING_ERR:
                error_str="File too large";

            break;

            default:
                error_str="Error reading file";
        }
        alert(error_str);
        return after_error();
    }

    reader.onload = function(e)
    {
        setTimeout(function(){after_file_load(f.name, e.target.result)}, 500);
    };

    reader.onprogress = function(e)
    {
        if (cancel_download)
        {
            reader.abort();
            return after_error();
        }
    };


    reader.readAsArrayBuffer(f);
}
    function after_file_load(filename, s) {
        var vf_data;

        try {
            vf_data=parse_3d_file(filename, s);
        }
        catch(err) {
            vf_data="Error parsing the file";
        }

        if (typeof vf_data === 'string') {
            alert(vf_data);
            return;
        }

        if (self.mesh!=null) {scene.remove(self.mesh);self.mesh=null};
        var material=new THREE.MeshPhongMaterial({color:0xC9BFBF, specular: 0xFFFFFF, shininess: 32, overdraw: 1, wireframe: false, shading:THREE.FlatShading, vertexColors: THREE.FaceColors});
        //var material=new THREE.MeshLambertMaterial({color:0xE2D3E0, overdraw: 1, wireframe: false, shading:THREE.FlatShading, vertexColors: THREE.FaceColors});
        var geo=new THREE.Geometry;
        geo.vertices=vf_data.vertices;
        geo.faces=vf_data.faces;
        geo.computeBoundingBox();

        //geo.computeCentroids();
        geo.computeFaceNormals();
        geo.computeVertexNormals();
        THREE.GeometryUtils.center(geo);
        self.mesh = new THREE.Mesh(geo, material);
        self.mesh.position.set(0,0,0);
        self.mesh.rotation.set(0,0,0);
        self.mesh.scale.set(1,1,1);
        self.mesh.rotation.x = -90 * Math.PI/180;

        self.mesh.castShadow = false;
        self.mesh.receiveShadow = false;

        self.scene.add(self.mesh);

        //self.camera.position.set(0,0,Math.max(geo.boundingBox.max.x*3,geo.boundingBox.max.y*3,geo.boundingBox.max.z*3));
    }

    function addSpotLight (x,y,z, its, color) {
        var spotLight = new THREE.SpotLight(color,its);
        spotLight.position.set(x,y,z);

        spotLight.castShadow = true;
        spotLight.shadowCameraVisible = false;

        spotLight.shadowDarkness = 0.5;
        spotLight.shadowMapWidth = 1024;
        spotLight.shadowMapHeight = 1024;

        spotLight.shadowCameraNear = 2;
        spotLight.shadowCameraFar = 4048;
        spotLight.shadowCameraLeft = -0.5;
        spotLight.shadowCameraRight = 0.5;
        spotLight.shadowCameraTop = 0.5;
        spotLight.shadowCameraBottom = -0.5;
        self.scene.add(spotLight);    
    }
    addSpotLight(0,1000,0,0.8,0xffffff);      //바로 위
    addSpotLight(0,5,1000,0.6,0xffffff);      //정면
    addSpotLight(1000,1500,0,0.7,0xffffff);     //오른쪽 대각 위
    addSpotLight(-1000,1500,0,0.7,0xffffff);    //왼쪽 대각 위
    addSpotLight(0,5,-1500,0.6,0xffffff);    //뒷면
    addSpotLight(0,-1000,0,0.8,0xffffff);    //바로 아래
};
TDBox.prototype = {
    setCamera : function (x, y, z, angle) {
        x = x || -1;
        y = y || 120;
        z = z || 265;
        angle = angle || 37.5;
        // ANGLE : 카메라의 각도 / ASPECT : 현재 보이는 화면의 영역 / NEAR : 제일 가까이볼 거리 / FAR : 제일 멀리볼 거리 (NEAR와 FAR 사이의 물체만 볼수 있음)
        if (this.container instanceof jQuery) {
            var VIEW_ANGLE = angle, ASPECT = this.container.width() / this.container.height(), NEAR = 1, FAR = 10000000;
        }
        else {
            var VIEW_ANGLE = angle, ASPECT = this.container.width() / this.container.height(), NEAR = 1, FAR = 10000000;
        }
        this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
        this.camera.position.x = x;
        this.camera.position.y = y;
        this.camera.position.z = z;
        this.tanFOV = Math.tan(((Math.PI/180) * this.camera.fov / 2));
    },
    addCameraControl : function () {
        if (this.camera)
            this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        else
            throw "Please add Camera first."
    },
    changeCameraPos : function (x,y,z) {
        if ((typeof x == undefined) || (typeof y == undefined) || (typeof z == undefined)) {
            throw "value error"
        }
        this.camera.position.set(x,y,z);
    },
    setbgColor : function (color, opacity) {
        if ((typeof color == undefined) || (typeof opacity == undefined)) {
            throw "value error";
        }
        this.renderer.setClearColor(color, opacity);
    },
    setbgImg : function (img) {
        if (typeof img == undefined) {
            throw "value error";
        }
        var texture = THREE.ImageUtils.loadTexture( img );
        var backgroundMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, 0),
            new THREE.MeshBasicMaterial({
                map: texture
            }));
    
        backgroundMesh.material.depthTest = false;
        backgroundMesh.material.depthWrite = false;
    
        // Create your background scene
        this.backgroundScene = new THREE.Scene();
        this.backgroundCamera = new THREE.Camera();
        this.backgroundScene.add(this.backgroundCamera );
        this.backgroundScene.add(backgroundMesh )
    },
    setPlane : function (px, py, pz) {
        px = px || 512;
        py = py || 512;
        pz = pz || 256;
        this.px = px;
        this.py = py;
        this.pz = pz;
        var sizeX = px/2;
        var sizeY = py/2; 
        var step = 8;
        var planeGeo = new THREE.Geometry();
        var material = new THREE.LineBasicMaterial({color : 0xaaaaaa, opacity : 0.3, transparent : true});
        for (var i = -sizeY; i <= sizeY; i+= step) {
            planeGeo.vertices.push(new THREE.Vector3(-sizeX, -0.04, i));
            planeGeo.vertices.push(new THREE.Vector3(sizeX, -0.04, i));
        }
        for (var i = -sizeX; i <= sizeX; i+= step) {
            planeGeo.vertices.push(new THREE.Vector3(i, -0.04, -sizeY));
            planeGeo.vertices.push(new THREE.Vector3(i, -0.04, sizeY));
        }
        var basePlane = new THREE.Line(planeGeo, material, THREE.LinePieces);
        basePlane.position.y = 0.1;
        console.log(basePlane);
        this.scene.add( basePlane );
    },
    setGuide : function (px, py, pz) {
            var guide = new THREE.Mesh( new THREE.BoxGeometry( px, pz, py ), new THREE.MeshNormalMaterial() );
            this.scene.add(guide);
            guide.position.y = pz/2;
            guide.material.transparent = true;
            guide.material.opacity = 0;
            var guideMesh = new THREE.EdgesHelper( guide, 0x000000 );
            guideMesh.material.linewidth = 3;
            //guideMesh.material.transparent = true;
            guideMesh.material.opacity = 0.7;
            this.scene.add( guideMesh ); 
            this.guide = guideMesh;
            this.guideSize = new THREE.Box3().setFromObject(guideMesh).size()
    },
    deleteGuide : function () {
        if (this.guide == undefined) {
            throw "Guide is not defined"
        }
        else {
            this.scene.remove(this.guide);              
        }

    },
    changeModelScales : function (x,y,z) {
        if ((x == undefined) || (y == undefined) || (z == undefined)) {
            throw "value";
        }
        this.mesh.scale.set(x,y,z);
    },
    changeModelScale : function (val, axis) {
        if ((axis == undefined) || (val == undefined)) {
            throw "value";
        }
        switch (axis) {
            case "x" : 
                this.mesh.scale.x = val;
                break;
            case "y" : 
                this.mesh.scale.y = val;
                break;
            case "z" : 
                this.mesh.scale.z = val;
                break;
        }
    },
    changeModelRotates : function (x,y,z) {
        if ((x == undefined) || (y == undefined) || (z == undefined)) {
            throw "value error";
        }
        this.mesh.rotation.set(x,y,z);
    },
    changeModelRotate : function (val, axis) {
        if ((axis == undefined) || (val == undefined)) {
            throw "value error";
        }
        switch (axis) {
            case "x" : 
                this.mesh.rotation.x = val;
                break;
            case "y" : 
                this.mesh.rotation.y = val;
                break;
            case "z" : 
                this.mesh.rotation.z = val;
                break;
        }
    },
    /*changeModelColor : function (color) {
        if (typeof color == "undefined") {
            throw "color";
        }
        this.mesh.material.color.set(String(color));  
    },
    */
    changeModelColor : function (color, specular, shininess) {
        if ((typeof color == "undefined") || (typeof specular == "undefined") || (typeof shininess == "undefined")) {
            throw "Param Error";
        }
        this.mesh.material.color.set(color);
        this.mesh.material.specular.set(specular);
        this.mesh.material.shininess = shininess;
    },
    getModelInfo : function () {
        var oBox = new THREE.Box3().setFromObject(this.mesh);
        var returnObj = Object();
        var scaleObj = Object();
        var rotateObj = Object();
        
        scaleObj.x = Number(this.mesh.scale.x);
        scaleObj.y = Number(this.mesh.scale.y);
        scaleObj.z = Number(this.mesh.scale.z);
        
        rotateObj.x = this.mesh.rotation.x / Math.PI*180 + 90;
        rotateObj.y = this.mesh.rotation.y / Math.PI*180;
        rotateObj.z = this.mesh.rotation.z / Math.PI*180;
        
        returnObj.scale = scaleObj;
        returnObj.rotate = rotateObj;
        returnObj.size = oBox.size();
        
        return returnObj
    },
    startAnimate : function () {
        if (this.animId == undefined) {
            var r = this.renderer.domElement;
            var self = this;
            r.id = "3dCanvas";
            if (this.container instanceof jQuery) {
                this.container.append(r);
            }
            else {
                this.container.appendChild(r);                
            }
            if ($('#stlInfo').length) {
                var temp = setInterval(function () {
                    if (self.mesh != undefined) {
                        var stlInfo = self.getModelInfo()
                        $('#stlInfo #x').html(String(stlInfo.size.x.toFixed(2)) + "mm");
                        $('#stlInfo #y').html(String(stlInfo.size.y.toFixed(2)) + "mm");
                        $('#stlInfo #z').html(String(stlInfo.size.z.toFixed(2)) + "mm");
                        $('#stlInfo #infill').html("20%");
                        clearInterval(temp);
                    }
                },500);                
            }

            function render() {
                self.renderer.autoClear = false;
                self.renderer.clear();
                self.renderer.render(self.backgroundScene , self.backgroundCamera );
                self.renderer.render(self.scene, self.camera);
                //set Camera's target at model's center
                self.orbit.target.set(self.mesh.position.x, self.mesh.position.y, self.mesh.position.z);
                self.orbit.update();
                resizeRenderer();
                var meshBox = new THREE.Box3().setFromObject( self.mesh );
                var meshSize = meshBox.size();
                //모델이 바닥에 붙어있지않다면 바닥에 붙이도록
                if (meshBox.min.y != 0) {
                    self.mesh.position.y -= meshBox.min.y;
                }
                //모델이 가이드를 넘어간다면
                if ((self.guide) && (meshSize.x > self.guideSize.x || meshSize.y > self.guideSize.z || meshSize.z > self.guideSize.y)) {
                    self.changeModelScales(0.5, 0.5, 0.5);
                    $('input[type=range]#scalex').val(0.5);
                    $('input[type=range]#scaley').val(0.5);
                    $('input[type=range]#scalez').val(0.5);
                    $('p#scalex').html("X : 0.5");
                    $('p#scaley').html("Y : 0.5");
                    $('p#scalez').html("Z : 0.5");
                    $('p#scaleAll').html("크기 : 0.5" );
                    $('input[type=range]#scaleAll').val(0.5);

                    console.log("Too Big");
                }
            }
            function animate() {
                self.animId = requestAnimationFrame(animate.bind(this));
                if (typeof self.mesh != 'undefined') {
                    render();
                }
            }
            this.renderer.domElement.addEventListener('onload', resizeRenderer, false);
            function resizeRenderer() {
                self.camera.aspect = self.container.width() / self.container.height();
                self.camera.updateProjectionMatrix();

                self.renderer.setSize( self.container.width(), self.container.height() );
                self.renderer.setViewport(0,0,self.container.width() , self.container.height())
            }
            animate();
        }    
        else {
           throw "Animation is Duplicated. Please try after execute stopAnimate."
        }
    },
    stopAnimate : function () {
        cancelAnimationFrame(this.animId);
        this.animId = undefined;
        var parent = this.renderer.domElement.parentNode;
        var child = this.renderer.domElement;
        parent.removeChild(child);
        //this.renderer.domElement.remove(); IE11 ERROR
    }
}
