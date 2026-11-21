/** A monotonic clock: no wall-clock changes or background time affect paused training. */
export class TrainingClock {
 private startedAt=0;private pausedAt:number|null=null;private pausedMs=0;private limitMs=0;
 start(limitMs:number,now:number){this.startedAt=now;this.pausedAt=null;this.pausedMs=0;this.limitMs=limitMs;}
 pause(now:number){if(this.pausedAt===null)this.pausedAt=now;}
 resume(now:number){if(this.pausedAt!==null){this.pausedMs+=Math.max(0,now-this.pausedAt);this.pausedAt=null;}}
 elapsed(now:number){return Math.max(0,(this.pausedAt??now)-this.startedAt-this.pausedMs);}
 remaining(now:number){return this.limitMs?Math.max(0,this.limitMs-this.elapsed(now)):Infinity;}
 expired(now:number){return this.limitMs>0&&this.remaining(now)===0;}
}
