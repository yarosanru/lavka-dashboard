const orders = Object.freeze(JSON.parse(document.getElementById('orders-data').textContent));
const SERVICE = 'Услуги Лавки';
const money = n => n === null ? '—' : Math.round(n).toLocaleString('ru-RU') + ' ₽';
const integer = n => n.toLocaleString('ru-RU');
const decimal = n => n === null || !Number.isFinite(n) ? '—' : n.toLocaleString('ru-RU', {maximumFractionDigits: 1});
const dateLabel = s => new Date(s + 'T00:00:00').toLocaleDateString('ru-RU');
const monthLabel = s => new Date(s + '-01T00:00:00').toLocaleDateString('ru-RU', {month: 'long', year: 'numeric'});
const minDate = d3.min(orders, o => o.date), maxDate = d3.max(orders, o => o.date);
const last24Start = d3.timeFormat('%Y-%m-%d')(d3.timeMonth.offset(new Date(maxDate.slice(0, 7) + '-01T00:00:00'), -23));
const goods = list => list.flatMap(o => o.items).filter(i => i.category !== SERVICE);
function summary(list) {
  const delivered = list.filter(o => o.status === 'доставлен'), items = goods(delivered);
  const units = d3.sum(items, i => i.quantity), discount = d3.sum(items, i => (i.originalPrice - i.price) * i.quantity);
  return {count: list.length, delivered: delivered.length, cancelled: list.length - delivered.length,
    amount: d3.sum(delivered, o => o.amount), goods: d3.sum(items, i => i.amount),
    services: d3.sum(delivered, o => o.items.filter(i => i.category === SERVICE).reduce((s, i) => s + i.amount, 0)),
    units, discount, averageDiscount: units ? d3.sum(items, i => i.originalPrice > 0 ? (i.originalPrice-i.price) / i.originalPrice * i.quantity : 0) / units * 100 : null,
    discountPerOrder: delivered.length ? discount / delivered.length : null,
    receipt: delivered.length ? d3.sum(delivered, o => o.amount) / delivered.length : null,
    minutes: delivered.length ? d3.mean(delivered, o => o.minutes) : null};
}
function monthlyData(list, from, to) {
  if (!from || !to || from > to) return [];
  const groups = d3.group(list, o => o.date.slice(0, 7));
  const start = new Date(from.slice(0, 7) + '-01T00:00:00'), end = d3.timeMonth.offset(new Date(to.slice(0, 7) + '-01T00:00:00'), 1);
  return d3.timeMonths(start, end).map(date => {const key = d3.timeFormat('%Y-%m')(date);return {key, date, ...summary(groups.get(key) || [])};});
}
function selectCategory(list, category) {
  if (category === 'all') return list;
  return list.filter(o => o.items.some(i => i.category === category)).map(o => {
    const items = o.items.filter(i => i.category === category);
    return {...o, items, amount: d3.sum(items, i => i.amount), units: d3.sum(items, i => i.quantity)};
  });
}
function productData(list) {
  const entries = list.filter(o => o.status === 'доставлен').flatMap(o => o.items.filter(i=>i.category!==SERVICE).map(i=>({...i, date:o.date, order:o.id})));
  return d3.rollups(entries, values => {
    const units = d3.sum(values, i=>i.quantity), amount = d3.sum(values, i=>i.amount);
    const history = d3.rollups(values, v=>d3.sum(v,i=>i.amount)/d3.sum(v,i=>i.quantity), i=>i.date.slice(0,7)).sort((a,b)=>d3.ascending(a[0],b[0])).map(([month,price])=>({month,price}));
    return {units,amount,orders:new Set(values.map(i=>i.order)).size,averagePrice:units?amount/units:null,history,category:values[0].category};
  },i=>i.name).map(([name,stats])=>({name,...stats}));
}
function base(id,h) {
  const node = document.getElementById(id), w = Math.max(300, node.clientWidth);
  const svg = d3.select(node).attr('viewBox', `0 0 ${w} ${h}`);svg.selectAll('*').remove();return {svg,w,h};
}
function axisStyle(g) {g.select('.domain').remove();g.selectAll('line').attr('stroke','#e9ece4');g.selectAll('text').attr('fill','#87907e').attr('font-size',10);}
function emptyChart(svg,w,h,message='Нет данных за этот период') {svg.append('text').attr('x',w/2).attr('y',h/2).attr('text-anchor','middle').attr('fill','#909b84').attr('font-size',12).text(message);}
function positionTip(event) {
  const box = document.getElementById('tooltip'), r = event.currentTarget?.getBoundingClientRect();
  const cx = event.clientX || r?.x || 15, cy = event.clientY || r?.y || 15;
  box.style.left = Math.max(8,Math.min(cx+16,innerWidth-box.offsetWidth-10))+'px';
  box.style.top = Math.max(8,Math.min(cy+16,innerHeight-box.offsetHeight-10))+'px';
}
function showTip(event,title,detail) {
  const box = document.getElementById('tooltip');box.replaceChildren();
  const strong = document.createElement('strong'), span = document.createElement('span');strong.textContent=title;span.textContent=detail;
  box.append(strong,span);box.hidden=false;positionTip(event);
}
function hideTip() {document.getElementById('tooltip').hidden=true;}
function productTip(event,d) {
  showTip(event,d.name,`${integer(d.units)} шт. · ${money(d.amount)} · ${integer(d.orders)} заказов`);
  const box = d3.select('#tooltip');
  box.append('div').attr('class','tip-price').text(`Средняя цена за штуку: ${money(d.averagePrice)}`);
  box.append('div').attr('class','tip-chart-title').text('Цена за штуку по месяцам покупок');
  const w=266,h=106,p=d.history;
  const svg=box.append('svg').attr('class','price-history').attr('viewBox',`0 0 ${w} ${h}`).attr('aria-label','Динамика цены товара');
  const x=d3.scalePoint().domain(p.map(a=>a.month)).range([13,w-13]).padding(.3);
  const extent=d3.extent(p,a=>a.price), padding=Math.max(10,(extent[1]-extent[0])*.2);
  const y=d3.scaleLinear().domain([Math.max(0,extent[0]-padding),extent[1]+padding]).range([77,12]);
  svg.append('path').datum(p).attr('d',d3.line().x(a=>x(a.month)).y(a=>y(a.price))).attr('fill','none').attr('stroke','#acd7b7').attr('stroke-width',2);
  svg.selectAll('circle').data(p).join('circle').attr('cx',a=>x(a.month)).attr('cy',a=>y(a.price)).attr('r',2.5).attr('fill','#acd7b7');
  const first=p[0],last=p.at(-1);
  svg.append('text').attr('x',9).attr('y',99).attr('fill','#bdcdb7').attr('font-size',9).text(first.month);
  if(p.length>1)svg.append('text').attr('x',w-9).attr('y',99).attr('text-anchor','end').attr('fill','#bdcdb7').attr('font-size',9).text(last.month);
  box.append('span').text(p.length>1?`${money(first.price)} → ${money(last.price)} · месяцев с покупками: ${p.length}`:`${money(first.price)} · одна точка наблюдения`);
  positionTip(event);
}
function drawMetric(id,data,key,color) {
  const {svg,w,h}=base(id,202);if(!data.length){emptyChart(svg,w,h);return;}
  const height=161,left=43,right=w-7;
  const x=d3.scaleBand().domain(data.map(d=>d.key)).range([left,right]).padding(.27);
  const max=d3.max(data,d=>d[key]??0);
  const y=d3.scaleLinear().domain([0,max||1]).nice().range([height,10]);
  const value=v=>key==='amount'?money(v):key==='averageDiscount'?decimal(v)+'%':integer(v);
  svg.append('g').attr('transform',`translate(${left},0)`).call(d3.axisLeft(y).ticks(3).tickFormat(v=>key==='amount'?Math.round(v/1000)+' тыс.':key==='averageDiscount'?decimal(v)+'%':Number.isInteger(v)?v:'').tickSize(-(right-left))).call(axisStyle);
  svg.selectAll('rect.month-bar').data(data).join('rect').attr('class','month-bar').attr('data-month',d=>d.key).attr('data-value',d=>d[key]??'').attr('x',d=>x(d.key)).attr('y',d=>y(d[key]??0)).attr('width',x.bandwidth()).attr('height',d=>height-y(d[key]??0)).attr('fill',color).attr('rx',1);
  const spacing=Math.max(1,Math.ceil(data.length/(w/75)));
  svg.append('g').attr('transform',`translate(0,${height})`).call(d3.axisBottom(x).tickValues(data.filter((_,i)=>i%spacing===0||i===data.length-1).map(d=>d.key)).tickFormat(key=>new Date(key+'-01T00:00:00').toLocaleDateString('ru-RU',{month:'short',year:'2-digit'})).tickSize(0).tickPadding(12)).call(axisStyle);
  svg.selectAll('rect.month-hit').data(data).join('rect').attr('class','month-hit').attr('x',d=>x(d.key)).attr('y',5).attr('width',x.bandwidth()).attr('height',height-4).attr('fill','transparent').on('pointermove',(e,d)=>showTip(e,monthLabel(d.key),d[key]===null?'Нет покупок товаров для расчёта скидки':value(d[key]))).on('pointerleave',hideTip);
}
function drawProducts(data,sort) {
  const selected=data.slice().sort(sort==='units'?(a,b)=>b.units-a.units:(a,b)=>b.amount-a.amount).slice(0,10);
  const h=Math.max(200,selected.length*49+40),{svg,w}=base('product-chart',h);
  if(!selected.length){emptyChart(svg,w,h,'Нет товаров за этот период');return;}
  const narrow=w<700,labelWidth=narrow?Math.min(170,w*.38):Math.min(305,w*.37), gap=18;
  const metricWidth=(w-labelWidth-gap*2)/2;
  const unitsX=d3.scaleLinear().domain([0,d3.max(selected,d=>d.units)||1]).range([0,Math.max(5,metricWidth-60)]);
  const moneyX=d3.scaleLinear().domain([0,d3.max(selected,d=>d.amount)||1]).range([0,Math.max(5,metricWidth-80)]);
  svg.append('text').attr('x',labelWidth+gap).attr('y',13).attr('class','chart-label').text('Количество, шт.');
  svg.append('text').attr('x',labelWidth+metricWidth+gap*2).attr('y',13).attr('class','chart-label').text('Расходы, ₽');
  const rows=svg.selectAll('g.product-point').data(selected).join('g').attr('class','product-point').attr('data-name',d=>d.name).attr('data-units',d=>d.units).attr('data-amount',d=>d.amount).attr('transform',(_,i)=>`translate(0,${30+i*49})`).attr('tabindex',0).attr('role','img').attr('aria-label',d=>`${d.name}, ${d.units} штук, ${money(d.amount)}. Подсказка с историей цены.`).on('pointermove',productTip).on('pointerleave',hideTip).on('focus',productTip).on('blur',hideTip);
  rows.append('line').attr('x1',0).attr('x2',w).attr('y1',39).attr('y2',39).attr('stroke','#f0f2ed');
  rows.each(function(d){const row=d3.select(this);const label=row.append('text').attr('x',0).attr('y',12).attr('fill','#515e4e').attr('font-size',11);
    const chars=Math.max(15,Math.floor(labelWidth/6));const words=d.name.split(' ');let lines=[''];for(const word of words){let i=lines.length-1;if((lines[i]+' '+word).trim().length>chars&&lines[i])lines.push(word);else lines[i]=(lines[i]+' '+word).trim();}
    lines.slice(0,2).forEach((line,i)=>label.append('tspan').attr('x',0).attr('dy',i?14:0).text(i===1&&lines.length>2?line.replace(/.{0,3}$/,'…'):line));
    row.append('rect').attr('x',labelWidth+gap).attr('y',7).attr('width',unitsX(d.units)).attr('height',9).attr('rx',1).attr('fill','#b0c9a6');
    row.append('text').attr('x',labelWidth+gap+unitsX(d.units)+7).attr('y',15).attr('font-size',10).attr('fill','#728169').text(integer(d.units));
    const mx=labelWidth+metricWidth+gap*2;
    row.append('rect').attr('x',mx).attr('y',7).attr('width',moneyX(d.amount)).attr('height',9).attr('rx',1).attr('fill','#598971');
    row.append('text').attr('x',mx+moneyX(d.amount)+7).attr('y',15).attr('font-size',10).attr('fill','#52694b').text(money(d.amount));
    row.append('rect').attr('x',0).attr('y',-3).attr('width',w).attr('height',42).attr('fill','transparent');
  });
}
Vue.createApp({
  data(){return {from:last24Start,to:maxDate,minDate,maxDate,period:'24',category:'all',query:'',status:'all',sort:'newest',productSort:'amount',page:1,pageSize:25,years:[...new Set(orders.map(o=>o.date.slice(0,4)))].sort(),categories:[...new Set(goods(orders).map(i=>i.category))].sort()};},
  computed:{
    invalidRange(){return !this.from||!this.to||this.from>this.to;},
    periodOrders(){return this.invalidRange?[]:orders.filter(o=>o.date>=this.from&&o.date<=this.to);},
    filtered(){return selectCategory(this.periodOrders,this.category);},
    stats(){return summary(this.filtered);},
    monthly(){return monthlyData(this.filtered,this.from,this.to);},
    currentMonth(){return this.invalidRange?'':(this.to>maxDate?maxDate:this.to).slice(0,7);},
    currentStats(){return summary(this.filtered.filter(o=>o.date.slice(0,7)===this.currentMonth));},
    previousStats(){if(!this.currentMonth)return null;const prev=d3.timeFormat('%Y-%m')(d3.timeMonth.offset(new Date(this.currentMonth+'-01T00:00:00'),-1));const group=this.monthly.find(d=>d.key===prev);return group||null;},
    products(){return productData(this.filtered);},
    categoryStats(){const delivered=this.periodOrders.filter(o=>o.status==='доставлен');return d3.rollups(delivered.flatMap(o=>o.items.filter(i=>i.category!==SERVICE).map(i=>({...i,order:o.id}))),v=>{const units=d3.sum(v,i=>i.quantity);return {amount:d3.sum(v,i=>i.amount),units,orders:new Set(v.map(i=>i.order)).size,averageDiscount:units?d3.sum(v,i=>i.originalPrice>0?(i.originalPrice-i.price)/i.originalPrice*i.quantity:0)/units*100:null};},i=>i.category).map(([name,stats])=>({name,...stats})).sort((a,b)=>b.amount-a.amount);},
    tableOrders(){const q=this.query.trim().toLocaleLowerCase('ru');return this.filtered.filter(o=>(this.status==='all'||o.status===this.status)&&(!q||o.id.toLowerCase().includes(q)||o.items.some(i=>i.name.toLocaleLowerCase('ru').includes(q)))).slice().sort(this.sort==='amount'?(a,b)=>b.amount-a.amount:this.sort==='oldest'?(a,b)=>a.date.localeCompare(b.date)||a.created.localeCompare(b.created):(a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created));},
    pages(){return Math.max(1,Math.ceil(this.tableOrders.length/this.pageSize));},
    visible(){return this.tableOrders.slice((this.page-1)*this.pageSize,this.page*this.pageSize);},
    periodLabel(){return `${dateLabel(this.from)} — ${dateLabel(this.to)}`;},
    monthPartial(){return this.currentMonth&&(this.to.slice(0,7)===this.currentMonth)&&Number(this.to.slice(8))!==new Date(Number(this.to.slice(0,4)),Number(this.to.slice(5,7)),0).getDate();}
  },
  watch:{from(){this.changed();},to(){this.changed();},category(){this.changed();},productSort(){hideTip();this.$nextTick(()=>drawProducts(this.products,this.productSort));},query(){this.page=1;},status(){this.page=1;},sort(){this.page=1;}},
  methods:{money,integer,decimal,dateLabel,monthLabel,
    percent(n){return n===null?'—':decimal(n)+'%';},
    change(key){if(!this.previousStats)return 'Нет предыдущего месяца в периоде';const prev=this.previousStats[key],current=this.currentStats[key];if(prev===null||current===null)return 'Нет данных для сравнения';if(key==='averageDiscount')return `${current-prev>=0?'+':''}${decimal(current-prev)} п.п. к предыдущему месяцу`;if(prev===0)return current===0?'Без изменений к предыдущему месяцу':'В предыдущем месяце — 0';const diff=(current-prev)/prev*100;return `${diff>=0?'+':''}${decimal(diff)}% к предыдущему месяцу`;},
    setPeriod(){if(this.period==='24'){this.from=last24Start;this.to=maxDate;}else if(this.period==='all'){this.from=minDate;this.to=maxDate;}else if(this.period!=='custom'){this.from=this.period+'-01-01';this.to=this.period+'-12-31';}},
    manualDate(){this.period='custom';},
    reset(){this.period='24';this.from=last24Start;this.to=maxDate;this.category='all';this.query='';this.status='all';this.sort='newest';this.productSort='amount';},
    chooseCategory(name){this.category=this.category===name?'all':name;},
    changed(){this.page=1;hideTip();this.$nextTick(()=>this.draw());},
    draw(){drawMetric('orders-chart',this.monthly,'count','#adc1a3');drawMetric('spend-chart',this.monthly,'amount','#598971');drawMetric('discount-chart',this.monthly,'averageDiscount','#b39b72');drawProducts(this.products,this.productSort);},
    go(n){this.page=Math.max(1,Math.min(this.pages,n));this.$nextTick(()=>this.$refs.tableScroll.scrollTop=0);},
    goodsNames(o){return o.items.filter(i=>i.category!==SERVICE).map(i=>i.name).join(', ')||'Только услуги';}
  },
  mounted(){this.draw();this.resize=()=>{clearTimeout(this.resizeTimeout);this.resizeTimeout=setTimeout(()=>this.draw(),100);};window.addEventListener('resize',this.resize);},
  beforeUnmount(){window.removeEventListener('resize',this.resize);clearTimeout(this.resizeTimeout);}
}).mount('#app');
