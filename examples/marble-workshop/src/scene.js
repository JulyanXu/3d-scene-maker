import scanBytes from './assets/david.bin';
import { buildWorkshop } from './workshop.js';

export const meta = { title: '石中人', subtitle: '文艺复兴雕塑工坊' };

function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function scanGeometry(T) {
  // Typed-array views also work when a bundler returns a slice of a larger buffer.
  const data = new DataView(scanBytes.buffer,scanBytes.byteOffset,scanBytes.byteLength);
  const vertices = data.getUint32(0,true), indices = data.getUint32(4,true);
  const xyz = new Float32Array(vertices*3);
  for(let i=0;i<xyz.length;i++) xyz[i]=data.getFloat32(8+4*i,true);
  const faces = new Uint32Array(indices);
  const faceOffset = 8+xyz.byteLength;
  for(let i=0;i<indices;i++) faces[i]=data.getUint32(faceOffset+4*i,true);
  const normals=new Int16Array(vertices*3),normalOffset=faceOffset+faces.byteLength;
  for(let i=0;i<normals.length;i++)normals[i]=data.getInt16(normalOffset+2*i,true);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position',new T.BufferAttribute(xyz,3));geo.setIndex(new T.BufferAttribute(faces,1));
  geo.setAttribute('normal',new T.BufferAttribute(normals,3,true));geo.computeBoundingSphere();
  return geo;
}

