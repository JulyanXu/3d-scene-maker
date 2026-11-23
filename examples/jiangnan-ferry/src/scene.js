import { Reflector } from 'three/addons/objects/Reflector.js';

export const meta = { title: '雨歇江南渡', subtitle: '雨后黄昏的江南渡口' };

export function createScene({ THREE: T, scene, view, ui }) {
  let seed = 25121;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const range = (a, b) => a + (b - a) * random();
  const v = (x, y, z) => new T.Vector3(x, y, z);
  const color = hex => new T.Color(hex);
  function group(name, parent = scene) {
    const g = new T.Group(); g.name = name; parent.add(g); return g;
  }
  function mat(hex, values = {}) { return new T.MeshStandardMaterial({ color: hex, roughness: 0.8, ...values }); }
  function mesh(parent, geometry, material) {
    const object = new T.Mesh(geometry, material); parent.add(object); return object;
  }
  const cube = new T.BoxGeometry(1, 1, 1);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 8);
  const ball = new T.SphereGeometry(1, 16, 12);
  const placements = new Map();
  const scratch = new T.Object3D();
  function batch(parent, geometry, material, p, s, rotation) {
    const key = parent.uuid + geometry.uuid + material.uuid;
    if (!placements.has(key)) placements.set(key, { parent, geometry, material, matrices: [] });
    scratch.position.copy(p); scratch.scale.set(...s);
    if (rotation?.isQuaternion) scratch.quaternion.copy(rotation);
    else scratch.rotation.set(...(rotation || [0, 0, 0]));
    scratch.updateMatrix(); placements.get(key).matrices.push(scratch.matrix.clone());
  }
  function box(parent, x, y, z, w, h, d, material, rotation) {
    batch(parent, cube, material, v(x,y,z), [w,h,d], rotation);
  }
  function beam(parent, a, b, radius, material, square = false) {
    const direction = b.clone().sub(a);
    const length = direction.length();
    if (!length) return;
    const q = new T.Quaternion().setFromUnitVectors(v(0,1,0), direction.normalize());
    batch(parent, square ? cube : cylinder, material, a.clone().add(b).multiplyScalar(0.5),
      [radius, length, radius], q);
  }
  function line(parent, points, material) {
    const o = new T.Line(new T.BufferGeometry().setFromPoints(points), material); parent.add(o); return o;
  }
  function texture(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const bg = { stone: '#e2e2de', plaster: '#f1f1eb', timber: '#c4b8ac' }[kind];
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 256);
    for (let i=0;i<1800;i++) {
      const x = range(0,256), y = range(0,256), bright = random() < 0.5;
      ctx.fillStyle = bright ? 'rgba(255,249,220,.1)' : kind==='plaster'?'rgba(74,78,74,.037)':'rgba(32,38,34,.08)';
      const width = kind === 'timber' ? range(4,70) : range(0.4,5);
      ctx.fillRect(x,y,width, kind === 'plaster' ? range(1,8) : range(0.3,2.5));
    }
    const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping; return tex;
  }
  scene.fog = new T.FogExp2(0xb69e97, 0.017);
  const sky = mesh(scene, new T.SphereGeometry(190, 48, 28), new T.ShaderMaterial({
    side: T.BackSide, depthWrite:false,
    vertexShader:'varying vec3 dir; void main(){dir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec3 dir;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){vec3 n=normalize(dir); float h=max(n.y,0.);
        vec3 c=mix(vec3(.96,.60,.37),vec3(.49,.38,.46),smoothstep(-.05,.34,h));
        c=mix(c,vec3(.16,.23,.33),smoothstep(.24,.75,h));
        vec2 p=n.xz/max(.11,h+.12); float cloud=.55*noise(p*vec2(2.,8.))+.3*noise(p*vec2(4.,17.))+.15*noise(p*vec2(9.,31.));
        c=mix(c, vec3(.50,.40,.45), .26*smoothstep(.36,.68,cloud)*smoothstep(.02,.17,h));
        vec3 sun=normalize(vec3(-.63,.135,-1.)); float disc=distance(n,sun);
        c+=vec3(.27,.115,.022)*exp(-disc*9.)+vec3(1.8,1.25,.60)*(1.-smoothstep(.019,.022,disc));
        gl_FragColor=vec4(c,1.); 
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  })); sky.name = '霞光与薄云';
  scene.add(new T.HemisphereLight(0xe6ebfa, 0x778189, 1.85));
  const light = new T.DirectionalLight(0xffd3b1, 1.65); light.position.set(-16,18,12); scene.add(light);
  light.castShadow=true;light.shadow.mapSize.set(2048,2048);
  Object.assign(light.shadow.camera,{left:-29,right:29,top:21,bottom:-19,near:.5,far:78});
  light.shadow.camera.updateProjectionMatrix();light.shadow.bias=-.0005;light.shadow.normalBias=.032;
  light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;
  const stoneMap = texture('stone'), timberMap = texture('timber'), plasterMap = texture('plaster');
  const stone = [0x837f78,0xa09b8d,0x969188,0x7e827b,0xaaa597].map(c=>mat(c,{map:stoneMap,roughness:.44}));
  const mortar = mat(0x484e50), parapet = mat(0x989588,{map:stoneMap});
  const plaster = [0xd6cdaf,0xe6dcc4,0xc9c7ba].map(c=>mat(c,{map:plasterMap}));
  const wood = mat(0x583e30,{map:timberMap}), darkwood = mat(0x3b2f2b,{map:timberMap}), oiled = mat(0x765441,{map:timberMap,roughness:.37});
  const tile = mat(0x354455), tileEdge = mat(0x536574), ridge = mat(0x53616a);
  const windowMaterial = [0xe7a755,0xd58b43,0xf4c77b].map(c=>mat(c,{emissive:c,emissiveIntensity:.24,roughness:.65}));
  const warmMetal = mat(0xcb9a58,{metalness:.15}), ink = mat(0x353237);
  const riverbank = group('岸墙与雨后石阶'), houses = group('白墙黛瓦的临水民居'), bridge = group('单孔石拱桥');
  const backdrop = group('层叠山影');
  function mountains(radius, base, amplitude, tint, shift) {
    const points=[],indices=[],segments=420;
    for(let i=0;i<=segments;i++) {
      const a=i*Math.PI*2/segments,x=Math.sin(a)*radius,z=Math.cos(a)*radius;
      const y=base+amplitude*(.42*Math.sin(11*a+shift)+.33*Math.sin(5*a+shift)+.15*Math.sin(22*a)+.065*Math.sin(49*a));
      points.push(x,-4,z,x,y,z);
      if(i<segments){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);
    mesh(backdrop,geo,new T.MeshBasicMaterial({color:tint,side:T.DoubleSide}));
  }
  mountains(74,10.2,5.4,0xb1a2ac,.63); mountains(60,6.8,3.9,0x8b929f,2.1); mountains(48,3.4,2.5,0x6d7f85,1.5);
  function quay(x0,x1,front,back,top) {
    box(riverbank,(x0+x1)/2,top/2-.55,(front+back)/2,x1-x0,top+1.1,front-back,mortar);
    for(let j=0;j<4;j++){
      for(let x=x0+(j%2 ? -.62 : 0);x<x1;){
        const end=Math.min(x+range(1.05,1.75),x1),start=Math.max(x,x0);
        if(end>start+.03)box(riverbank,(start+end)*.5,top-.19-j*.38,front+.013,end-start-.026,.354,.13,stone[Math.floor(random()*5)]);
        x=end;
      }
    }
    const count=Math.ceil((x1-x0)/1.45);
    for(let j=0;j<count;j++){
      const dx=(x1-x0)/count;box(riverbank,x0+(j+.5)*dx,top+.03,front-.25,dx-.025,.14,.78,stone[j%5]);
    }
  }
  quay(-4.1,24,-2.45,-23,1.52); quay(-28,-15.75,-3.0,-23,1.52);
  const stairX=1.4, stairWidth=4, steps=[];
  for(let j=0;j<7;j++){
    const top=1.49-j*.22, z=-2.17+j*.39;
    const step=group('渡口石级 '+(j+1),riverbank);step.position.set(stairX,top,z);steps.push(step);
    box(step,0,-top/2-.32,0,stairWidth,top+.64,.45,mortar);
    for(let i=0;i<3;i++)box(step,(i-1)*stairWidth/3,0,0,stairWidth/3-.018,.13,.43,stone[(i+j)%5]);
  }
  function roofY(localX,z,width,depth,wallHeight) {
    const along=Math.abs(localX)/(width*.5), across=Math.abs(z)/(depth*.5);
    return wallHeight + 1.38 * (1-across) + .12*Math.sin(Math.PI*across) + .30*Math.pow(along,5)*(.25+.75*across);
  }
  function makeRoof(g,w,d,h) {
    const width=w+1.05, depth=d+1.07;
    for(const side of [-1,1]){
      const verts=[],ix=[]; const nx=14,nz=5;
      for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
        const x=width*(i/nx-.5),z=side*depth*.5*j/nz;
        verts.push(x,roofY(x,z,width,depth,h),z);
        if(i<nx&&j<nz){const n=j*(nx+1)+i;ix.push(n,n+1,n+nx+1,n+1,n+nx+2,n+nx+1);}
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(ix);geo.computeVertexNormals();
      tile.side=T.DoubleSide; mesh(g,geo,tile);
      const rows=Math.ceil(width/.21); 
      for(let i=0;i<=rows;i++){
        const x=width*(i/rows-.5);let last=v(x,roofY(x,0,width,depth,h)+.018,0);
        for(let j=1;j<=3;j++){
          const z=side*depth*.5*j/3,next=v(x,roofY(x,z,width,depth,h)+.018,z);
          beam(g,last,next,.047,i%5===1? ridge :tileEdge);last=next;
        }
      }
      for(let i=0;i<12;i++){
        const x1=width*(i/12-.5),x2=width*((i+1)/12-.5),z=side*depth*.5;
        beam(g,v(x1,roofY(x1,z,width,depth,h)-.035,z),v(x2,roofY(x2,z,width,depth,h)-.035,z),.112,ridge,true);
      }
    }
    for(let i=0;i<12;i++){
      const x1=width*(i/12-.5),x2=width*((i+1)/12-.5);
      beam(g,v(x1,roofY(x1,0,width,depth,h)+.068,0),v(x2,roofY(x2,0,width,depth,h)+.068,0),.118,ridge);
    }
  }
  const lanternSkin=mat(0xf1a24e,{emissive:0xec702a,emissiveIntensity:.53}), lanternRim=mat(0x7a5137), silk=mat(0xad512e);
  function lantern(g,x,y,z) {
    batch(g,ball,lanternSkin,v(x,y,z),[.226,.306,.226]);
    for(const sig of [-1,1])batch(g,cylinder,lanternRim,v(x,y+sig*.271,z),[.139,.05,.139]);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      for(let k=-2;k<2;k++){
        const point=n=>{const lat=n*Math.PI/6;return v(x+.227*Math.cos(lat)*Math.cos(a),y+.306*Math.sin(lat),z+.227*Math.cos(lat)*Math.sin(a));};
        beam(g,point(k),point(k+1),.008,lanternRim);
      }
    }
    beam(g,v(x,y+.31,z),v(x,y+.55,z),.013,darkwood);
    batch(g,cylinder,silk,v(x,y-.397,z),[.021,.18,.021]);
  }
  function sign(g,x,y,z) {
    const canvas=document.createElement('canvas'); canvas.width=128;canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#3f4440';ctx.fillRect(0,0,128,256);ctx.strokeStyle='#bc985a';ctx.lineWidth=4;ctx.strokeRect(9,9,110,238);
    ctx.fillStyle='#ead8a9';ctx.font='bold 82px serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('渡',64,78);ctx.fillText('口',64,178);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    const panel=mesh(g,new T.PlaneGeometry(.65,1.3),mat(0xffffff,{map}));panel.position.set(x,y,z);
  }
  function house(x,z,w,d,h,variant,landing=false){
    const g=group(landing?'渡口茶棚':'沿河民居',houses);g.position.set(x,1.55,z);
    box(g,0,h/2,0,w,h,d,plaster[variant%3]);
    for(const side of [-1,1]){
      const shape=new T.Shape();shape.moveTo(-d/2,h-.05);
      for(let i=0;i<=20;i++){
        const u=-d/2+i*d/20;
        shape.lineTo(u,roofY(side*w*.5,u,w+1.05,d+1.07,h)-.015);
      }
      shape.lineTo(d/2,h-.05);shape.closePath();
      const end=mesh(g,new T.ShapeGeometry(shape),plaster[variant%3]); end.material.side=T.DoubleSide;end.rotation.y=Math.PI/2;end.position.x=side*w*.5;
    }
    box(g,0,.21,d*.5+.006,w,.42,.10,stone[1]);
    const face=d*.5+.085, bays=Math.max(2,Math.round(w/1.76));
    for(let b=0;b<bays;b++){
      const px=w*((b+.5)/bays-.5),bw=w/bays;
      if(b===Math.floor(bays/2)&&landing){
        box(g,px,.93,face,bw*.75,1.86,.11,darkwood);
        for(let k=0;k<4;k++)box(g,px+(k-1.5)*bw*.17,.9,face+.07,bw*.15,1.73,.055,wood);
      }else{
        const wh=h>4?1.11:1.42,wy=h>4?h-1.1:1.7;
        box(g,px,wy,face,bw*.75,wh+.14,.10,darkwood);box(g,px,wy,face+.062,bw*.66,wh-.02,.033,windowMaterial[(variant+b)%3]);
        for(let k=-1;k<=1;k++)box(g,px+k*bw*.158,wy,face+.104,.042,wh,.042,wood);
        for(let k=-1;k<=1;k++)box(g,px,wy+k*wh*.29,face+.105,bw*.69,.043,.041,wood);
        if(h>4){box(g,px,1.21,face,bw*.58,1.93,.096,wood);box(g,px,1.24,face+.059,bw*.49,1.70,.028,ink);}
      }
      box(g,px-bw*.47,h*.5,face-.015,.105,h,.16,darkwood);
    }
    box(g,0,h-.14,face+.07,w+.12,.19,.27,darkwood);
    if(h>4)box(g,0,h-2.07,face+.06,w+.21,.21,.24,wood);
    if(landing){
      const awningZ=d*.5+.72;
      box(g,0,2.75,awningZ,w+.32,.15,1.55,tile,[.12,0,0]);
      for(const side of [-1,1]){
        box(g,side*(w*.5-.24),1.29,d*.5+1.29,.14,2.58,.14,wood);
        lantern(g,side*(w*.5-.58),2.12,d*.5+1.22);
      }
      sign(g,-w*.5+.28,1.59,d*.5+1.39);
      for(const bx of [-w*.32,w*.32]){
        box(g,bx,.43,d*.5+.53,.9,.103,.40,wood);
        for(const q of [-1,1])box(g,bx+q*.32,.2,d*.5+.53,.09,.38,.29,wood);
      }
    } else if(variant%2===0) lantern(g,w*.28,h-.74,d*.5+.40);
    makeRoof(g,w,d,h);
  }
  house(.4,-6.52,5.6,4.25,3.40,1,true);
  house(5.63,-7.0,4.1,4.1,4.62,2);
  house(10.32,-7.6,4.6,4.85,3.37,0);
  house(15.5,-7.1,5.0,4.55,4.08,1);
  house(-19.46,-7.81,5.3,4.3,3.25,0);
  house(-25.16,-8.56,5.35,4.3,3.92,2);
  house(-1.65,-13.05,5.3,4.3,4.81,2);
  house(7.75,-13.31,5.4,4.4,4.02,1);
  house(-16.2,-16.68,5.3,4.4,4.02,2);
  const bridgeCenter=-9.9; bridge.position.set(bridgeCenter,0,-5.38);
  const bridgeTop=x=>1.51+2.51*(1-Math.pow(Math.abs(x)/5.98,1.54));
  const arch=x=>2.77*Math.sqrt(Math.max(0,1-(x/3.83)**2))-.015;
  const bridgeProfile=new T.Shape(); bridgeProfile.moveTo(-5.98,-.8);
  for(let i=0;i<=38;i++){const x=-5.98+11.96*i/38;bridgeProfile.lineTo(x,bridgeTop(x));}
  bridgeProfile.lineTo(5.98,-.8);bridgeProfile.lineTo(3.83,-.8);
  for(let i=0;i<=40;i++){const x=3.83*Math.cos(Math.PI*i/40);bridgeProfile.lineTo(x,arch(x));}
  bridgeProfile.lineTo(-3.83,-.8);bridgeProfile.closePath();
  const archMesh=mesh(bridge,new T.ExtrudeGeometry(bridgeProfile,{depth:1.86,bevelEnabled:false}),stone[0]); archMesh.position.z=-.93;
  for(const side of [-1,1]){
    const z=side*.975;
    for(let i=0;i<25;i++){
      const a=i*Math.PI/25+.007,b=(i+1)*Math.PI/25-.007, sh=new T.Shape();
      sh.moveTo(3.85*Math.cos(a),2.76*Math.sin(a)); sh.lineTo(4.20*Math.cos(a),3.10*Math.sin(a));
      sh.lineTo(4.20*Math.cos(b),3.10*Math.sin(b));sh.lineTo(3.85*Math.cos(b),2.76*Math.sin(b));sh.closePath();
      const wedge=mesh(bridge,new T.ShapeGeometry(sh),stone[(i+2)%5]);wedge.material.side=T.DoubleSide;wedge.position.z=z;
    }
    for(let i=0;i<=12;i++){
      const x=-5.93+i*.985,y=bridgeTop(x);
      box(bridge,x,y+.34,z,.19,.69,.20,parapet);
      batch(bridge,ball,parapet,v(x,y+.76,z),[.13,.13,.13]);
      if(i<12){
        for(const hh of [.25,.58])beam(bridge,v(x,y+hh,z),v(x+.985,bridgeTop(x+.985)+hh,z),.105,parapet,true);
      }
    }
  }
  for(let i=0;i<32;i++){const x=-5.81+i*.375;box(bridge,x,bridgeTop(x)+.012,0,.365,.095,1.69,stone[i%5]);}
  const ferry=group('乌篷渡船'); ferry.position.set(1.75,0,2.23); ferry.rotation.y=-.095;
  const seamMat=new T.LineBasicMaterial({color:0x9c896a});
  function buildBoat(g,covered=true){
    const length=7.45;
    function section(t){
      const breadth=.90*Math.pow(Math.max(0,Math.sin(t*Math.PI)),.61)+.018;
      const rise=.23*Math.pow(Math.abs(2*t-1),3);
      return [ [(t-.5)*length, .39+rise, breadth],[(t-.5)*length,.14+rise*.66,breadth*.88],[(t-.5)*length,-.11+rise*.48,breadth*.43],
        [(t-.5)*length,-.11+rise*.48,-breadth*.43],[(t-.5)*length,.14+rise*.66,-breadth*.88],[(t-.5)*length,.39+rise,-breadth] ];
    }
    const verts=[],indices=[];
    for(let j=0;j<=28;j++){
      const sec=section(j/28);sec.forEach(p=>verts.push(...p));
      if(j<28)for(let k=0;k<5;k++){const n=j*6+k;indices.push(n,n+6,n+1,n+6,n+7,n+1);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
    const hull=mat(0x382e29,{map:timberMap,side:T.DoubleSide,roughness:.44});mesh(g,geo,hull);
    for(let j=0;j<28;j++){
      const s=section(j/28),n=section((j+1)/28);
      for(const k of [0,5]){
        beam(g,v(...s[k]),v(...n[k]),.049,oiled);
        beam(g,v(s[k][0],s[k][1]-.085,s[k][2]*.964),v(n[k][0],n[k][1]-.085,n[k][2]*.964),.019,warmMetal);
      }
      const m=section((j+.5)/28)[0];
      box(g,m[0],m[1]-.12,0,length/28-.011,.115,m[2]*1.80,wood);
    }
    for(const x of [-2.56,1.68,2.55])box(g,x,.41,0,.35,.095,1.14,oiled);
    if(covered){
      const shade=mat(0x383b35,{side:T.DoubleSide,map:timberMap,roughness:.7});
      for(const [start,end,height] of [[-1.78,-.36,.85],[-.33,1.06,.92]]){
        const vs=[],ix=[],uv=[];
        const cover=(x,a)=>v(x,.43+height*Math.sin(a),.80*Math.cos(a));
        for(let i=0;i<=20;i++){
          const a=Math.PI*i/20;
          for(const [j,x] of [start,end].entries()){
            const p=cover(x,a);vs.push(p.x,p.y,p.z);uv.push(j,i/20);
          }
          if(i<20){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}
        }
        const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(vs,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
        shell.setIndex(ix);shell.computeVertexNormals();mesh(g,shell,shade);
        for(let j=0;j<=5;j++){
          const x=start+(end-start)*j/5;
          for(let i=0;i<14;i++)beam(g,cover(x,i*Math.PI/14),cover(x,(i+1)*Math.PI/14),j%5===0?.028:.014,j%5===0?oiled:darkwood);
        }
        for(let j=1;j<8;j++)line(g,[cover(start,j*Math.PI/8),cover(end,j*Math.PI/8)],seamMat);
      }
    }
  }
  buildBoat(ferry);
  const oar=group('摇橹',ferry);oar.position.set(2.65,.47,.47);
  beam(oar,v(-.43,.5,-.21),v(1.35,-.39,.63),.038,oiled);
  beam(oar,v(.99,-.24,.43),v(1.52,-.47,.70),.103,wood,true);
  box(ferry,2.68,.50,.45,.095,.45,.091,wood);
  const skiff=group('桥边小舟');skiff.position.set(-14.3,.02,-.55);skiff.rotation.y=.28;skiff.scale.setScalar(.72);buildBoat(skiff,false);
  const ropePoints=[v(-1.18,.53,1.34),v(-1.53,.50,.89),v(-2.00,.59,.33),v(-2.40,.78,-.25)];
  const mooring=group('缆桩与系绳');
  for(const [x,z,h] of [[-2.41,-.26,1.03],[-2.2,-1.60,1.15],[4.61,-1.83,1.12]]){
    batch(mooring,cylinder,wood,v(x,h*.5-.22,z),[.118,h+.44,.118]);
    for(let i=0;i<3;i++)batch(mooring,cylinder,warmMetal,v(x,h-.21+i*.05,z),[.125,.034,.125]);
  }
  const ropePath=new T.CatmullRomCurve3(ropePoints); mesh(mooring,new T.TubeGeometry(ropePath,22,.018,5,false),oiled);
  const willow=group('垂柳');
  const bark=mat(0x615a44,{map:timberMap}), twigMat=new T.LineBasicMaterial({color:0x67754e});
  const leaves=[0x647954,0x839064,0x8a986c,0x5d7050].map(c=>mat(c,{side:T.DoubleSide}));
  const leaf=new T.Shape();leaf.moveTo(0,-.50);leaf.quadraticCurveTo(.24,0,.06,.50);leaf.quadraticCurveTo(-.17,.04,0,-.50);
  const leafGeometry=new T.ShapeGeometry(leaf);
  function tree(x,z,scale){
    const g=group('垂柳树冠',willow);g.position.set(x,1.51,z);g.scale.setScalar(scale);
    beam(g,v(0,-.10,0),v(-.14,1.45,0),.27,bark);beam(g,v(-.14,1.45,0),v(.19,3.03,-.04),.21,bark);
    for(let j=0;j<10;j++){
      const theta=j*2.40+.3, len=range(1.2,2.67), ty=range(3.5,4.9);
      const elbow=v(.2+.38*Math.cos(theta),2.83+range(.1,.85),.38*Math.sin(theta));
      const wrist=v(Math.cos(theta)*len*.73,ty+.05,Math.sin(theta)*len*.73);
      const tip=v(Math.cos(theta)*len,ty-.24,Math.sin(theta)*len);
      beam(g,v(.12,2.55,0),elbow,.105,bark);beam(g,elbow,wrist,.074,bark);beam(g,wrist,tip,.040,bark);
      for(let t=0;t<12;t++){
        const a=theta+range(-.33,.33), l=len*range(.7,1.22);
        const start=v(l*Math.cos(a),ty+range(-.20,.24),l*Math.sin(a));
        const drop=range(.85,2.25);
        const end=start.clone().add(v(.28*Math.cos(a),-drop,.28*Math.sin(a)));
        line(g,[wrist,start,start.clone().lerp(end,.33).add(v(.10,.03,.04)),end],twigMat);
        for(let k=0;k<9;k++){
          const p=start.clone().lerp(end,(k+.55)/9);
          p.x+=.09*(1-k/10)+.043*Math.sin(k*1.9);p.z+=.034*Math.cos(k*2.19);
          batch(g,leafGeometry,leaves[(k+t)%4],p,[.23,range(.23,.36),.23],[range(-.5,.5),a+range(-.66,.66),range(-.45,.45)]);
        }
      }
    }
  }
  tree(8.55,-2.96,1.19);tree(-17.16,-4.45,.87);
  // A waiting passenger gives the steps, timber frames and hull a common human scale.
  const passenger=group('候船人');passenger.position.set(4.15,1.61,-2.79);passenger.rotation.y=-.70;
  const coat=mat(0x617c80,{roughness:.74}),pants=mat(0x44505b),hat=mat(0xb49662),skin=mat(0xa7856a);
  for(const side of [-1,1]){
    beam(passenger,v(side*.115,.75,0),v(side*.15,.12,.025+side*.035),.078,pants);
    batch(passenger,ball,darkwood,v(side*.15,.075,.076+side*.035),[.095,.07,.156]);
  }
  const tunic=mesh(passenger,new T.CylinderGeometry(.153,.244,.66,12),coat);tunic.position.y=.99;
  batch(passenger,ball,coat,v(0,1.25,0),[.223,.122,.132]);
  beam(passenger,v(-.17,1.27,.005),v(-.26,.89,.13),.074,coat);
  beam(passenger,v(.17,1.27,.005),v(.26,.91,.086),.076,coat);
  batch(passenger,ball,skin,v(.26,.87,.083),[.048,.065,.048]);
  batch(passenger,ball,skin,v(0,1.46,0),[.125,.16,.115]);
  const conicalHat=mesh(passenger,new T.ConeGeometry(.31,.175,30),hat);conicalHat.position.y=1.63;
  const basket=mesh(passenger,new T.CylinderGeometry(.16,.117,.21,16),warmMetal);basket.position.set(.27,.56,.08);
  const handle=mesh(passenger,new T.TorusGeometry(.153,.014,6,16,Math.PI),wood);handle.position.set(.27,.67,.08);
  const waterShader = {
    uniforms:{color:{value:color(0x738e8b)},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},clock:{value:0},wakeAge:{value:7},wakeOrigin:{value:new T.Vector2()}},
    vertexShader:`
      uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 world;
      void main(){ vUv=textureMatrix*vec4(position,1.); world=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(world,1.); }`,
    fragmentShader:`
      uniform sampler2D tDiffuse; uniform float clock,wakeAge; uniform vec2 wakeOrigin; varying vec4 vUv; varying vec3 world;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.545);}
      void main(){
        vec2 p=world.xz; float t=clock*.72;
        float w=sin(p.y*9.8+p.x*.79+sin(p.x*1.13+t)*.7+t)+.59*sin(p.y*17.7-p.x*1.02+t*1.4)+.21*sin(p.y*32.+p.x*2.-t);
        vec2 wave=p-wakeOrigin; float d=length(wave);float ring=sin((d-wakeAge*1.32)*14.)*exp(-pow((d-wakeAge*1.32)*2.6,2.))*exp(-wakeAge*.74);
        vec2 uv=vUv.xy/vUv.w+vec2(w*.0019, w*.0037+ring*.013);
        vec3 mirror=(texture2D(tDiffuse,uv).rgb*.50+texture2D(tDiffuse,uv+vec2(.0014,.002)).rgb*.25+texture2D(tDiffuse,uv-vec2(.0014,.002)).rgb*.25);
        vec3 base=vec3(.061,.143,.155);
        float distanceFade=clamp(length(world-cameraPosition)/44.,0.,1.);
        vec3 c=mix(base,mirror,.50+distanceFade*.17);
        float fine=clamp(sin(p.y*38.+p.x*1.3+sin(p.x*1.57+t)*2.2+t)*.6+.4*sin(p.x*3.+p.y*12.-t),0.,1.);
        float glitter=pow(max(0.,w/1.8),6.)*(.017+.020*distanceFade)+pow(fine,12.)*.016;
        gl_FragColor=vec4(c+vec3(glitter)+max(0.,ring)*.08,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  };
  const water = new Reflector(new T.PlaneGeometry(150,136),{textureWidth:768,textureHeight:512,clipBias:.002,shader:waterShader, multisample:0});
  water.name='河面与倒影';water.rotation.x=-Math.PI/2;water.position.z=4;scene.add(water);
  const rippleMat=mat(0xafbdb1,{transparent:true,opacity:.47,depthWrite:false,roughness:.47});
  const rippleSystem=group('水边余滴'), drops=[];
  const ringGeometry=new T.RingGeometry(.93,1,48);ringGeometry.rotateX(-Math.PI*.5);
  for(let i=0;i<7;i++){
    const ring=mesh(rippleSystem,ringGeometry,rippleMat.clone());
    ring.position.set(range(-2.59,5.25),.018+random()*.004,range(.45,4.93));
    drops.push({ring,offset:random()*3.1});
  }
  for(const {parent,geometry,material,matrices} of placements.values()){
    const instances=new T.InstancedMesh(geometry,material,matrices.length);
    matrices.forEach((matrix,i)=>instances.setMatrixAt(i,matrix));
    instances.computeBoundingSphere();parent.add(instances);
  }
  for(const g of [riverbank, houses, bridge, willow, ferry, mooring, passenger]){
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  const views=['河心望渡','石阶候船','桥畔回望'];
  view.preset(views[0],[8.8,4.55,17.5],[-2.0,2.63,-4.2],{fov:43});
  view.preset(views[1],[4.15,2.52,7.37],[.67,1.42,-2.30],{fov:53});
  view.preset(views[2],[-15.8,3.71,8.3],[-2.5,2.14,-4.8],{fov:51});
  let elapsed=0,strokeAt=-20,strokeCount=0,boaty=0;
  ui.button('轻摇船橹',()=>{strokeAt=elapsed;strokeCount++;});
  return {
    update(dt,time){
      elapsed=time;const age=elapsed-strokeAt;
      const activity=age<5?Math.sin(Math.min(age,1.8)/1.8*Math.PI)*Math.exp(-age*.63):0;
      boaty=.025+.023*Math.sin(time*.98);
      ferry.position.y=boaty;ferry.rotation.z=.007*Math.sin(time*.88);
      ferry.rotation.x=.009*Math.sin(time*1.22)+activity*.042;
      oar.rotation.y=activity*.69;oar.rotation.z=-activity*.19;
      skiff.position.y=.022*Math.cos(time*.88+.5);skiff.rotation.x=.012*Math.sin(time*.85);
      water.material.uniforms.clock.value=time;
      water.material.uniforms.wakeAge.value=age;
      const wake=oar.localToWorld(v(1.4,-.39,.67));water.material.uniforms.wakeOrigin.value.set(wake.x,wake.z);
      for(const {ring,offset} of drops){
        const phase=((time+offset)%3.5)/3.5;ring.scale.setScalar(.032+phase*.37);
        ring.material.opacity=.34*Math.sin(phase*Math.PI)*(1-phase);
      }
    },
    inspect(){return {ferryName:ferry.name,boatCount:[ferry,skiff].filter(boat=>boat.parent===scene).length,
      stepHeights:steps.map(step=>step.position.y),roofedHouses:houses.children.length,
      willowTrees:willow.children.length,strokeCount,boatHeight:boaty,strokeAge:elapsed-strokeAt,
      oarAngle:oar.rotation.y,wakeAge:water.material.uniforms.wakeAge.value,waterReflection:water.isReflector,viewNames:views};}
  };
}
