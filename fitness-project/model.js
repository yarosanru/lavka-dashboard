(function(scope){
  'use strict';
  function create(data){
    const all={week:0,coach:0,kind:0,cohort:0};
    function clean(input={}){return Object.fromEntries(Object.entries(all).map(([key])=>{const max={week:10,coach:5,kind:6,cohort:3}[key],n=Number(input[key]||0);return [key,Number.isInteger(n)&&n>=0&&n<=max?n:0];}));}
    function eligible(w,state){return (!state.week||w.week===state.week)&&(!state.coach||w.coach===state.coach)&&(!state.kind||w.kind===state.kind);}
    function bins(w,cohort){return cohort?w.hist[cohort-1]:w.hist.flat();}
    function stats(workouts,cohort=0){
      let views=0,depthSum=0,ratingSum=0,ratings=0;
      for(const w of workouts)for(const [depth,rating,n] of bins(w,cohort)){views+=n;depthSum+=depth*n;if(rating!==null){ratings+=n;ratingSum+=rating*n;}}
      const participants=data.cohorts[cohort].n;
      return {views,participants,videos:workouts.length,depth:views?depthSum/views:null,rating:ratings?ratingSum/ratings:null,ratings,reach:workouts.length&&participants?views/(participants*workouts.length):null,engagement:participants?views/participants:null};
    }
    function atoms(workouts,cohort=0){
      const list=[];
      for(const w of workouts){let n=0;for(const [depth,rating,count] of bins(w,cohort))for(let i=0;i<count;i++)list.push({id:w.code+':'+(++n),workout:w,depth,rating});}
      return list.sort((a,b)=>b.depth-a.depth||a.workout.coach-b.workout.coach||a.id.localeCompare(b.id));
    }
    function view(input){
      const state=clean(input),workouts=data.workouts.filter(w=>eligible(w,state)),summary=stats(workouts,state.cohort);
      summary.active=data.active[`${state.week}:${state.coach}:${state.kind}:${state.cohort}`];
      const weekly=Array.from({length:10},(_,i)=>{const ws=workouts.filter(w=>w.week===i+1);return {week:i+1,...stats(ws,state.cohort),workouts:ws};});
      const coaches=data.coaches.map((name,i)=>{const ws=workouts.filter(w=>w.coach===i+1);return {id:i+1,name,...stats(ws,state.cohort)};});
      const group=state.cohort||1;
      const preferences=data.kinds.map((name,i)=>{const ws=workouts.filter(w=>w.kind===i+1);return {id:i+1,name,chosen:stats(ws,group),all:stats(ws,0)};});
      return {state,workouts,summary,weekly,coaches,preferences,preferenceCohort:data.cohorts[group],transitions:data.transitions[state.cohort]};
    }
    return {data,all,clean,eligible,bins,stats,atoms,view};
  }
  if(typeof module==='object'&&module.exports)module.exports={create};else scope.FitnessModel={create};
})(typeof window==='object'?window:this);