function marble(T, rough) {
  const mat=new T.MeshStandardMaterial({color:rough?0xc9bcaa:0xe6dfd2,roughness:rough?.95:.39,metalness:0});
  mat.userData.breath={value:0};
  // Both surfaces use workshop coordinates so that veins cross the extraction line.
  mat.customProgramCacheKey=()=>rough?'quarried-stone':'honed-stone';
  mat.onBeforeCompile=shader=>{
    shader.uniforms.breath=mat.userData.breath;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStone; uniform float breath;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vStone=position;
        ${rough?'':'float ribcage = exp(-pow((position.y-2.64)*2.1,2.)-pow(position.x*1.35,2.)); transformed.z += breath*ribcage;'}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vStone;
      float grainHash(vec3 q) { q=fract(q*vec3(.1031,.1030,.0973));q+=dot(q,q.yxz+33.33);return fract((q.x+q.y)*q.z); }
      float rockNoise(vec3 q) {
        vec3 i=floor(q),f=fract(q); f=f*f*(3.-2.*f);
        return mix(mix(mix(grainHash(i),grainHash(i+vec3(1,0,0)),f.x),
                       mix(grainHash(i+vec3(0,1,0)),grainHash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(grainHash(i+vec3(0,0,1)),grainHash(i+vec3(1,0,1)),f.x),
                       mix(grainHash(i+vec3(0,1,1)),grainHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }`);
    const coloring=`
      vec3 stoneP = vStone;
      float layer = 2.8*stoneP.y + 1.85*stoneP.x + .78*stoneP.z
          + .60*sin(3.5*stoneP.x + 1.9*stoneP.z + stoneP.y)
          + .15*sin(8.1*stoneP.y-6.4*stoneP.x) + .041*sin(18.6*stoneP.z+15.1*stoneP.y);
      float veins = 1.0 - smoothstep(.008,.079,abs(sin(layer)));
      float mist = .5+.5*sin(layer+.3*sin(4.*stoneP.z));
      diffuseColor.rgb *= (1.0-.067*mist);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.48,.60,.65), veins*${rough?'.23':'.29'});
      ${rough?`
        float grain=rockNoise(stoneP*51.);
        float grooves = pow(.5+.5*sin(111.*stoneP.x + 45.*stoneP.y + 61.*stoneP.z + 3.8*sin(5.9*stoneP.y)),6.);
        float broken = smoothstep(.34,.64,rockNoise(stoneP*4.5));
        diffuseColor.rgb *= .89+.105*grain-.105*grooves*broken;
      `:''}
    `;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+coloring);
    if(rough) shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float relief=.032*rockNoise(vStone*9.)+.0045*grain+.004*grooves*broken;
      vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),rx=cross(dy,normal),ry=cross(normal,dx);
      float det=dot(dx,rx);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*rx+dFdy(relief)*ry));`);
  };
  return mat;
}

function makeStock(T, material) {
  // A continuous closed quarry shell. Its top and four sides share all edge vertices.
  const grid=40, points=[], faces=[], rim=[], sides=[], cuts=new Float32Array((grid+1)**2);
  const vertex=(x,y,z)=>{points.push(x,y,z);return points.length/3-1;};
  const index=(i,j)=>j*(grid+1)+i;
  for(let j=0;j<=grid;j++)for(let i=0;i<=grid;i++)vertex(0,0,0);
  for(let i=0;i<grid;i++)rim.push(index(i,0));
  for(let j=0;j<grid;j++)rim.push(index(grid,j));
  for(let i=grid;i>0;i--)rim.push(index(i,grid));
  for(let j=grid;j>0;j--)rim.push(index(0,j));
  for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
    const a=index(i,j),b=index(i+1,j),c=index(i,j+1),d=index(i+1,j+1);
    faces.push(a,c,b,b,c,d);
  }
  let above=rim;
  for(let row=1;row<=14;row++) {
    const lower=rim.map(()=>vertex(0,0,0));
    for(let i=0;i<rim.length;i++){
      const j=(i+1)%rim.length;faces.push(above[i],above[j],lower[i],lower[i],above[j],lower[j]);
    }
    sides.push(lower);above=lower;
  }
  const bottom=vertex(0,.438,0);
  for(let i=0;i<rim.length;i++)faces.push(above[i],above[(i+1)%rim.length],bottom);
  const geometry=new T.BufferGeometry(), position=new T.Float32BufferAttribute(points,3);
  position.setUsage(T.DynamicDrawUsage);geometry.setAttribute('position',position);geometry.setIndex(faces);
  let progress=.58;
  function sample(i,j) {
    const u=i/grid*2-1,v=j/grid*2-1;
    const corner=Math.max(0,(Math.abs(u)+Math.abs(v)-1.70)/.30);
    const x=u*(1.87-.29*progress)*(1-.087*corner);
    const z=v*(1.15-.12*progress)*(1-.085*corner)-.05;
    const rise=.36*x-.61*z+.18*Math.sin(2.8*x+1.4*z)+.10*Math.cos(.9*x-5.1*z);
    const shell=5.17-4.10*progress;
    const ledge=.048*Math.sin(16*x+2.6*z)+.033*Math.sin(18*z-7*x)+.023*Math.sin(39*x-21*z);
    const y=Math.max(.62,shell+progress*(rise+ledge)-cuts[index(i,j)]);
    return [x,y,z];
  }
  function rebuild(value) {
    progress=value;
    for(let j=0;j<=grid;j++)for(let i=0;i<=grid;i++)position.setXYZ(index(i,j),...sample(i,j));
    sides.forEach((row,level)=>{
      const t=(level+1)/sides.length;
      for(let i=0;i<rim.length;i++){
        const x=position.getX(rim[i]),z=position.getZ(rim[i]),top=position.getY(rim[i]);
        const y=top*(1-t)+.438*t;
        const fracture=1+Math.sin(t*Math.PI)*(.008*Math.sin(17*x+7*y)+.013*Math.cos(12*z-4*y));
        position.setXYZ(row[i],x*fracture,y,z*fracture);
      }
    });
    position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  }
  function strike(serial) {
    // A local deficit accumulates where the chisel lands. Side faces follow the changing rim.
    const angle=serial*2.40;
    const cx=Math.round(grid*(.895+.045*Math.cos(angle))),cz=Math.round(grid*(.82+.05*Math.sin(angle)));
    const before=sample(cx,cz);
    for(let j=0;j<=grid;j++)for(let i=0;i<=grid;i++) {
      const d=((i-cx)/2.5)**2+((j-cz)/3.2)**2;
      if(d<3)cuts[index(i,j)]=Math.min(.49,cuts[index(i,j)]+.145*Math.exp(-1.5*d));
    }
    rebuild(progress);
    return new T.Vector3(...before);
  }
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;
  rebuild(progress);
  return {mesh,rebuild,strike,height:()=>position.getY(index(grid/2,grid/2)), removed:()=>cuts.reduce((a,b)=>a+b,0)};
}

