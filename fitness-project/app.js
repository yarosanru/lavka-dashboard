(()=>{
  'use strict';
  const data=JSON.parse(document.getElementById('project-data').textContent),model=FitnessModel.create(data);
  let state={...model.all},current=model.view(state),pinned=false;
  const $=id=>document.getElementById(id),tip=$('tooltip'),live=$('live');
  const num=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
  const integer=new Intl.NumberFormat('ru-RU');
  const pct=new Intl.NumberFormat('ru-RU',{style:'percent',maximumFractionDigits:1});
  const percent=v=>v===null?'—':pct.format(v);
  const rating=v=>v===null?'—':num.format(v);
  const colors=data.coaches.map((_,i)=>`var(--c${i+1})`);
  for(const [key,values] of [['week',Array.from({length:10},(_,i)=>'Неделя '+(i+1))],['kind',data.kinds],['coach',data.coaches],['cohort',data.cohorts.slice(1).map(d=>`${d.label} · ${d.n} чел.`)]]){
    values.forEach((value,i)=>{const option=document.createElement('option');option.value=String(i+1);option.textContent=value;$('filter-'+key).appendChild(option);});
    $('filter-'+key).addEventListener('change',event=>set({[key]:Number(event.target.value)}));
  }
  $('reset').addEventListener('click',()=>set({...model.all}));
  function set(patch){state=model.clean({...state,...patch});pinned=false;tip.hidden=true;render();}
  function toggle(key,value){set({[key]:state[key]===value?0:value});}
  data.coaches.forEach((name,i)=>{
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed','false');button.setAttribute('data-coach',i+1);
    const swatch=document.createElement('i');swatch.className='swatch';swatch.style.setProperty('--color',colors[i]);button.appendChild(swatch);button.appendChild(document.createTextNode(name));
    button.addEventListener('click',()=>toggle('coach',i+1));$('coach-key').appendChild(button);
  });
  function hide(){if(!pinned)tip.hidden=true;}
  function show(event,text,announce=false){
    tip.textContent=text;tip.hidden=false;
    const x=event.clientX??12,y=event.clientY??12;
    tip.style.left=Math.max(12,Math.min(x+12,window.innerWidth-tip.offsetWidth-12))+'px';
    tip.style.top=Math.max(12,Math.min(y-tip.offsetHeight-10,window.innerHeight-tip.offsetHeight-12))+'px';
    if(announce)live.textContent=text;
  }
  function at(node){const b=node.getBoundingClientRect();return {clientX:b.left+b.width/2,clientY:b.top};}
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){pinned=false;tip.hidden=true;}});
  function svgFor(id,height,label){
    const holder=$(id),width=Math.floor(holder.clientWidth);d3.select(holder).selectAll('*').remove();
    const svg=d3.select(holder).append('svg').attr('xmlns','http://www.w3.org/2000/svg').attr('width',width).attr('height',height).attr('viewBox',`0 0 ${width} ${height}`).attr('role','group').attr('aria-label',label);
    return {svg,width};
  }
  function text(svg,x,y,value,cls='',anchor='start'){return svg.append('text').attr('x',x).attr('y',y).attr('class',cls).attr('text-anchor',anchor).text(value);}
  function link(svg,label,click,details){
    const a=svg.append('a').attr('href','#fitness-project').attr('aria-label',label);
    a.on('click',event=>{event.preventDefault();click();})
      .on('pointermove',event=>{if(details&&!pinned)show(event,details());})
      .on('pointerleave',hide).on('focus',()=>{if(details)show(at(a.node()),details(),true);}).on('blur',()=>{pinned=false;tip.hidden=true;});
    return a;
  }
  function hit(a,x,y,width,height){a.append('rect').attr('data-hit','').attr('x',x).attr('y',y).attr('width',width).attr('height',height).attr('fill','transparent');}
  function drawMain(){
    const holder=$('main-chart'),width=Math.floor(holder.clientWidth);d3.select(holder).selectAll('*').remove();
    const left=120,right=width>=700?54:12,available=width-left-right;
    const perPanel=Math.min(width<450?4:10,Math.max(1,Math.floor(available/56))),cw=available/perPanel;
    const gap=.8,size=Math.min(5,(cw-10-9*gap)/10),pitch=size+gap,barWidth=10*pitch-gap;
    const schedule=data.workouts.filter(w=>w.week===1).sort((a,b)=>a.slot-b.slot);
    const groups=[{key:0,title:'Все тренировки',day:'8 видео / нед.',max:d3.max(model.view({}).weekly,d=>d.views)},...schedule.map(w=>({key:w.slot,title:data.kinds[w.kind-1],kind:w.kind,day:w.day.toUpperCase(),max:d3.max(data.workouts.filter(x=>x.slot===w.slot),x=>model.stats([x]).views)}))];
    for(let start=1;start<=10;start+=perPanel){
      const weeks=d3.range(start,Math.min(11,start+perPanel));let cursor=56;
      const lanes=groups.map(g=>{const baseline=cursor+Math.ceil(g.max/10)*pitch+25;const lane={g,top:cursor,baseline};cursor=baseline+32;return lane;});
      const height=Math.ceil(cursor+40);
      const svg=d3.select(holder).append('svg').attr('xmlns','http://www.w3.org/2000/svg').attr('class','main-panel').attr('width',width).attr('height',height).attr('viewBox',`0 0 ${width} ${height}`).attr('role','group').attr('aria-label',`Просмотры, недели ${weeks[0]}–${weeks.at(-1)}. Один кубик — один просмотр. Цвет — тренер, заполнение — глубина.`);
      text(svg,0,18,'Тип · день','axis-title').attr('data-axis','y');text(svg,left,18,'Неделя программы','axis-title').attr('data-axis','x');
      if(right>=54&&weeks.includes(10))text(svg,width-right+5,40,'К 1-й','muted');
      weeks.forEach((week,i)=>{const a=link(svg,`Выбрать неделю ${week}`,()=>toggle('week',week));hit(a,left+i*cw,24,cw,28);if(state.week===week)a.append('rect').attr('class','week-selected').attr('x',left+i*cw).attr('y',24).attr('width',cw).attr('height',24).attr('pointer-events','none');text(a,left+(i+.5)*cw,40,week,state.week===week?'emphasis':'','middle');});
      svg.append('rect').attr('data-chart-frame','').attr('x',left-5).attr('y',49).attr('width',available+8).attr('height',cursor-49).attr('fill','none').attr('stroke','var(--line)').attr('stroke-width',.7);
      for(const {g,top,baseline} of lanes){
        if(g.kind){const a=link(svg,`${g.title}, ${g.day}: выбрать тип`,()=>toggle('kind',g.kind));hit(a,0,baseline-36,left-10,35);text(a,left-12,baseline-21,g.title,'emphasis','end');text(a,left-12,baseline-3,g.day,'muted','end');}
        else{text(svg,left-12,baseline-21,g.title,'emphasis','end');text(svg,left-12,baseline-3,g.day,'muted','end');text(svg,left-12,baseline+20,'Просм. / уч.','muted','end');}
        svg.append('line').attr('x1',left-5).attr('x2',width-right+3).attr('y1',baseline+.5).attr('y2',baseline+.5).attr('stroke','var(--line)').attr('stroke-width',.7);
        const laneWorkouts=current.workouts.filter(w=>!g.key||w.slot===g.key);
        const first=model.stats(laneWorkouts.filter(w=>w.week===1),state.cohort),last=model.stats(laneWorkouts.filter(w=>w.week===10),state.cohort);
        if(right>=54&&weeks.includes(10)&&first.videos&&last.videos&&first.views){const delta=Math.round((last.views/first.views-1)*100);text(svg,width-right+5,baseline-12,`${delta>0?'+':delta<0?'−':''}${Math.abs(delta)}%`,'emphasis');}
        weeks.forEach((week,i)=>{
          const ws=laneWorkouts.filter(w=>w.week===week),stats=model.stats(ws,state.cohort),values=model.atoms(ws,state.cohort),x=left+i*cw+(cw-barWidth)/2;
          const cell=svg.append('g').attr('data-cell',`${g.key}:${week}`).attr('data-count',values.length).attr('data-videos',ws.length).attr('data-baseline',baseline);
          values.forEach((d,index)=>{const ax=x+(index%10)*pitch,ay=baseline-size-Math.floor(index/10)*pitch;const mark=cell.append('g').attr('data-view',d.id).attr('data-depth',d.depth).attr('aria-hidden','true');mark.append('rect').attr('x',ax).attr('y',ay).attr('width',size).attr('height',size).attr('fill','var(--track)');mark.append('rect').attr('data-depth-fill','').attr('x',ax).attr('y',ay+size*(1-d.depth)).attr('width',size).attr('height',size*d.depth).attr('fill',colors[d.workout.coach-1]);});
          let chosen=-1;
          const details=item=>item?[`${item.workout.code} · ${data.kinds[item.workout.kind-1]} · ${item.workout.day.toUpperCase()}`,`Неделя ${week} · ${data.coaches[item.workout.coach-1]}`,`Просмотрено ${percent(item.depth)}`,`Оценка: ${rating(item.rating)}`,`Длительность видео: ${num.format(item.workout.duration)} (ед. источника)`].join('\n'):[`${g.title} · неделя ${week}`,ws.length?`${stats.views} просмотров · ${num.format(stats.engagement)} на участника`:'Нет видео в выбранном срезе',ws.length?`Средняя глубина ${percent(stats.depth)}`:'',ws.length?'Нажмите, чтобы выбрать этот срез':''].filter(Boolean).join('\n');
          function nearest(event){const p=d3.pointer(event,svg.node()),col=Math.floor((p[0]-x)/pitch),row=Math.floor((baseline-p[1])/pitch);return col>=0&&col<10&&row>=0?values[row*10+col]||null:null;}
          const a=link(cell,`${g.title}, ${g.day}, неделя ${week}: ${ws.length?stats.views+' просмотров':'нет видео'}. Стрелки — отдельные просмотры.`,()=>{const patch={week:state.week===week&&(!g.kind||state.kind===g.kind)?0:week};if(g.kind)patch.kind=patch.week?g.kind:0;set(patch);},()=>details(values[chosen]));
          hit(a,left+i*cw,top,cw,baseline-top+26);
          const barTop=baseline-Math.ceil(values.length/10)*pitch+gap;
          text(a,left+(i+.5)*cw,ws.length&&values.length?barTop-7:baseline-9,ws.length?stats.views:'—',ws.length?'':'muted','middle');
          a.on('pointermove',event=>{if(!pinned)show(event,details(nearest(event)));}).on('keydown',event=>{
            if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!values.length)return;
            event.preventDefault();chosen=event.key==='Home'?0:event.key==='End'?values.length-1:Math.max(0,Math.min(values.length-1,chosen+(event.key==='ArrowRight'?1:-1)));pinned=true;show(at(a.node()),details(values[chosen]),true);
          });
          if(ws.length&&g.key===0)text(svg,left+(i+.5)*cw,baseline+20,num.format(stats.engagement),'muted','middle');
          else if(stats.depth!==null&&stats.depth<.9)text(svg,left+(i+.5)*cw,baseline+20,`гл. ${Math.round(stats.depth*100)}%`,'muted','middle');
        });
      }
      weeks.forEach((week,i)=>text(svg,left+(i+.5)*cw,cursor+18,week,'','middle'));
      text(svg,left+available/2,cursor+38,'Неделя программы','muted','middle');
    }
  }
  function drawFlow(){
    const height=250,{svg,width}=svgFor('flow-chart',height,'Пропуски и возвращения участников по неделям программы. Зелёные столбики вверх — вернулись, красные вниз — пропустили.');
    const left=25,right=10,cw=(width-left-right)/10,y=d3.scaleLinear().domain([-15,15]).range([205,25]),zero=y(0);
    text(svg,0,14,'Участники','muted');
    svg.append('line').attr('x1',left).attr('x2',width-right).attr('y1',zero).attr('y2',zero).attr('stroke','var(--line)');text(svg,left-7,zero+4,'0','muted','end');
    current.transitions.forEach((d,i)=>{
      const cx=left+(i+.5)*cw,bw=Math.min(20,cw*.58);
      const detail=()=>d.week===1?`Неделя 1\nНачали смотреть ${d.active} участников\nПервая неделя не считается возвращением`:`Неделя ${d.week}\nВернулись после пропуска: ${d.returned}\nПропустили после предыдущей: ${d.missed}\nАктивны: ${d.active} из ${data.cohorts[state.cohort].n}\nПереходы по всей программе выбранной группы`;
      const a=link(svg,`Неделя ${d.week}: вернулись ${d.returned}, пропустили ${d.missed}, активны ${d.active}`,()=>toggle('week',d.week),detail);
      hit(a,left+i*cw,20,cw,212);
      if(state.week===d.week)a.append('rect').attr('class','week-selected').attr('x',left+i*cw+1).attr('y',20).attr('width',cw-2).attr('height',207).attr('pointer-events','none');
      if(d.returned){a.append('rect').attr('data-returned',d.week).attr('data-count',d.returned).attr('x',cx-bw/2).attr('y',y(d.returned)).attr('width',bw).attr('height',zero-y(d.returned)).attr('fill','var(--green)').attr('pointer-events','none');text(a,cx,y(d.returned)-6,d.returned,'','middle');}
      if(d.missed){a.append('rect').attr('data-missed',d.week).attr('data-count',d.missed).attr('x',cx-bw/2).attr('y',zero).attr('width',bw).attr('height',y(-d.missed)-zero).attr('fill','var(--red)').attr('pointer-events','none');text(a,cx,y(-d.missed)+15,d.missed,'','middle');}
      text(a,cx,230,d.week,'','middle');
    });
    text(svg,left+(width-left-right)/2,249,'Неделя программы','muted','middle');
    $('flow-caption').textContent=`Вся программа · участников: ${data.cohorts[state.cohort].n}${state.cohort?' в выбранной группе':''}. Пропуск не означает окончательный уход. Фильтры тренера и типа здесь не применяются.`;
  }
  function drawRatings(){
    const height=234,{svg,width}=svgFor('ratings-chart',height,'Средние оценки тренеров и количество поставленных оценок в выбранном срезе.');
    const left=73,right=88,x=d3.scaleLinear().domain([0,5]).range([left,width-right]),top=22,row=35;
    text(svg,width-3,13,'Оценка · n','muted','end');
    current.coaches.forEach((d,i)=>{
      const y=top+i*row,detail=()=>`${d.name}\nСредняя оценка: ${rating(d.rating)}\nПоставлено оценок: ${d.ratings} из ${d.views} просмотров\nВидео в срезе: ${d.videos}\nОхват одного видео: ${percent(d.reach)}`;
      const a=link(svg,`${d.name}: оценка ${rating(d.rating)}, ${d.ratings} оценок. Выбрать тренера.`,()=>toggle('coach',d.id),detail);
      hit(a,0,y-6,width,row);
      text(a,left-10,y+10,d.name,state.coach===d.id?'emphasis':'','end');
      if(d.rating!==null){a.append('rect').attr('x',left).attr('y',y).attr('width',x(5)-left).attr('height',12).attr('fill','var(--track)').attr('pointer-events','none');a.append('rect').attr('data-rating',d.id).attr('data-value',d.rating).attr('x',left).attr('y',y).attr('width',x(d.rating)-left).attr('height',12).attr('fill',colors[i]).attr('pointer-events','none');}
      text(a,width-3,y+10,`${rating(d.rating)} · ${d.ratings}`,'','end');
    });
    [0,1,2,3,4,5].forEach(v=>text(svg,x(v),top+5*row+2,v,'muted','middle'));
    text(svg,left,233,'Средняя оценка','muted');
  }
  function drawPreferences(){
    const height=286,{svg,width}=svgFor('preference-chart',height,'Предпочтения выбранной группы активности и всех участников. Средний охват одного видео каждого типа в процентах.');
    const group=current.preferenceCohort,key=$('preference-key');key.textContent='';
    for(const [label,color,cohort] of [[`${group.label} · ${group.n}`,'var(--low)',group.id],['Все участники · 101','var(--all)',0]]){
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(state.cohort===cohort));button.addEventListener('click',()=>toggle('cohort',cohort));
      const swatch=document.createElement('i');swatch.className='swatch';swatch.style.setProperty('--color',color);button.appendChild(swatch);button.appendChild(document.createTextNode(label));key.appendChild(button);
    }
    const left=78,right=48,x=d3.scaleLinear().domain([0,1]).range([left,width-right]),row=39,top=12;
    current.preferences.forEach((d,i)=>{
      const y=top+i*row;
      const a=link(svg,`${d.name}: выбрать тип`,()=>toggle('kind',d.id));hit(a,0,y-4,left-5,row);text(a,left-10,y+15,d.name,state.kind===d.id?'emphasis':'','end');
      for(const [s,offset,color,cohort] of [[d.chosen,0,'var(--low)',group.id],[d.all,14,'var(--all)',0]]){
        const detail=()=>`${d.name} · ${data.cohorts[cohort].label}\nОхват одного видео: ${percent(s.reach)}\n${s.views} просмотров / (${s.participants} участников × ${s.videos} видео)\nНажмите, чтобы выбрать тип и группу`;
        const bar=link(svg,`${d.name}, ${data.cohorts[cohort].label}: ${percent(s.reach)}. Выбрать тип и группу.`,()=>{const same=state.kind===d.id&&state.cohort===cohort;set({kind:same?0:d.id,cohort:same?0:cohort});},detail);
        hit(bar,left,y+offset,width-left,14);
        if(s.reach!==null)bar.append('rect').attr('data-preference',`${cohort}:${d.id}`).attr('data-value',s.reach).attr('x',left).attr('y',y+offset+1).attr('width',x(s.reach)-left).attr('height',8).attr('fill',color).attr('pointer-events','none');
        text(bar,width-2,y+offset+10,s.reach===null?'—':`${Math.round(s.reach*100)}%`,'','end');
      }
    });
    [0,.25,.5,.75,1].forEach(v=>text(svg,x(v),top+6*row+8,`${v*100}%`,'muted',v===0?'start':v===1?'end':'middle'));
    text(svg,left,283,'Средний охват одного видео','muted');
    $('preference-caption').textContent=`${group.label}: ${group.min}–${group.max} просмотренных видео за всю программу. Группа остаётся постоянной при фильтрации.`;
  }
  function render(){
    current=model.view(state);
    for(const key of Object.keys(state))$('filter-'+key).value=String(state[key]);
    document.querySelectorAll('#coach-key button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.getAttribute('data-coach'))===state.coach)));
    const s=current.summary;
    $('scope').textContent=`${integer.format(s.views)} просмотров · ${s.active} из ${s.participants} участников · ${s.videos} видео · ${num.format(s.engagement)} просмотра на участника за выбранный период`;
    drawMain();drawFlow();drawRatings();drawPreferences();
  }
  let width=0;
  new ResizeObserver(()=>{const next=$('main-chart').clientWidth+':'+$('flow-chart').clientWidth;if(next!==width){width=next;render();}}).observe($('fitness-project'));
  render();
})();
