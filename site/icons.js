// Official UIcons Regular Rounded by Flaticon, bundled in assets/flaticon.
const icons={hortifruti:'carrot',limpeza:'broom',higiene:'soap',bebidas:'glass',frios:'cheese',proteinas:'drumstick',alimentos:'wheat',congelados:'snowflake',pet:'paw',casa:'home',outros:'apps'};
export function categoryIcon(id){
 const icon=document.createElement('i');
 icon.className=`fi fi-rr-${icons[id]||icons.outros}`;
 icon.setAttribute('aria-hidden','true');
 return icon;
}