function lightInAir(T,scene,random) {
  // Fading cross-sections keep window rays visible without rendering a fog volume per pixel.
  const shaft=new T.BufferGeometry(),coords=[],intensity=[];
  const put=(point,alpha)=>{coords.push(...point);intensity.push(alpha);};
  for(const x of [-5.75,-3]) for(let j=0;j<4;j++){
    const offset=(j-1.5)*.28;
    const a=[x+offset-.12,4.05,-4.91],b=[x+offset+.12,4.05,-4.91];
    const c=[x+offset+2.50,.06,2.60],d=[x+offset+3.20,.06,2.60];
    put(a,.035);put(c,0);put(b,.035);put(b,.035);put(c,0);put(d,0);
  }
  shaft.setAttribute('position',new T.Float32BufferAttribute(coords,3));shaft.setAttribute('strength',new T.Float32BufferAttribute(intensity,1));
  const shaftMaterial=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'attribute float strength; varying float alpha; void main(){ alpha=strength; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader:'varying float alpha; void main(){ gl_FragColor=vec4(1.,.76,.43,alpha); }'});
  scene.add(new T.Mesh(shaft,shaftMaterial));
  const motes=new Float32Array(180*3);
  for(let i=0;i<motes.length;i+=3){motes[i]=-5.6+random()*7;motes[i+1]=.5+random()*4.2;motes[i+2]=-4.8+random()*6.8;}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(motes,3));
  const dust=new T.Points(geo,new T.PointsMaterial({color:0xffdc9c,size:.014,transparent:true,opacity:.44,depthWrite:false}));
  scene.add(dust);return dust;
}

