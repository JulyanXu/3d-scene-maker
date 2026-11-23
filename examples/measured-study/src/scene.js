export const meta = {
  title: '午后书房',
  subtitle: '测绘还原 · 4.80 × 3.60 m · 窗位修改对照'
};

export function createScene({ THREE, scene, view, ui, renderer }) {
  scene.background = new THREE.Color(0xe8e2d5);
  const group = (parent, name, x = 0, y = 0, z = 0) => {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  };
  const model = group(scene, '午后书房');
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .79, ...extra});
  let seed = 32814519;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

  function painted(width, height, painter) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    painter(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  function timber(base, grain) {
    return mat(0xffffff, {map: painted(512, 96, (c, width, height) => {
      c.fillStyle = base; c.fillRect(0, 0, width, height);
      for (let i = 0; i < 320; i++) {
        const y = rand() * height, amplitude = rand() * 3, phase = rand() * 9;
        c.strokeStyle = grain; c.globalAlpha = .027 + rand() * .115;
        c.lineWidth = .3 + rand() * 1.1; c.beginPath();
        for (let x = -12; x <= width + 12; x += 8) {
          const v = y + Math.sin(phase + x / 61) * amplitude + Math.sin(x / 22 + phase) * .5;
          if (x === -12) c.moveTo(x, v); else c.lineTo(x, v);
        }
        c.stroke();
      }
    }), roughness: .62});
  }

  const walnut = timber('#9a7151', '#3b261c'), darkWood = timber('#74513b', '#2e211c');
  const ash = timber('#c19a68', '#644124');
  const floorWoods = ['#c5a47d','#cdb08d','#bfa184','#c9ad8b','#cfb393'].map(c => timber(c, '#725638'));
  const plaster = mat(0xeae3cd), floorEdge = mat(0xb3997b), trim = mat(0xdfd4bc);
  const metal = mat(0x383d34, {roughness:.42, metalness:.46}), brass = mat(0xac854f,{roughness:.43,metalness:.6});
  const cream = mat(0xeadfc8), ceramic = mat(0xb76e4f), clay = mat(0xa14e35), leaf = mat(0x67784d);
  const olive = mat(0x798063), oliveShadow = mat(0x5c6653), paper = mat(0xebd8ac);
  const bookJackets = [0x505849,0x9b5341,0xd9bc8c,0x657a79,0xd09356,0x484b42,0xb6aca0].map(c => mat(c));
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  function mesh(parent, geom, material, x, y, z) {
    const out = new THREE.Mesh(geom, material);
    out.position.set(x, y, z); out.castShadow = true; out.receiveShadow = true;
    parent.add(out); return out;
  }
  function box(parent, x, y, z, w, h, d, material) {
    const out = mesh(parent, unitBox, material, x, y, z);
    out.scale.set(w, h, d); return out;
  }
  function soft(parent, x, y, z, w, h, d, material, rad = .03) {
    const r = Math.min(rad, w / 3, h / 3, d / 3), hw = w / 2 - r, hh = h / 2 - r;
    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {depth:d - 2*r, bevelEnabled:true, bevelThickness:r, bevelSize:r, bevelSegments:3, steps:1});
    geometry.translate(0, 0, -d/2 + r);
    return mesh(parent, geometry, material, x, y, z);
  }
  function cylinder(parent, x, y, z, top, bottom, height, material, segments = 24) {
    return mesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments), material, x, y, z);
  }
  function rod(parent, a, b, radius, material, topRadius = radius) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta = bv.clone().sub(av);
    const out = cylinder(parent, (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2, topRadius, radius, delta.length(), material, 12);
    out.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return out;
  }
  function vase(parent, x, y, z, height, radius, material) {
    const profile = [[.47,0],[.68,.04],[.9,.19],[1,.43],[.84,.68],[.45,.82],[.40,.96],[.47,1]];
    const pts = profile.map(([r,h]) => new THREE.Vector2(r*radius,h*height));
    pts.push(new THREE.Vector2(.34*radius,height), new THREE.Vector2(.34*radius,.91*height));
    return mesh(parent, new THREE.LatheGeometry(pts, 30), material, x, y, z);
  }
  function plant(parent, x, y, z, size) {
    const p = group(parent, '盆栽', x, y, z);
    vase(p, 0, 0, 0, size*.36, size*.19, ceramic);
    for (let i=0;i<9;i++) {
      const a=i*2.40, h=size*(.58 + .35*rand()), extent=size*(.23+.13*rand());
      const end=[Math.cos(a)*extent,h,Math.sin(a)*extent];
      rod(p,[0,size*.31,0],end,size*.008,leaf);
      const blade=mesh(p,new THREE.SphereGeometry(1,12,8),leaf,end[0],end[1],end[2]);
      blade.scale.set(size*.065,size*.15,size*.023);
      blade.rotation.order='YXZ'; blade.rotation.y=-a+Math.PI/2; blade.rotation.x=.85;
    }
  }
  function flatArt(parent, x,y,z,w,h,texture) {
    return mesh(parent,new THREE.PlaneGeometry(w,h),mat(0xffffff,{map:texture,roughness:1}),x,y,z);
  }

  scene.add(new THREE.HemisphereLight(0xfff4e6,0xb8ac99,1.86));
  const key = new THREE.DirectionalLight(0xffead3, 2.90);
  key.position.set(3.8,7,4.4); key.target.position.set(-.5,0,-.3);
  scene.add(key,key.target); key.castShadow = true;
  Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:18});
  key.shadow.mapSize.set(2048,2048); key.shadow.normalBias=.014; key.shadow.bias=-.00022;
  const bounce = new THREE.DirectionalLight(0xe2f0ef,.7); bounce.position.set(-2,4,-2); scene.add(bounce);
  const ground = mesh(scene,new THREE.PlaneGeometry(200,200),mat(0xe2dbcc),0,-.153,0);
  ground.rotation.x=-Math.PI/2; ground.castShadow=false;

  box(model,0,-.077,-.025,4.96,.14,3.81,floorEdge);
  const boardDepth = 3.60 / 22;
  for (let row=0;row<22;row++) {
    let start = -2.40;
    for (const end of [-1.68 + (row%3)*.69, .39+(row%3)*.51, 2.40]) {
      box(model,(start+end)/2,-.008,-1.80+(row+.5)*boardDepth,end-start-.004,.016,boardDepth-.004,floorWoods[(row+Math.floor(rand()*4))%5]);
      start=end;
    }
  }

  const landscape = painted(440,330,(c,w,h)=>{
    const grad=c.createLinearGradient(0,0,0,h); grad.addColorStop(0,'#c5dfe1');grad.addColorStop(.59,'#e6eacb');grad.addColorStop(1,'#bcc7a1');c.fillStyle=grad;c.fillRect(0,0,w,h);
    for (let layer=0;layer<3;layer++){
      c.fillStyle=['#b1c9b2','#99b5a0','#829d82'][layer];c.beginPath();c.moveTo(-15,h);
      for(let x=-15;x<=w+15;x+=5)c.lineTo(x,h*(.63+layer*.12)+Math.sin(x/(70-layer*12)+layer*2)*21+Math.sin(x/16)*5-rand()*4);
      c.lineTo(w+15,h);c.closePath();c.fill();
    }
    c.strokeStyle='#7f907c';c.lineWidth=2;
    for(let i=0;i<16;i++){const x=w*.77+i*2, y=h*.59-i*4;c.beginPath();c.moveTo(w*.77,h*.89);c.quadraticCurveTo(x,y+8,x+(i%2?1:-1)*18,y);c.stroke();}
  });
  function buildWall(parent, side, opened) {
    const north = side==='north', width=north?4.80:3.60, middle=north?-.55:.70;
    const wall=group(parent,side,north?0:-2.40,0,north?-1.80:0);
    if(!north) wall.rotation.y=Math.PI/2;
    const solid=group(wall,'墙体');
    const slab=(x0,x1,y0,y1)=>box(solid,(x0+x1)/2,(y0+y1)/2,-.06,x1-x0,y1-y0,.12,plaster);
    const bays=[];
    if(north)bays.push({left:-2.30,right:-1.46,bottom:0,top:2.05});
    if(opened)bays.push({left:middle-.70,right:middle+.70,bottom:1.04,top:2.24});
    let cursor=-width/2;
    for(const bay of bays){
      slab(cursor,bay.left,0,2.70);
      if(bay.bottom>0)slab(bay.left,bay.right,0,bay.bottom);
      slab(bay.left,bay.right,bay.top,2.70);cursor=bay.right;
    }
    slab(cursor,width/2,0,2.70);
    const skirting=(left,right)=>box(wall,(left+right)/2,.053,.012,right-left,.106,.024,trim);
    if(north){skirting(-width/2,-2.30);skirting(-1.46,width/2);}else skirting(-width/2,width/2);
    box(wall,0,2.70,-.058,width,.013,.122,trim);
    let frame;
    if(opened){
      frame=group(wall,'窗框外缘',middle,1.64,-.032);
      box(frame,-.677,0,0,.046,1.20,.07,ash);box(frame,.677,0,0,.046,1.20,.07,ash);
      box(frame,0,.579,0,1.31,.042,.07,ash);box(frame,0,-.579,0,1.31,.042,.07,ash);
      box(frame,0,0,-.005,.036,1.12,.055,ash);box(frame,0,.236,-.007,1.315,.026,.05,ash);
      box(wall,middle,1.025,.023,1.47,.030,.185,walnut);
      const outdoors=flatArt(wall,middle,1.64,-.14,1.445,1.245,landscape);
      outdoors.receiveShadow=false;outdoors.castShadow=false;
      box(wall,middle-.038,1.54,.013,.009,.08,.018,metal);
    }
    return {wall,solid,frame};
  }
  const versions={};
  for(const [state,destination] of [['original','north'],['revised','west']]){
    const root=group(model,state);versions[state]={root,north:buildWall(root,'north',destination==='north'),west:buildWall(root,'west',destination==='west')};
  }
  // Fill the outer back corner, beyond the surveyed interior faces.
  box(model,-2.46,1.35,-1.86,.12,2.70,.12,plaster);
  const entry=group(model,'北墙入口',-1.88,0,-1.80);
  const doorFrame=group(entry,'门框外缘');
  box(doorFrame,-.40,1.025,-.033,.04,2.05,.09,walnut);
  box(doorFrame,.40,1.025,-.033,.04,2.05,.09,walnut);
  box(doorFrame,0,2.03,-.033,.76,.04,.09,walnut);
  const doorPaint=mat(0x909b7e);
  box(entry,0,1.014,-.046,.746,1.986,.041,doorPaint);
  for(const lower of [true,false]){
    const yp=lower?.428:1.4, height=lower?.52:.96;
    for(const x of [-.28,.28])box(entry,x,yp,-.019,.018,height,.014,doorPaint);
    for(const y of [yp-height/2,yp+height/2])box(entry,0,y,-.019,.57,.018,.014,doorPaint);
  }
  box(entry,.274,1.012,-.012,.037,.137,.018,brass);
  for(const y of [.28,1.02,1.77])cylinder(entry,-.374,y,-.011,.007,.007,.087,brass,10);
  rod(entry,[.276,1.023,-.008],[.276,1.023,.052],.012,brass);
  rod(entry,[.277,1.023,.055],[.191,1.023,.055],.012,brass);

  const furniture={};
  const desk=furniture.desk=group(model,'书桌',-.55,0,-1.24);
  box(desk,0,.737,0,1.75,.046,.72,walnut);
  for(const sx of [-1,1]) for(const sz of [-1,1]) rod(desk,[sx*.775,.003,sz*.275],[sx*.724,.716,sz*.23],.031,darkWood,.040);
  box(desk,0,.677,-.232,1.49,.083,.045,darkWood);
  box(desk,.50,.643,0,.405,.14,.50,walnut);box(desk,.50,.644,.257,.402,.13,.016,walnut);
  box(desk,.50,.652,.274,.12,.011,.019,brass);
  const props=group(model,'桌面陈设',-.55,.76,-1.24);
  box(props,.05,.005,.037,.60,.01,.365,oliveShadow);
  box(props,.02,.018,.035,.31,.015,.21,paper).rotation.y=-.13;
  box(props,.02,.031,.036,.28,.008,.19,cream).rotation.y=-.13;
  rod(props,[.12,.038,.115],[.29,.038,.145],.004,metal);
  cylinder(props,.52,.012,-.098,.105,.111,.024,metal);
  rod(props,[.52,.022,-.098],[.61,.34,-.115],.015,brass);
  rod(props,[.61,.34,-.115],[.45,.46,-.078],.012,brass);
  const shade=cylinder(props,.425,.433,-.067,.053,.12,.123,clay);
  shade.rotation.z=-.42;
  cylinder(props,-.62,.060,-.065,.059,.048,.12,cream);
  const handle=mesh(props,new THREE.TorusGeometry(.042,.009,10,22),cream,-.552,.065,-.065);
  handle.scale.x=.8;
  const deskChair=furniture.deskChair=group(model,'桌椅',-.55,0,-.48);
  for(const sx of [-1,1])for(const sz of [-1,1])rod(deskChair,[sx*.241,.012,sz*.212],[sx*.186,.427,sz*.145],.021,walnut,.027);
  soft(deskChair,0,.444,0,.48,.085,.43,oliveShadow,.026);
  for(const sx of [-1,1])rod(deskChair,[sx*.183,.45,.14],[sx*.195,.80,.191],.018,walnut);
  soft(deskChair,0,.737,.18,.46,.168,.057,walnut,.021).rotation.x=.1;

  const shelf=furniture.bookcase=group(model,'高书柜',1.55,0,-1.52);
  box(shelf,0,1.06,-.187,1.12,2.12,.026,darkWood);
  for(const x of [-.536,.536])box(shelf,x,1.06,0,.048,2.12,.40,walnut);
  const ledges=[.075,.435,.835,1.235,1.635,2.096];
  for(const y of ledges)box(shelf,0,y,0,1.05,.048,.40,walnut);
  const shelfProps=group(model,'书柜陈设',1.55,0,-1.52);
  function books(parent,start,y,z,count,direction=1) {
    let x=start;
    for(let i=0;i<count;i++){
      const w=.033+rand()*.038,h=.16+rand()*.13,d=.13+rand()*.047;
      const book=bookJackets[Math.floor(rand()*bookJackets.length)];
      box(parent,x+direction*w/2,y+h/2,z,w,h,d,book);
      if(i%3!==1)box(parent,x+direction*w/2,y+h*.72,z+d/2+.0008,w*.60,.005,.002,paper);
      x+=direction*(w+.004);
    }
  }
  books(shelfProps,-.47,.099,.073,9);books(shelfProps,.47,.459,.072,7,-1);
  books(shelfProps,-.47,.859,.07,7);books(shelfProps,.47,1.259,.068,6,-1);
  books(shelfProps,-.47,1.659,.071,5);
  vase(shelfProps,.34,.859,.046,.25,.088,cream);vase(shelfProps,.115,.859,.06,.13,.056,ceramic);
  vase(shelfProps,-.228,1.259,.060,.21,.089,ceramic);plant(shelfProps,.265,1.659,.035,.39);
  for(let i=0;i<3;i++)box(shelfProps,-.29,.478+i*.037,.05,.31+i*.02,.035,.165,bookJackets[[0,3,2][i]]);
  box(shelfProps,.29,.208,.045,.33,.217,.245,oliveShadow);box(shelfProps,.29,.23,.17,.09,.034,.008,paper);

  const credenza=furniture.credenza=group(model,'西墙矮柜',-2.10,0,.85);
  for(const x of [-.147,.147])for(const z of [-.50,.50])box(credenza,x,.063,z,.048,.126,.048,darkWood);
  box(credenza,0,.467,0,.42,.706,1.18,walnut);
  for(const z of [-.287,.287]){box(credenza,.204,.464,z,.012,.617,.552,darkWood);box(credenza,.208,.465,z,.004,.57,.51,walnut);box(credenza,.210,.53,z+(z>0?-.18:.18),.001,.068,.013,brass);}
  const credProps=group(model,'矮柜陈设',-2.10,.82,.85);
  vase(credProps,0,0,.24,.29,.112,cream);vase(credProps,.008,0,.02,.20,.072,ceramic);
  box(credProps,.015,.016,-.32,.24,.032,.32,bookJackets[0]);box(credProps,.03,.047,-.32,.22,.028,.27,bookJackets[2]);
  const art=group(model,'西墙版画',-2.376,1.66,.85);art.rotation.y=Math.PI/2;
  box(art,0,0,0,.72,.81,.032,darkWood);
  const artTexture=painted(360,425,(c,w,h)=>{
    c.fillStyle='#f0e5c7';c.fillRect(0,0,w,h);
    c.fillStyle='#c36c47';c.beginPath();c.arc(w*.68,h*.32,56,0,Math.PI*2);c.fill();
    for(let i=0;i<7;i++){c.strokeStyle=i%2?'#b16d4c':'#616e54';c.lineWidth=7;c.beginPath();c.moveTo(60,334-i*12);c.lineTo(60,263-i*12);c.arc(150,263-i*12,90,Math.PI,Math.PI*1.97);c.lineTo(240,334-i*12);c.stroke();}
    c.fillStyle='#525847';c.fillRect(42,368,70,3);c.fillRect(42,377,44,2);
  });
  flatArt(art,0,0,.019,.666,.755,artTexture);

  const rugTex=painted(512,384,(c,w,h)=>{
    c.fillStyle='#a75e46';c.fillRect(0,0,w,h);
    for(let i=0;i<9;i++){const inset=10+i*4;c.strokeStyle=['#d2ae84','#b87d59','#815647'][i%3];c.lineWidth=i%3?1.4:2.7;c.strokeRect(inset,inset,w-2*inset,h-2*inset);}
    c.lineWidth=2.5;
    for(let x=72;x<w-45;x+=51)for(let y=66;y<h-42;y+=50){
      c.strokeStyle='#c48c68';c.beginPath();c.moveTo(x-10,y);c.lineTo(x,y-8);c.lineTo(x+10,y);c.lineTo(x,y+8);c.closePath();c.stroke();
      c.fillStyle='#e0b08a';c.fillRect(x-2,y-2,4,4);
    }
    for(let x=0;x<w;x+=2){c.fillStyle=x%4?'rgba(245,214,162,.085)':'rgba(49,34,29,.075)';c.fillRect(x,0,1,h);}
    for(let y=0;y<h;y+=3){c.fillStyle='rgba(48,34,29,.06)';c.fillRect(0,y,w,1);}
  });
  const rug=mesh(model,new THREE.PlaneGeometry(2.20,1.60),mat(0xffffff,{map:rugTex}),.86,.011,.67);
  rug.rotation.x=-Math.PI/2; rug.castShadow=false;
  const lounge=furniture.lounge=group(model,'阅读椅',1.12,.012,.63); lounge.rotation.y=-.43;
  for(const sx of [-1,1]){
    rod(lounge,[sx*.325,.01,.295],[sx*.324,.57,.20],.030,ash,.034);
    rod(lounge,[sx*.33,.01,-.28],[sx*.323,.597,-.214],.031,ash,.033);
    rod(lounge,[sx*.329,.53,.245],[sx*.326,.58,-.306],.032,ash);
    rod(lounge,[sx*.323,.272,.24],[sx*.323,.316,-.28],.027,darkWood);
  }
  soft(lounge,0,.345,.01,.643,.161,.605,olive,.054);
  soft(lounge,0,.595,-.239,.645,.515,.145,olive,.058).rotation.x=-.19;
  soft(lounge,-.085,.52,-.079,.321,.24,.091,cream,.033).rotation.set(-.18,-.025,-.12);
  const table=furniture.sideTable=group(model,'圆几',1.83,.012,.48);
  cylinder(table,0,.408,0,.225,.225,.045,walnut);
  for(let i=0;i<3;i++){const a=i*2*Math.PI/3;rod(table,[Math.cos(a)*.14,.007,Math.sin(a)*.14],[Math.cos(a)*.09,.394,Math.sin(a)*.09],.016,metal);}
  const tableProps=group(model,'圆几陈设',1.83,.442,.48);
  box(tableProps,-.018,.012,-.004,.196,.024,.140,bookJackets[2]).rotation.y=.32;
  vase(tableProps,.086,0,.059,.095,.043,cream);
  const standing=furniture.standingLamp=group(model,'落地灯',.53,0,-.86);
  cylinder(standing,0,.024,0,.144,.154,.048,metal);cylinder(standing,0,.69,0,.013,.013,1.33,brass);
  cylinder(standing,0,1.40,0,.125,.245,.289,cream);
  cylinder(standing,0,1.552,0,.026,.026,.021,brass);

  let current='revised';
  const choices={};
  function apply(state){
    current=state;
    for(const [id,value] of Object.entries(versions)){
      const active=id===state;
      value.root.visible=active;
      if(choices[id]){
        choices[id].setAttribute('aria-pressed',String(active));
        choices[id].style.background=active?'#765a3d':'';
      }
    }
  }
  view.preset('室内全景',[5.35,3.98,6.02],[-.10,.76,-.16],{fov:38});
  view.preset('斜侧核距',[1.85,6.65,4.02],[-.28,.53,-.35],{fov:38});
  view.preset('北墙立面',[0,1.35,23.5],[0,1.35,-1.8],{fov:8.55});
  view.preset('西墙立面',[23.5,1.35,0],[-2.4,1.35,0],{fov:8.55});
  choices.original=ui.button('原方案 · 北窗',()=>apply('original'));
  choices.revised=ui.button('修改后 · 西窗',()=>apply('revised'));
  apply(current);

  const rounded = n => Math.round(n*1000)/1000;
  function extent(node){
    const bb=new THREE.Box3().setFromObject(node,true);
    return {min:bb.min.toArray().map(rounded), max:bb.max.toArray().map(rounded)};
  }
  function solidAt(side,along,height){
    const {wall,solid}=versions[current][side];
    const from=wall.localToWorld(new THREE.Vector3(along,height,.22));
    const dir=wall.localToWorld(new THREE.Vector3(along,height,-.22)).sub(from).normalize();
    return new THREE.Raycaster(from,dir,0,.5).intersectObjects(solid.children,false).length>0;
  }
  function imageCorners(node,side){
    const {min,max}=new THREE.Box3().setFromObject(node,true);
    const topLeft=side==='north'?[min.x,max.y,max.z]:[max.x,max.y,max.z];
    const bottomRight=side==='north'?[max.x,min.y,max.z]:[max.x,min.y,min.z];
    return [topLeft,bottomRight].map(p=>new THREE.Vector3(...p).project(view.camera));
  }
  function inspect(){
    model.updateWorldMatrix(true,true);
    const side=current==='revised'?'west':'north';
    const assembly=versions[current][side];
    const [lt,rb]=imageCorners(assembly.solid,side),[wl,wr]=imageCorners(assembly.frame,side);
    return {
      revision:current, side, frameBounds:extent(versions[current][side].frame),
      projectedOpening:{left:rounded((wl.x-lt.x)/(rb.x-lt.x)),right:rounded((wr.x-lt.x)/(rb.x-lt.x)),top:rounded((lt.y-wl.y)/(lt.y-rb.y)),bottom:rounded((lt.y-wr.y)/(lt.y-rb.y))},
      doorFrame:extent(doorFrame), doorProbes:{center:solidAt('north',-1.88,1.05),above:solidAt('north',-1.88,2.06),left:solidAt('north',-2.31,1.05),right:solidAt('north',-1.45,1.05)},
      deskFacing:desk.position.clone().sub(deskChair.position).normalize().toArray().map(rounded),
      walls:Object.fromEntries(['north','west'].map(s=>[s,extent(versions[current][s].solid)])),
      probes:Object.fromEntries(['north','west'].map(s=>{
        const mid=s==='north'?-.55:.70;
        return [s, {center:solidAt(s,mid,1.64), left:solidAt(s,mid-.701,1.64), right:solidAt(s,mid+.701,1.64), above:solidAt(s,mid,2.241),below:solidAt(s,mid,1.039), innerLeft:solidAt(s,mid-.699,1.64),innerRight:solidAt(s,mid+.699,1.64),innerTop:solidAt(s,mid,2.239),innerBottom:solidAt(s,mid,1.041)}];
      })),
      furniture:Object.fromEntries(Object.entries(furniture).map(([id,obj])=>[id,extent(obj)]))
    };
  }
  return {inspect};
}
