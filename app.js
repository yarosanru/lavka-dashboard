const orders=Object.freeze(JSON.parse(document.getElementById('orders-data').textContent));
const money=n=>Math.round(n).toLocaleString('ru-RU')+' ₽';
const integer=n=>n.toLocaleString('ru-RU');
const dateLabel=s=>new Date(s+'T00:00:00').toLocaleDateString('ru-RU');
const tip=(event,title,detail)=>{const box=document.getElementById('tooltip');box.replaceChildren();const a=document.createElement('strong'),b=document.createElement('span');a.textContent=title;b.textContent=detail;box.append(a,b);box.hidden=false;box.style.left=Math.max(8,Math.min(event.clientX+12,innerWidth-box.offsetWidth-10))+'px';box.style.top=Math.max(8,Math.min(event.clientY+12,innerHeight-box.offsetHeight-10))+'px';};
const hideTip=()=>document.getElementById('tooltip').hidden=true;
const palette=['#468573','#71a693','#a4c3b5','#b9c9bf','#cfdbd4'];
function emptyChart(svg,w,h){svg.append('text').attr('x',w/2).attr('y',h/2).attr('text-anchor','middle').attr('fill','#9d9e97').attr('font-size',13).text('Нет доставленных заказов за этот период');}
function base(id,h){const node=document.getElementById(id),w=Math.max(310,node.clientWidth);const svg=d3.select(node).attr('viewBox',`0 0 ${w} ${h}`);svg.selectAll('*').remove();return {svg,w,h};}
function axisStyle(g){g.select('.domain').remove();g.selectAll('line').attr('stroke','#e9eae4');g.selectAll('text').attr('fill','#92978e').attr('font-size',10);}
function drawMonthly(delivered,from,to){const {svg,w,h}=base('monthly-chart',255);if(!delivered.length){emptyChart(svg,w,h);return;}
 const values=d3.rollup(delivered,v=>({amount:d3.sum(v,x=>x.amount),count:v.length}),x=>x.date.slice(0,7));
 const start=new Date(from.slice(0,7)+'-01T00:00:00'),end=d3.timeMonth.offset(new Date(to.slice(0,7)+'-01T00:00:00'),1);
 const data=d3.timeMonths(start,end).map(date=>({date,key:d3.timeFormat('%Y-%m')(date),...values.get(d3.timeFormat('%Y-%m')(date))||{amount:0,count:0}}));
 const x=d3.scaleBand().domain(data.map(d=>d.key)).range([49,w-8]).padding(.24),y=d3.scaleLinear().domain([0,d3.max(data,d=>d.amount)]).nice().range([218,13]);
 svg.append('g').attr('transform','translate(49,0)').call(d3.axisLeft(y).ticks(4).tickFormat(v=>v/1000+' тыс.').tickSize(-(w-57))).call(axisStyle);
 svg.selectAll('rect.month-bar').data(data).join('rect').attr('class','month-bar').attr('data-month',d=>d.key).attr('data-amount',d=>d.amount).attr('x',d=>x(d.key)).attr('y',d=>y(d.amount)).attr('width',x.bandwidth()).attr('height',d=>218-y(d.amount)).attr('rx',1).attr('fill','#578b78').on('pointermove',(e,d)=>tip(e,d.date.toLocaleDateString('ru-RU',{month:'long',year:'numeric'}),`${money(d.amount)} · ${integer(d.count)} заказов`)).on('pointerleave',hideTip);
 const step=Math.ceil(data.length/Math.max(3,Math.floor(w/90)));
 svg.append('g').attr('transform','translate(0,218)').call(d3.axisBottom(x).tickValues(data.filter((_,i)=>i%step===0).map(d=>d.key)).tickFormat(key=>{const date=new Date(key+'-01T00:00:00');return date.toLocaleDateString('ru-RU',{month:'short',year:'2-digit'});}).tickSize(0).tickPadding(15)).call(axisStyle);
}
function drawCategories(delivered){const {svg,w,h}=base('category-chart',255);if(!delivered.length){emptyChart(svg,w,h);return;}
 const items=delivered.flatMap(o=>o.items).filter(x=>x.category!=='Услуги Лавки');
 const all=d3.rollups(items,v=>d3.sum(v,x=>x.amount),x=>x.category).sort((a,b)=>b[1]-a[1]);
 const data=all.slice(0,5).map(([name,amount])=>({name,amount}));if(all.length>5)data.push({name:'Другие категории',amount:d3.sum(all.slice(5),d=>d[1])});
 const total=d3.sum(data,d=>d.amount),x=d3.scaleLinear().domain([0,d3.max(data,d=>d.amount)]).range([0,w-185]),row=38;
 data.forEach((d,i)=>{const y=i*row+15;svg.append('text').attr('x',0).attr('y',y).attr('fill','#4c534b').attr('font-size',12).text(d.name);svg.append('rect').attr('x',0).attr('y',y+7).attr('height',5).attr('width',Math.max(0,x(d.amount))).attr('fill',palette[Math.min(i,4)]);svg.append('text').attr('x',w-2).attr('y',y+3).attr('text-anchor','end').attr('fill','#4f594f').attr('font-size',12).text(money(d.amount));svg.append('text').attr('x',w-2).attr('y',y+17).attr('text-anchor','end').attr('fill','#989f95').attr('font-size',10).text((d.amount/total*100).toLocaleString('ru-RU',{maximumFractionDigits:1})+'%');svg.append('rect').attr('x',0).attr('y',y-12).attr('width',w).attr('height',row-2).attr('fill','transparent').on('pointermove',e=>tip(e,d.name,`${money(d.amount)} · ${(d.amount/total*100).toFixed(1).replace('.',',')}% расходов на товары`)).on('pointerleave',hideTip);});
}
function drawDelivery(delivered){const {svg,w,h}=base('delivery-chart',235);if(!delivered.length){emptyChart(svg,w,h);return;}
 const boundaries=[0,10,20,30,45,60,120];const data=boundaries.slice(0,-1).map((low,i)=>({low,high:boundaries[i+1],count:delivered.filter(o=>o.minutes>=low&&o.minutes<boundaries[i+1]).length}));
 const x=d3.scaleBand().domain(data.map(d=>`${d.low}–${d.high}`)).range([35,w-10]).padding(.32),y=d3.scaleLinear().domain([0,d3.max(data,d=>d.count)]).nice().range([190,18]);
 svg.append('g').attr('transform','translate(35,0)').call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')).tickSize(-(w-45))).call(axisStyle);
 svg.selectAll('rect.delivery-bar').data(data).join('rect').attr('class','delivery-bar').attr('data-count',d=>d.count).attr('x',d=>x(`${d.low}–${d.high}`)).attr('y',d=>y(d.count)).attr('width',x.bandwidth()).attr('height',d=>190-y(d.count)).attr('fill','#a2b39e').attr('rx',2).on('pointermove',(e,d)=>tip(e,`${d.low}–${d.high} минут`,`${integer(d.count)} заказов · нижняя граница включена, верхняя исключена`)).on('pointerleave',hideTip);
 svg.append('g').attr('transform','translate(0,190)').call(d3.axisBottom(x).tickSize(0).tickPadding(12)).call(axisStyle);
 svg.append('text').attr('x',w-8).attr('y',231).attr('text-anchor','end').attr('fill','#9da396').attr('font-size',10).text('Минут от создания до доставки');
}
Vue.createApp({
 data(){return {from:'2021-09-03',to:'2026-08-24',minDate:'2021-09-03',maxDate:'2026-08-24',year:'all',page:1,query:'',status:'all',sort:'newest',pageSize:25,years:[...new Set(orders.map(o=>o.date.slice(0,4)))].sort()};},
 computed:{
  invalidRange(){return this.from>this.to;},
  filtered(){return this.invalidRange?[]:orders.filter(o=>o.date>=this.from&&o.date<=this.to);},
  deliveredOrders(){return this.filtered.filter(o=>o.status==='доставлен');},
  total(){return this.filtered.length;},
  stats(){const d=this.deliveredOrders;return {amount:d3.sum(d,o=>o.amount),goods:d3.sum(d,o=>o.goodsAmount),services:d3.sum(d,o=>o.serviceAmount),discount:d3.sum(d,o=>o.discount),delivered:d.length,cancelled:this.total-d.length,receipt:d.length?d3.sum(d,o=>o.amount)/d.length:null,minutes:d.length?d3.mean(d,o=>o.minutes):null,median:d.length?d3.median(d,o=>o.minutes):null,fast:d.length?d.filter(o=>o.minutes<=20).length/d.length*100:null,units:d3.sum(d,o=>o.units)};},
  topProducts(){const items=this.deliveredOrders.flatMap(o=>o.items).filter(i=>i.category!=='Услуги Лавки');return d3.rollups(items,v=>({amount:d3.sum(v,x=>x.amount),units:d3.sum(v,x=>x.quantity)}),x=>x.name).map(([name,stats])=>({name,...stats})).sort((a,b)=>b.amount-a.amount).slice(0,6);},
  tableOrders(){const q=this.query.trim().toLocaleLowerCase('ru');const selected=this.filtered.filter(o=>(this.status==='all'||o.status===this.status)&&(!q||o.id.toLowerCase().includes(q)||o.items.some(i=>i.name.toLocaleLowerCase('ru').includes(q))));return selected.slice().sort(this.sort==='amount'?(a,b)=>b.amount-a.amount:this.sort==='oldest'?(a,b)=>a.date.localeCompare(b.date)||a.created.localeCompare(b.created):(a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created));},
  pages(){return Math.max(1,Math.ceil(this.tableOrders.length/this.pageSize));},
  visible(){return this.tableOrders.slice((this.page-1)*this.pageSize,this.page*this.pageSize);},
  periodLabel(){return `${dateLabel(this.from)} — ${dateLabel(this.to)}`;}
 },
 watch:{from(){this.changed();},to(){this.changed();},query(){this.page=1;},status(){this.page=1;},sort(){this.page=1;}},
 methods:{money,integer,dateLabel,
  decimal(n){return n===null?'—':n.toLocaleString('ru-RU',{maximumFractionDigits:1});},
  setYear(){if(this.year==='all'){this.from=this.minDate;this.to=this.maxDate;}else{this.from=this.year+'-01-01';this.to=this.year+'-12-31';}},
  manualDate(){this.year='custom';},
  reset(){this.year='all';this.from=this.minDate;this.to=this.maxDate;this.query='';this.status='all';this.sort='newest';},
  changed(){this.page=1;hideTip();this.$nextTick(()=>this.draw());},
  draw(){drawMonthly(this.deliveredOrders,this.from,this.to);drawCategories(this.deliveredOrders);drawDelivery(this.deliveredOrders);},
  go(n){this.page=Math.min(this.pages,Math.max(1,n));this.$nextTick(()=>{this.$refs.tableScroll.scrollTop=0;});},
  goodsNames(o){return o.items.filter(i=>i.category!=='Услуги Лавки').map(i=>i.name).join(', ')||'Только услуги';}
 },
 mounted(){this.draw();this.resize=()=>{clearTimeout(this.resizeTimeout);this.resizeTimeout=setTimeout(()=>this.draw(),100);};window.addEventListener('resize',this.resize);},
 beforeUnmount(){window.removeEventListener('resize',this.resize);clearTimeout(this.resizeTimeout);}
}).mount('#app');