export function createScene({ THREE:T, scene, view, ui, renderer }) {
  const random=randomFrom(0x105ca4), ambient=new T.HemisphereLight(0xcddbe4,0x92847e,1.32);
  scene.background=new T.Color(0x756c58);scene.fog=new T.FogExp2(0x90816b,.029);scene.add(ambient);
  const key=new T.DirectionalLight(0xffe5bc,2.65);
  key.position.set(-4.7,7.8,4.05);key.target.position.set(0,1.8,0);scene.add(key,key.target);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:24});
  key.shadow.normalBias=.025;key.shadow.bias=-.00020;key.shadow.camera.updateProjectionMatrix();
  if(renderer.shadowMap)renderer.shadowMap.enabled=true;
  const rim=new T.DirectionalLight(0xffdd9f,1.24);rim.position.set(-2.8,5.4,-4.5);scene.add(rim);
  const fill=new T.DirectionalLight(0xc3d4de,.49);fill.position.set(4.2,3.6,3.3);scene.add(fill);
  const updateWorkshop=buildWorkshop(T,scene,random);
  const dust=lightInAir(T,scene,random);
  const figure=new T.Mesh(scanGeometry(T),marble(T,false));figure.castShadow=true;figure.receiveShadow=true;scene.add(figure);
  const stock=makeStock(T,marble(T,true));scene.add(stock.mesh);
  const chipMaterial=new T.MeshStandardMaterial({color:0xe5d5bc,roughness:.88});
  const chipMesh=new T.InstancedMesh(new T.TetrahedronGeometry(1),chipMaterial,60);
  chipMesh.frustumCulled=false;chipMesh.count=0;scene.add(chipMesh);
  const particleRecords=[];const chipMatrix=new T.Object3D();
  const puffCanvas=document.createElement('canvas');puffCanvas.width=puffCanvas.height=64;
  const brush=puffCanvas.getContext('2d'),soft=brush.createRadialGradient(32,32,0,32,32,32);
  soft.addColorStop(0,'rgba(255,248,228,1)');soft.addColorStop(.32,'rgba(255,248,228,.65)');soft.addColorStop(1,'rgba(255,248,228,0)');
  brush.fillStyle=soft;brush.fillRect(0,0,64,64);
  const cloudTexture=new T.CanvasTexture(puffCanvas);
  const puffs=Array.from({length:5},(_,i)=>{
    const puff=new T.Sprite(new T.SpriteMaterial({map:cloudTexture,color:0xffe4b3,transparent:true,depthWrite:false}));
    puff.userData.phase=i*1.29;puff.visible=false;scene.add(puff);return puff;
  });
  const chisel=new T.Group();chisel.visible=false;
  const stem=new T.Mesh(new T.CylinderGeometry(.027,.016,.49,8),new T.MeshStandardMaterial({color:0x595752,metalness:.64,roughness:.46}));
  stem.position.y=.245;chisel.add(stem);
  const grip=new T.Mesh(new T.CylinderGeometry(.055,.04,.26,12),new T.MeshStandardMaterial({color:0x805b36,roughness:.75}));
  grip.position.y=.57;chisel.add(grip);chisel.rotation.z=.38;scene.add(chisel);
  let strikes=0,totalChips=0,toolPhase=1,progress=58;
  const point=new T.Vector3();
  function tap(){
    point.copy(stock.strike(strikes));strikes++;toolPhase=0;chisel.visible=true;
    chisel.position.copy(point);
    for(let i=0;i<15;i++){
      if(particleRecords.length>=60)particleRecords.shift();
      particleRecords.push({pos:point.clone(),vel:new T.Vector3((random()-.46)*2.7,.68+random()*1.87,(random()-.20)*2.0),
        rot:random()*6,spin:.7+random()*7,size:.027+random()*.059,age:0});
    }
    totalChips+=15;
  }
  view.preset('工坊全景',[3.16,3.32,7.28],[-.05,2.58,-.08]);
  view.preset('面部近观',[2.04,4.36,2.88],[-.33,4.11,-.10]);
  view.preset('凿痕细节',[3.52,4.12,3.06],[1.04,2.82,.38]);
  ui.slider('雕刻进度',0,100,1,progress,value=>{progress=Number(value);stock.rebuild(progress/100);});
  ui.button('落凿',tap);
  tap();
  return {
    update(dt,time){
      updateWorkshop(time);
      figure.material.userData.breath.value=.023*(progress/100)*Math.sin(time*1.47);
      dust.position.x=Math.sin(time*.17)*.11;dust.position.y=Math.sin(time*.29)*.048;
      toolPhase+=dt;
      if(toolPhase<.47)chisel.position.y=point.y+Math.sin(toolPhase/.47*Math.PI)*.29;
      else chisel.visible=false;
      for(const puff of puffs){
        puff.visible=toolPhase<1.15;
        if(!puff.visible)continue;
        const angle=puff.userData.phase;
        puff.position.copy(point);
        puff.position.x+=Math.cos(angle)*toolPhase*.52;puff.position.y+=.065+toolPhase*(.40+.11*Math.sin(angle));puff.position.z+=Math.sin(angle)*toolPhase*.41;
        puff.scale.setScalar(.11+toolPhase*.83);puff.material.opacity=.32*(1-toolPhase/1.15);
      }
      for(let i=particleRecords.length-1;i>=0;i--){
        const p=particleRecords[i];p.age+=dt;
        if(p.age>1.45){particleRecords.splice(i,1);continue;}
        p.vel.y-=5.2*dt;p.pos.addScaledVector(p.vel,dt);p.rot+=p.spin*dt;
      }
      particleRecords.forEach((p,i)=>{
        chipMatrix.position.copy(p.pos);chipMatrix.rotation.set(p.rot,p.rot*.6,-p.rot*.8);
        const s=p.size*Math.min(1,(1.45-p.age)*5);
        chipMatrix.scale.set(s,s*.55,s*.78);chipMatrix.updateMatrix();chipMesh.setMatrixAt(i,chipMatrix.matrix);
      });
      chipMesh.count=particleRecords.length;
      if(chipMesh.count)chipMesh.instanceMatrix.needsUpdate=true;
    },
    inspect(){return {progress,strikes,totalChips,airborneChips:particleRecords.length,cutDepthSum:stock.removed(),
      stockCenterHeight:stock.height(),impact:point.toArray(),figureTriangles:figure.geometry.index.count/3};}
  };
}
