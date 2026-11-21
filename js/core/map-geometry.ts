/** Pixel coordinate frame of the user-supplied 1600×1200 Mirage radar. */
export const mirageReference={width:1600,height:1200,viewBox:{x:270,y:140,width:1060,height:920}};
export function radarPoint(x:number,y:number){const v=mirageReference.viewBox;return {x:Number(((x-v.x)/v.width*100).toFixed(5)),y:Number(((y-v.y)/v.height*100).toFixed(5))};}
