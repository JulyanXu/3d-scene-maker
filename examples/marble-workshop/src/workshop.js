// Repeated architectural and workshop details share instanced geometry.
export function buildWorkshop(T, scene, random) {
  const material = (color, roughness = 0.85) => new T.MeshStandardMaterial({color, roughness});
  const box = new T.BoxGeometry(1, 1, 1);
  const cylinder = new T.CylinderGeometry(0.5, 0.5, 1, 14);
  const splinter = new T.DodecahedronGeometry(1, 0);
  const pale = material(0xc8b594), limestone = material(0x9e8464), darkWood = material(0x3e2a1c), wood = material(0x6d4630);
  const iron = material(0x434342, 0.46), verdigris = material(0x456359, 0.49), chalk = material(0xe5d1ad);
  const pieces = new Map();
  const dummy = new T.Object3D();
  function part(shape, surface, pos, scale, rotation = [0, 0, 0]) {
    const key = shape.uuid + surface.uuid;
    if (!pieces.has(key)) pieces.set(key, {shape, surface, transforms: []});
    dummy.position.fromArray(pos); dummy.rotation.set(...rotation); dummy.scale.fromArray(scale); dummy.updateMatrix();
    pieces.get(key).transforms.push(dummy.matrix.clone());
  }
  const cuboid = (surface, x, y, z, w, h, d, rotation) => part(box, surface, [x, y, z], [w, h, d], rotation);
  function rod(shape, surface, start, end, diameter) {
    const a = new T.Vector3(...start), b = new T.Vector3(...end);
    const delta = b.clone().sub(a);
    dummy.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize());
    const rot = new T.Euler().setFromQuaternion(dummy.quaternion);
    part(shape, surface, a.clone().add(b).multiplyScalar(0.5).toArray(), [diameter, delta.length(), diameter], [rot.x, rot.y, rot.z]);
  }
  function canvas(width, height, draw) {
    const element = document.createElement('canvas');
    element.width = width; element.height = height;
    draw(element.getContext('2d'), width, height);
    const texture = new T.CanvasTexture(element);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
  }
  // Limewash, water marks and shallow cracks are painted onto the actual walls.
  const plaster = canvas(1024, 512, (c, w, h) => {
    c.fillStyle = '#807e72'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const x = random()*w, y = random()*h, radius = 2+random()*38;
      const g = c.createRadialGradient(x,y,0,x,y,radius);
      g.addColorStop(0,i%2?'rgba(247,224,187,.09)':'rgba(75,70,65,.07)'); g.addColorStop(1,'rgba(118,105,83,0)');
      c.fillStyle=g; c.fillRect(x-radius,y-radius,radius*2,radius*2);
    }
    for (let i=0;i<30;i++) {
      let x=random()*w,y=random()*h;
      c.strokeStyle='rgba(61,50,37,.24)'; c.lineWidth=.6; c.beginPath(); c.moveTo(x,y);
      for(let j=0;j<8;j++) {x+=(random()-.48)*13;y+=random()*8;c.lineTo(x,y);}
      c.stroke();
    }
  });
  const wall = new T.MeshStandardMaterial({map:plaster, roughness:1});
  const windowCenters = [-5.75,-3.0];
  const rear = new T.Shape();
  rear.moveTo(-11,-.04); rear.lineTo(11,-.04); rear.lineTo(11,8); rear.lineTo(-11,8); rear.closePath();
  for (const x of windowCenters) {
    const hole = new T.Path();
    hole.moveTo(x-.89,1.35);hole.lineTo(x-.89,4.15);
    hole.absarc(x,4.15,.89,Math.PI,0,true);hole.lineTo(x+.89,1.35);hole.closePath();
    rear.holes.push(hole);
  }
  const wallGeo = new T.ShapeGeometry(rear,32);
  const wp = wallGeo.attributes.position, uv=wallGeo.attributes.uv;
  for(let i=0;i<wp.count;i++) uv.setXY(i,(wp.getX(i)+11)/22,wp.getY(i)/8);
  const back = new T.Mesh(wallGeo,wall); back.position.z=-5; back.receiveShadow=true; scene.add(back);
  const left = new T.Mesh(new T.PlaneGeometry(16,8), wall); left.rotation.y=Math.PI/2; left.position.set(-8.5,4,0); left.receiveShadow=true; scene.add(left);
  cuboid(wood,0,.26,-4.85,22,.17,.21);
  cuboid(limestone,0,.11,-4.86,22,.19,.22);
  // Receding hills and trees are viewed through a physical arched opening.
  const sky = canvas(768,512,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#a4c8ce');g.addColorStop(.57,'#ffe1a1');g.addColorStop(1,'#b1945e');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let j=0;j<3;j++) {
      c.fillStyle=['#c9b78d','#acaa82','#888f70'][j];c.beginPath();c.moveTo(0,h);
      for(let x=0;x<=w;x+=4)c.lineTo(x,h*(.68+.055*j)+8*Math.sin(x/93+j*2)+5*Math.sin(x/47));
      c.lineTo(w,h);c.closePath();c.fill();
    }
    for(let i=0;i<64;i++){const x=random()*w,y=h*(.81+random()*.19),s=3+random()*13;c.fillStyle='#66765b';c.beginPath();c.moveTo(x-s*.19,y);c.quadraticCurveTo(x-s*.12,y-s*.75,x,y-s);c.quadraticCurveTo(x+s*.30,y-s*.4,x+s*.14,y);c.fill();}
  });
  const view = new T.Mesh(new T.PlaneGeometry(6,5.6),new T.MeshBasicMaterial({map:sky,toneMapped:false}));
  view.position.set(-4.3,3,-5.5);scene.add(view);
  for (const x of windowCenters) {
    cuboid(pale,x,1.32,-4.9,2.32,.19,.41);
    for(const sign of [-1,1]) {
      for(let i=0;i<7;i++) cuboid(i%2?limestone:pale,x+sign*1.04,1.55+.40*i,-4.94,.28,.382,.25);
      cuboid(darkWood,x+sign*.31,2.95,-5.02,.045,3.12,.07);
    }
    for(let i=0;i<13;i++) {
      const ang=(i+.5)*Math.PI/13;
      cuboid(i%4===0?pale:limestone,x+1.03*Math.cos(ang),4.15+1.03*Math.sin(ang),-4.94,.24,.28,.3,[0,0,ang-Math.PI/2]);
    }
    for(let i=0;i<4;i++) cuboid(darkWood,x,1.94+.69*i,-5.02,1.76,.037,.065);
    cuboid(darkWood,x,4.61,-5.02,.043,.81,.07);
  }
  for(const x of [-7.55,-.98,3.95,8.15]){
    cuboid(darkWood,x,3.35,-4.85,.24,6.7,.37);
    cuboid(wood,x+.03,3.35,-4.66,.10,6.6,.05);
  }
  for(const y of [5.66,6.56])cuboid(darkWood,0,y,-4.79,21,.26,.39);
  const rafter=material(0x493522);
  for(const x of [-7.55,-3.35,1,5.4]) {
    cuboid(rafter,x,6.27,.12,.25,.36,11);
    rod(box,rafter,[x,5.02,-4.71],[x,6.22,-3.18],.16);
  }
  const sandy=canvas(192,128,(c,w,h)=>{
    c.fillStyle='#d1c8af';c.fillRect(0,0,w,h);
    for(let i=0;i<6700;i++){const size=.45+random()*1.4;c.fillStyle=i%4?'rgba(106,91,71,.18)':'rgba(250,242,215,.36)';c.fillRect(random()*w,random()*h,size,size*.6);}
    for(let i=0;i<16;i++){let x=random()*w,y=random()*h; c.strokeStyle='rgba(129,116,93,.11)';c.lineWidth=1+random()*2;c.beginPath();c.moveTo(x,y);for(let j=0;j<8;j++){x+=random()*8;y+=(random()-.43)*7;c.lineTo(x,y);}c.stroke();}
  });
  const floorMats = [0xa39683,0xbaaa94,0xad9b86,0xa19986,0xcbbeaa,0xb8a68f].map(x=>new T.MeshStandardMaterial({color:x,roughness:1,map:sandy}));
  const grout = new T.Mesh(new T.PlaneGeometry(36,32),material(0x675d4e));
  grout.rotation.x=-Math.PI/2;grout.position.y=-.035;grout.receiveShadow=true;scene.add(grout);
  for(let row=-6;row<=6;row++)for(let col=-6;col<=6;col++)
    cuboid(floorMats[Math.floor(random()*floorMats.length)],col*1.87+(row%2)*.90,-.023+random()*.005,row*1.13,1.852,.04,1.114);
  // Work trestle, brickwork behind it, and hand tools lying across its top.
  const plankTexture = canvas(256,64,(c,w,h)=>{
    c.fillStyle='#ad8766';c.fillRect(0,0,w,h);
    for(let i=0;i<165;i++){let y=random()*h; c.strokeStyle=i%3?'rgba(60,38,22,.17)':'rgba(240,205,143,.16)';c.lineWidth=random()*1.8+.2;c.beginPath();c.moveTo(0,y);for(let x=0;x<=w;x+=6)c.lineTo(x,y+Math.sin(x*.034+i)*.6);c.stroke();}
  });
  const boards=new T.MeshStandardMaterial({map:plankTexture,color:0xab906d,roughness:.88});
  for(const z of [-.67,0,.67])cuboid(boards,0,.31,z,4.38,.24,.65);
  for(const x of [-1.39,1.39]) {
    cuboid(darkWood,x,.12,0,.31,.23,1.94);
    for(const z of [-.68,.68])cuboid(iron,x,.44,z,.12,.012,.12);
  }
  for(let k=0;k<4;k++)cuboid(boards,3.05,1.16,-2.49+.22*k,3.24,.16,.208);
  for(const x of [1.8,4.3])for(const z of [-2.42,-1.96])cuboid(darkWood,x,.55,z,.14,1.08,.15,[.03,0,(x-3)*.05]);
  cuboid(wood,3.05,.43,-2.2,2.74,.13,.12);
  for(let i=0;i<5;i++) {
    const x=2.00+i*.24,z=-2.26+random()*.12;
    rod(cylinder,wood,[x,1.27,z],[x+.22,1.285,z+.24],.066);
    rod(cylinder,iron,[x+.22,1.285,z+.24],[x+.38,1.285,z+.42],.031);
  }
  rod(cylinder,wood,[3.44,1.28,-2.15],[3.95,1.29,-2.02],.083);
  rod(cylinder,darkWood,[3.42,1.32,-2.34],[3.36,1.32,-2.03],.19);
  // Narrow cobbled plinth, offcuts awaiting carving, a ladder and corded shelf.
  for(const [x,z,w,h,d] of [[-3.52,-2.36,1.35,.72,.96],[-3.62,-2.39,1.15,.48,.74],[-5.13,-1.88,1.40,.62,.85]]) {
    cuboid(limestone,x,h/2+(w===1.15?.72:0),z,w,h,d,[0,w*.09,0]);
  }
  for(const x of [4.42,4.96])rod(box,darkWood,[x,0,-3.36],[x+.26,3.23,-4.56],.095);
  for(let i=1;i<9;i++)rod(cylinder,wood,[4.42+.026*i,.33*i,-3.36-.124*i],[4.98+.026*i,.33*i,-3.36-.124*i],.072);
  for(const y of [2.4,3.33]) {
    cuboid(darkWood,3.1,y,-4.56,2.1,.105,.5);
    for(let i=0;i<5;i++){
      const x=2.29+i*.36,h=.17+random()*.14;
      part(cylinder,i%2?pale:verdigris,[x,y+.052+h*.5,-4.60],[.17,h,.17]);
      part(cylinder,wood,[x,y+.065+h,-4.60],[.12,.045,.12]);
    }
  }
  // A geometric workshop drawing, pinned in the plaster of the rear wall.
  const sheet = canvas(300,400,(c,w,h)=>{
    c.fillStyle='#b49c73';c.fillRect(0,0,w,h);c.strokeStyle='#61513f';c.lineWidth=1.2;
    for(let i=0;i<2;i++){c.strokeRect(21+i*2,21+i*2,w-43-i*4,h-43-i*4);}
    c.beginPath();c.arc(150,181,91,0,Math.PI*2);c.stroke();c.strokeRect(76,108,149,149);
    for(const [a,b,x,y] of [[150,60,150,318],[44,181,257,181],[73,256,227,107],[76,108,224,258],[75,275,225,275]]){c.beginPath();c.moveTo(a,b);c.lineTo(x,y);c.stroke();}
    for(let i=0;i<31;i++){const y=301+i%5*7,x=42+Math.floor(i/5)*32;c.fillStyle='rgba(69,51,35,.58)';c.fillRect(x,y,10+random()*18,.9);}
  });
  const drawing=new T.Mesh(new T.PlaneGeometry(.96,1.28),new T.MeshStandardMaterial({map:sheet,roughness:1}));
  drawing.rotation.z=.04;drawing.position.set(.38,2.75,-4.84);scene.add(drawing);
  // Thrown earthenware and linen break up the straight lines of the bench.
  function pitcher(x,y,z,scale,tint) {
    const clay=material(tint,.84), profile=[[.13,.0],[.19,.035],[.21,.11],[.24,.22],[.22,.34],[.14,.42],[.082,.46],[.085,.52],[.11,.54],[.103,.55],[.074,.535],[.067,.49]];
    const pot=new T.Mesh(new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(r,h)),25),clay);
    pot.scale.setScalar(scale);pot.position.set(x,y,z);pot.castShadow=true;scene.add(pot);
    const handleCurve=new T.CatmullRomCurve3([new T.Vector3(.083,.48,0),new T.Vector3(.21,.49,0),new T.Vector3(.278,.41,0),new T.Vector3(.267,.30,0),new T.Vector3(.21,.24,0)]);
    const handle=new T.Mesh(new T.TubeGeometry(handleCurve,15,.023,7,false),clay);
    handle.position.copy(pot.position);handle.scale.copy(pot.scale);scene.add(handle);
  }
  pitcher(3.56,1.24,-2.34,.94,0x84644b);
  pitcher(-4.76,.64,-1.89,1.10,0x7c5941);
  const fabricGeo=new T.PlaneGeometry(.75,1.14,20,35);
  const cloth=fabricGeo.attributes.position;
  for(let i=0;i<cloth.count;i++){
    const x=cloth.getX(i),run=.57-cloth.getY(i),over=Math.max(0,run-.62),fold=Math.sin(x*32+run*2.2);
    cloth.setXYZ(i,3.86+x,1.25-over*.92+.013*fold+Math.sin(x*9)*.006,
      -2.40+Math.min(run,.62)+.095*Math.sin(Math.min(1,over*5)*1.56)+over*.068*fold);
  }
  fabricGeo.computeVertexNormals();
  const linen=new T.Mesh(fabricGeo,new T.MeshStandardMaterial({color:0x8e958b,roughness:1,side:T.DoubleSide}));
  linen.castShadow=true;linen.receiveShadow=true;scene.add(linen);
  const restingCloth=cloth.array.slice();
  const hoist=new T.Group();hoist.position.set(-2.64,6.19,-.94);scene.add(hoist);
  const cord=material(0x917550), sheave=material(0x4f4132,.64);
  function pulleyPart(shape,surface,x,y,z) {
    const mesh=new T.Mesh(shape,surface);mesh.position.set(x,y,z);mesh.castShadow=true;hoist.add(mesh);return mesh;
  }
  for(const x of [-.125,.125]){
    pulleyPart(new T.CylinderGeometry(.017,.017,1.15,7),cord,x,-.57,0);
    const cheek=pulleyPart(new T.CapsuleGeometry(.106,.18,4,8),wood,0,-1.22,x*.53);
    cheek.scale.set(1.3,1,.4);
  }
  const wheel=pulleyPart(new T.CylinderGeometry(.136,.136,.094,22),sheave,0,-1.19,0);wheel.rotation.x=Math.PI/2;
  const hook=new T.CatmullRomCurve3([new T.Vector3(0,-1.4,0),new T.Vector3(0,-1.55,0),new T.Vector3(.085,-1.57,.012),new T.Vector3(.104,-1.47,.022)]);
  pulleyPart(new T.TubeGeometry(hook,18,.026,7,false),iron,0,0,0);
  for(let i=0;i<140;i++) {
    const a=random()*Math.PI*2,r=1.17+random()*1.72;
    const x=Math.cos(a)*r,z=Math.sin(a)*r*.76,s=.019+random()**2*.115;
    const onTable=Math.abs(x)<2.13 && Math.abs(z)<.94;
    if(onTable && Math.abs(x)<1.28 && Math.abs(z)<.67)continue;
    part(splinter,i%5===0?limestone:chalk,[x,(onTable?.442:.015)+s*.34,z],[s*1.4,s*.57,s*.82],[random(),random(),random()]);
  }
  for(const {shape,surface,transforms} of pieces.values()) {
    const mesh=new T.InstancedMesh(shape,surface,transforms.length);
    transforms.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix)); mesh.castShadow=surface!==rafter;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
  }
  return function updateWorkshop(time){
    hoist.rotation.z=.018*Math.sin(.93*time);
    hoist.rotation.x=.009*Math.sin(.71*time);
    for(let i=0;i<cloth.count;i++){
      const hanging=Math.min(1,Math.max(0,(1.245-restingCloth[3*i+1])*2.6));
      if(hanging)cloth.setZ(i,restingCloth[3*i+2]+hanging*.016*Math.sin(9*restingCloth[3*i]+time*1.6));
    }
    cloth.needsUpdate=true;
  };
}
