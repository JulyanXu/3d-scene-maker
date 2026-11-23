import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export default async function checkStudy(page, assert, capture) {
  const get = () => page.evaluate(() => window.sceneMaker.inspect());
  const menu = page.getByRole('combobox', {name:'视角'});
  const originalButton = page.getByRole('button', {name:'原方案 · 北窗'});
  const revisedButton = page.getByRole('button', {name:'修改后 · 西窗'});
  const near = (observed, expected, label, tolerance = .002) =>
    assert.ok(Math.abs(observed-expected) <= tolerance, label + ' (' + observed + ', ' + expected + ')');
  function checkWallProbes(result, openWall) {
    for (const [side, probes] of Object.entries(result.probes)) {
      assert.equal(probes.center,side!==openWall,side + '洞口实墙射线');
      for (const edge of ['left','right','above','below']) assert.equal(probes[edge],true,side + '洞口外应有墙: ' + edge);
      for(const edge of ['innerLeft','innerRight','innerTop','innerBottom'])assert.equal(probes[edge],side!==openWall,side+'洞口内沿射线: '+edge);
    }
  }
  async function compareElevation(side){
    const {projectedOpening:measured}=await get();
    const expected={left:side==='north'?115/480:180/360,right:side==='north'?255/480:320/360,top:46/270,bottom:166/270};
    for(const edge of Object.keys(expected))near(measured[edge],expected[edge],side+' 窗框在墙面图像中的投影比例 '+edge,.002);
    return {expected,measured,tolerance:.002};
  }
  function checkDimensions(result) {
    const {north,west}=result.walls, {min,max}=result.frameBounds;
    near(north.max[0]-north.min[0],4.8,'净宽');
    near(west.max[2]-west.min[2],3.6,'净深');near(north.max[1]-north.min[1],2.70,'净高');
    near(north.max[2],-1.80,'北墙完成面');near(west.max[0],-2.40,'西墙完成面');
    near(result.doorFrame.min[0],-2.30,'门洞西边');near(result.doorFrame.max[0],-1.46,'门洞东边');
    near(result.doorFrame.max[1],2.05,'门高');near(result.doorFrame.min[1],0,'门底');
    near(result.doorFrame.min[0]-west.max[0],.10,'门洞距西墙');
    assert.deepEqual(result.doorProbes,{center:false,above:true,left:true,right:true});
    assert.deepEqual(result.deskFacing,[0,0,-1],'就座时朝北');
    near(result.furniture.desk.min[2]-north.max[2],.20,'书桌后缘距北墙');
    near(min[1],1.04,'洞口窗台');near(max[1],2.24,'洞口上沿');
    const axis=result.side==='north'?0:2;
    near(max[axis]-min[axis],1.4,'洞宽');near((max[axis]+min[axis])/2,result.side==='north'?-.55:-.70,'洞口中心');
    for(const [id, bounds] of Object.entries({
      desk:[-1.425,.325,-1.60,-.88,.76],bookcase:[.99,2.11,-1.72,-1.32,2.12],credenza:[-2.31,-1.89,.26,1.44,.82]
    })){
      const b=result.furniture[id];
      [b.min[0],b.max[0],b.min[2],b.max[2],b.max[1]].forEach((value,i)=>near(value,bounds[i],id + ' 实测外包',.003));
    }
  }
  const initial=await get();
  assert.equal(initial.revision,'revised'); checkDimensions(initial); checkWallProbes(initial,'west');
  await originalButton.click();
  const before=await get();
  assert.equal(before.revision,'original');checkDimensions(before);checkWallProbes(before,'north');
  await menu.selectOption({label:'北墙立面'}); await capture('before-north-elevation');
  const northProjection=await compareElevation('north');
  await menu.selectOption({label:'室内全景'}); await capture('before-room');
  await revisedButton.click();
  const after=await get();
  assert.equal(after.revision,'revised');checkDimensions(after);checkWallProbes(after,'west');
  assert.deepEqual(after.furniture,before.furniture,'窗位变更应保留所有家具的实际世界坐标外包');
  assert.deepEqual(after.walls,before.walls,'墙体边界应保持一致');
  assert.deepEqual(after,initial,'重复切换应准确复原修改后的方案');
  await menu.selectOption({label:'西墙立面'});await capture('after-west-elevation');
  const westProjection=await compareElevation('west');
  await menu.selectOption({label:'北墙立面'});await capture('after-north-elevation');
  await menu.selectOption({label:'斜侧核距'});await capture('after-oblique-clearances');
  await menu.selectOption({label:'室内全景'});
  const root=fileURLToPath(new URL('./',import.meta.url));
  const out=resolve(root,process.env.SCENE_QA_DIR || 'verification/'+(process.env.SCENE_BROWSER_CHANNEL || 'chrome'));
  await mkdir(out,{recursive:true});
  await writeFile(resolve(out,'measurements.json'),JSON.stringify({units:'m',geometry:'world-space mesh bounds and solid wall raycasts',windowPlacementInElevation:{northProjection,westProjection},before,after},null,2)+'\n');
}
