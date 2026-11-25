import {normalize} from './categories.js';
// Um mês é tratado como ~30 dias para uma previsão aproximada de consumo.
export function durationDays(value=''){
 const match=normalize(value).match(/^(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+(dia|dias|semana|semanas|mes|meses|ano|anos)$/);
 if(!match)return null;
 const words={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
 const count=Number(match[1])||words[match[1]],unit=match[2],factor=unit.startsWith('dia')?1:unit.startsWith('semana')?7:unit.startsWith('mes')?30:365;
 return count>0&&count*factor<=3650?count*factor:null;
}
