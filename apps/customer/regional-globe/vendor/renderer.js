var jc=0,jo=1,th=2;var zr=1,eh=2,ji=3,ri=0,Ge=1,nn=2,Tn=0,tr=1,tl=2,el=3,nl=4,nh=5;var yi=100,ih=101,rh=102,sh=103,ah=104,oh=200,lh=201,ch=202,hh=203,il=204,rl=205,uh=206,fh=207,dh=208,ph=209,mh=210,gh=211,_h=212,xh=213,vh=214,Ds=0,Ns=1,Us=2,Gi=3,Fs=4,Os=5,Bs=6,zs=7,sl=0,yh=1,Sh=2,fn=0,al=1,ol=2,ll=3,cl=4,hl=5,ul=6,fl=7;var dl=300,si=301,Si=302,ua=303,fa=304,Vr=306,Vs=1e3,yn=1001,ks=1002,Ae=1003,Mh=1004;var kr=1005;var Pe=1006,da=1007;var ai=1008;var qe=1009,pl=1010,ml=1011,er=1012,pa=1013,dn=1014,pn=1015,mn=1016,ma=1017,ga=1018,nr=1020,gl=35902,_l=35899,xl=1021,vl=1022,rn=1023,Mn=1026,oi=1027,yl=1028,_a=1029,li=1030,xa=1031;var va=1033,Gr=33776,Hr=33777,Wr=33778,Xr=33779,ya=35840,Sa=35841,Ma=35842,ba=35843,Ea=36196,Ta=37492,wa=37496,Aa=37488,Ca=37489,qr=37490,Ra=37491,Pa=37808,Ia=37809,La=37810,Da=37811,Na=37812,Ua=37813,Fa=37814,Oa=37815,Ba=37816,za=37817,Va=37818,ka=37819,Ga=37820,Ha=37821,Wa=36492,Xa=36494,qa=36495,Ya=36283,Za=36284,Yr=36285,Ja=36286;var Sr=2300,Gs=2301,Is=2302,qo=2303,Yo=2400,Zo=2401,Jo=2402;var bh=3200;var $a=0,Eh=1,Bn="",Ne="srgb",Mr="srgb-linear",br="linear",re="srgb";var Ls=7680;var Th=519,wh=512,Ah=513,Ch=514,Ka=515,Rh=516,Ph=517,Qa=518,Ih=519,Lh=35044;var Sl="300 es",un=2e3,Hi=2001;function lf(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function cf(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Er(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Dh(){let i=Er("canvas");return i.style.display="block",i}var Ic={},Wi=null;function Ml(...i){let t="THREE."+i.shift();Wi?Wi("log",t,...i):console.log(t,...i)}function Nh(i){let t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){let e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Dt(...i){i=Nh(i);let t="THREE."+i.shift();if(Wi)Wi("warn",t,...i);else{let e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Nt(...i){i=Nh(i);let t="THREE."+i.shift();if(Wi)Wi("error",t,...i);else{let e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function gi(...i){let t=i.join(" ");t in Ic||(Ic[t]=!0,Dt(...i))}function Uh(i,t,e){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,e);break;default:n()}}setTimeout(s,e)})}var Fh={[Ds]:Ns,[Us]:Bs,[Fs]:zs,[Gi]:Os,[Ns]:Ds,[Bs]:Us,[zs]:Fs,[Os]:Gi},bn=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let r=n[t];if(r!==void 0){let s=r.indexOf(e);s!==-1&&r.splice(s,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,t);t.target=null}}},Le=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Lc=1234567,vr=Math.PI/180,Xi=180/Math.PI;function ir(){let i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Le[i&255]+Le[i>>8&255]+Le[i>>16&255]+Le[i>>24&255]+"-"+Le[t&255]+Le[t>>8&255]+"-"+Le[t>>16&15|64]+Le[t>>24&255]+"-"+Le[e&63|128]+Le[e>>8&255]+"-"+Le[e>>16&255]+Le[e>>24&255]+Le[n&255]+Le[n>>8&255]+Le[n>>16&255]+Le[n>>24&255]).toLowerCase()}function Zt(i,t,e){return Math.max(t,Math.min(e,i))}function bl(i,t){return(i%t+t)%t}function hf(i,t,e,n,r){return n+(i-t)*(r-n)/(e-t)}function uf(i,t,e){return i!==t?(e-i)/(t-i):0}function yr(i,t,e){return(1-e)*i+e*t}function ff(i,t,e,n){return yr(i,t,1-Math.exp(-e*n))}function df(i,t=1){return t-Math.abs(bl(i,t*2)-t)}function pf(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function mf(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function gf(i,t){return i+Math.floor(Math.random()*(t-i+1))}function _f(i,t){return i+Math.random()*(t-i)}function xf(i){return i*(.5-Math.random())}function vf(i){i!==void 0&&(Lc=i);let t=Lc+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function yf(i){return i*vr}function Sf(i){return i*Xi}function Mf(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function bf(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Ef(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Tf(i,t,e,n,r){let s=Math.cos,a=Math.sin,o=s(e/2),c=a(e/2),l=s((t+n)/2),h=a((t+n)/2),f=s((t-n)/2),u=a((t-n)/2),d=s((n-t)/2),g=a((n-t)/2);switch(r){case"XYX":i.set(o*h,c*f,c*u,o*l);break;case"YZY":i.set(c*u,o*h,c*f,o*l);break;case"ZXZ":i.set(c*f,c*u,o*h,o*l);break;case"XZX":i.set(o*h,c*g,c*d,o*l);break;case"YXY":i.set(c*d,o*h,c*g,o*l);break;case"ZYZ":i.set(c*g,c*d,o*h,o*l);break;default:Dt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Vi(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Be(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var El={DEG2RAD:vr,RAD2DEG:Xi,generateUUID:ir,clamp:Zt,euclideanModulo:bl,mapLinear:hf,inverseLerp:uf,lerp:yr,damp:ff,pingpong:df,smoothstep:pf,smootherstep:mf,randInt:gf,randFloat:_f,randFloatSpread:xf,seededRandom:vf,degToRad:yf,radToDeg:Sf,isPowerOfTwo:Mf,ceilPowerOfTwo:bf,floorPowerOfTwo:Ef,setQuaternionFromProperEuler:Tf,normalize:Be,denormalize:Vi},Xt=class i{static{i.prototype.isVector2=!0}constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6],this.y=r[1]*e+r[4]*n+r[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Zt(this.x,t.x,e.x),this.y=Zt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Zt(this.x,t,e),this.y=Zt(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Zt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Zt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),r=Math.sin(e),s=this.x-t.x,a=this.y-t.y;return this.x=s*n-a*r+t.x,this.y=s*r+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},En=class{constructor(t=0,e=0,n=0,r=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=r}static slerpFlat(t,e,n,r,s,a,o){let c=n[r+0],l=n[r+1],h=n[r+2],f=n[r+3],u=s[a+0],d=s[a+1],g=s[a+2],S=s[a+3];if(f!==S||c!==u||l!==d||h!==g){let m=c*u+l*d+h*g+f*S;m<0&&(u=-u,d=-d,g=-g,S=-S,m=-m);let p=1-o;if(m<.9995){let T=Math.acos(m),R=Math.sin(T);p=Math.sin(p*T)/R,o=Math.sin(o*T)/R,c=c*p+u*o,l=l*p+d*o,h=h*p+g*o,f=f*p+S*o}else{c=c*p+u*o,l=l*p+d*o,h=h*p+g*o,f=f*p+S*o;let T=1/Math.sqrt(c*c+l*l+h*h+f*f);c*=T,l*=T,h*=T,f*=T}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=f}static multiplyQuaternionsFlat(t,e,n,r,s,a){let o=n[r],c=n[r+1],l=n[r+2],h=n[r+3],f=s[a],u=s[a+1],d=s[a+2],g=s[a+3];return t[e]=o*g+h*f+c*d-l*u,t[e+1]=c*g+h*u+l*f-o*d,t[e+2]=l*g+h*d+o*u-c*f,t[e+3]=h*g-o*f-c*u-l*d,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,r){return this._x=t,this._y=e,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,r=t._y,s=t._z,a=t._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(r/2),f=o(s/2),u=c(n/2),d=c(r/2),g=c(s/2);switch(a){case"XYZ":this._x=u*h*f+l*d*g,this._y=l*d*f-u*h*g,this._z=l*h*g+u*d*f,this._w=l*h*f-u*d*g;break;case"YXZ":this._x=u*h*f+l*d*g,this._y=l*d*f-u*h*g,this._z=l*h*g-u*d*f,this._w=l*h*f+u*d*g;break;case"ZXY":this._x=u*h*f-l*d*g,this._y=l*d*f+u*h*g,this._z=l*h*g+u*d*f,this._w=l*h*f-u*d*g;break;case"ZYX":this._x=u*h*f-l*d*g,this._y=l*d*f+u*h*g,this._z=l*h*g-u*d*f,this._w=l*h*f+u*d*g;break;case"YZX":this._x=u*h*f+l*d*g,this._y=l*d*f+u*h*g,this._z=l*h*g-u*d*f,this._w=l*h*f-u*d*g;break;case"XZY":this._x=u*h*f-l*d*g,this._y=l*d*f-u*h*g,this._z=l*h*g+u*d*f,this._w=l*h*f+u*d*g;break;default:Dt("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,r=Math.sin(n);return this._x=t.x*r,this._y=t.y*r,this._z=t.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],r=e[4],s=e[8],a=e[1],o=e[5],c=e[9],l=e[2],h=e[6],f=e[10],u=n+o+f;if(u>0){let d=.5/Math.sqrt(u+1);this._w=.25/d,this._x=(h-c)*d,this._y=(s-l)*d,this._z=(a-r)*d}else if(n>o&&n>f){let d=2*Math.sqrt(1+n-o-f);this._w=(h-c)/d,this._x=.25*d,this._y=(r+a)/d,this._z=(s+l)/d}else if(o>f){let d=2*Math.sqrt(1+o-n-f);this._w=(s-l)/d,this._x=(r+a)/d,this._y=.25*d,this._z=(c+h)/d}else{let d=2*Math.sqrt(1+f-n-o);this._w=(a-r)/d,this._x=(s+l)/d,this._y=(c+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Zt(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let r=Math.min(1,e/n);return this.slerp(t,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,r=t._y,s=t._z,a=t._w,o=e._x,c=e._y,l=e._z,h=e._w;return this._x=n*h+a*o+r*l-s*c,this._y=r*h+a*c+s*o-n*l,this._z=s*h+a*l+n*c-r*o,this._w=a*h-n*o-r*c-s*l,this._onChangeCallback(),this}slerp(t,e){let n=t._x,r=t._y,s=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,r=-r,s=-s,a=-a,o=-o);let c=1-e;if(o<.9995){let l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,e=Math.sin(e*l)/h,this._x=this._x*c+n*e,this._y=this._y*c+r*e,this._z=this._z*c+s*e,this._w=this._w*c+a*e,this._onChangeCallback()}else this._x=this._x*c+n*e,this._y=this._y*c+r*e,this._z=this._z*c+s*e,this._w=this._w*c+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(t),r*Math.cos(t),s*Math.sin(e),s*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},V=class i{static{i.prototype.isVector3=!0}constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Dc.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Dc.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6]*r,this.y=s[1]*e+s[4]*n+s[7]*r,this.z=s[2]*e+s[5]*n+s[8]*r,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,r=this.z,s=t.elements,a=1/(s[3]*e+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*e+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*e+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*e+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(t){let e=this.x,n=this.y,r=this.z,s=t.x,a=t.y,o=t.z,c=t.w,l=2*(a*r-o*n),h=2*(o*e-s*r),f=2*(s*n-a*e);return this.x=e+c*l+a*f-o*h,this.y=n+c*h+o*l-s*f,this.z=r+c*f+s*h-a*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[4]*n+s[8]*r,this.y=s[1]*e+s[5]*n+s[9]*r,this.z=s[2]*e+s[6]*n+s[10]*r,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Zt(this.x,t.x,e.x),this.y=Zt(this.y,t.y,e.y),this.z=Zt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Zt(this.x,t,e),this.y=Zt(this.y,t,e),this.z=Zt(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Zt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,r=t.y,s=t.z,a=e.x,o=e.y,c=e.z;return this.x=r*c-s*o,this.y=s*a-n*c,this.z=n*o-r*a,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return To.copy(this).projectOnVector(t),this.sub(To)}reflect(t){return this.sub(To.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(Zt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,r=this.z-t.z;return e*e+n*n+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let r=Math.sin(e)*t;return this.x=r*Math.sin(n),this.y=Math.cos(e)*t,this.z=r*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),r=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=r,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},To=new V,Dc=new En,Ot=class i{static{i.prototype.isMatrix3=!0}constructor(t,e,n,r,s,a,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,r,s,a,o,c,l)}set(t,e,n,r,s,a,o,c,l){let h=this.elements;return h[0]=t,h[1]=r,h[2]=o,h[3]=e,h[4]=s,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,r=e.elements,s=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],f=n[7],u=n[2],d=n[5],g=n[8],S=r[0],m=r[3],p=r[6],T=r[1],R=r[4],y=r[7],b=r[2],M=r[5],C=r[8];return s[0]=a*S+o*T+c*b,s[3]=a*m+o*R+c*M,s[6]=a*p+o*y+c*C,s[1]=l*S+h*T+f*b,s[4]=l*m+h*R+f*M,s[7]=l*p+h*y+f*C,s[2]=u*S+d*T+g*b,s[5]=u*m+d*R+g*M,s[8]=u*p+d*y+g*C,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8];return e*a*h-e*o*l-n*s*h+n*o*c+r*s*l-r*a*c}invert(){let t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],f=h*a-o*l,u=o*c-h*s,d=l*s-a*c,g=e*f+n*u+r*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let S=1/g;return t[0]=f*S,t[1]=(r*l-h*n)*S,t[2]=(o*n-r*a)*S,t[3]=u*S,t[4]=(h*e-r*c)*S,t[5]=(r*s-o*e)*S,t[6]=d*S,t[7]=(n*c-l*e)*S,t[8]=(a*e-n*s)*S,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,r,s,a,o){let c=Math.cos(s),l=Math.sin(s);return this.set(n*c,n*l,-n*(c*a+l*o)+a+t,-r*l,r*c,-r*(-l*a+c*o)+o+e,0,0,1),this}scale(t,e){return gi("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(wo.makeScale(t,e)),this}rotate(t){return gi("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(wo.makeRotation(-t)),this}translate(t,e){return gi("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(wo.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let r=0;r<9;r++)if(e[r]!==n[r])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},wo=new Ot,Nc=new Ot().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Uc=new Ot().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function wf(){let i={enabled:!0,workingColorSpace:Mr,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===re&&(r.r=Fn(r.r),r.g=Fn(r.g),r.b=Fn(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===re&&(r.r=ki(r.r),r.g=ki(r.g),r.b=ki(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===Bn?br:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return gi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return gi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(r,s)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Mr]:{primaries:t,whitePoint:n,transfer:br,toXYZ:Nc,fromXYZ:Uc,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ne},outputColorSpaceConfig:{drawingBufferColorSpace:Ne}},[Ne]:{primaries:t,whitePoint:n,transfer:re,toXYZ:Nc,fromXYZ:Uc,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ne}}}),i}var Yt=wf();function Fn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function ki(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var Ai,Hs=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Ai===void 0&&(Ai=Er("canvas")),Ai.width=t.width,Ai.height=t.height;let r=Ai.getContext("2d");t instanceof ImageData?r.putImageData(t,0,0):r.drawImage(t,0,0,t.width,t.height),n=Ai}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=Er("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let r=n.getImageData(0,0,t.width,t.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=Fn(s[a]/255)*255;return n.putImageData(r,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Fn(e[n]/255)*255):e[n]=Fn(e[n]);return{data:e,width:t.width,height:t.height}}else return Dt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Af=0,qi=class{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Af++}),this.uuid=ir(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(Ao(r[a].image)):s.push(Ao(r[a]))}else s=Ao(r);n.url=s}return e||(t.images[this.uuid]=n),n}};function Ao(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Hs.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Dt("Texture: Unable to serialize Texture."),{})}var Cf=0,Co=new V,ze=class i extends bn{constructor(t=i.DEFAULT_IMAGE,e=i.DEFAULT_MAPPING,n=yn,r=yn,s=Pe,a=ai,o=rn,c=qe,l=i.DEFAULT_ANISOTROPY,h=Bn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Cf++}),this.uuid=ir(),this.name="",this.source=new qi(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new Xt(0,0),this.repeat=new Xt(1,1),this.center=new Xt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ot,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Co).x}get height(){return this.source.getSize(Co).y}get depth(){return this.source.getSize(Co).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){Dt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let r=this[e];if(r===void 0){Dt(`Texture.setValues(): property '${e}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==dl)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Vs:t.x=t.x-Math.floor(t.x);break;case yn:t.x=t.x<0?0:1;break;case ks:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Vs:t.y=t.y-Math.floor(t.y);break;case yn:t.y=t.y<0?0:1;break;case ks:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};ze.DEFAULT_IMAGE=null;ze.DEFAULT_MAPPING=dl;ze.DEFAULT_ANISOTROPY=1;var me=class i{static{i.prototype.isVector4=!0}constructor(t=0,e=0,n=0,r=1){this.x=t,this.y=e,this.z=n,this.w=r}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,r){return this.x=t,this.y=e,this.z=n,this.w=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let e=this.x,n=this.y,r=this.z,s=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*e+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*e+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*e+a[7]*n+a[11]*r+a[15]*s,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,r,s,c=t.elements,l=c[0],h=c[4],f=c[8],u=c[1],d=c[5],g=c[9],S=c[2],m=c[6],p=c[10];if(Math.abs(h-u)<.01&&Math.abs(f-S)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(f+S)<.1&&Math.abs(g+m)<.1&&Math.abs(l+d+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;let R=(l+1)/2,y=(d+1)/2,b=(p+1)/2,M=(h+u)/4,C=(f+S)/4,x=(g+m)/4;return R>y&&R>b?R<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(R),r=M/n,s=C/n):y>b?y<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(y),n=M/r,s=x/r):b<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(b),n=C/s,r=x/s),this.set(n,r,s,e),this}let T=Math.sqrt((m-g)*(m-g)+(f-S)*(f-S)+(u-h)*(u-h));return Math.abs(T)<.001&&(T=1),this.x=(m-g)/T,this.y=(f-S)/T,this.z=(u-h)/T,this.w=Math.acos((l+d+p-1)/2),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Zt(this.x,t.x,e.x),this.y=Zt(this.y,t.y,e.y),this.z=Zt(this.z,t.z,e.z),this.w=Zt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Zt(this.x,t,e),this.y=Zt(this.y,t,e),this.z=Zt(this.z,t,e),this.w=Zt(this.w,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Zt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Ws=class extends bn{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Pe,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new me(0,0,t,e),this.scissorTest=!1,this.viewport=new me(0,0,t,e),this.textures=[];let r={width:t,height:e,depth:n.depth},s=new ze(r),a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){let e={minFilter:Pe,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=t,this.textures[r].image.height=e,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;let r=Object.assign({},t.textures[e].image);this.textures[e].source=new qi(r)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){let e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},Xe=class extends Ws{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}},Tr=class extends ze{constructor(t=null,e=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:r},this.magFilter=Ae,this.minFilter=Ae,this.wrapR=yn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}};var Xs=class extends ze{constructor(t=null,e=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:r},this.magFilter=Ae,this.minFilter=Ae,this.wrapR=yn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}};var ge=class i{static{i.prototype.isMatrix4=!0}constructor(t,e,n,r,s,a,o,c,l,h,f,u,d,g,S,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,r,s,a,o,c,l,h,f,u,d,g,S,m)}set(t,e,n,r,s,a,o,c,l,h,f,u,d,g,S,m){let p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=r,p[1]=s,p[5]=a,p[9]=o,p[13]=c,p[2]=l,p[6]=h,p[10]=f,p[14]=u,p[3]=d,p[7]=g,p[11]=S,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();let e=this.elements,n=t.elements,r=1/Ci.setFromMatrixColumn(t,0).length(),s=1/Ci.setFromMatrixColumn(t,1).length(),a=1/Ci.setFromMatrixColumn(t,2).length();return e[0]=n[0]*r,e[1]=n[1]*r,e[2]=n[2]*r,e[3]=0,e[4]=n[4]*s,e[5]=n[5]*s,e[6]=n[6]*s,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,r=t.y,s=t.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(r),l=Math.sin(r),h=Math.cos(s),f=Math.sin(s);if(t.order==="XYZ"){let u=a*h,d=a*f,g=o*h,S=o*f;e[0]=c*h,e[4]=-c*f,e[8]=l,e[1]=d+g*l,e[5]=u-S*l,e[9]=-o*c,e[2]=S-u*l,e[6]=g+d*l,e[10]=a*c}else if(t.order==="YXZ"){let u=c*h,d=c*f,g=l*h,S=l*f;e[0]=u+S*o,e[4]=g*o-d,e[8]=a*l,e[1]=a*f,e[5]=a*h,e[9]=-o,e[2]=d*o-g,e[6]=S+u*o,e[10]=a*c}else if(t.order==="ZXY"){let u=c*h,d=c*f,g=l*h,S=l*f;e[0]=u-S*o,e[4]=-a*f,e[8]=g+d*o,e[1]=d+g*o,e[5]=a*h,e[9]=S-u*o,e[2]=-a*l,e[6]=o,e[10]=a*c}else if(t.order==="ZYX"){let u=a*h,d=a*f,g=o*h,S=o*f;e[0]=c*h,e[4]=g*l-d,e[8]=u*l+S,e[1]=c*f,e[5]=S*l+u,e[9]=d*l-g,e[2]=-l,e[6]=o*c,e[10]=a*c}else if(t.order==="YZX"){let u=a*c,d=a*l,g=o*c,S=o*l;e[0]=c*h,e[4]=S-u*f,e[8]=g*f+d,e[1]=f,e[5]=a*h,e[9]=-o*h,e[2]=-l*h,e[6]=d*f+g,e[10]=u-S*f}else if(t.order==="XZY"){let u=a*c,d=a*l,g=o*c,S=o*l;e[0]=c*h,e[4]=-f,e[8]=l*h,e[1]=u*f+S,e[5]=a*h,e[9]=d*f-g,e[2]=g*f-d,e[6]=o*h,e[10]=S*f+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Rf,t,Pf)}lookAt(t,e,n){let r=this.elements;return Ye.subVectors(t,e),Ye.lengthSq()===0&&(Ye.z=1),Ye.normalize(),Xn.crossVectors(n,Ye),Xn.lengthSq()===0&&(Math.abs(n.z)===1?Ye.x+=1e-4:Ye.z+=1e-4,Ye.normalize(),Xn.crossVectors(n,Ye)),Xn.normalize(),fs.crossVectors(Ye,Xn),r[0]=Xn.x,r[4]=fs.x,r[8]=Ye.x,r[1]=Xn.y,r[5]=fs.y,r[9]=Ye.y,r[2]=Xn.z,r[6]=fs.z,r[10]=Ye.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,r=e.elements,s=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],f=n[5],u=n[9],d=n[13],g=n[2],S=n[6],m=n[10],p=n[14],T=n[3],R=n[7],y=n[11],b=n[15],M=r[0],C=r[4],x=r[8],E=r[12],P=r[1],L=r[5],F=r[9],O=r[13],I=r[2],A=r[6],z=r[10],W=r[14],K=r[3],q=r[7],j=r[11],tt=r[15];return s[0]=a*M+o*P+c*I+l*K,s[4]=a*C+o*L+c*A+l*q,s[8]=a*x+o*F+c*z+l*j,s[12]=a*E+o*O+c*W+l*tt,s[1]=h*M+f*P+u*I+d*K,s[5]=h*C+f*L+u*A+d*q,s[9]=h*x+f*F+u*z+d*j,s[13]=h*E+f*O+u*W+d*tt,s[2]=g*M+S*P+m*I+p*K,s[6]=g*C+S*L+m*A+p*q,s[10]=g*x+S*F+m*z+p*j,s[14]=g*E+S*O+m*W+p*tt,s[3]=T*M+R*P+y*I+b*K,s[7]=T*C+R*L+y*A+b*q,s[11]=T*x+R*F+y*z+b*j,s[15]=T*E+R*O+y*W+b*tt,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],r=t[8],s=t[12],a=t[1],o=t[5],c=t[9],l=t[13],h=t[2],f=t[6],u=t[10],d=t[14],g=t[3],S=t[7],m=t[11],p=t[15],T=c*d-l*u,R=o*d-l*f,y=o*u-c*f,b=a*d-l*h,M=a*u-c*h,C=a*f-o*h;return e*(S*T-m*R+p*y)-n*(g*T-m*b+p*M)+r*(g*R-S*b+p*C)-s*(g*y-S*M+m*C)}determinantAffine(){let t=this.elements,e=t[0],n=t[4],r=t[8],s=t[1],a=t[5],o=t[9],c=t[2],l=t[6],h=t[10];return e*(a*h-o*l)-n*(s*h-o*c)+r*(s*l-a*c)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let r=this.elements;return t.isVector3?(r[12]=t.x,r[13]=t.y,r[14]=t.z):(r[12]=t,r[13]=e,r[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],a=t[4],o=t[5],c=t[6],l=t[7],h=t[8],f=t[9],u=t[10],d=t[11],g=t[12],S=t[13],m=t[14],p=t[15],T=e*o-n*a,R=e*c-r*a,y=e*l-s*a,b=n*c-r*o,M=n*l-s*o,C=r*l-s*c,x=h*S-f*g,E=h*m-u*g,P=h*p-d*g,L=f*m-u*S,F=f*p-d*S,O=u*p-d*m,I=T*O-R*F+y*L+b*P-M*E+C*x;if(I===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/I;return t[0]=(o*O-c*F+l*L)*A,t[1]=(r*F-n*O-s*L)*A,t[2]=(S*C-m*M+p*b)*A,t[3]=(u*M-f*C-d*b)*A,t[4]=(c*P-a*O-l*E)*A,t[5]=(e*O-r*P+s*E)*A,t[6]=(m*y-g*C-p*R)*A,t[7]=(h*C-u*y+d*R)*A,t[8]=(a*F-o*P+l*x)*A,t[9]=(n*P-e*F-s*x)*A,t[10]=(g*M-S*y+p*T)*A,t[11]=(f*y-h*M-d*T)*A,t[12]=(o*E-a*L-c*x)*A,t[13]=(e*L-n*E+r*x)*A,t[14]=(S*R-g*b-m*T)*A,t[15]=(h*b-f*R+u*T)*A,this}scale(t){let e=this.elements,n=t.x,r=t.y,s=t.z;return e[0]*=n,e[4]*=r,e[8]*=s,e[1]*=n,e[5]*=r,e[9]*=s,e[2]*=n,e[6]*=r,e[10]*=s,e[3]*=n,e[7]*=r,e[11]*=s,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],r=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,r))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),r=Math.sin(e),s=1-n,a=t.x,o=t.y,c=t.z,l=s*a,h=s*o;return this.set(l*a+n,l*o-r*c,l*c+r*o,0,l*o+r*c,h*o+n,h*c-r*a,0,l*c-r*o,h*c+r*a,s*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,r,s,a){return this.set(1,n,s,0,t,1,a,0,e,r,1,0,0,0,0,1),this}compose(t,e,n){let r=this.elements,s=e._x,a=e._y,o=e._z,c=e._w,l=s+s,h=a+a,f=o+o,u=s*l,d=s*h,g=s*f,S=a*h,m=a*f,p=o*f,T=c*l,R=c*h,y=c*f,b=n.x,M=n.y,C=n.z;return r[0]=(1-(S+p))*b,r[1]=(d+y)*b,r[2]=(g-R)*b,r[3]=0,r[4]=(d-y)*M,r[5]=(1-(u+p))*M,r[6]=(m+T)*M,r[7]=0,r[8]=(g+R)*C,r[9]=(m-T)*C,r[10]=(1-(u+S))*C,r[11]=0,r[12]=t.x,r[13]=t.y,r[14]=t.z,r[15]=1,this}decompose(t,e,n){let r=this.elements;t.x=r[12],t.y=r[13],t.z=r[14];let s=this.determinantAffine();if(s===0)return n.set(1,1,1),e.identity(),this;let a=Ci.set(r[0],r[1],r[2]).length(),o=Ci.set(r[4],r[5],r[6]).length(),c=Ci.set(r[8],r[9],r[10]).length();s<0&&(a=-a),on.copy(this);let l=1/a,h=1/o,f=1/c;return on.elements[0]*=l,on.elements[1]*=l,on.elements[2]*=l,on.elements[4]*=h,on.elements[5]*=h,on.elements[6]*=h,on.elements[8]*=f,on.elements[9]*=f,on.elements[10]*=f,e.setFromRotationMatrix(on),n.x=a,n.y=o,n.z=c,this}makePerspective(t,e,n,r,s,a,o=un,c=!1){let l=this.elements,h=2*s/(e-t),f=2*s/(n-r),u=(e+t)/(e-t),d=(n+r)/(n-r),g,S;if(c)g=s/(a-s),S=a*s/(a-s);else if(o===un)g=-(a+s)/(a-s),S=-2*a*s/(a-s);else if(o===Hi)g=-a/(a-s),S=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=f,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=g,l[14]=S,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,r,s,a,o=un,c=!1){let l=this.elements,h=2/(e-t),f=2/(n-r),u=-(e+t)/(e-t),d=-(n+r)/(n-r),g,S;if(c)g=1/(a-s),S=a/(a-s);else if(o===un)g=-2/(a-s),S=-(a+s)/(a-s);else if(o===Hi)g=-1/(a-s),S=-s/(a-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=u,l[1]=0,l[5]=f,l[9]=0,l[13]=d,l[2]=0,l[6]=0,l[10]=g,l[14]=S,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let r=0;r<16;r++)if(e[r]!==n[r])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},Ci=new V,on=new ge,Rf=new V(0,0,0),Pf=new V(1,1,1),Xn=new V,fs=new V,Ye=new V,Fc=new ge,Oc=new En,On=class i{constructor(t=0,e=0,n=0,r=i.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=r}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,r=this._order){return this._x=t,this._y=e,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let r=t.elements,s=r[0],a=r[4],o=r[8],c=r[1],l=r[5],h=r[9],f=r[2],u=r[6],d=r[10];switch(e){case"XYZ":this._y=Math.asin(Zt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Zt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-f,s),this._z=0);break;case"ZXY":this._x=Math.asin(Zt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Zt(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(u,d),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Zt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-f,s)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-Zt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,d),this._y=0);break;default:Dt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Fc.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Fc,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Oc.setFromEuler(this),this.setFromQuaternion(Oc,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};On.DEFAULT_ORDER="XYZ";var wr=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},If=0,Bc=new V,Ri=new En,In=new ge,ds=new V,mr=new V,Lf=new V,Df=new En,zc=new V(1,0,0),Vc=new V(0,1,0),kc=new V(0,0,1),Gc={type:"added"},Nf={type:"removed"},Pi={type:"childadded",child:null},Ro={type:"childremoved",child:null},Ve=class i extends bn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:If++}),this.uuid=ir(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let t=new V,e=new On,n=new En,r=new V(1,1,1);function s(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new ge},normalMatrix:{value:new Ot}}),this.matrix=new ge,this.matrixWorld=new ge,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new wr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Ri.setFromAxisAngle(t,e),this.quaternion.multiply(Ri),this}rotateOnWorldAxis(t,e){return Ri.setFromAxisAngle(t,e),this.quaternion.premultiply(Ri),this}rotateX(t){return this.rotateOnAxis(zc,t)}rotateY(t){return this.rotateOnAxis(Vc,t)}rotateZ(t){return this.rotateOnAxis(kc,t)}translateOnAxis(t,e){return Bc.copy(t).applyQuaternion(this.quaternion),this.position.add(Bc.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(zc,t)}translateY(t){return this.translateOnAxis(Vc,t)}translateZ(t){return this.translateOnAxis(kc,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(In.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?ds.copy(t):ds.set(t,e,n);let r=this.parent;this.updateWorldMatrix(!0,!1),mr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?In.lookAt(mr,ds,this.up):In.lookAt(ds,mr,this.up),this.quaternion.setFromRotationMatrix(In),r&&(In.extractRotation(r.matrixWorld),Ri.setFromRotationMatrix(In),this.quaternion.premultiply(Ri.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Nt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Gc),Pi.child=t,this.dispatchEvent(Pi),Pi.child=null):Nt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Nf),Ro.child=t,this.dispatchEvent(Ro),Ro.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),In.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),In.multiply(t.parent.matrixWorld)),t.applyMatrix4(In),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Gc),Pi.child=t,this.dispatchEvent(Pi),Pi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,r=this.children.length;n<r;n++){let a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(mr,t,Lf),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(mr,Df,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);let e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let t=this.pivot;if(t!==null){let e=t.x,n=t.y,r=t.z,s=this.matrix.elements;s[12]+=e-s[0]*e-s[4]*n-s[8]*r,s[13]+=n-s[1]*e-s[5]*n-s[9]*r,s[14]+=r-s[2]*e-s[6]*n-s[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){let r=this.parent;if(t===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){let s=this.children;for(let a=0,o=s.length;a<o;a++)s[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(t),r.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let f=c[l];s(t.shapes,f)}else s(t.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(s(t.materials,this.material[c]));r.material=o}else r.material=s(t.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];r.animations.push(s(t.animations,c))}}if(e){let o=a(t.geometries),c=a(t.materials),l=a(t.textures),h=a(t.images),f=a(t.shapes),u=a(t.skeletons),d=a(t.animations),g=a(t.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),f.length>0&&(n.shapes=f),u.length>0&&(n.skeletons=u),d.length>0&&(n.animations=d),g.length>0&&(n.nodes=g)}return n.object=r,n;function a(o){let c=[];for(let l in o){let h=o[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let r=t.children[n];this.add(r.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};Ve.DEFAULT_UP=new V(0,1,0);Ve.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ve.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Sn=class extends Ve{constructor(){super(),this.isGroup=!0,this.type="Group"}},Uf={type:"move"},Yi=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Sn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Sn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new V,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new V),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Sn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new V,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new V,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let e=this._hand;if(e)for(let n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let r=null,s=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){a=!0;for(let S of t.hand.values()){let m=e.getJointPose(S,n),p=this._getHandJoint(l,S);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let h=l.joints["index-finger-tip"],f=l.joints["thumb-tip"],u=h.position.distanceTo(f.position),d=.02,g=.005;l.inputState.pinching&&u>d+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&u<=d-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(s=e.getPose(t.gripSpace,n),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(r=e.getPose(t.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Uf)))}return o!==null&&(o.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){let n=new Sn;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}},Oh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},qn={h:0,s:0,l:0},ps={h:0,s:0,l:0};function Po(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}var Ht=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let r=t;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ne){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Yt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,r=Yt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Yt.colorSpaceToWorking(this,r),this}setHSL(t,e,n,r=Yt.workingColorSpace){if(t=bl(t,1),e=Zt(e,0,1),n=Zt(n,0,1),e===0)this.r=this.g=this.b=n;else{let s=n<=.5?n*(1+e):n+e-n*e,a=2*n-s;this.r=Po(a,s,t+1/3),this.g=Po(a,s,t),this.b=Po(a,s,t-1/3)}return Yt.colorSpaceToWorking(this,r),this}setStyle(t,e=Ne){function n(s){s!==void 0&&parseFloat(s)<1&&Dt("Color: Alpha component of "+t+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(t)){let s,a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,e);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,e);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,e);break;default:Dt("Color: Unknown color model "+t)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(t)){let s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(s,16),e);Dt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ne){let n=Oh[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Dt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Fn(t.r),this.g=Fn(t.g),this.b=Fn(t.b),this}copyLinearToSRGB(t){return this.r=ki(t.r),this.g=ki(t.g),this.b=ki(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ne){return Yt.workingToColorSpace(De.copy(this),t),Math.round(Zt(De.r*255,0,255))*65536+Math.round(Zt(De.g*255,0,255))*256+Math.round(Zt(De.b*255,0,255))}getHexString(t=Ne){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Yt.workingColorSpace){Yt.workingToColorSpace(De.copy(this),e);let n=De.r,r=De.g,s=De.b,a=Math.max(n,r,s),o=Math.min(n,r,s),c,l,h=(o+a)/2;if(o===a)c=0,l=0;else{let f=a-o;switch(l=h<=.5?f/(a+o):f/(2-a-o),a){case n:c=(r-s)/f+(r<s?6:0);break;case r:c=(s-n)/f+2;break;case s:c=(n-r)/f+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=Yt.workingColorSpace){return Yt.workingToColorSpace(De.copy(this),e),t.r=De.r,t.g=De.g,t.b=De.b,t}getStyle(t=Ne){Yt.workingToColorSpace(De.copy(this),t);let e=De.r,n=De.g,r=De.b;return t!==Ne?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(t,e,n){return this.getHSL(qn),this.setHSL(qn.h+t,qn.s+e,qn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(qn),t.getHSL(ps);let n=yr(qn.h,ps.h,e),r=yr(qn.s,ps.s,e),s=yr(qn.l,ps.l,e);return this.setHSL(n,r,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,r=this.b,s=t.elements;return this.r=s[0]*e+s[3]*n+s[6]*r,this.g=s[1]*e+s[4]*n+s[7]*r,this.b=s[2]*e+s[5]*n+s[8]*r,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},De=new Ht;Ht.NAMES=Oh;var Ar=class extends Ve{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new On,this.environmentIntensity=1,this.environmentRotation=new On,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){let e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}},ln=new V,Ln=new V,Io=new V,Dn=new V,Ii=new V,Li=new V,Hc=new V,Lo=new V,Do=new V,No=new V,Uo=new me,Fo=new me,Oo=new me,$n=class i{constructor(t=new V,e=new V,n=new V){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,r){r.subVectors(n,e),ln.subVectors(t,e),r.cross(ln);let s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(t,e,n,r,s){ln.subVectors(r,e),Ln.subVectors(n,e),Io.subVectors(t,e);let a=ln.dot(ln),o=ln.dot(Ln),c=ln.dot(Io),l=Ln.dot(Ln),h=Ln.dot(Io),f=a*l-o*o;if(f===0)return s.set(0,0,0),null;let u=1/f,d=(l*c-o*h)*u,g=(a*h-o*c)*u;return s.set(1-d-g,g,d)}static containsPoint(t,e,n,r){return this.getBarycoord(t,e,n,r,Dn)===null?!1:Dn.x>=0&&Dn.y>=0&&Dn.x+Dn.y<=1}static getInterpolation(t,e,n,r,s,a,o,c){return this.getBarycoord(t,e,n,r,Dn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,Dn.x),c.addScaledVector(a,Dn.y),c.addScaledVector(o,Dn.z),c)}static getInterpolatedAttribute(t,e,n,r,s,a){return Uo.setScalar(0),Fo.setScalar(0),Oo.setScalar(0),Uo.fromBufferAttribute(t,e),Fo.fromBufferAttribute(t,n),Oo.fromBufferAttribute(t,r),a.setScalar(0),a.addScaledVector(Uo,s.x),a.addScaledVector(Fo,s.y),a.addScaledVector(Oo,s.z),a}static isFrontFacing(t,e,n,r){return ln.subVectors(n,e),Ln.subVectors(t,e),ln.cross(Ln).dot(r)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,r){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[r]),this}setFromAttributeAndIndices(t,e,n,r){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,r),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ln.subVectors(this.c,this.b),Ln.subVectors(this.a,this.b),ln.cross(Ln).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,r,s){return i.getInterpolation(t,this.a,this.b,this.c,e,n,r,s)}containsPoint(t){return i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){let n=this.a,r=this.b,s=this.c,a,o;Ii.subVectors(r,n),Li.subVectors(s,n),Lo.subVectors(t,n);let c=Ii.dot(Lo),l=Li.dot(Lo);if(c<=0&&l<=0)return e.copy(n);Do.subVectors(t,r);let h=Ii.dot(Do),f=Li.dot(Do);if(h>=0&&f<=h)return e.copy(r);let u=c*f-h*l;if(u<=0&&c>=0&&h<=0)return a=c/(c-h),e.copy(n).addScaledVector(Ii,a);No.subVectors(t,s);let d=Ii.dot(No),g=Li.dot(No);if(g>=0&&d<=g)return e.copy(s);let S=d*l-c*g;if(S<=0&&l>=0&&g<=0)return o=l/(l-g),e.copy(n).addScaledVector(Li,o);let m=h*g-d*f;if(m<=0&&f-h>=0&&d-g>=0)return Hc.subVectors(s,r),o=(f-h)/(f-h+(d-g)),e.copy(r).addScaledVector(Hc,o);let p=1/(m+S+u);return a=S*p,o=u*p,e.copy(n).addScaledVector(Ii,a).addScaledVector(Li,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Kn=class{constructor(t=new V(1/0,1/0,1/0),e=new V(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(cn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(cn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){let n=cn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);let n=t.geometry;if(n!==void 0){let s=n.getAttribute("position");if(e===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,cn):cn.fromBufferAttribute(s,a),cn.applyMatrix4(t.matrixWorld),this.expandByPoint(cn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),ms.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ms.copy(n.boundingBox)),ms.applyMatrix4(t.matrixWorld),this.union(ms)}let r=t.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,cn),cn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(gr),gs.subVectors(this.max,gr),Di.subVectors(t.a,gr),Ni.subVectors(t.b,gr),Ui.subVectors(t.c,gr),Yn.subVectors(Ni,Di),Zn.subVectors(Ui,Ni),fi.subVectors(Di,Ui);let e=[0,-Yn.z,Yn.y,0,-Zn.z,Zn.y,0,-fi.z,fi.y,Yn.z,0,-Yn.x,Zn.z,0,-Zn.x,fi.z,0,-fi.x,-Yn.y,Yn.x,0,-Zn.y,Zn.x,0,-fi.y,fi.x,0];return!Bo(e,Di,Ni,Ui,gs)||(e=[1,0,0,0,1,0,0,0,1],!Bo(e,Di,Ni,Ui,gs))?!1:(_s.crossVectors(Yn,Zn),e=[_s.x,_s.y,_s.z],Bo(e,Di,Ni,Ui,gs))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,cn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(cn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Nn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Nn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Nn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Nn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Nn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Nn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Nn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Nn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Nn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}},Nn=[new V,new V,new V,new V,new V,new V,new V,new V],cn=new V,ms=new Kn,Di=new V,Ni=new V,Ui=new V,Yn=new V,Zn=new V,fi=new V,gr=new V,gs=new V,_s=new V,di=new V;function Bo(i,t,e,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){di.fromArray(i,s);let o=r.x*Math.abs(di.x)+r.y*Math.abs(di.y)+r.z*Math.abs(di.z),c=t.dot(di),l=e.dot(di),h=n.dot(di);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}var Me=new V,xs=new Xt,Ff=0,en=class extends bn{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Ff++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Lh,this.updateRanges=[],this.gpuType=pn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[t+r]=e.array[n+r];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)xs.fromBufferAttribute(this,e),xs.applyMatrix3(t),this.setXY(e,xs.x,xs.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Me.fromBufferAttribute(this,e),Me.applyMatrix3(t),this.setXYZ(e,Me.x,Me.y,Me.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Me.fromBufferAttribute(this,e),Me.applyMatrix4(t),this.setXYZ(e,Me.x,Me.y,Me.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Me.fromBufferAttribute(this,e),Me.applyNormalMatrix(t),this.setXYZ(e,Me.x,Me.y,Me.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Me.fromBufferAttribute(this,e),Me.transformDirection(t),this.setXYZ(e,Me.x,Me.y,Me.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Vi(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Be(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Vi(e,this.array)),e}setX(t,e){return this.normalized&&(e=Be(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Vi(e,this.array)),e}setY(t,e){return this.normalized&&(e=Be(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Vi(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Be(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Vi(e,this.array)),e}setW(t,e){return this.normalized&&(e=Be(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Be(e,this.array),n=Be(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,r){return t*=this.itemSize,this.normalized&&(e=Be(e,this.array),n=Be(n,this.array),r=Be(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=r,this}setXYZW(t,e,n,r,s){return t*=this.itemSize,this.normalized&&(e=Be(e,this.array),n=Be(n,this.array),r=Be(r,this.array),s=Be(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=r,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}};var Cr=class extends en{constructor(t,e,n){super(new Uint16Array(t),e,n)}};var Rr=class extends en{constructor(t,e,n){super(new Uint32Array(t),e,n)}};var ye=class extends en{constructor(t,e,n){super(new Float32Array(t),e,n)}},Of=new Kn,_r=new V,zo=new V,Zi=class{constructor(t=new V,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){let n=this.center;e!==void 0?n.copy(e):Of.setFromPoints(t).getCenter(n);let r=0;for(let s=0,a=t.length;s<a;s++)r=Math.max(r,n.distanceToSquared(t[s]));return this.radius=Math.sqrt(r),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){let n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;_r.subVectors(t,this.center);let e=_r.lengthSq();if(e>this.radius*this.radius){let n=Math.sqrt(e),r=(n-this.radius)*.5;this.center.addScaledVector(_r,r/n),this.radius+=r}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(zo.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(_r.copy(t.center).add(zo)),this.expandByPoint(_r.copy(t.center).sub(zo))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}},Bf=0,tn=new ge,Vo=new Ve,Fi=new V,Ze=new Kn,xr=new Kn,we=new V,Je=class i extends bn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Bf++}),this.uuid=ir(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(lf(t)?Rr:Cr)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){let e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let s=new Ot().getNormalMatrix(t);n.applyNormalMatrix(s),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return tn.makeRotationFromQuaternion(t),this.applyMatrix4(tn),this}rotateX(t){return tn.makeRotationX(t),this.applyMatrix4(tn),this}rotateY(t){return tn.makeRotationY(t),this.applyMatrix4(tn),this}rotateZ(t){return tn.makeRotationZ(t),this.applyMatrix4(tn),this}translate(t,e,n){return tn.makeTranslation(t,e,n),this.applyMatrix4(tn),this}scale(t,e,n){return tn.makeScale(t,e,n),this.applyMatrix4(tn),this}lookAt(t){return Vo.lookAt(t),Vo.updateMatrix(),this.applyMatrix4(Vo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Fi).negate(),this.translate(Fi.x,Fi.y,Fi.z),this}setFromPoints(t){let e=this.getAttribute("position");if(e===void 0){let n=[];for(let r=0,s=t.length;r<s;r++){let a=t[r];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ye(n,3))}else{let n=Math.min(t.length,e.count);for(let r=0;r<n;r++){let s=t[r];e.setXYZ(r,s.x,s.y,s.z||0)}t.length>e.count&&Dt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Kn);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new V(-1/0,-1/0,-1/0),new V(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,r=e.length;n<r;n++){let s=e[n];Ze.setFromBufferAttribute(s),this.morphTargetsRelative?(we.addVectors(this.boundingBox.min,Ze.min),this.boundingBox.expandByPoint(we),we.addVectors(this.boundingBox.max,Ze.max),this.boundingBox.expandByPoint(we)):(this.boundingBox.expandByPoint(Ze.min),this.boundingBox.expandByPoint(Ze.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Zi);let t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new V,1/0);return}if(t){let n=this.boundingSphere.center;if(Ze.setFromBufferAttribute(t),e)for(let s=0,a=e.length;s<a;s++){let o=e[s];xr.setFromBufferAttribute(o),this.morphTargetsRelative?(we.addVectors(Ze.min,xr.min),Ze.expandByPoint(we),we.addVectors(Ze.max,xr.max),Ze.expandByPoint(we)):(Ze.expandByPoint(xr.min),Ze.expandByPoint(xr.max))}Ze.getCenter(n);let r=0;for(let s=0,a=t.count;s<a;s++)we.fromBufferAttribute(t,s),r=Math.max(r,n.distanceToSquared(we));if(e)for(let s=0,a=e.length;s<a;s++){let o=e[s],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)we.fromBufferAttribute(o,l),c&&(Fi.fromBufferAttribute(t,l),we.add(Fi)),r=Math.max(r,n.distanceToSquared(we))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&Nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.position,r=e.normal,s=e.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new en(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],c=[];for(let x=0;x<n.count;x++)o[x]=new V,c[x]=new V;let l=new V,h=new V,f=new V,u=new Xt,d=new Xt,g=new Xt,S=new V,m=new V;function p(x,E,P){l.fromBufferAttribute(n,x),h.fromBufferAttribute(n,E),f.fromBufferAttribute(n,P),u.fromBufferAttribute(s,x),d.fromBufferAttribute(s,E),g.fromBufferAttribute(s,P),h.sub(l),f.sub(l),d.sub(u),g.sub(u);let L=1/(d.x*g.y-g.x*d.y);isFinite(L)&&(S.copy(h).multiplyScalar(g.y).addScaledVector(f,-d.y).multiplyScalar(L),m.copy(f).multiplyScalar(d.x).addScaledVector(h,-g.x).multiplyScalar(L),o[x].add(S),o[E].add(S),o[P].add(S),c[x].add(m),c[E].add(m),c[P].add(m))}let T=this.groups;T.length===0&&(T=[{start:0,count:t.count}]);for(let x=0,E=T.length;x<E;++x){let P=T[x],L=P.start,F=P.count;for(let O=L,I=L+F;O<I;O+=3)p(t.getX(O+0),t.getX(O+1),t.getX(O+2))}let R=new V,y=new V,b=new V,M=new V;function C(x){b.fromBufferAttribute(r,x),M.copy(b);let E=o[x];R.copy(E),R.sub(b.multiplyScalar(b.dot(E))).normalize(),y.crossVectors(M,E);let L=y.dot(c[x])<0?-1:1;a.setXYZW(x,R.x,R.y,R.z,L)}for(let x=0,E=T.length;x<E;++x){let P=T[x],L=P.start,F=P.count;for(let O=L,I=L+F;O<I;O+=3)C(t.getX(O+0)),C(t.getX(O+1)),C(t.getX(O+2))}this._transformed=!0}computeVertexNormals(){let t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new en(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,d=n.count;u<d;u++)n.setXYZ(u,0,0,0);let r=new V,s=new V,a=new V,o=new V,c=new V,l=new V,h=new V,f=new V;if(t)for(let u=0,d=t.count;u<d;u+=3){let g=t.getX(u+0),S=t.getX(u+1),m=t.getX(u+2);r.fromBufferAttribute(e,g),s.fromBufferAttribute(e,S),a.fromBufferAttribute(e,m),h.subVectors(a,s),f.subVectors(r,s),h.cross(f),o.fromBufferAttribute(n,g),c.fromBufferAttribute(n,S),l.fromBufferAttribute(n,m),o.add(h),c.add(h),l.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(S,c.x,c.y,c.z),n.setXYZ(m,l.x,l.y,l.z)}else for(let u=0,d=e.count;u<d;u+=3)r.fromBufferAttribute(e,u+0),s.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,s),f.subVectors(r,s),h.cross(f),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)we.fromBufferAttribute(t,e),we.normalize(),t.setXYZ(e,we.x,we.y,we.z)}toNonIndexed(){function t(o,c){let l=o.array,h=o.itemSize,f=o.normalized,u=new l.constructor(c.length*h),d=0,g=0;for(let S=0,m=c.length;S<m;S++){o.isInterleavedBufferAttribute?d=c[S]*o.data.stride+o.offset:d=c[S]*h;for(let p=0;p<h;p++)u[g++]=l[d++]}return new en(u,h,f)}if(this.index===null)return Dt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let e=new i,n=this.index.array,r=this.attributes;for(let o in r){let c=r[o],l=t(c,n);e.setAttribute(o,l)}let s=this.morphAttributes;for(let o in s){let c=[],l=s[o];for(let h=0,f=l.length;h<f;h++){let u=l[h],d=t(u,n);c.push(d)}e.morphAttributes[o]=c}e.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){let t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};let e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});let n=this.attributes;for(let c in n){let l=n[c];t.data.attributes[c]=l.toJSON(t.data)}let r={},s=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let f=0,u=l.length;f<u;f++){let d=l[f];h.push(d.toJSON(t.data))}h.length>0&&(r[c]=h,s=!0)}s&&(t.data.morphAttributes=r,t.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let e={};this.name=t.name;let n=t.index;n!==null&&this.setIndex(n.clone());let r=t.attributes;for(let l in r){let h=r[l];this.setAttribute(l,h.clone(e))}let s=t.morphAttributes;for(let l in s){let h=[],f=s[l];for(let u=0,d=f.length;u<d;u++)h.push(f[u].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;let a=t.groups;for(let l=0,h=a.length;l<h;l++){let f=a[l];this.addGroup(f.start,f.count,f.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var ko=new V,zf=new V,Vf=new Ot,hn=class{constructor(t=new V(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,r){return this.normal.set(t,e,n),this.constant=r,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let r=ko.subVectors(n,e).cross(zf.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(r,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){let r=t.delta(ko),s=this.normal.dot(r);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let a=-(t.start.dot(this.normal)+this.constant)/s;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(r,a)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||Vf.getNormalMatrix(t),r=this.coplanarPoint(ko).applyMatrix4(t),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}},kf=0,Qn=class extends bn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:kf++}),this.uuid=ir(),this.name="",this.type="Material",this.blending=tr,this.side=ri,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=il,this.blendDst=rl,this.blendEquation=yi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ht(0,0,0),this.blendAlpha=0,this.depthFunc=Gi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Th,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ls,this.stencilZFail=Ls,this.stencilZPass=Ls,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let e in t){let n=t[e];if(n===void 0){Dt(`Material: parameter '${e}' has value of undefined.`);continue}let r=this[e];if(r===void 0){Dt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(s=>s.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){let a=[];for(let o in s){let c=s[o];delete c.metadata,a.push(c)}return a}if(e){let s=r(t.textures),a=r(t.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new Ht().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new hn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Xt().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Xt().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let e=t.clippingPlanes,n=null;if(e!==null){let r=e.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=e[s].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}};var Un=new V,Go=new V,vs=new V,ys=new V,qs=class{constructor(t=new V,e=new V(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Un)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Un.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Un.copy(this.origin).addScaledVector(this.direction,e),Un.distanceToSquared(t))}distanceSqToSegment(t,e,n,r){Go.copy(t).add(e).multiplyScalar(.5),vs.copy(e).sub(t).normalize(),ys.copy(this.origin).sub(Go);let s=t.distanceTo(e)*.5,a=-this.direction.dot(vs),o=ys.dot(this.direction),c=-ys.dot(vs),l=ys.lengthSq(),h=Math.abs(1-a*a),f,u,d,g;if(h>0)if(f=a*c-o,u=a*o-c,g=s*h,f>=0)if(u>=-g)if(u<=g){let S=1/h;f*=S,u*=S,d=f*(f+a*u+2*o)+u*(a*f+u+2*c)+l}else u=s,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*c)+l;else u=-s,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*c)+l;else u<=-g?(f=Math.max(0,-(-a*s+o)),u=f>0?-s:Math.min(Math.max(-s,-c),s),d=-f*f+u*(u+2*c)+l):u<=g?(f=0,u=Math.min(Math.max(-s,-c),s),d=u*(u+2*c)+l):(f=Math.max(0,-(a*s+o)),u=f>0?s:Math.min(Math.max(-s,-c),s),d=-f*f+u*(u+2*c)+l);else u=a>0?-s:s,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,f),r&&r.copy(Go).addScaledVector(vs,u),d}intersectSphere(t,e){if(t.radius<0)return null;Un.subVectors(t.center,this.origin);let n=Un.dot(this.direction),r=Un.dot(Un)-n*n,s=t.radius*t.radius;if(r>s)return null;let a=Math.sqrt(s-r),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,r,s,a,o,c,l=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,u=this.origin;return l>=0?(n=(t.min.x-u.x)*l,r=(t.max.x-u.x)*l):(n=(t.max.x-u.x)*l,r=(t.min.x-u.x)*l),h>=0?(s=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(s=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||s>r||((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),f>=0?(o=(t.min.z-u.z)*f,c=(t.max.z-u.z)*f):(o=(t.max.z-u.z)*f,c=(t.min.z-u.z)*f),n>c||o>r)||((o>n||n!==n)&&(n=o),(c<r||r!==r)&&(r=c),r<0)?null:this.at(n>=0?n:r,e)}intersectsBox(t){return this.intersectBox(t,Un)!==null}intersectTriangle(t,e,n,r,s){let a=this.origin,o=this.direction,c=o.x,l=o.y,h=o.z,f=t.x-a.x,u=t.y-a.y,d=t.z-a.z,g=e.x-a.x,S=e.y-a.y,m=e.z-a.z,p=n.x-a.x,T=n.y-a.y,R=n.z-a.z,y=Math.abs(c),b=Math.abs(l),M=Math.abs(h),C,x,E,P,L,F,O,I,A,z,W,K;if(y>=b&&y>=M?(E=c,F=f,A=g,K=p,c>=0?(C=l,x=h,P=u,L=d,O=S,I=m,z=T,W=R):(C=h,x=l,P=d,L=u,O=m,I=S,z=R,W=T)):b>=M?(E=l,F=u,A=S,K=T,l>=0?(C=h,x=c,P=d,L=f,O=m,I=g,z=R,W=p):(C=c,x=h,P=f,L=d,O=g,I=m,z=p,W=R)):(E=h,F=d,A=m,K=R,h>=0?(C=c,x=l,P=f,L=u,O=g,I=S,z=p,W=T):(C=l,x=c,P=u,L=f,O=S,I=g,z=T,W=p)),E===0)return null;let q=C/E,j=x/E,tt=1/E,St=P-q*F,gt=L-j*F,$t=O-q*A,Bt=I-j*A,Kt=z-q*K,Z=W-j*K,$=Kt*Bt-Z*$t,xt=St*Z-gt*Kt,Ut=$t*gt-Bt*St;if(r){if($<0||xt<0||Ut<0)return null}else if(($<0||xt<0||Ut<0)&&($>0||xt>0||Ut>0))return null;let _t=$+xt+Ut;if(_t===0)return null;let Ft=tt*($*F+xt*A+Ut*K);return(_t>0?Ft<0:Ft>0)?null:this.at(Ft/_t,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},_i=class extends Qn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ht(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new On,this.combine=sl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}},Wc=new ge,pi=new qs,Ss=new Zi,Xc=new V,Ms=new V,bs=new V,Es=new V,Ho=new V,Ts=new V,qc=new V,ws=new V,be=class extends Ve{constructor(t=new Je,e=new _i){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){let r=e[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){let o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(t,e){let n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(r,t);let o=this.morphTargetInfluences;if(s&&o){Ts.set(0,0,0);for(let c=0,l=s.length;c<l;c++){let h=o[c],f=s[c];h!==0&&(Ho.fromBufferAttribute(f,t),a?Ts.addScaledVector(Ho,h):Ts.addScaledVector(Ho.sub(e),h))}e.add(Ts)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){let n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Ss.copy(n.boundingSphere),Ss.applyMatrix4(s),pi.copy(t.ray).recast(t.near),!(Ss.containsPoint(pi.origin)===!1&&(pi.intersectSphere(Ss,Xc)===null||pi.origin.distanceToSquared(Xc)>(t.far-t.near)**2))&&(Wc.copy(s).invert(),pi.copy(t.ray).applyMatrix4(Wc),!(n.boundingBox!==null&&pi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,pi)))}_computeIntersections(t,e,n){let r,s=this.geometry,a=this.material,o=s.index,c=s.attributes.position,l=s.attributes.uv,h=s.attributes.uv1,f=s.attributes.normal,u=s.groups,d=s.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,S=u.length;g<S;g++){let m=u[g],p=a[m.materialIndex],T=Math.max(m.start,d.start),R=Math.min(o.count,Math.min(m.start+m.count,d.start+d.count));for(let y=T,b=R;y<b;y+=3){let M=o.getX(y),C=o.getX(y+1),x=o.getX(y+2);r=As(this,p,t,n,l,h,f,M,C,x),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=m.materialIndex,e.push(r))}}else{let g=Math.max(0,d.start),S=Math.min(o.count,d.start+d.count);for(let m=g,p=S;m<p;m+=3){let T=o.getX(m),R=o.getX(m+1),y=o.getX(m+2);r=As(this,a,t,n,l,h,f,T,R,y),r&&(r.faceIndex=Math.floor(m/3),e.push(r))}}else if(c!==void 0)if(Array.isArray(a))for(let g=0,S=u.length;g<S;g++){let m=u[g],p=a[m.materialIndex],T=Math.max(m.start,d.start),R=Math.min(c.count,Math.min(m.start+m.count,d.start+d.count));for(let y=T,b=R;y<b;y+=3){let M=y,C=y+1,x=y+2;r=As(this,p,t,n,l,h,f,M,C,x),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=m.materialIndex,e.push(r))}}else{let g=Math.max(0,d.start),S=Math.min(c.count,d.start+d.count);for(let m=g,p=S;m<p;m+=3){let T=m,R=m+1,y=m+2;r=As(this,a,t,n,l,h,f,T,R,y),r&&(r.faceIndex=Math.floor(m/3),e.push(r))}}}};function Gf(i,t,e,n,r,s,a,o){let c;if(t.side===Ge?c=n.intersectTriangle(a,s,r,!0,o):c=n.intersectTriangle(r,s,a,t.side===ri,o),c===null)return null;ws.copy(o),ws.applyMatrix4(i.matrixWorld);let l=e.ray.origin.distanceTo(ws);return l<e.near||l>e.far?null:{distance:l,point:ws.clone(),object:i}}function As(i,t,e,n,r,s,a,o,c,l){i.getVertexPosition(o,Ms),i.getVertexPosition(c,bs),i.getVertexPosition(l,Es);let h=Gf(i,t,e,n,Ms,bs,Es,qc);if(h){let f=new V;$n.getBarycoord(qc,Ms,bs,Es,f),r&&(h.uv=$n.getInterpolatedAttribute(r,o,c,l,f,new Xt)),s&&(h.uv1=$n.getInterpolatedAttribute(s,o,c,l,f,new Xt)),a&&(h.normal=$n.getInterpolatedAttribute(a,o,c,l,f,new V),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:c,c:l,normal:new V,materialIndex:0};$n.getNormal(Ms,bs,Es,u.normal),h.face=u,h.barycoord=f}return h}var Ys=class extends ze{constructor(t=null,e=1,n=1,r,s,a,o,c,l=Ae,h=Ae,f,u){super(null,a,o,c,l,h,r,s,f,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var mi=new Zi,Hf=new Xt(.5,.5),Cs=new V,Ji=class{constructor(t=new hn,e=new hn,n=new hn,r=new hn,s=new hn,a=new hn){this.planes=[t,e,n,r,s,a]}set(t,e,n,r,s,a){let o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(t){let e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=un,n=!1){let r=this.planes,s=t.elements,a=s[0],o=s[1],c=s[2],l=s[3],h=s[4],f=s[5],u=s[6],d=s[7],g=s[8],S=s[9],m=s[10],p=s[11],T=s[12],R=s[13],y=s[14],b=s[15];if(r[0].setComponents(l-a,d-h,p-g,b-T).normalize(),r[1].setComponents(l+a,d+h,p+g,b+T).normalize(),r[2].setComponents(l+o,d+f,p+S,b+R).normalize(),r[3].setComponents(l-o,d-f,p-S,b-R).normalize(),n)r[4].setComponents(c,u,m,y).normalize(),r[5].setComponents(l-c,d-u,p-m,b-y).normalize();else if(r[4].setComponents(l-c,d-u,p-m,b-y).normalize(),e===un)r[5].setComponents(l+c,d+u,p+m,b+y).normalize();else if(e===Hi)r[5].setComponents(c,u,m,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),mi.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),mi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(mi)}intersectsSprite(t){mi.center.set(0,0,0);let e=Hf.distanceTo(t.center);return mi.radius=.7071067811865476+e,mi.applyMatrix4(t.matrixWorld),this.intersectsSphere(mi)}intersectsSphere(t){let e=this.planes,n=t.center,r=-t.radius;for(let s=0;s<6;s++)if(e[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(t){let e=this.planes;for(let n=0;n<6;n++){let r=e[n];if(Cs.x=r.normal.x>0?t.max.x:t.min.x,Cs.y=r.normal.y>0?t.max.y:t.min.y,Cs.z=r.normal.z>0?t.max.z:t.min.z,r.distanceToPoint(Cs)<0)return!1}return!0}containsPoint(t){let e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Pr=class extends ze{constructor(t=[],e=si,n,r,s,a,o,c,l,h){super(t,e,n,r,s,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},Ir=class extends ze{constructor(t,e,n,r,s,a,o,c,l){super(t,e,n,r,s,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}};var jn=class extends ze{constructor(t,e,n=dn,r,s,a,o=Ae,c=Ae,l,h=Mn,f=1){if(h!==Mn&&h!==oi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:t,height:e,depth:f};super(u,r,s,a,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new qi(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){let e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}},Zs=class extends jn{constructor(t,e=dn,n=si,r,s,a=Ae,o=Ae,c,l=Mn){let h={width:t,height:t,depth:1},f=[h,h,h,h,h,h];super(t,t,e,n,r,s,a,o,c,l),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}},Lr=class extends ze{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}},$i=class i extends Je{constructor(t=1,e=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};let o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);let c=[],l=[],h=[],f=[],u=0,d=0;g("z","y","x",-1,-1,n,e,t,a,s,0),g("z","y","x",1,-1,n,e,-t,a,s,1),g("x","z","y",1,1,t,n,e,r,a,2),g("x","z","y",1,-1,t,n,-e,r,a,3),g("x","y","z",1,-1,t,e,n,r,s,4),g("x","y","z",-1,-1,t,e,-n,r,s,5),this.setIndex(c),this.setAttribute("position",new ye(l,3)),this.setAttribute("normal",new ye(h,3)),this.setAttribute("uv",new ye(f,2));function g(S,m,p,T,R,y,b,M,C,x,E){let P=y/C,L=b/x,F=y/2,O=b/2,I=M/2,A=C+1,z=x+1,W=0,K=0,q=new V;for(let j=0;j<z;j++){let tt=j*L-O;for(let St=0;St<A;St++){let gt=St*P-F;q[S]=gt*T,q[m]=tt*R,q[p]=I,l.push(q.x,q.y,q.z),q[S]=0,q[m]=0,q[p]=M>0?1:-1,h.push(q.x,q.y,q.z),f.push(St/C),f.push(1-j/x),W+=1}}for(let j=0;j<x;j++)for(let tt=0;tt<C;tt++){let St=u+tt+A*j,gt=u+tt+A*(j+1),$t=u+(tt+1)+A*(j+1),Bt=u+(tt+1)+A*j;c.push(St,gt,Bt),c.push(gt,$t,Bt),K+=6}o.addGroup(d,K,E),d+=K,u+=W}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};var Dr=class i extends Je{constructor(t=1,e=1,n=1,r=32,s=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:r,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:c};let l=this;r=Math.floor(r),s=Math.floor(s);let h=[],f=[],u=[],d=[],g=0,S=[],m=n/2,p=0;T(),a===!1&&(t>0&&R(!0),e>0&&R(!1)),this.setIndex(h),this.setAttribute("position",new ye(f,3)),this.setAttribute("normal",new ye(u,3)),this.setAttribute("uv",new ye(d,2));function T(){let y=new V,b=new V,M=0,C=(e-t)/n;for(let x=0;x<=s;x++){let E=[],P=x/s,L=P*(e-t)+t;for(let F=0;F<=r;F++){let O=F/r,I=O*c+o,A=Math.sin(I),z=Math.cos(I);b.x=L*A,b.y=-P*n+m,b.z=L*z,f.push(b.x,b.y,b.z),y.set(A,C,z).normalize(),u.push(y.x,y.y,y.z),d.push(O,1-P),E.push(g++)}S.push(E)}for(let x=0;x<r;x++)for(let E=0;E<s;E++){let P=S[E][x],L=S[E+1][x],F=S[E+1][x+1],O=S[E][x+1];(t>0||E!==0)&&(h.push(P,L,O),M+=3),(e>0||E!==s-1)&&(h.push(L,F,O),M+=3)}l.addGroup(p,M,0),p+=M}function R(y){let b=g,M=new Xt,C=new V,x=0,E=y===!0?t:e,P=y===!0?1:-1;for(let F=1;F<=r;F++)f.push(0,m*P,0),u.push(0,P,0),d.push(.5,.5),g++;let L=g;for(let F=0;F<=r;F++){let I=F/r*c+o,A=Math.cos(I),z=Math.sin(I);C.x=E*z,C.y=m*P,C.z=E*A,f.push(C.x,C.y,C.z),u.push(0,P,0),M.x=A*.5+.5,M.y=z*.5*P+.5,d.push(M.x,M.y),g++}for(let F=0;F<r;F++){let O=b+F,I=L+F;y===!0?h.push(I,I+1,O):h.push(I+1,I,O),x+=3}l.addGroup(p,x,y===!0?1:2),p+=x}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}};var xi=class i extends Je{constructor(t=1,e=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:r};let s=t/2,a=e/2,o=Math.floor(n),c=Math.floor(r),l=o+1,h=c+1,f=t/o,u=e/c,d=[],g=[],S=[],m=[];for(let p=0;p<h;p++){let T=p*u-a;for(let R=0;R<l;R++){let y=R*f-s;g.push(y,-T,0),S.push(0,0,1),m.push(R/o),m.push(1-p/c)}}for(let p=0;p<c;p++)for(let T=0;T<o;T++){let R=T+l*p,y=T+l*(p+1),b=T+1+l*(p+1),M=T+1+l*p;d.push(R,y,M),d.push(y,b,M)}this.setIndex(d),this.setAttribute("position",new ye(g,3)),this.setAttribute("normal",new ye(S,3)),this.setAttribute("uv",new ye(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.width,t.height,t.widthSegments,t.heightSegments)}},Nr=class i extends Je{constructor(t=.5,e=1,n=32,r=1,s=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:e,thetaSegments:n,phiSegments:r,thetaStart:s,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);let o=[],c=[],l=[],h=[],f=t,u=(e-t)/r,d=new V,g=new Xt;for(let S=0;S<=r;S++){for(let m=0;m<=n;m++){let p=s+m/n*a;d.x=f*Math.cos(p),d.y=f*Math.sin(p),c.push(d.x,d.y,d.z),l.push(0,0,1),g.x=(d.x/e+1)/2,g.y=(d.y/e+1)/2,h.push(g.x,g.y)}f+=u}for(let S=0;S<r;S++){let m=S*(n+1);for(let p=0;p<n;p++){let T=p+m,R=T,y=T+n+1,b=T+n+2,M=T+1;o.push(R,y,M),o.push(y,b,M)}}this.setIndex(o),this.setAttribute("position",new ye(c,3)),this.setAttribute("normal",new ye(l,3)),this.setAttribute("uv",new ye(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}};var Ki=class i extends Je{constructor(t=1,e=32,n=16,r=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));let c=Math.min(a+o,Math.PI),l=0,h=[],f=new V,u=new V,d=[],g=[],S=[],m=[];for(let p=0;p<=n;p++){let T=[],R=p/n,y=a+R*o,b=t*Math.cos(y),M=Math.sqrt(t*t-b*b),C=0;p===0&&a===0?C=.5/e:p===n&&c===Math.PI&&(C=-.5/e);for(let x=0;x<=e;x++){let E=x/e,P=r+E*s;f.x=-M*Math.cos(P),f.y=b,f.z=M*Math.sin(P),g.push(f.x,f.y,f.z),u.copy(f).normalize(),S.push(u.x,u.y,u.z),m.push(E+C,1-R),T.push(l++)}h.push(T)}for(let p=0;p<n;p++)for(let T=0;T<e;T++){let R=h[p][T+1],y=h[p][T],b=h[p+1][T],M=h[p+1][T+1];(p!==0||a>0)&&d.push(R,y,M),(p!==n-1||c<Math.PI)&&d.push(y,b,M)}this.setIndex(d),this.setAttribute("position",new ye(g,3)),this.setAttribute("normal",new ye(S,3)),this.setAttribute("uv",new ye(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new i(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}};function Mi(i){let t={};for(let e in i){t[e]={};for(let n in i[e]){let r=i[e][n];if(Yc(r))r.isRenderTargetTexture?(Dt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=r.clone();else if(Array.isArray(r))if(Yc(r[0])){let s=[];for(let a=0,o=r.length;a<o;a++)s[a]=r[a].clone();t[e][n]=s}else t[e][n]=r.slice();else t[e][n]=r}}return t}function Ue(i){let t={};for(let e=0;e<i.length;e++){let n=Mi(i[e]);for(let r in n)t[r]=n[r]}return t}function Yc(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Wf(i){let t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function Tl(i){let t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Yt.workingColorSpace}var Bh={clone:Mi,merge:Ue},Xf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,qf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,ke=class extends Qn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Xf,this.fragmentShader=qf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Mi(t.uniforms),this.uniformsGroups=Wf(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){let e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(let r in this.uniforms){let a=this.uniforms[r].value;a&&a.isTexture?e.uniforms[r]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[r]={type:"m4",value:a.toArray()}:e.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;let n={};for(let r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(let n in t.uniforms){let r=t.uniforms[n];switch(this.uniforms[n]={},r.type){case"t":this.uniforms[n].value=e[r.value]||null;break;case"c":this.uniforms[n].value=new Ht().setHex(r.value);break;case"v2":this.uniforms[n].value=new Xt().fromArray(r.value);break;case"v3":this.uniforms[n].value=new V().fromArray(r.value);break;case"v4":this.uniforms[n].value=new me().fromArray(r.value);break;case"m3":this.uniforms[n].value=new Ot().fromArray(r.value);break;case"m4":this.uniforms[n].value=new ge().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(let n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}},Js=class extends ke{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},vi=class extends Qn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ht(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ht(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=$a,this.normalScale=new Xt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new On,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}};var $s=class extends Qn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=bh,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Ks=class extends Qn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}};function Oi(i,t){return!i||i.constructor===t?i:typeof t.BYTES_PER_ELEMENT=="number"?new t(i):Array.prototype.slice.call(i)}function Wo(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var ti=class{constructor(t,e,n,r){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,r=e[n],s=e[n-1];n:{t:{let a;e:{i:if(!(t<r)){for(let o=n+2;;){if(r===void 0){if(t<s)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(s=r,r=e[++n],t<r)break t}a=e.length;break e}if(!(t>=s)){let o=e[1];t<o&&(n=2,s=o);for(let c=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(r=s,s=e[--n-1],t>=s)break t}a=n,n=0;break e}break n}for(;n<a;){let o=n+a>>>1;t<e[o]?a=o:n=o+1}if(r=e[n],s=e[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,r)}return this.interpolate_(n,s,t,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,r=this.valueSize,s=t*r;for(let a=0;a!==r;++a)e[a]=n[s+a];return e}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Qs=class extends ti{constructor(t,e,n,r){super(t,e,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Yo,endingEnd:Yo}}intervalChanged_(t,e,n){let r=this.parameterPositions,s=t-2,a=t+1,o=r[s],c=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Zo:s=t,o=2*e-n;break;case Jo:s=r.length-2,o=e+r[s]-r[s+1];break;default:s=t,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case Zo:a=t,c=2*n-e;break;case Jo:a=1,c=n+r[1]-r[0];break;default:a=t-1,c=e}let l=(n-e)*.5,h=this.valueSize;this._weightPrev=l/(e-o),this._weightNext=l/(c-n),this._offsetPrev=s*h,this._offsetNext=a*h}interpolate_(t,e,n,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,h=this._offsetPrev,f=this._offsetNext,u=this._weightPrev,d=this._weightNext,g=(n-e)/(r-e),S=g*g,m=S*g,p=-u*m+2*u*S-u*g,T=(1+u)*m+(-1.5-2*u)*S+(-.5+u)*g+1,R=(-1-d)*m+(1.5+d)*S+.5*g,y=d*m-d*S;for(let b=0;b!==o;++b)s[b]=p*a[h+b]+T*a[l+b]+R*a[c+b]+y*a[f+b];return s}},js=class extends ti{constructor(t,e,n,r){super(t,e,n,r)}interpolate_(t,e,n,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,h=(n-e)/(r-e),f=1-h;for(let u=0;u!==o;++u)s[u]=a[l+u]*f+a[c+u]*h;return s}},ta=class extends ti{constructor(t,e,n,r){super(t,e,n,r)}interpolate_(t){return this.copySampleValue_(t-1)}},ea=class extends ti{interpolate_(t,e,n,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=t*o,l=c-o,h=this.inTangents,f=this.outTangents;if(!h||!f){let g=(n-e)/(r-e),S=1-g;for(let m=0;m!==o;++m)s[m]=a[l+m]*S+a[c+m]*g;return s}let u=o*2,d=t-1;for(let g=0;g!==o;++g){let S=a[l+g],m=a[c+g],p=d*u+g*2,T=f[p],R=f[p+1],y=t*u+g*2,b=h[y],M=h[y+1],C=Zf(n,e,T,b,r);s[g]=zh(C,S,R,M,m)}return s}};function zh(i,t,e,n,r){let s=1-i;return s*s*s*t+3*s*s*i*e+3*s*i*i*n+i*i*i*r}function Yf(i,t,e,n,r){let s=1-i;return 3*s*s*(e-t)+6*s*i*(n-e)+3*i*i*(r-n)}function Zf(i,t,e,n,r){let s=(i-t)/(r-t);for(let a=0;a<8;a++){let o=zh(s,t,e,n,r)-i;if(Math.abs(o)<1e-10)break;let c=Yf(s,t,e,n,r);if(Math.abs(c)<1e-10)break;s=Math.max(0,Math.min(1,s-o/c))}return s}var $e=class{constructor(t,e,n,r){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=Oi(e,this.TimeBufferType),this.values=Oi(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:Oi(t.times,Array),values:Oi(t.values,Array)};let r=t.getInterpolation();r!==t.DefaultInterpolation&&(n.interpolation=r),Wo(t.settings)&&(n.settings={inTangents:Oi(t.settings.inTangents,Array),outTangents:Oi(t.settings.outTangents,Array)})}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new ta(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new js(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Qs(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodBezier(t){let e=new ea(this.times,this.values,this.getValueSize(),t);return this.settings&&(e.inTangents=this.settings.inTangents,e.outTangents=this.settings.outTangents),e}setInterpolation(t){let e;switch(t){case Sr:e=this.InterpolantFactoryMethodDiscrete;break;case Gs:e=this.InterpolantFactoryMethodLinear;break;case Is:e=this.InterpolantFactoryMethodSmooth;break;case qo:e=this.InterpolantFactoryMethodBezier;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Dt("KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Sr;case this.InterpolantFactoryMethodLinear:return Gs;case this.InterpolantFactoryMethodSmooth:return Is;case this.InterpolantFactoryMethodBezier:return qo}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,r=e.length;n!==r;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,r=e.length;n!==r;++n)e[n]*=t;Wo(this.settings)&&(Zc(this.settings.inTangents,t),Zc(this.settings.outTangents,t))}return this}trim(t,e){let n=this.times,r=n.length,s=0,a=r-1;for(;s!==r&&n[s]<t;)++s;for(;a!==-1&&n[a]>e;)--a;if(++a,s!==0||a!==r){s>=a&&(a=Math.max(a,1),s=a-1);let o=this.getValueSize();this.times=n.slice(s,a),this.values=this.values.slice(s*o,a*o)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(Nt("KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,r=this.values,s=n.length;s===0&&(Nt("KeyframeTrack: Track is empty.",this),t=!1);let a=null;for(let o=0;o!==s;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){Nt("KeyframeTrack: Time is not a valid number.",this,o,c),t=!1;break}if(a!==null&&a>c){Nt("KeyframeTrack: Out of order keys.",this,o,c,a),t=!1;break}a=c}if(r!==void 0&&cf(r))for(let o=0,c=r.length;o!==c;++o){let l=r[o];if(isNaN(l)){Nt("KeyframeTrack: Value is not a valid number.",this,o,l),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Is,s=t.length-1,a=1;for(let o=1;o<s;++o){let c=!1,l=t[o],h=t[o+1];if(l!==h&&(o!==1||l!==t[0]))if(r)c=!0;else{let f=o*n,u=f-n,d=f+n;for(let g=0;g!==n;++g){let S=e[f+g];if(S!==e[u+g]||S!==e[d+g]){c=!0;break}}}if(c){if(o!==a){t[a]=t[o];let f=o*n,u=a*n;for(let d=0;d!==n;++d)e[u+d]=e[f+d]}++a}}if(s>0){t[a]=t[s];for(let o=s*n,c=a*n,l=0;l!==n;++l)e[c+l]=e[o+l];++a}return a!==t.length?(this.times=t.slice(0,a),this.values=e.slice(0,a*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,r=new n(this.name,t,e);return r.createInterpolant=this.createInterpolant,Wo(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}};function Zc(i,t){for(let e=0,n=i.length;e!==n;e+=2)i[e]*=t}$e.prototype.ValueTypeName="";$e.prototype.TimeBufferType=Float32Array;$e.prototype.ValueBufferType=Float32Array;$e.prototype.DefaultInterpolation=Gs;var ei=class extends $e{constructor(t,e,n){super(t,e,n)}};ei.prototype.ValueTypeName="bool";ei.prototype.ValueBufferType=Array;ei.prototype.DefaultInterpolation=Sr;ei.prototype.InterpolantFactoryMethodLinear=void 0;ei.prototype.InterpolantFactoryMethodSmooth=void 0;var na=class extends $e{constructor(t,e,n,r){super(t,e,n,r)}};na.prototype.ValueTypeName="color";var ia=class extends $e{constructor(t,e,n,r){super(t,e,n,r)}};ia.prototype.ValueTypeName="number";var ra=class extends ti{constructor(t,e,n,r){super(t,e,n,r)}interpolate_(t,e,n,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-e)/(r-e),l=t*o;for(let h=l+o;l!==h;l+=4)En.slerpFlat(s,0,a,l-o,a,l,c);return s}},Ur=class extends $e{constructor(t,e,n,r){super(t,e,n,r)}InterpolantFactoryMethodLinear(t){return new ra(this.times,this.values,this.getValueSize(),t)}};Ur.prototype.ValueTypeName="quaternion";Ur.prototype.InterpolantFactoryMethodSmooth=void 0;var ni=class extends $e{constructor(t,e,n){super(t,e,n)}};ni.prototype.ValueTypeName="string";ni.prototype.ValueBufferType=Array;ni.prototype.DefaultInterpolation=Sr;ni.prototype.InterpolantFactoryMethodLinear=void 0;ni.prototype.InterpolantFactoryMethodSmooth=void 0;var sa=class extends $e{constructor(t,e,n,r){super(t,e,n,r)}};sa.prototype.ValueTypeName="vector";var aa=class{constructor(t,e,n){let r=this,s=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,s===!1&&r.onStart!==void 0&&r.onStart(h,a,o),s=!0},this.itemEnd=function(h){a++,r.onProgress!==void 0&&r.onProgress(h,a,o),a===o&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(h){r.onError!==void 0&&r.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,f){return l.push(h,f),this},this.removeHandler=function(h){let f=l.indexOf(h);return f!==-1&&l.splice(f,2),this},this.getHandler=function(h){for(let f=0,u=l.length;f<u;f+=2){let d=l[f],g=l[f+1];if(d.global&&(d.lastIndex=0),d.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Vh=new aa,oa=class{constructor(t){this.manager=t!==void 0?t:Vh,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){let n=this;return new Promise(function(r,s){n.load(t,r,e,s)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};oa.DEFAULT_MATERIAL_NAME="__DEFAULT";var Fr=class extends Ve{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ht(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){let e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}};var Xo=new ge,Jc=new V,$c=new V,la=class{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Xt(512,512),this.mapType=qe,this.map=null,this.mapPass=null,this.matrix=new ge,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ji,this._frameExtents=new Xt(1,1),this._viewportCount=1,this._viewports=[new me(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){let e=this.camera;Jc.setFromMatrixPosition(t.matrixWorld),e.position.copy(Jc),$c.setFromMatrixPosition(t.target.matrixWorld),e.lookAt($c),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,r){Xo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(Xo,t.coordinateSystem,t.reversedDepth);let s=this._frameExtents,a=r?r.z/s.x:1,o=r?r.w/s.y:1,c=r?r.x/s.x:0,l=r?r.y/s.y:0;t.coordinateSystem===Hi||t.reversedDepth?e.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+c,0,.5*o,0,.5*o+l,0,0,.5,.5,0,0,0,1),e.multiply(Xo)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}},Rs=new V,Ps=new En,vn=new V,Or=class extends Ve{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ge,this.projectionMatrix=new ge,this.projectionMatrixInverse=new ge,this.coordinateSystem=un,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(Rs,Ps,vn),vn.x===1&&vn.y===1&&vn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Rs,Ps,vn.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(Rs,Ps,vn),vn.x===1&&vn.y===1&&vn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Rs,Ps,vn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Jn=new V,Kc=new Xt,Qc=new Xt,We=class extends Or{constructor(t=50,e=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Xi*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(vr*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Xi*2*Math.atan(Math.tan(vr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Jn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Jn.x,Jn.y).multiplyScalar(-t/Jn.z),Jn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Jn.x,Jn.y).multiplyScalar(-t/Jn.z)}getViewSize(t,e){return this.getViewBounds(t,Kc,Qc),e.subVectors(Qc,Kc)}setViewOffset(t,e,n,r,s,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(vr*.5*this.fov)/this.zoom,n=2*e,r=this.aspect*n,s=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;s+=a.offsetX*r/c,e-=a.offsetY*n/l,r*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(s+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var ii=class extends Or{constructor(t=-1,e=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,s=n-t,a=n+t,o=r+e,c=r-e;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}},$o=class extends la{constructor(){super(new ii(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Qi=class extends Fr{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ve.DEFAULT_UP),this.updateMatrix(),this.target=new Ve,this.shadow=new $o}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){let e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}},Br=class extends Fr{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}};var Bi=-90,zi=1,ca=class extends Ve{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new We(Bi,zi,t,e);r.layers=this.layers,this.add(r);let s=new We(Bi,zi,t,e);s.layers=this.layers,this.add(s);let a=new We(Bi,zi,t,e);a.layers=this.layers,this.add(a);let o=new We(Bi,zi,t,e);o.layers=this.layers,this.add(o);let c=new We(Bi,zi,t,e);c.layers=this.layers,this.add(c);let l=new We(Bi,zi,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let t=this.coordinateSystem,e=this.children.concat(),[n,r,s,a,o,c]=e;for(let l of e)this.remove(l);if(t===un)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===Hi)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[s,a,o,c,l,h]=this.children,f=t.getRenderTarget(),u=t.getActiveCubeFace(),d=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;let S=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let m=!1;t.isWebGLRenderer===!0?m=t.state.buffers.depth.getReversed():m=t.reversedDepthBuffer,t.setRenderTarget(n,0,r),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,s),t.setRenderTarget(n,1,r),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,r),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,r),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),t.setRenderTarget(n,4,r),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),n.texture.generateMipmaps=S,t.setRenderTarget(n,5,r),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(f,u,d),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},ha=class extends We{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}};var wl="\\[\\]\\.:\\/",Jf=new RegExp("["+wl+"]","g"),Al="[^"+wl+"]",$f="[^"+wl.replace("\\.","")+"]",Kf=/((?:WC+[\/:])*)/.source.replace("WC",Al),Qf=/(WCOD+)?/.source.replace("WCOD",$f),jf=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Al),td=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Al),ed=new RegExp("^"+Kf+Qf+jf+td+"$"),nd=["material","materials","bones","map"],Ko=class{constructor(t,e,n){let r=n||pe.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,r)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=n.length;r!==s;++r)n[r].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},pe=class i{constructor(t,e,n){this.path=e,this.parsedPath=n||i.parseTrackName(e),this.node=i.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new i.Composite(t,e,n):new i(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Jf,"")}static parseTrackName(t){let e=ed.exec(t);if(e===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},r=n.nodeName&&n.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){let s=n.nodeName.substring(r+1);nd.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(s){for(let a=0;a<s.length;a++){let o=s[a];if(o.name===e||o.uuid===e)return o;let c=n(o.children);if(c)return c}return null},r=n(t.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)t[e++]=n[r]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,r=e.propertyName,s=e.propertyIndex;if(t||(t=i.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){Dt("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=e.objectIndex;switch(n){case"materials":if(!t.material){Nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){Nt("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){Nt("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===l){l=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){Nt("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){Nt("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){Nt("PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(l!==void 0){if(t[l]===void 0){Nt("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let a=t[r];if(a===void 0){let l=e.nodeName;Nt("PropertyBinding: Trying to update property for track: "+l+"."+r+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?o=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!t.geometry){Nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){Nt("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[s]!==void 0&&(s=t.morphTargetDictionary[s])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=r;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};pe.Composite=Ko;pe.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};pe.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};pe.prototype.GetterByBindingType=[pe.prototype._getValue_direct,pe.prototype._getValue_array,pe.prototype._getValue_arrayElement,pe.prototype._getValue_toArray];pe.prototype.SetterByBindingTypeAndVersioning=[[pe.prototype._setValue_direct,pe.prototype._setValue_direct_setNeedsUpdate,pe.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_array,pe.prototype._setValue_array_setNeedsUpdate,pe.prototype._setValue_array_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_arrayElement,pe.prototype._setValue_arrayElement_setNeedsUpdate,pe.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[pe.prototype._setValue_fromArray,pe.prototype._setValue_fromArray_setNeedsUpdate,pe.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Tg=new Float32Array(1);var Qo=class i{static{i.prototype.isMatrix2=!0}constructor(t,e,n,r){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,r){let s=this.elements;return s[0]=t,s[2]=e,s[1]=n,s[3]=r,this}};function Cl(i,t,e,n){let r=id(n);switch(e){case xl:return i*t;case yl:return i*t/r.components*r.byteLength;case _a:return i*t/r.components*r.byteLength;case li:return i*t*2/r.components*r.byteLength;case xa:return i*t*2/r.components*r.byteLength;case vl:return i*t*3/r.components*r.byteLength;case rn:return i*t*4/r.components*r.byteLength;case va:return i*t*4/r.components*r.byteLength;case Gr:case Hr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Wr:case Xr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Sa:case ba:return Math.max(i,16)*Math.max(t,8)/4;case ya:case Ma:return Math.max(i,8)*Math.max(t,8)/2;case Ea:case Ta:case Aa:case Ca:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case wa:case qr:case Ra:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Pa:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Ia:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case La:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case Da:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Na:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Ua:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Fa:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Oa:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Ba:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case za:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Va:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case ka:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Ga:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Ha:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case Wa:case Xa:case qa:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Ya:case Za:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Yr:case Ja:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function id(i){switch(i){case qe:case pl:return{byteLength:1,components:1};case er:case ml:case mn:return{byteLength:2,components:1};case ma:case ga:return{byteLength:2,components:4};case dn:case pa:case pn:return{byteLength:4,components:1};case gl:case _l:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Dt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function lu(){let i=null,t=!1,e=null,n=null;function r(s,a){n=i.requestAnimationFrame(r),e(s,a)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(r),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(s){e=s},setContext:function(s){i=s}}}function sd(i){let t=new WeakMap;function e(o,c){let l=o.array,h=o.usage,f=l.byteLength,u=i.createBuffer();i.bindBuffer(c,u),i.bufferData(c,l,h),o.onUploadCallback();let d;if(l instanceof Float32Array)d=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)d=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?d=i.HALF_FLOAT:d=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)d=i.SHORT;else if(l instanceof Uint32Array)d=i.UNSIGNED_INT;else if(l instanceof Int32Array)d=i.INT;else if(l instanceof Int8Array)d=i.BYTE;else if(l instanceof Uint8Array)d=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)d=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:d,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:f}}function n(o,c,l){let h=c.array,f=c.updateRanges;if(i.bindBuffer(l,o),f.length===0)i.bufferSubData(l,0,h);else{f.sort((d,g)=>d.start-g.start);let u=0;for(let d=1;d<f.length;d++){let g=f[u],S=f[d];S.start<=g.start+g.count+1?g.count=Math.max(g.count,S.start+S.count-g.start):(++u,f[u]=S)}f.length=u+1;for(let d=0,g=f.length;d<g;d++){let S=f[d];i.bufferSubData(l,S.start*h.BYTES_PER_ELEMENT,h,S.start,S.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);let c=t.get(o);c&&(i.deleteBuffer(c.buffer),t.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let l=t.get(o);if(l===void 0)t.set(o,e(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:r,remove:s,update:a}}var ad=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,od=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,ld=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,cd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,hd=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ud=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,fd=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,dd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,pd=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,md=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,gd=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,_d=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,xd=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,vd=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,yd=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Sd=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Md=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,bd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Ed=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Td=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,wd=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Ad=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Cd=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Rd=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Pd=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Id=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Ld=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Dd=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Nd=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ud=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Fd="gl_FragColor = linearToOutputTexel( gl_FragColor );",Od=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Bd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,zd=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Vd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,kd=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Gd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Hd=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Wd=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Xd=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,qd=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Yd=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Zd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Jd=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,$d=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Kd=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Qd=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,jd=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,tp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,ep=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,np=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,ip=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,rp=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,sp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,ap=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,op=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lp=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,cp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,hp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,up=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,fp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,dp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,pp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,mp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,gp=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,_p=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,xp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,vp=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,yp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Sp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Mp=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,bp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ep=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Tp=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,wp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Ap=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Cp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Rp=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Pp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Ip=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Lp=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Dp=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Np=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Up=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Fp=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Op=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Bp=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,zp=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Vp=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,kp=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Gp=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Hp=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Wp=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Xp=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,qp=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Yp=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Zp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Jp=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,$p=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Kp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Qp=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,jp=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,tm=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,em=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,nm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,im=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,rm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,sm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,am=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,om=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cm=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,um=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,dm=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,pm=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,mm=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,gm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,_m=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xm=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,vm=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ym=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Sm=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Mm=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,bm=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Em=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Tm=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wm=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Am=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Cm=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Rm=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Pm=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Im=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lm=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Dm=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Nm=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Um=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Fm=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Om=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Bm=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,zm=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Gt={alphahash_fragment:ad,alphahash_pars_fragment:od,alphamap_fragment:ld,alphamap_pars_fragment:cd,alphatest_fragment:hd,alphatest_pars_fragment:ud,aomap_fragment:fd,aomap_pars_fragment:dd,batching_pars_vertex:pd,batching_vertex:md,begin_vertex:gd,beginnormal_vertex:_d,bsdfs:xd,iridescence_fragment:vd,bumpmap_pars_fragment:yd,clipping_planes_fragment:Sd,clipping_planes_pars_fragment:Md,clipping_planes_pars_vertex:bd,clipping_planes_vertex:Ed,color_fragment:Td,color_pars_fragment:wd,color_pars_vertex:Ad,color_vertex:Cd,common:Rd,cube_uv_reflection_fragment:Pd,defaultnormal_vertex:Id,displacementmap_pars_vertex:Ld,displacementmap_vertex:Dd,emissivemap_fragment:Nd,emissivemap_pars_fragment:Ud,colorspace_fragment:Fd,colorspace_pars_fragment:Od,envmap_fragment:Bd,envmap_common_pars_fragment:zd,envmap_pars_fragment:Vd,envmap_pars_vertex:kd,envmap_physical_pars_fragment:Qd,envmap_vertex:Gd,fog_vertex:Hd,fog_pars_vertex:Wd,fog_fragment:Xd,fog_pars_fragment:qd,gradientmap_pars_fragment:Yd,lightmap_pars_fragment:Zd,lights_lambert_fragment:Jd,lights_lambert_pars_fragment:$d,lights_pars_begin:Kd,lights_toon_fragment:jd,lights_toon_pars_fragment:tp,lights_phong_fragment:ep,lights_phong_pars_fragment:np,lights_physical_fragment:ip,lights_physical_pars_fragment:rp,lights_fragment_begin:sp,lights_fragment_maps:ap,lights_fragment_end:op,lightprobes_pars_fragment:lp,logdepthbuf_fragment:cp,logdepthbuf_pars_fragment:hp,logdepthbuf_pars_vertex:up,logdepthbuf_vertex:fp,map_fragment:dp,map_pars_fragment:pp,map_particle_fragment:mp,map_particle_pars_fragment:gp,metalnessmap_fragment:_p,metalnessmap_pars_fragment:xp,morphinstance_vertex:vp,morphcolor_vertex:yp,morphnormal_vertex:Sp,morphtarget_pars_vertex:Mp,morphtarget_vertex:bp,normal_fragment_begin:Ep,normal_fragment_maps:Tp,normal_pars_fragment:wp,normal_pars_vertex:Ap,normal_vertex:Cp,normalmap_pars_fragment:Rp,clearcoat_normal_fragment_begin:Pp,clearcoat_normal_fragment_maps:Ip,clearcoat_pars_fragment:Lp,iridescence_pars_fragment:Dp,opaque_fragment:Np,packing:Up,premultiplied_alpha_fragment:Fp,project_vertex:Op,dithering_fragment:Bp,dithering_pars_fragment:zp,roughnessmap_fragment:Vp,roughnessmap_pars_fragment:kp,shadowmap_pars_fragment:Gp,shadowmap_pars_vertex:Hp,shadowmap_vertex:Wp,shadowmask_pars_fragment:Xp,skinbase_vertex:qp,skinning_pars_vertex:Yp,skinning_vertex:Zp,skinnormal_vertex:Jp,specularmap_fragment:$p,specularmap_pars_fragment:Kp,tonemapping_fragment:Qp,tonemapping_pars_fragment:jp,transmission_fragment:tm,transmission_pars_fragment:em,uv_pars_fragment:nm,uv_pars_vertex:im,uv_vertex:rm,worldpos_vertex:sm,background_vert:am,background_frag:om,backgroundCube_vert:lm,backgroundCube_frag:cm,cube_vert:hm,cube_frag:um,depth_vert:fm,depth_frag:dm,distance_vert:pm,distance_frag:mm,equirect_vert:gm,equirect_frag:_m,linedashed_vert:xm,linedashed_frag:vm,meshbasic_vert:ym,meshbasic_frag:Sm,meshlambert_vert:Mm,meshlambert_frag:bm,meshmatcap_vert:Em,meshmatcap_frag:Tm,meshnormal_vert:wm,meshnormal_frag:Am,meshphong_vert:Cm,meshphong_frag:Rm,meshphysical_vert:Pm,meshphysical_frag:Im,meshtoon_vert:Lm,meshtoon_frag:Dm,points_vert:Nm,points_frag:Um,shadow_vert:Fm,shadow_frag:Om,sprite_vert:Bm,sprite_frag:zm},ut={common:{diffuse:{value:new Ht(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ot},alphaMap:{value:null},alphaMapTransform:{value:new Ot},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ot}},envmap:{envMap:{value:null},envMapRotation:{value:new Ot},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ot}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ot}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ot},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ot},normalScale:{value:new Xt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ot},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ot}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ot}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ot}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ht(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new V},probesMax:{value:new V},probesResolution:{value:new V}},points:{diffuse:{value:new Ht(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ot},alphaTest:{value:0},uvTransform:{value:new Ot}},sprite:{diffuse:{value:new Ht(16777215)},opacity:{value:1},center:{value:new Xt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ot},alphaMap:{value:null},alphaMapTransform:{value:new Ot},alphaTest:{value:0}}},An={basic:{uniforms:Ue([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.fog]),vertexShader:Gt.meshbasic_vert,fragmentShader:Gt.meshbasic_frag},lambert:{uniforms:Ue([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,ut.lights,{emissive:{value:new Ht(0)},envMapIntensity:{value:1}}]),vertexShader:Gt.meshlambert_vert,fragmentShader:Gt.meshlambert_frag},phong:{uniforms:Ue([ut.common,ut.specularmap,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,ut.lights,{emissive:{value:new Ht(0)},specular:{value:new Ht(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Gt.meshphong_vert,fragmentShader:Gt.meshphong_frag},standard:{uniforms:Ue([ut.common,ut.envmap,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.roughnessmap,ut.metalnessmap,ut.fog,ut.lights,{emissive:{value:new Ht(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Gt.meshphysical_vert,fragmentShader:Gt.meshphysical_frag},toon:{uniforms:Ue([ut.common,ut.aomap,ut.lightmap,ut.emissivemap,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.gradientmap,ut.fog,ut.lights,{emissive:{value:new Ht(0)}}]),vertexShader:Gt.meshtoon_vert,fragmentShader:Gt.meshtoon_frag},matcap:{uniforms:Ue([ut.common,ut.bumpmap,ut.normalmap,ut.displacementmap,ut.fog,{matcap:{value:null}}]),vertexShader:Gt.meshmatcap_vert,fragmentShader:Gt.meshmatcap_frag},points:{uniforms:Ue([ut.points,ut.fog]),vertexShader:Gt.points_vert,fragmentShader:Gt.points_frag},dashed:{uniforms:Ue([ut.common,ut.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Gt.linedashed_vert,fragmentShader:Gt.linedashed_frag},depth:{uniforms:Ue([ut.common,ut.displacementmap]),vertexShader:Gt.depth_vert,fragmentShader:Gt.depth_frag},normal:{uniforms:Ue([ut.common,ut.bumpmap,ut.normalmap,ut.displacementmap,{opacity:{value:1}}]),vertexShader:Gt.meshnormal_vert,fragmentShader:Gt.meshnormal_frag},sprite:{uniforms:Ue([ut.sprite,ut.fog]),vertexShader:Gt.sprite_vert,fragmentShader:Gt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ot},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Gt.background_vert,fragmentShader:Gt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ot}},vertexShader:Gt.backgroundCube_vert,fragmentShader:Gt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Gt.cube_vert,fragmentShader:Gt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Gt.equirect_vert,fragmentShader:Gt.equirect_frag},distance:{uniforms:Ue([ut.common,ut.displacementmap,{referencePosition:{value:new V},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Gt.distance_vert,fragmentShader:Gt.distance_frag},shadow:{uniforms:Ue([ut.lights,ut.fog,{color:{value:new Ht(0)},opacity:{value:1}}]),vertexShader:Gt.shadow_vert,fragmentShader:Gt.shadow_frag}};An.physical={uniforms:Ue([An.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ot},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ot},clearcoatNormalScale:{value:new Xt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ot},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ot},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ot},sheen:{value:0},sheenColor:{value:new Ht(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ot},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ot},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ot},transmissionSamplerSize:{value:new Xt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ot},attenuationDistance:{value:0},attenuationColor:{value:new Ht(0)},specularColor:{value:new Ht(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ot},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ot},anisotropyVector:{value:new Xt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ot}}]),vertexShader:Gt.meshphysical_vert,fragmentShader:Gt.meshphysical_frag};var ja={r:0,b:0,g:0},Vm=new ge,cu=new Ot;cu.set(-1,0,0,0,1,0,0,0,1);function km(i,t,e,n,r,s){let a=new Ht(0),o=r===!0?0:1,c,l,h=null,f=0,u=null;function d(T){let R=T.isScene===!0?T.background:null;if(R&&R.isTexture){let y=T.backgroundBlurriness>0;R=t.get(R,y)}return R}function g(T){let R=!1,y=d(T);y===null?m(a,o):y&&y.isColor&&(m(y,1),R=!0);let b=i.xr.getEnvironmentBlendMode();b==="additive"?e.buffers.color.setClear(0,0,0,1,s):b==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,s),(i.autoClear||R)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function S(T,R){let y=d(R);y&&(y.isCubeTexture||y.mapping===Vr)?(l===void 0&&(l=new be(new $i(1,1,1),new ke({name:"BackgroundCubeMaterial",uniforms:Mi(An.backgroundCube.uniforms),vertexShader:An.backgroundCube.vertexShader,fragmentShader:An.backgroundCube.fragmentShader,side:Ge,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(b,M,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=y,l.material.uniforms.backgroundBlurriness.value=R.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=R.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Vm.makeRotationFromEuler(R.backgroundRotation)).transpose(),y.isCubeTexture&&y.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(cu),l.material.toneMapped=Yt.getTransfer(y.colorSpace)!==re,(h!==y||f!==y.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=y,f=y.version,u=i.toneMapping),l.layers.enableAll(),T.unshift(l,l.geometry,l.material,0,0,null)):y&&y.isTexture&&(c===void 0&&(c=new be(new xi(2,2),new ke({name:"BackgroundMaterial",uniforms:Mi(An.background.uniforms),vertexShader:An.background.vertexShader,fragmentShader:An.background.fragmentShader,side:ri,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=y,c.material.uniforms.backgroundIntensity.value=R.backgroundIntensity,c.material.toneMapped=Yt.getTransfer(y.colorSpace)!==re,y.matrixAutoUpdate===!0&&y.updateMatrix(),c.material.uniforms.uvTransform.value.copy(y.matrix),(h!==y||f!==y.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=y,f=y.version,u=i.toneMapping),c.layers.enableAll(),T.unshift(c,c.geometry,c.material,0,0,null))}function m(T,R){T.getRGB(ja,Tl(i)),e.buffers.color.setClear(ja.r,ja.g,ja.b,R,s)}function p(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(T,R=1){a.set(T),o=R,m(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(T){o=T,m(a,o)},render:g,addToRenderList:S,dispose:p}}function Gm(i,t){let e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=u(null),s=r,a=!1;function o(L,F,O,I,A){let z=!1,W=f(L,I,O,F);s!==W&&(s=W,l(s.object)),z=d(L,I,O,A),z&&g(L,I,O,A),A!==null&&t.update(A,i.ELEMENT_ARRAY_BUFFER),(z||a)&&(a=!1,y(L,F,O,I),A!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(A).buffer))}function c(){return i.createVertexArray()}function l(L){return i.bindVertexArray(L)}function h(L){return i.deleteVertexArray(L)}function f(L,F,O,I){let A=I.wireframe===!0,z=n[F.id];z===void 0&&(z={},n[F.id]=z);let W=L.isInstancedMesh===!0?L.id:0,K=z[W];K===void 0&&(K={},z[W]=K);let q=K[O.id];q===void 0&&(q={},K[O.id]=q);let j=q[A];return j===void 0&&(j=u(c()),q[A]=j),j}function u(L){let F=[],O=[],I=[];for(let A=0;A<e;A++)F[A]=0,O[A]=0,I[A]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:O,attributeDivisors:I,object:L,attributes:{},index:null}}function d(L,F,O,I){let A=s.attributes,z=F.attributes,W=0,K=O.getAttributes();for(let q in K)if(K[q].location>=0){let tt=A[q],St=z[q];if(St===void 0&&(q==="instanceMatrix"&&L.instanceMatrix&&(St=L.instanceMatrix),q==="instanceColor"&&L.instanceColor&&(St=L.instanceColor)),tt===void 0||tt.attribute!==St||St&&tt.data!==St.data)return!0;W++}return s.attributesNum!==W||s.index!==I}function g(L,F,O,I){let A={},z=F.attributes,W=0,K=O.getAttributes();for(let q in K)if(K[q].location>=0){let tt=z[q];tt===void 0&&(q==="instanceMatrix"&&L.instanceMatrix&&(tt=L.instanceMatrix),q==="instanceColor"&&L.instanceColor&&(tt=L.instanceColor));let St={};St.attribute=tt,tt&&tt.data&&(St.data=tt.data),A[q]=St,W++}s.attributes=A,s.attributesNum=W,s.index=I}function S(){let L=s.newAttributes;for(let F=0,O=L.length;F<O;F++)L[F]=0}function m(L){p(L,0)}function p(L,F){let O=s.newAttributes,I=s.enabledAttributes,A=s.attributeDivisors;O[L]=1,I[L]===0&&(i.enableVertexAttribArray(L),I[L]=1),A[L]!==F&&(i.vertexAttribDivisor(L,F),A[L]=F)}function T(){let L=s.newAttributes,F=s.enabledAttributes;for(let O=0,I=F.length;O<I;O++)F[O]!==L[O]&&(i.disableVertexAttribArray(O),F[O]=0)}function R(L,F,O,I,A,z,W){W===!0?i.vertexAttribIPointer(L,F,O,A,z):i.vertexAttribPointer(L,F,O,I,A,z)}function y(L,F,O,I){S();let A=I.attributes,z=O.getAttributes(),W=F.defaultAttributeValues;for(let K in z){let q=z[K];if(q.location>=0){let j=A[K];if(j===void 0&&(K==="instanceMatrix"&&L.instanceMatrix&&(j=L.instanceMatrix),K==="instanceColor"&&L.instanceColor&&(j=L.instanceColor)),j!==void 0){let tt=j.normalized,St=j.itemSize,gt=t.get(j);if(gt===void 0)continue;let $t=gt.buffer,Bt=gt.type,Kt=gt.bytesPerElement,Z=Bt===i.INT||Bt===i.UNSIGNED_INT||j.gpuType===pa;if(j.isInterleavedBufferAttribute){let $=j.data,xt=$.stride,Ut=j.offset;if($.isInstancedInterleavedBuffer){for(let _t=0;_t<q.locationSize;_t++)p(q.location+_t,$.meshPerAttribute);L.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=$.meshPerAttribute*$.count)}else for(let _t=0;_t<q.locationSize;_t++)m(q.location+_t);i.bindBuffer(i.ARRAY_BUFFER,$t);for(let _t=0;_t<q.locationSize;_t++)R(q.location+_t,St/q.locationSize,Bt,tt,xt*Kt,(Ut+St/q.locationSize*_t)*Kt,Z)}else{if(j.isInstancedBufferAttribute){for(let $=0;$<q.locationSize;$++)p(q.location+$,j.meshPerAttribute);L.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let $=0;$<q.locationSize;$++)m(q.location+$);i.bindBuffer(i.ARRAY_BUFFER,$t);for(let $=0;$<q.locationSize;$++)R(q.location+$,St/q.locationSize,Bt,tt,St*Kt,St/q.locationSize*$*Kt,Z)}}else if(W!==void 0){let tt=W[K];if(tt!==void 0)switch(tt.length){case 2:i.vertexAttrib2fv(q.location,tt);break;case 3:i.vertexAttrib3fv(q.location,tt);break;case 4:i.vertexAttrib4fv(q.location,tt);break;default:i.vertexAttrib1fv(q.location,tt)}}}}T()}function b(){E();for(let L in n){let F=n[L];for(let O in F){let I=F[O];for(let A in I){let z=I[A];for(let W in z)h(z[W].object),delete z[W];delete I[A]}}delete n[L]}}function M(L){if(n[L.id]===void 0)return;let F=n[L.id];for(let O in F){let I=F[O];for(let A in I){let z=I[A];for(let W in z)h(z[W].object),delete z[W];delete I[A]}}delete n[L.id]}function C(L){for(let F in n){let O=n[F];for(let I in O){let A=O[I];if(A[L.id]===void 0)continue;let z=A[L.id];for(let W in z)h(z[W].object),delete z[W];delete A[L.id]}}}function x(L){for(let F in n){let O=n[F],I=L.isInstancedMesh===!0?L.id:0,A=O[I];if(A!==void 0){for(let z in A){let W=A[z];for(let K in W)h(W[K].object),delete W[K];delete A[z]}delete O[I],Object.keys(O).length===0&&delete n[F]}}}function E(){P(),a=!0,s!==r&&(s=r,l(s.object))}function P(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:E,resetDefaultState:P,dispose:b,releaseStatesOfGeometry:M,releaseStatesOfObject:x,releaseStatesOfProgram:C,initAttributes:S,enableAttribute:m,disableUnusedAttributes:T}}function Hm(i,t,e){let n;function r(c){n=c}function s(c,l){i.drawArrays(n,c,l),e.update(l,n,1)}function a(c,l,h){h!==0&&(i.drawArraysInstanced(n,c,l,h),e.update(l,n,h))}function o(c,l,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,l,0,h);let u=0;for(let d=0;d<h;d++)u+=l[d];e.update(u,n,1)}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o}function Wm(i,t,e,n){let r;function s(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){let C=t.get("EXT_texture_filter_anisotropic");r=i.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(C){return!(C!==rn&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(C){let x=C===mn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==qe&&C!==pn&&!x&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function c(C){if(C==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp",h=c(l);h!==l&&(Dt("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);let f=e.logarithmicDepthBuffer===!0,u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&u===!1&&Dt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let d=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),S=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),T=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),R=i.getParameter(i.MAX_VARYING_VECTORS),y=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),b=i.getParameter(i.MAX_SAMPLES),M=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:u,maxTextures:d,maxVertexTextures:g,maxTextureSize:S,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:T,maxVaryings:R,maxFragmentUniforms:y,maxSamples:b,samples:M}}function Xm(i){let t=this,e=null,n=0,r=!1,s=!1,a=new hn,o=new Ot,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(f,u){let d=f.length!==0||u||n!==0||r;return r=u,n=f.length,d},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(f,u){e=h(f,u,0)},this.setState=function(f,u,d){let g=f.clippingPlanes,S=f.clipIntersection,m=f.clipShadows,p=i.get(f);if(!r||g===null||g.length===0||s&&!m)s?h(null):l();else{let T=s?0:n,R=T*4,y=p.clippingState||null;c.value=y,y=h(g,u,R,d);for(let b=0;b!==R;++b)y[b]=e[b];p.clippingState=y,this.numIntersection=S?this.numPlanes:0,this.numPlanes+=T}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(f,u,d,g){let S=f!==null?f.length:0,m=null;if(S!==0){if(m=c.value,g!==!0||m===null){let p=d+S*4,T=u.matrixWorldInverse;o.getNormalMatrix(T),(m===null||m.length<p)&&(m=new Float32Array(p));for(let R=0,y=d;R!==S;++R,y+=4)a.copy(f[R]).applyMatrix4(T,o),a.normal.toArray(m,y),m[y+3]=a.constant}c.value=m,c.needsUpdate=!0}return t.numPlanes=S,t.numIntersection=0,m}}var sr=4,qm=6,Ym=20,Zm=256,Zr=new ii,kh=new Ht,Rl=null,Pl=0,Il=0,Ll=!1,Jm=new V,bi=new V,eo=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,r=100,s={}){let{size:a=256,position:o=Jm}=s;Rl=this._renderer.getRenderTarget(),Pl=this._renderer.getActiveCubeFace(),Il=this._renderer.getActiveMipmapLevel(),Ll=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(t,n,r,c,o),e>0&&this._blur(c,0,0,e),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Wh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Hh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Rl,Pl,Il),this._renderer.xr.enabled=Ll,t.scissorTest=!1,rr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===si||t.mapping===Si?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Rl=this._renderer.getRenderTarget(),Pl=this._renderer.getActiveCubeFace(),Il=this._renderer.getActiveMipmapLevel(),Ll=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Pe,minFilter:Pe,generateMipmaps:!1,type:mn,format:rn,colorSpace:Mr,depthBuffer:!1},r=Gh(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Gh(t,e,n);let{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=$m(s)),this._blurMaterial=Qm(s,t,e),this._ggxMaterial=Km(s,t,e)}return r}_compileMaterial(t){let e=new be(new Je,t);this._renderer.compile(e,Zr)}_sceneToCubeUV(t,e,n,r,s){let c=new We(90,1,e,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],f=this._renderer,u=f.autoClear,d=f.toneMapping;f.getClearColor(kh),f.toneMapping=fn,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(r),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new be(new $i,new _i({name:"PMREM.Background",side:Ge,depthWrite:!1,depthTest:!1})));let S=this._backgroundBox,m=S.material,p=!1,T=t.background;T?T.isColor&&(m.color.copy(T),t.background=null,p=!0):(m.color.copy(kh),p=!0);for(let R=0;R<6;R++){let y=R%3;y===0?(c.up.set(0,l[R],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x+h[R],s.y,s.z)):y===1?(c.up.set(0,0,l[R]),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y+h[R],s.z)):(c.up.set(0,l[R],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y,s.z+h[R]));let b=this._cubeSize;rr(r,y*b,R>2?b:0,b,b),f.setRenderTarget(r),p&&f.render(S,c),f.render(t,c)}f.toneMapping=d,f.autoClear=u,t.background=T}_textureToCubeUV(t,e){let n=this._renderer,r=t.mapping===si||t.mapping===Si;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Wh()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Hh());let s=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=s;let o=s.uniforms;o.envMap.value=t;let c=this._cubeSize;rr(e,0,0,3*c,2*c),n.setRenderTarget(e),n.render(a,Zr)}_applyPMREM(t){let e=this._renderer,n=e.autoClear;e.autoClear=!1;let r=this._lodMeshes.length;for(let s=1;s<r;s++)this._applyGGXFilter(t,s-1,s);e.autoClear=n}_applyGGXFilter(t,e,n){let r=this._renderer,s=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let c=a.uniforms,l=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),f=Math.sqrt(l*l-h*h),u=l*1.25,d=f*u,{_lodMax:g}=this,S=this._sizeLods[n],m=3*S*(n>g-sr?n-g+sr:0),p=4*(this._cubeSize-S);c.envMap.value=t.texture,c.roughness.value=d,c.mipInt.value=g-e,rr(s,m,p,3*S,2*S),r.setRenderTarget(s),r.render(o,Zr),c.envMap.value=s.texture,c.roughness.value=0,c.mipInt.value=g-n,rr(t,m,p,3*S,2*S),r.setRenderTarget(t),r.render(o,Zr)}_blur(t,e,n,r){let s=this._pingPongRenderTarget,a=Math.min(r,Math.PI)/Math.SQRT2;this._blurPass(t,s,e,n,a),this._blurPass(s,t,n,n,a)}_blurPass(t,e,n,r,s){let a=this._renderer,o=this._blurMaterial,c=this._lodMeshes[r];c.material=o;let l=o.uniforms;l.envMap.value=t.texture,l.sigma.value=s,l.mipInt.value=this._lodMax-n;let h=this._sizeLods[r],f=3*h*(r>this._lodMax-sr?r-this._lodMax+sr:0),u=4*(this._cubeSize-h);rr(e,f,u,3*h,2*h),a.setRenderTarget(e),a.render(c,Zr)}};function $m(i){let t=[],e=[],n=i,r=i-sr+1+qm;for(let s=0;s<r;s++){let a=Math.pow(2,n);t.push(a);let o=1/(a-2),c=-o,l=1+o,h=[c,c,l,c,l,l,c,c,l,l,c,l],f=6,u=6,d=3,g=new Float32Array(d*u*f),S=new Float32Array(d*u*f);for(let p=0;p<f;p++){let T=p%3*2/3-1,R=p>2?0:-1,y=[T,R,0,T+2/3,R,0,T+2/3,R+1,0,T,R,0,T+2/3,R+1,0,T,R+1,0];g.set(y,d*u*p);for(let b=0;b<u;b++){let M=h[b*2]*2-1,C=h[b*2+1]*2-1;p===0?bi.set(1,C,M):p===1?bi.set(-M,1,-C):p===2?bi.set(-M,C,1):p===3?bi.set(-1,C,-M):p===4?bi.set(-M,-1,C):bi.set(M,C,-1),bi.toArray(S,(p*u+b)*d)}}let m=new Je;m.setAttribute("position",new en(g,d)),m.setAttribute("outputDirection",new en(S,d)),e.push(new be(m,null)),n>sr&&n--}return{lodMeshes:e,sizeLods:t}}function Gh(i,t,e){let n=new Xe(i,t,e);return n.texture.mapping=Vr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function rr(i,t,e,n,r){i.viewport.set(t,e,n,r),i.scissor.set(t,e,n,r)}function Km(i,t,e){return new ke({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Zm,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:ro(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function Qm(i,t,e){return new ke({name:"SphericalGaussianBlur",defines:{SAMPLES:Ym,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:ro(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function Hh(){return new ke({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ro(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function Wh(){return new ke({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ro(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Tn,depthTest:!1,depthWrite:!1})}function ro(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var no=class extends Xe{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;let n={width:t,height:t,depth:1},r=[n,n,n,n,n,n];this.texture=new Pr(r),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new $i(5,5,5),s=new ke({name:"CubemapFromEquirect",uniforms:Mi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ge,blending:Tn});s.uniforms.tEquirect.value=e;let a=new be(r,s),o=e.minFilter;return e.minFilter===ai&&(e.minFilter=Pe),new ca(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,r=!0){let s=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,r);t.setRenderTarget(s)}};function jm(i){let t=new WeakMap,e=new WeakMap,n=null;function r(u,d=!1){return u==null?null:d?a(u):s(u)}function s(u){if(u&&u.isTexture){let d=u.mapping;if(d===ua||d===fa)if(t.has(u)){let g=t.get(u).texture;return o(g,u.mapping)}else{let g=u.image;if(g&&g.height>0){let S=new no(g.height);return S.fromEquirectangularTexture(i,u),t.set(u,S),u.addEventListener("dispose",l),o(S.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){let d=u.mapping,g=d===ua||d===fa,S=d===si||d===Si;if(g||S){let m=e.get(u),p=m!==void 0?m.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new eo(i)),m=g?n.fromEquirectangular(u,m):n.fromCubemap(u,m),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),m.texture;if(m!==void 0)return m.texture;{let T=u.image;return g&&T&&T.height>0||S&&T&&c(T)?(n===null&&(n=new eo(i)),m=g?n.fromEquirectangular(u):n.fromCubemap(u),m.texture.pmremVersion=u.pmremVersion,e.set(u,m),u.addEventListener("dispose",h),m.texture):null}}}return u}function o(u,d){return d===ua?u.mapping=si:d===fa&&(u.mapping=Si),u}function c(u){let d=0,g=6;for(let S=0;S<g;S++)u[S]!==void 0&&d++;return d===g}function l(u){let d=u.target;d.removeEventListener("dispose",l);let g=t.get(d);g!==void 0&&(t.delete(d),g.dispose())}function h(u){let d=u.target;d.removeEventListener("dispose",h);let g=e.get(d);g!==void 0&&(e.delete(d),g.dispose())}function f(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:r,dispose:f}}function t0(i){let t={};function e(n){if(t[n]!==void 0)return t[n];let r=i.getExtension(n);return t[n]=r,r}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){let r=e(n);return r===null&&gi("WebGLRenderer: "+n+" extension not supported."),r}}}function e0(i,t,e,n){let r={},s=new WeakMap;function a(f){let u=f.target;u.index!==null&&t.remove(u.index);for(let g in u.attributes)t.remove(u.attributes[g]);u.removeEventListener("dispose",a),delete r[u.id];let d=s.get(u);d&&(t.remove(d),s.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(f,u){return r[u.id]===!0||(u.addEventListener("dispose",a),r[u.id]=!0,e.memory.geometries++),u}function c(f){let u=f.attributes;for(let d in u)t.update(u[d],i.ARRAY_BUFFER)}function l(f){let u=[],d=f.index,g=f.attributes.position,S=0;if(g===void 0)return;if(d!==null){let T=d.array;S=d.version;for(let R=0,y=T.length;R<y;R+=3){let b=T[R+0],M=T[R+1],C=T[R+2];u.push(b,M,M,C,C,b)}}else{let T=g.array;S=g.version;for(let R=0,y=T.length/3-1;R<y;R+=3){let b=R+0,M=R+1,C=R+2;u.push(b,M,M,C,C,b)}}let m=new(g.count>=65535?Rr:Cr)(u,1);m.version=S;let p=s.get(f);p&&t.remove(p),s.set(f,m)}function h(f){let u=s.get(f);if(u){let d=f.index;d!==null&&u.version<d.version&&l(f)}else l(f);return s.get(f)}return{get:o,update:c,getWireframeAttribute:h}}function n0(i,t,e){let n;function r(f){n=f}let s,a;function o(f){s=f.type,a=f.bytesPerElement}function c(f,u){i.drawElements(n,u,s,f*a),e.update(u,n,1)}function l(f,u,d){d!==0&&(i.drawElementsInstanced(n,u,s,f*a,d),e.update(u,n,d))}function h(f,u,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,s,f,0,d);let S=0;for(let m=0;m<d;m++)S+=u[m];e.update(S,n,1)}this.setMode=r,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function i0(i){let t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(s/3);break;case i.LINES:e.lines+=o*(s/2);break;case i.LINE_STRIP:e.lines+=o*(s-1);break;case i.LINE_LOOP:e.lines+=o*s;break;case i.POINTS:e.points+=o*s;break;default:Nt("WebGLInfo: Unknown draw mode:",a);break}}function r(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:r,update:n}}function r0(i,t,e){let n=new WeakMap,r=new me;function s(a,o,c){let l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=h!==void 0?h.length:0,u=n.get(o);if(u===void 0||u.count!==f){let E=function(){C.dispose(),n.delete(o),o.removeEventListener("dispose",E)};u!==void 0&&u.texture.dispose();let d=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,S=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],T=o.morphAttributes.color||[],R=0;d===!0&&(R=1),g===!0&&(R=2),S===!0&&(R=3);let y=o.attributes.position.count*R,b=1;y>t.maxTextureSize&&(b=Math.ceil(y/t.maxTextureSize),y=t.maxTextureSize);let M=new Float32Array(y*b*4*f),C=new Tr(M,y,b,f);C.type=pn,C.needsUpdate=!0;let x=R*4;for(let P=0;P<f;P++){let L=m[P],F=p[P],O=T[P],I=y*b*4*P;for(let A=0;A<L.count;A++){let z=A*x;d===!0&&(r.fromBufferAttribute(L,A),M[I+z+0]=r.x,M[I+z+1]=r.y,M[I+z+2]=r.z,M[I+z+3]=0),g===!0&&(r.fromBufferAttribute(F,A),M[I+z+4]=r.x,M[I+z+5]=r.y,M[I+z+6]=r.z,M[I+z+7]=0),S===!0&&(r.fromBufferAttribute(O,A),M[I+z+8]=r.x,M[I+z+9]=r.y,M[I+z+10]=r.z,M[I+z+11]=O.itemSize===4?r.w:1)}}u={count:f,texture:C,size:new Xt(y,b)},n.set(o,u),o.addEventListener("dispose",E)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let d=0;for(let S=0;S<l.length;S++)d+=l[S];let g=o.morphTargetsRelative?1:1-d;c.getUniforms().setValue(i,"morphTargetBaseInfluence",g),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),c.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:s}}function s0(i,t,e,n,r){let s=new WeakMap;function a(l){let h=r.render.frame,f=l.geometry,u=t.get(l,f);if(s.get(u)!==h&&(t.update(u),s.set(u,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),s.get(l)!==h&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,h))),l.isSkinnedMesh){let d=l.skeleton;s.get(d)!==h&&(d.update(),s.set(d,h))}return u}function o(){s=new WeakMap}function c(l){let h=l.target;h.removeEventListener("dispose",c),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}var a0={[al]:"LINEAR_TONE_MAPPING",[ol]:"REINHARD_TONE_MAPPING",[ll]:"CINEON_TONE_MAPPING",[cl]:"ACES_FILMIC_TONE_MAPPING",[ul]:"AGX_TONE_MAPPING",[fl]:"NEUTRAL_TONE_MAPPING",[hl]:"CUSTOM_TONE_MAPPING"};function o0(i,t,e,n,r,s){let a=new Xe(t,e,{type:i,depthBuffer:r,stencilBuffer:s,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,c=null,l=new Je;l.setAttribute("position",new ye([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new ye([0,2,0,0,2,0],2));let h=new Js({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new be(l,h),u=new ii(-1,1,1,-1,0,1),d=null,g=null,S=!1,m,p=null,T=[],R=!1;this.setSize=function(y,b){a.setSize(y,b),o!==null&&o.setSize(y,b),c!==null&&c.setSize(y,b);for(let M=0;M<T.length;M++){let C=T[M];C.setSize&&C.setSize(y,b)}},this.setEffects=function(y){T=y,R=T.length>0&&T[0].isRenderPass===!0;let b=a.width,M=a.height;T.length>0&&o===null&&(o=new Xe(b,M,{type:mn,depthBuffer:!1,stencilBuffer:!1}),c=new Xe(b,M,{type:mn,depthBuffer:!1,stencilBuffer:!1}));for(let C=0;C<T.length;C++){let x=T[C];x.setSize&&x.setSize(b,M)}},this.begin=function(y,b){if(S||y.toneMapping===fn&&T.length===0)return!1;if(p=b,b!==null){let M=b.width,C=b.height;(a.width!==M||a.height!==C)&&this.setSize(M,C)}return R===!1&&y.setRenderTarget(a),m=y.toneMapping,y.toneMapping=fn,!0},this.hasRenderPass=function(){return R},this.end=function(y,b){y.toneMapping=m,S=!0;let M=a,C=o;for(let x=0;x<T.length;x++){let E=T[x];E.enabled!==!1&&(E.render(y,C,M,b),E.needsSwap!==!1&&(M=C,C=C===o?c:o))}if(d!==y.outputColorSpace||g!==y.toneMapping){d=y.outputColorSpace,g=y.toneMapping,h.defines={},Yt.getTransfer(d)===re&&(h.defines.SRGB_TRANSFER="");let x=a0[g];x&&(h.defines[x]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=M.texture,y.setRenderTarget(p),y.render(f,u),p=null,S=!1},this.isCompositing=function(){return S},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),c!==null&&c.dispose(),l.dispose(),h.dispose()}}var hu=new ze,Ul=new jn(1,1),uu=new Tr,fu=new Xs,du=new Pr,Xh=[],qh=[],Yh=new Float32Array(16),Zh=new Float32Array(9),Jh=new Float32Array(4);function or(i,t,e){let n=i[0];if(n<=0||n>0)return i;let r=t*e,s=Xh[r];if(s===void 0&&(s=new Float32Array(r),Xh[r]=s),t!==0){n.toArray(s,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(s,o)}return s}function Ee(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Te(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function so(i,t){let e=qh[t];e===void 0&&(e=new Int32Array(t),qh[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function l0(i,t){let e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function c0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ee(e,t))return;i.uniform2fv(this.addr,t),Te(e,t)}}function h0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ee(e,t))return;i.uniform3fv(this.addr,t),Te(e,t)}}function u0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ee(e,t))return;i.uniform4fv(this.addr,t),Te(e,t)}}function f0(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ee(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Te(e,t)}else{if(Ee(e,n))return;Jh.set(n),i.uniformMatrix2fv(this.addr,!1,Jh),Te(e,n)}}function d0(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ee(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Te(e,t)}else{if(Ee(e,n))return;Zh.set(n),i.uniformMatrix3fv(this.addr,!1,Zh),Te(e,n)}}function p0(i,t){let e=this.cache,n=t.elements;if(n===void 0){if(Ee(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Te(e,t)}else{if(Ee(e,n))return;Yh.set(n),i.uniformMatrix4fv(this.addr,!1,Yh),Te(e,n)}}function m0(i,t){let e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function g0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ee(e,t))return;i.uniform2iv(this.addr,t),Te(e,t)}}function _0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ee(e,t))return;i.uniform3iv(this.addr,t),Te(e,t)}}function x0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ee(e,t))return;i.uniform4iv(this.addr,t),Te(e,t)}}function v0(i,t){let e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function y0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ee(e,t))return;i.uniform2uiv(this.addr,t),Te(e,t)}}function S0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ee(e,t))return;i.uniform3uiv(this.addr,t),Te(e,t)}}function M0(i,t){let e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ee(e,t))return;i.uniform4uiv(this.addr,t),Te(e,t)}}function b0(i,t,e){let n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?(Ul.compareFunction=e.isReversedDepthBuffer()?Qa:Ka,s=Ul):s=hu,e.setTexture2D(t||s,r)}function E0(i,t,e){let n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTexture3D(t||fu,r)}function T0(i,t,e){let n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTextureCube(t||du,r)}function w0(i,t,e){let n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTexture2DArray(t||uu,r)}function A0(i){switch(i){case 5126:return l0;case 35664:return c0;case 35665:return h0;case 35666:return u0;case 35674:return f0;case 35675:return d0;case 35676:return p0;case 5124:case 35670:return m0;case 35667:case 35671:return g0;case 35668:case 35672:return _0;case 35669:case 35673:return x0;case 5125:return v0;case 36294:return y0;case 36295:return S0;case 36296:return M0;case 35678:case 36198:case 36298:case 36306:case 35682:return b0;case 35679:case 36299:case 36307:return E0;case 35680:case 36300:case 36308:case 36293:return T0;case 36289:case 36303:case 36311:case 36292:return w0}}function C0(i,t){i.uniform1fv(this.addr,t)}function R0(i,t){let e=or(t,this.size,2);i.uniform2fv(this.addr,e)}function P0(i,t){let e=or(t,this.size,3);i.uniform3fv(this.addr,e)}function I0(i,t){let e=or(t,this.size,4);i.uniform4fv(this.addr,e)}function L0(i,t){let e=or(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function D0(i,t){let e=or(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function N0(i,t){let e=or(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function U0(i,t){i.uniform1iv(this.addr,t)}function F0(i,t){i.uniform2iv(this.addr,t)}function O0(i,t){i.uniform3iv(this.addr,t)}function B0(i,t){i.uniform4iv(this.addr,t)}function z0(i,t){i.uniform1uiv(this.addr,t)}function V0(i,t){i.uniform2uiv(this.addr,t)}function k0(i,t){i.uniform3uiv(this.addr,t)}function G0(i,t){i.uniform4uiv(this.addr,t)}function H0(i,t,e){let n=this.cache,r=t.length,s=so(e,r);Ee(n,s)||(i.uniform1iv(this.addr,s),Te(n,s));let a;this.type===i.SAMPLER_2D_SHADOW?a=Ul:a=hu;for(let o=0;o!==r;++o)e.setTexture2D(t[o]||a,s[o])}function W0(i,t,e){let n=this.cache,r=t.length,s=so(e,r);Ee(n,s)||(i.uniform1iv(this.addr,s),Te(n,s));for(let a=0;a!==r;++a)e.setTexture3D(t[a]||fu,s[a])}function X0(i,t,e){let n=this.cache,r=t.length,s=so(e,r);Ee(n,s)||(i.uniform1iv(this.addr,s),Te(n,s));for(let a=0;a!==r;++a)e.setTextureCube(t[a]||du,s[a])}function q0(i,t,e){let n=this.cache,r=t.length,s=so(e,r);Ee(n,s)||(i.uniform1iv(this.addr,s),Te(n,s));for(let a=0;a!==r;++a)e.setTexture2DArray(t[a]||uu,s[a])}function Y0(i){switch(i){case 5126:return C0;case 35664:return R0;case 35665:return P0;case 35666:return I0;case 35674:return L0;case 35675:return D0;case 35676:return N0;case 5124:case 35670:return U0;case 35667:case 35671:return F0;case 35668:case 35672:return O0;case 35669:case 35673:return B0;case 5125:return z0;case 36294:return V0;case 36295:return k0;case 36296:return G0;case 35678:case 36198:case 36298:case 36306:case 35682:return H0;case 35679:case 36299:case 36307:return W0;case 35680:case 36300:case 36308:case 36293:return X0;case 36289:case 36303:case 36311:case 36292:return q0}}var Fl=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=A0(e.type)}},Ol=class{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Y0(e.type)}},Bl=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){let r=this.seq;for(let s=0,a=r.length;s!==a;++s){let o=r[s];o.setValue(t,e[o.id],n)}}},Dl=/(\w+)(\])?(\[|\.)?/g;function $h(i,t){i.seq.push(t),i.map[t.id]=t}function Z0(i,t,e){let n=i.name,r=n.length;for(Dl.lastIndex=0;;){let s=Dl.exec(n),a=Dl.lastIndex,o=s[1],c=s[2]==="]",l=s[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===r){$h(e,l===void 0?new Fl(o,i,t):new Ol(o,i,t));break}else{let f=e.map[o];f===void 0&&(f=new Bl(o),$h(e,f)),e=f}}}var ar=class{constructor(t,e){this.seq=[],this.map={};let n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=t.getActiveUniform(e,a),c=t.getUniformLocation(e,o.name);Z0(o,c,this)}let r=[],s=[];for(let a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?r.push(a):s.push(a);r.length>0&&(this.seq=r.concat(s))}setValue(t,e,n,r){let s=this.map[e];s!==void 0&&s.setValue(t,n,r)}setOptional(t,e,n){let r=e[n];r!==void 0&&this.setValue(t,n,r)}static upload(t,e,n,r){for(let s=0,a=e.length;s!==a;++s){let o=e[s],c=n[o.id];c.needsUpdate!==!1&&o.setValue(t,c.value,r)}}static seqWithValue(t,e){let n=[];for(let r=0,s=t.length;r!==s;++r){let a=t[r];a.id in e&&n.push(a)}return n}};function Kh(i,t,e){let n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}var J0=37297,$0=0;function K0(i,t){let e=i.split(`
`),n=[],r=Math.max(t-6,0),s=Math.min(t+6,e.length);for(let a=r;a<s;a++){let o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}var Qh=new Ot;function Q0(i){Yt._getMatrix(Qh,Yt.workingColorSpace,i);let t=`mat3( ${Qh.elements.map(e=>e.toFixed(4))} )`;switch(Yt.getTransfer(i)){case br:return[t,"LinearTransferOETF"];case re:return[t,"sRGBTransferOETF"];default:return Dt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function jh(i,t,e){let n=i.getShaderParameter(t,i.COMPILE_STATUS),s=(i.getShaderInfoLog(t)||"").trim();if(n&&s==="")return"";let a=/ERROR: 0:(\d+)/.exec(s);if(a){let o=parseInt(a[1]);return e.toUpperCase()+`

`+s+`

`+K0(i.getShaderSource(t),o)}else return s}function j0(i,t){let e=Q0(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}var t1={[al]:"Linear",[ol]:"Reinhard",[ll]:"Cineon",[cl]:"ACESFilmic",[ul]:"AgX",[fl]:"Neutral",[hl]:"Custom"};function e1(i,t){let e=t1[t];return e===void 0?(Dt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}var to=new V;function n1(){Yt.getLuminanceCoefficients(to);let i=to.x.toFixed(4),t=to.y.toFixed(4),e=to.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function i1(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter($r).join(`
`)}function r1(i){let t=[];for(let e in i){let n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function s1(i,t){let e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){let s=i.getActiveAttrib(t,r),a=s.name,o=1;s.type===i.FLOAT_MAT2&&(o=2),s.type===i.FLOAT_MAT3&&(o=3),s.type===i.FLOAT_MAT4&&(o=4),e[a]={type:s.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function $r(i){return i!==""}function tu(i,t){let e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function eu(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var a1=/^[ \t]*#include +<([\w\d./]+)>/gm;function zl(i){return i.replace(a1,l1)}var o1=new Map;function l1(i,t){let e=Gt[t];if(e===void 0){let n=o1.get(t);if(n!==void 0)e=Gt[n],Dt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return zl(e)}var c1=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function nu(i){return i.replace(c1,h1)}function h1(i,t,e,n){let r="";for(let s=parseInt(t);s<parseInt(e);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function iu(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}var u1={[zr]:"SHADOWMAP_TYPE_PCF",[ji]:"SHADOWMAP_TYPE_VSM"};function f1(i){return u1[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var d1={[si]:"ENVMAP_TYPE_CUBE",[Si]:"ENVMAP_TYPE_CUBE",[Vr]:"ENVMAP_TYPE_CUBE_UV"};function p1(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":d1[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var m1={[Si]:"ENVMAP_MODE_REFRACTION"};function g1(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":m1[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var _1={[sl]:"ENVMAP_BLENDING_MULTIPLY",[yh]:"ENVMAP_BLENDING_MIX",[Sh]:"ENVMAP_BLENDING_ADD"};function x1(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":_1[i.combine]||"ENVMAP_BLENDING_NONE"}function v1(i){let t=i.envMapCubeUVHeight;if(t===null)return null;let e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function y1(i,t,e,n){let r=i.getContext(),s=e.defines,a=e.vertexShader,o=e.fragmentShader,c=f1(e),l=p1(e),h=g1(e),f=x1(e),u=v1(e),d=i1(e),g=r1(s),S=r.createProgram(),m,p,T=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter($r).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter($r).join(`
`),p.length>0&&(p+=`
`)):(m=[iu(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter($r).join(`
`),p=[iu(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+f:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==fn?"#define TONE_MAPPING":"",e.toneMapping!==fn?Gt.tonemapping_pars_fragment:"",e.toneMapping!==fn?e1("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Gt.colorspace_pars_fragment,j0("linearToOutputTexel",e.outputColorSpace),n1(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter($r).join(`
`)),a=zl(a),a=tu(a,e),a=eu(a,e),o=zl(o),o=tu(o,e),o=eu(o,e),a=nu(a),o=nu(o),e.isRawShaderMaterial!==!0&&(T=`#version 300 es
`,m=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===Sl?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Sl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let R=T+m+a,y=T+p+o,b=Kh(r,r.VERTEX_SHADER,R),M=Kh(r,r.FRAGMENT_SHADER,y);r.attachShader(S,b),r.attachShader(S,M),e.index0AttributeName!==void 0?r.bindAttribLocation(S,0,e.index0AttributeName):e.hasPositionAttribute===!0&&r.bindAttribLocation(S,0,"position"),r.linkProgram(S);function C(L){if(i.debug.checkShaderErrors){let F=r.getProgramInfoLog(S)||"",O=r.getShaderInfoLog(b)||"",I=r.getShaderInfoLog(M)||"",A=F.trim(),z=O.trim(),W=I.trim(),K=!0,q=!0;if(r.getProgramParameter(S,r.LINK_STATUS)===!1)if(K=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,S,b,M);else{let j=jh(r,b,"vertex"),tt=jh(r,M,"fragment");Nt("WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(S,r.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+A+`
`+j+`
`+tt)}else A!==""?Dt("WebGLProgram: Program Info Log:",A):(z===""||W==="")&&(q=!1);q&&(L.diagnostics={runnable:K,programLog:A,vertexShader:{log:z,prefix:m},fragmentShader:{log:W,prefix:p}})}r.deleteShader(b),r.deleteShader(M),x=new ar(r,S),E=s1(r,S)}let x;this.getUniforms=function(){return x===void 0&&C(this),x};let E;this.getAttributes=function(){return E===void 0&&C(this),E};let P=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=r.getProgramParameter(S,J0)),P},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(S),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=$0++,this.cacheKey=t,this.usedTimes=1,this.program=S,this.vertexShader=b,this.fragmentShader=M,this}var S1=0,Vl=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){let r=this._getShaderCacheForMaterial(t);return r.has(e)===!1&&(r.add(e),e.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(t){let e=this.materialCache.get(t);for(let n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let e=this.materialCache,n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){let e=this.shaderCache,n=e.get(t);return n===void 0&&(n=new kl(t),e.set(t,n)),n}},kl=class{constructor(t){this.id=S1++,this.code=t,this.usedTimes=0}};function M1(i){return i===li||i===qr||i===Yr}function b1(i,t,e,n,r,s){let a=new wr,o=new Vl,c=new Set,l=[],h=new Map,f=n.logarithmicDepthBuffer,u=n.precision,d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(x){return c.add(x),x===0?"uv":`uv${x}`}function S(x,E,P,L,F,O){let I=L.fog,A=F.geometry,z=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?L.environment:null,W=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,K=t.get(x.envMap||z,W),q=K&&K.mapping===Vr?K.image.height:null,j=d[x.type];x.precision!==null&&(u=n.getMaxPrecision(x.precision),u!==x.precision&&Dt("WebGLProgram.getParameters:",x.precision,"not supported, using",u,"instead."));let tt=A.morphAttributes.position||A.morphAttributes.normal||A.morphAttributes.color,St=tt!==void 0?tt.length:0,gt=0;A.morphAttributes.position!==void 0&&(gt=1),A.morphAttributes.normal!==void 0&&(gt=2),A.morphAttributes.color!==void 0&&(gt=3);let $t,Bt,Kt,Z;if(j){let ue=An[j];$t=ue.vertexShader,Bt=ue.fragmentShader}else{$t=x.vertexShader,Bt=x.fragmentShader;let ue=o.getVertexShaderStage(x),ne=o.getFragmentShaderStage(x);o.update(x,ue,ne),Kt=ue.id,Z=ne.id}let $=i.getRenderTarget(),xt=i.state.buffers.depth.getReversed(),Ut=F.isInstancedMesh===!0,_t=F.isBatchedMesh===!0,Ft=!!x.map,_e=!!x.matcap,Vt=!!K,it=!!x.aoMap,ft=!!x.lightMap,Et=!!x.bumpMap&&x.wireframe===!1,At=!!x.normalMap,It=!!x.displacementMap,jt=!!x.emissiveMap,te=!!x.metalnessMap,he=!!x.roughnessMap,N=x.anisotropy>0,xe=x.clearcoat>0,se=x.dispersion>0,w=x.retroreflectivity>0,_=x.iridescence>0,B=x.sheen>0,H=x.transmission>0,Y=N&&!!x.anisotropyMap,rt=xe&&!!x.clearcoatMap,st=xe&&!!x.clearcoatNormalMap,J=xe&&!!x.clearcoatRoughnessMap,et=_&&!!x.iridescenceMap,at=_&&!!x.iridescenceThicknessMap,Ct=B&&!!x.sheenColorMap,ht=B&&!!x.sheenRoughnessMap,ot=!!x.specularMap,Rt=!!x.specularColorMap,Lt=!!x.specularIntensityMap,zt=H&&!!x.transmissionMap,U=H&&!!x.thicknessMap,lt=!!x.gradientMap,Q=!!x.alphaMap,ct=x.alphaTest>0,mt=!!x.alphaHash,nt=!!x.extensions,Pt=fn;x.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(Pt=i.toneMapping);let Tt={shaderID:j,shaderType:x.type,shaderName:x.name,vertexShader:$t,fragmentShader:Bt,defines:x.defines,customVertexShaderID:Kt,customFragmentShaderID:Z,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:u,batching:_t,batchingColor:_t&&F._colorsTexture!==null,instancing:Ut,instancingColor:Ut&&F.instanceColor!==null,instancingMorph:Ut&&F.morphTexture!==null,outputColorSpace:$===null?i.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:Yt.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:Ft,matcap:_e,envMap:Vt,envMapMode:Vt&&K.mapping,envMapCubeUVHeight:q,aoMap:it,lightMap:ft,bumpMap:Et,normalMap:At,displacementMap:It,emissiveMap:jt,normalMapObjectSpace:At&&x.normalMapType===Eh,normalMapTangentSpace:At&&x.normalMapType===$a,packedNormalMap:At&&x.normalMapType===$a&&M1(x.normalMap.format),metalnessMap:te,roughnessMap:he,anisotropy:N,anisotropyMap:Y,clearcoat:xe,clearcoatMap:rt,clearcoatNormalMap:st,clearcoatRoughnessMap:J,dispersion:se,retroreflection:w,iridescence:_,iridescenceMap:et,iridescenceThicknessMap:at,sheen:B,sheenColorMap:Ct,sheenRoughnessMap:ht,specularMap:ot,specularColorMap:Rt,specularIntensityMap:Lt,transmission:H,transmissionMap:zt,thicknessMap:U,gradientMap:lt,opaque:x.transparent===!1&&x.blending===tr&&x.alphaToCoverage===!1,alphaMap:Q,alphaTest:ct,alphaHash:mt,combine:x.combine,mapUv:Ft&&g(x.map.channel),aoMapUv:it&&g(x.aoMap.channel),lightMapUv:ft&&g(x.lightMap.channel),bumpMapUv:Et&&g(x.bumpMap.channel),normalMapUv:At&&g(x.normalMap.channel),displacementMapUv:It&&g(x.displacementMap.channel),emissiveMapUv:jt&&g(x.emissiveMap.channel),metalnessMapUv:te&&g(x.metalnessMap.channel),roughnessMapUv:he&&g(x.roughnessMap.channel),anisotropyMapUv:Y&&g(x.anisotropyMap.channel),clearcoatMapUv:rt&&g(x.clearcoatMap.channel),clearcoatNormalMapUv:st&&g(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:J&&g(x.clearcoatRoughnessMap.channel),iridescenceMapUv:et&&g(x.iridescenceMap.channel),iridescenceThicknessMapUv:at&&g(x.iridescenceThicknessMap.channel),sheenColorMapUv:Ct&&g(x.sheenColorMap.channel),sheenRoughnessMapUv:ht&&g(x.sheenRoughnessMap.channel),specularMapUv:ot&&g(x.specularMap.channel),specularColorMapUv:Rt&&g(x.specularColorMap.channel),specularIntensityMapUv:Lt&&g(x.specularIntensityMap.channel),transmissionMapUv:zt&&g(x.transmissionMap.channel),thicknessMapUv:U&&g(x.thicknessMap.channel),alphaMapUv:Q&&g(x.alphaMap.channel),vertexTangents:!!A.attributes.tangent&&(At||N),vertexNormals:!!A.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!A.attributes.color&&A.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!A.attributes.uv&&(Ft||Q),fog:!!I,useFog:x.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||A.attributes.normal===void 0&&At===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:xt,skinning:F.isSkinnedMesh===!0,hasPositionAttribute:A.attributes.position!==void 0,morphTargets:A.morphAttributes.position!==void 0,morphNormals:A.morphAttributes.normal!==void 0,morphColors:A.morphAttributes.color!==void 0,morphTargetsCount:St,morphTextureStride:gt,numSunLights:E.sun.length,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numSunLightShadows:E.sunShadowMap.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numLightProbeGrids:O.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&P.length>0,shadowMapType:i.shadowMap.type,toneMapping:Pt,decodeVideoTexture:Ft&&x.map.isVideoTexture===!0&&Yt.getTransfer(x.map.colorSpace)===re,decodeVideoTextureEmissive:jt&&x.emissiveMap.isVideoTexture===!0&&Yt.getTransfer(x.emissiveMap.colorSpace)===re,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===nn,flipSided:x.side===Ge,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:nt&&x.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(nt&&x.extensions.multiDraw===!0||_t)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return Tt.vertexUv1s=c.has(1),Tt.vertexUv2s=c.has(2),Tt.vertexUv3s=c.has(3),c.clear(),Tt}function m(x){let E=[];if(x.shaderID?E.push(x.shaderID):(E.push(x.customVertexShaderID),E.push(x.customFragmentShaderID)),x.defines!==void 0)for(let P in x.defines)E.push(P),E.push(x.defines[P]);return x.isRawShaderMaterial===!1&&(p(E,x),T(E,x),E.push(i.outputColorSpace)),E.push(x.customProgramCacheKey),E.join()}function p(x,E){x.push(E.precision),x.push(E.outputColorSpace),x.push(E.envMapMode),x.push(E.envMapCubeUVHeight),x.push(E.mapUv),x.push(E.alphaMapUv),x.push(E.lightMapUv),x.push(E.aoMapUv),x.push(E.bumpMapUv),x.push(E.normalMapUv),x.push(E.displacementMapUv),x.push(E.emissiveMapUv),x.push(E.metalnessMapUv),x.push(E.roughnessMapUv),x.push(E.anisotropyMapUv),x.push(E.clearcoatMapUv),x.push(E.clearcoatNormalMapUv),x.push(E.clearcoatRoughnessMapUv),x.push(E.iridescenceMapUv),x.push(E.iridescenceThicknessMapUv),x.push(E.sheenColorMapUv),x.push(E.sheenRoughnessMapUv),x.push(E.specularMapUv),x.push(E.specularColorMapUv),x.push(E.specularIntensityMapUv),x.push(E.transmissionMapUv),x.push(E.thicknessMapUv),x.push(E.combine),x.push(E.fogExp2),x.push(E.sizeAttenuation),x.push(E.morphTargetsCount),x.push(E.morphAttributeCount),x.push(E.numSunLights),x.push(E.numDirLights),x.push(E.numPointLights),x.push(E.numSpotLights),x.push(E.numSpotLightMaps),x.push(E.numHemiLights),x.push(E.numRectAreaLights),x.push(E.numSunLightShadows),x.push(E.numDirLightShadows),x.push(E.numPointLightShadows),x.push(E.numSpotLightShadows),x.push(E.numSpotLightShadowsWithMaps),x.push(E.numLightProbes),x.push(E.shadowMapType),x.push(E.toneMapping),x.push(E.numClippingPlanes),x.push(E.numClipIntersection),x.push(E.depthPacking)}function T(x,E){a.disableAll(),E.instancing&&a.enable(0),E.instancingColor&&a.enable(1),E.instancingMorph&&a.enable(2),E.matcap&&a.enable(3),E.envMap&&a.enable(4),E.normalMapObjectSpace&&a.enable(5),E.normalMapTangentSpace&&a.enable(6),E.clearcoat&&a.enable(7),E.iridescence&&a.enable(8),E.alphaTest&&a.enable(9),E.vertexColors&&a.enable(10),E.vertexAlphas&&a.enable(11),E.vertexUv1s&&a.enable(12),E.vertexUv2s&&a.enable(13),E.vertexUv3s&&a.enable(14),E.vertexTangents&&a.enable(15),E.anisotropy&&a.enable(16),E.alphaHash&&a.enable(17),E.batching&&a.enable(18),E.dispersion&&a.enable(19),E.retroreflection&&a.enable(24),E.batchingColor&&a.enable(20),E.gradientMap&&a.enable(21),E.packedNormalMap&&a.enable(22),E.vertexNormals&&a.enable(23),x.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.reversedDepthBuffer&&a.enable(4),E.skinning&&a.enable(5),E.morphTargets&&a.enable(6),E.morphNormals&&a.enable(7),E.morphColors&&a.enable(8),E.premultipliedAlpha&&a.enable(9),E.shadowMapEnabled&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),E.decodeVideoTextureEmissive&&a.enable(20),E.alphaToCoverage&&a.enable(21),E.numLightProbeGrids>0&&a.enable(22),E.hasPositionAttribute&&a.enable(23),x.push(a.mask)}function R(x){let E=d[x.type],P;if(E){let L=An[E];P=Bh.clone(L.uniforms)}else P=x.uniforms;return P}function y(x,E){let P=h.get(E);return P!==void 0?++P.usedTimes:(P=new y1(i,E,x,r),l.push(P),h.set(E,P)),P}function b(x){if(--x.usedTimes===0){let E=l.indexOf(x);l[E]=l[l.length-1],l.pop(),h.delete(x.cacheKey),x.destroy()}}function M(x){o.remove(x)}function C(){o.dispose()}return{getParameters:S,getProgramCacheKey:m,getUniforms:R,acquireProgram:y,releaseProgram:b,releaseShaderCache:M,programs:l,dispose:C}}function E1(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function r(a,o,c){i.get(a)[o]=c}function s(){i=new WeakMap}return{has:t,get:e,remove:n,update:r,dispose:s}}function T1(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function ru(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function su(){let i=[],t=0,e=[],n=[],r=[];function s(){t=0,e.length=0,n.length=0,r.length=0}function a(u){let d=0;return u.isInstancedMesh&&(d+=2),u.isSkinnedMesh&&(d+=1),d}function o(u,d,g,S,m,p){let T=i[t];return T===void 0?(T={id:u.id,object:u,geometry:d,material:g,materialVariant:a(u),groupOrder:S,renderOrder:u.renderOrder,z:m,group:p},i[t]=T):(T.id=u.id,T.object=u,T.geometry=d,T.material=g,T.materialVariant=a(u),T.groupOrder=S,T.renderOrder=u.renderOrder,T.z=m,T.group=p),t++,T}function c(u,d,g,S,m,p,T){T.reversedDepth===!0&&(m=-m);let R=o(u,d,g,S,m,p);g.transmission>0?n.push(R):g.transparent===!0?r.push(R):e.push(R)}function l(u,d,g,S,m,p){let T=o(u,d,g,S,m,p);g.transmission>0?n.unshift(T):g.transparent===!0?r.unshift(T):e.unshift(T)}function h(u,d){e.length>1&&e.sort(u||T1),n.length>1&&n.sort(d||ru),r.length>1&&r.sort(d||ru)}function f(){for(let u=t,d=i.length;u<d;u++){let g=i[u];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:n,transparent:r,init:s,push:c,unshift:l,finish:f,sort:h}}function w1(){let i=new WeakMap;function t(n,r){let s=i.get(n),a;return s===void 0?(a=new su,i.set(n,[a])):r>=s.length?(a=new su,s.push(a)):a=s[r],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function A1(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new V,color:new Ht};break;case"SpotLight":e={position:new V,direction:new V,color:new Ht,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new V,color:new Ht,distance:0,decay:0};break;case"HemisphereLight":e={direction:new V,skyColor:new Ht,groundColor:new Ht};break;case"RectAreaLight":e={color:new Ht,position:new V,halfWidth:new V,halfHeight:new V};break}return i[t.id]=e,e}}}function C1(){let i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Xt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Xt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Xt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}var R1=0;function P1(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function I1(i){let t=new A1,e=C1(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new V);let r=new V,s=new ge,a=new ge;function o(l){let h=0,f=0,u=0;for(let F=0;F<9;F++)n.probe[F].set(0,0,0);let d=0,g=0,S=0,m=0,p=0,T=0,R=0,y=0,b=0,M=0,C=0,x=0,E=0,P=0;l.sort(P1);for(let F=0,O=l.length;F<O;F++){let I=l[F],A=I.color,z=I.intensity,W=I.distance,K=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===li?K=I.shadow.map.texture:K=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)h+=A.r*z,f+=A.g*z,u+=A.b*z;else if(I.isLightProbe){for(let q=0;q<9;q++)n.probe[q].addScaledVector(I.sh.coefficients[q],z);P++}else if(I.isSunLight){let q=t.get(I);if(q.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let j=I.shadow,tt=e.get(I);tt.shadowIntensity=j.intensity,tt.shadowBias=j.bias,tt.shadowNormalBias=j.normalBias,tt.shadowRadius=j.radius,tt.shadowMapSize.copy(j.mapSize).multiply(j.getFrameExtents()),n.sunShadow[g]=tt,n.sunShadowMap[g]=K;let St=j.getViewportCount();for(let gt=0;gt<St;gt++)n.sunShadowMatrix[S+gt]=j.getMatrix(gt),n.sunShadowCascade[S+gt]=j._cascadeData[gt];S+=St,g++}n.sun[d]=q,d++}else if(I.isDirectionalLight){let q=t.get(I);if(q.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let j=I.shadow,tt=e.get(I);tt.shadowIntensity=j.intensity,tt.shadowBias=j.bias,tt.shadowNormalBias=j.normalBias,tt.shadowRadius=j.radius,tt.shadowMapSize=j.mapSize,n.directionalShadow[m]=tt,n.directionalShadowMap[m]=K,n.directionalShadowMatrix[m]=I.shadow.matrix,b++}n.directional[m]=q,m++}else if(I.isSpotLight){let q=t.get(I);q.position.setFromMatrixPosition(I.matrixWorld),q.color.copy(A).multiplyScalar(z),q.distance=W,q.coneCos=Math.cos(I.angle),q.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),q.decay=I.decay,n.spot[T]=q;let j=I.shadow;if(I.map&&(n.spotLightMap[x]=I.map,x++,j.updateMatrices(I),I.castShadow&&E++),n.spotLightMatrix[T]=j.matrix,I.castShadow){let tt=e.get(I);tt.shadowIntensity=j.intensity,tt.shadowBias=j.bias,tt.shadowNormalBias=j.normalBias,tt.shadowRadius=j.radius,tt.shadowMapSize=j.mapSize,n.spotShadow[T]=tt,n.spotShadowMap[T]=K,C++}T++}else if(I.isRectAreaLight){let q=t.get(I);q.color.copy(A).multiplyScalar(z),q.halfWidth.set(I.width*.5,0,0),q.halfHeight.set(0,I.height*.5,0),n.rectArea[R]=q,R++}else if(I.isPointLight){let q=t.get(I);if(q.color.copy(I.color).multiplyScalar(I.intensity),q.distance=I.distance,q.decay=I.decay,I.castShadow){let j=I.shadow,tt=e.get(I);tt.shadowIntensity=j.intensity,tt.shadowBias=j.bias,tt.shadowNormalBias=j.normalBias,tt.shadowRadius=j.radius,tt.shadowMapSize=j.mapSize,tt.shadowCameraNear=j.camera.near,tt.shadowCameraFar=j.camera.far,n.pointShadow[p]=tt,n.pointShadowMap[p]=K,n.pointShadowMatrix[p]=I.shadow.matrix,M++}n.point[p]=q,p++}else if(I.isHemisphereLight){let q=t.get(I);q.skyColor.copy(I.color).multiplyScalar(z),q.groundColor.copy(I.groundColor).multiplyScalar(z),n.hemi[y]=q,y++}}R>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ut.LTC_FLOAT_1,n.rectAreaLTC2=ut.LTC_FLOAT_2):(n.rectAreaLTC1=ut.LTC_HALF_1,n.rectAreaLTC2=ut.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=f,n.ambient[2]=u;let L=n.hash;(L.sunLength!==d||L.directionalLength!==m||L.pointLength!==p||L.spotLength!==T||L.rectAreaLength!==R||L.hemiLength!==y||L.numSunShadows!==g||L.numDirectionalShadows!==b||L.numPointShadows!==M||L.numSpotShadows!==C||L.numSpotMaps!==x||L.numLightProbes!==P)&&(n.sun.length=d,n.directional.length=m,n.spot.length=T,n.rectArea.length=R,n.point.length=p,n.hemi.length=y,n.sunShadow.length=g,n.sunShadowMap.length=g,n.sunShadowMatrix.length=S,n.sunShadowCascade.length=S,n.directionalShadow.length=b,n.directionalShadowMap.length=b,n.directionalShadowMatrix.length=b,n.pointShadow.length=M,n.pointShadowMap.length=M,n.pointShadowMatrix.length=M,n.spotShadow.length=C,n.spotShadowMap.length=C,n.spotLightMatrix.length=C+x-E,n.spotLightMap.length=x,n.numSpotLightShadowsWithMaps=E,n.numLightProbes=P,L.sunLength=d,L.directionalLength=m,L.pointLength=p,L.spotLength=T,L.rectAreaLength=R,L.hemiLength=y,L.numSunShadows=g,L.numDirectionalShadows=b,L.numPointShadows=M,L.numSpotShadows=C,L.numSpotMaps=x,L.numLightProbes=P,n.version=R1++)}function c(l,h){let f=0,u=0,d=0,g=0,S=0,m=0,p=h.matrixWorldInverse;for(let T=0,R=l.length;T<R;T++){let y=l[T];if(y.isSunLight){let b=n.sun[f];b.direction.setFromMatrixPosition(y.matrixWorld),b.direction.transformDirection(p),f++}else if(y.isDirectionalLight){let b=n.directional[u];b.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(r),b.direction.transformDirection(p),u++}else if(y.isSpotLight){let b=n.spot[g];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(p),b.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(r),b.direction.transformDirection(p),g++}else if(y.isRectAreaLight){let b=n.rectArea[S];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(p),a.identity(),s.copy(y.matrixWorld),s.premultiply(p),a.extractRotation(s),b.halfWidth.set(y.width*.5,0,0),b.halfHeight.set(0,y.height*.5,0),b.halfWidth.applyMatrix4(a),b.halfHeight.applyMatrix4(a),S++}else if(y.isPointLight){let b=n.point[d];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(p),d++}else if(y.isHemisphereLight){let b=n.hemi[m];b.direction.setFromMatrixPosition(y.matrixWorld),b.direction.transformDirection(p),m++}}}return{setup:o,setupView:c,state:n}}function au(i){let t=new I1(i),e=[],n=[],r=[];function s(u){f.camera=u,e.length=0,n.length=0,r.length=0}function a(u){e.push(u)}function o(u){n.push(u)}function c(u){r.push(u)}function l(){t.setup(e)}function h(u){t.setupView(e,u)}let f={lightsArray:e,shadowsArray:n,lightProbeGridArray:r,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:s,state:f,setupLights:l,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:c}}function L1(i){let t=new WeakMap;function e(r,s=0){let a=t.get(r),o;return a===void 0?(o=new au(i),t.set(r,[o])):s>=a.length?(o=new au(i),a.push(o)):o=a[s],o}function n(){t=new WeakMap}return{get:e,dispose:n}}var D1=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,N1=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,U1=[new V(1,0,0),new V(-1,0,0),new V(0,1,0),new V(0,-1,0),new V(0,0,1),new V(0,0,-1)],F1=[new V(0,-1,0),new V(0,-1,0),new V(0,0,1),new V(0,0,-1),new V(0,-1,0),new V(0,-1,0)],ou=new ge,Jr=new V,Nl=new V;function O1(i,t,e){let n=new Ji,r=new Xt,s=new Xt,a=new me,o=new $s,c=new Ks,l={},h=e.maxTextureSize,f={[ri]:Ge,[Ge]:ri,[nn]:nn},u=new ke({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Xt},radius:{value:4}},vertexShader:D1,fragmentShader:N1}),d=u.clone();d.defines.HORIZONTAL_PASS=1;let g=new Je;g.setAttribute("position",new en(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let S=new be(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=zr;let p=this.type;this.render=function(M,C,x){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||M.length===0)return;this.type===eh&&(Dt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=zr);let E=i.getRenderTarget(),P=i.getActiveCubeFace(),L=i.getActiveMipmapLevel(),F=i.state;F.setBlending(Tn),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);let O=p!==this.type;O&&C.traverse(function(I){I.material&&(Array.isArray(I.material)?I.material.forEach(A=>A.needsUpdate=!0):I.material.needsUpdate=!0)});for(let I=0,A=M.length;I<A;I++){let z=M[I],W=z.shadow;if(W===void 0){Dt("WebGLShadowMap:",z,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;r.copy(W.mapSize);let K=W.getFrameExtents();r.multiply(K),s.copy(W.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/K.x),r.x=s.x*K.x,W.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/K.y),r.y=s.y*K.y,W.mapSize.y=s.y));let q=i.state.buffers.depth.getReversed();if(W.camera._reversedDepth=q,W.map===null||O===!0){if(W.map!==null&&(W.map.depthTexture!==null&&(W.map.depthTexture.dispose(),W.map.depthTexture=null),W.map.dispose()),this.type===ji){if(z.isPointLight){Dt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}W.map=new Xe(r.x,r.y,{format:li,type:mn,minFilter:Pe,magFilter:Pe,generateMipmaps:!1}),W.map.texture.name=z.name+".shadowMap",W.map.depthTexture=new jn(r.x,r.y,pn),W.map.depthTexture.name=z.name+".shadowMapDepth",W.map.depthTexture.format=Mn,W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=Ae,W.map.depthTexture.magFilter=Ae}else z.isPointLight?(W.map=new no(r.x),W.map.depthTexture=new Zs(r.x,dn)):(W.map=new Xe(r.x,r.y),W.map.depthTexture=new jn(r.x,r.y,dn)),W.map.depthTexture.name=z.name+".shadowMap",W.map.depthTexture.format=Mn,this.type===zr?(W.map.depthTexture.compareFunction=q?Qa:Ka,W.map.depthTexture.minFilter=Pe,W.map.depthTexture.magFilter=Pe):(W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=Ae,W.map.depthTexture.magFilter=Ae);W.camera.updateProjectionMatrix()}W.map.isWebGLCubeRenderTarget!==!0&&(W.map.width!==r.x||W.map.height!==r.y)&&W.map.setSize(r.x,r.y);let j=W.map.isWebGLCubeRenderTarget?6:W.getViewportCount();z.isPointLight!==!0&&W.updateMatrices(z,x);for(let tt=0;tt<j;tt++){let St=W.getCamera(tt);if(z.isPointLight){let gt=W.camera,$t=W.matrix,Bt=z.distance||gt.far;Bt!==gt.far&&(gt.far=Bt,gt.updateProjectionMatrix()),Jr.setFromMatrixPosition(z.matrixWorld),gt.position.copy(Jr),Nl.copy(gt.position),Nl.add(U1[tt]),gt.up.copy(F1[tt]),gt.lookAt(Nl),gt.updateMatrixWorld(),$t.makeTranslation(-Jr.x,-Jr.y,-Jr.z),ou.multiplyMatrices(gt.projectionMatrix,gt.matrixWorldInverse),W._frustum.setFromProjectionMatrix(ou,gt.coordinateSystem,gt.reversedDepth)}if(W.map.isWebGLCubeRenderTarget)i.setRenderTarget(W.map,tt),i.clear();else{tt===0&&(i.setRenderTarget(W.map),i.clear());let gt=W.getViewport(tt);a.set(s.x*gt.x,s.y*gt.y,s.x*gt.z,s.y*gt.w),F.viewport(a)}n=W.getFrustum(tt),y(C,x,St,z,this.type)}W.isPointLightShadow!==!0&&this.type===ji&&T(W,x),W.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(E,P,L)};function T(M,C){let x=t.update(S);u.defines.VSM_SAMPLES!==M.blurSamples&&(u.defines.VSM_SAMPLES=M.blurSamples,d.defines.VSM_SAMPLES=M.blurSamples,u.needsUpdate=!0,d.needsUpdate=!0),M.mapPass===null?M.mapPass=new Xe(r.x,r.y,{format:li,type:mn}):(M.mapPass.width!==M.map.width||M.mapPass.height!==M.map.height)&&M.mapPass.setSize(M.map.width,M.map.height),u.uniforms.shadow_pass.value=M.map.depthTexture,u.uniforms.resolution.value.set(M.map.width,M.map.height),u.uniforms.radius.value=M.radius,i.setRenderTarget(M.mapPass),i.clear(),i.renderBufferDirect(C,null,x,u,S,null),d.uniforms.shadow_pass.value=M.mapPass.texture,d.uniforms.resolution.value.set(M.map.width,M.map.height),d.uniforms.radius.value=M.radius,i.setRenderTarget(M.map),i.clear(),i.renderBufferDirect(C,null,x,d,S,null)}function R(M,C,x,E){let P=null,L=x.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(L!==void 0)P=L;else if(P=x.isPointLight===!0?c:o,i.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let F=P.uuid,O=C.uuid,I=l[F];I===void 0&&(I={},l[F]=I);let A=I[O];A===void 0&&(A=P.clone(),I[O]=A,C.addEventListener("dispose",b)),P=A}if(P.visible=C.visible,P.wireframe=C.wireframe,E===ji?P.side=C.shadowSide!==null?C.shadowSide:C.side:P.side=C.shadowSide!==null?C.shadowSide:f[C.side],P.alphaMap=C.alphaMap,P.alphaTest=C.alphaToCoverage===!0?.5:C.alphaTest,P.map=C.map,P.clipShadows=C.clipShadows,P.clippingPlanes=C.clippingPlanes,P.clipIntersection=C.clipIntersection,P.displacementMap=C.displacementMap,P.displacementScale=C.displacementScale,P.displacementBias=C.displacementBias,P.wireframeLinewidth=C.wireframeLinewidth,P.linewidth=C.linewidth,x.isPointLight===!0&&P.isMeshDistanceMaterial===!0){let F=i.properties.get(P);F.light=x}return P}function y(M,C,x,E,P){if(M.visible===!1)return;if(M.layers.test(C.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&P===ji)&&(!M.frustumCulled||M.intersectsFrustum(n))){M.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,M.matrixWorld);let O=t.update(M),I=M.material;if(Array.isArray(I)){let A=O.groups;for(let z=0,W=A.length;z<W;z++){let K=A[z],q=I[K.materialIndex];if(q&&q.visible){let j=R(M,q,E,P);M.onBeforeShadow(i,M,C,x,O,j,K),i.renderBufferDirect(x,null,O,j,M,K),M.onAfterShadow(i,M,C,x,O,j,K)}}}else if(I.visible){let A=R(M,I,E,P);M.onBeforeShadow(i,M,C,x,O,A,null),i.renderBufferDirect(x,null,O,A,M,null),M.onAfterShadow(i,M,C,x,O,A,null)}}let F=M.children;for(let O=0,I=F.length;O<I;O++)y(F[O],C,x,E,P)}function b(M){M.target.removeEventListener("dispose",b);for(let x in l){let E=l[x],P=M.target.uuid;P in E&&(E[P].dispose(),delete E[P])}}}function B1(i,t){function e(){let U=!1,lt=new me,Q=null,ct=new me(0,0,0,0);return{setMask:function(mt){Q!==mt&&!U&&(i.colorMask(mt,mt,mt,mt),Q=mt)},setLocked:function(mt){U=mt},setClear:function(mt,nt,Pt,Tt,ue){ue===!0&&(mt*=Tt,nt*=Tt,Pt*=Tt),lt.set(mt,nt,Pt,Tt),ct.equals(lt)===!1&&(i.clearColor(mt,nt,Pt,Tt),ct.copy(lt))},reset:function(){U=!1,Q=null,ct.set(-1,0,0,0)}}}function n(){let U=!1,lt=!1,Q=null,ct=null,mt=null;return{setReversed:function(nt){if(lt!==nt){let Pt=t.get("EXT_clip_control");nt?Pt.clipControlEXT(Pt.LOWER_LEFT_EXT,Pt.ZERO_TO_ONE_EXT):Pt.clipControlEXT(Pt.LOWER_LEFT_EXT,Pt.NEGATIVE_ONE_TO_ONE_EXT),lt=nt;let Tt=mt;mt=null,this.setClear(Tt)}},getReversed:function(){return lt},setTest:function(nt){nt?$(i.DEPTH_TEST):xt(i.DEPTH_TEST)},setMask:function(nt){Q!==nt&&!U&&(i.depthMask(nt),Q=nt)},setFunc:function(nt){if(lt&&(nt=Fh[nt]),ct!==nt){switch(nt){case Ds:i.depthFunc(i.NEVER);break;case Ns:i.depthFunc(i.ALWAYS);break;case Us:i.depthFunc(i.LESS);break;case Gi:i.depthFunc(i.LEQUAL);break;case Fs:i.depthFunc(i.EQUAL);break;case Os:i.depthFunc(i.GEQUAL);break;case Bs:i.depthFunc(i.GREATER);break;case zs:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ct=nt}},setLocked:function(nt){U=nt},setClear:function(nt){mt!==nt&&(mt=nt,lt&&(nt=1-nt),i.clearDepth(nt))},reset:function(){U=!1,Q=null,ct=null,mt=null,lt=!1}}}function r(){let U=!1,lt=null,Q=null,ct=null,mt=null,nt=null,Pt=null,Tt=null,ue=null;return{setTest:function(ne){U||(ne?$(i.STENCIL_TEST):xt(i.STENCIL_TEST))},setMask:function(ne){lt!==ne&&!U&&(i.stencilMask(ne),lt=ne)},setFunc:function(ne,an,_n){(Q!==ne||ct!==an||mt!==_n)&&(i.stencilFunc(ne,an,_n),Q=ne,ct=an,mt=_n)},setOp:function(ne,an,_n){(nt!==ne||Pt!==an||Tt!==_n)&&(i.stencilOp(ne,an,_n),nt=ne,Pt=an,Tt=_n)},setLocked:function(ne){U=ne},setClear:function(ne){ue!==ne&&(i.clearStencil(ne),ue=ne)},reset:function(){U=!1,lt=null,Q=null,ct=null,mt=null,nt=null,Pt=null,Tt=null,ue=null}}}let s=new e,a=new n,o=new r,c=new WeakMap,l=new WeakMap,h={},f={},u={},d=new WeakMap,g=[],S=null,m=!1,p=null,T=null,R=null,y=null,b=null,M=null,C=null,x=new Ht(0,0,0),E=0,P=!1,L=null,F=null,O=null,I=null,A=null,z=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),W=!1,K=0,q=i.getParameter(i.VERSION);q.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(q)[1]),W=K>=1):q.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),W=K>=2);let j=null,tt={},St=i.getParameter(i.SCISSOR_BOX),gt=i.getParameter(i.VIEWPORT),$t=new me().fromArray(St),Bt=new me().fromArray(gt);function Kt(U,lt,Q,ct){let mt=new Uint8Array(4),nt=i.createTexture();i.bindTexture(U,nt),i.texParameteri(U,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(U,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Pt=0;Pt<Q;Pt++)U===i.TEXTURE_3D||U===i.TEXTURE_2D_ARRAY?i.texImage3D(lt,0,i.RGBA,1,1,ct,0,i.RGBA,i.UNSIGNED_BYTE,mt):i.texImage2D(lt+Pt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,mt);return nt}let Z={};Z[i.TEXTURE_2D]=Kt(i.TEXTURE_2D,i.TEXTURE_2D,1),Z[i.TEXTURE_CUBE_MAP]=Kt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Z[i.TEXTURE_2D_ARRAY]=Kt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Z[i.TEXTURE_3D]=Kt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),$(i.DEPTH_TEST),a.setFunc(Gi),Et(!1),At(jo),$(i.CULL_FACE),it(Tn);function $(U){h[U]!==!0&&(i.enable(U),h[U]=!0)}function xt(U){h[U]!==!1&&(i.disable(U),h[U]=!1)}function Ut(U,lt){return u[U]!==lt?(i.bindFramebuffer(U,lt),u[U]=lt,U===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=lt),U===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=lt),!0):!1}function _t(U,lt){let Q=g,ct=!1;if(U){Q=d.get(lt),Q===void 0&&(Q=[],d.set(lt,Q));let mt=U.textures;if(Q.length!==mt.length||Q[0]!==i.COLOR_ATTACHMENT0){for(let nt=0,Pt=mt.length;nt<Pt;nt++)Q[nt]=i.COLOR_ATTACHMENT0+nt;Q.length=mt.length,ct=!0}}else Q[0]!==i.BACK&&(Q[0]=i.BACK,ct=!0);ct&&i.drawBuffers(Q)}function Ft(U){return S!==U?(i.useProgram(U),S=U,!0):!1}let _e={[yi]:i.FUNC_ADD,[ih]:i.FUNC_SUBTRACT,[rh]:i.FUNC_REVERSE_SUBTRACT};_e[sh]=i.MIN,_e[ah]=i.MAX;let Vt={[oh]:i.ZERO,[lh]:i.ONE,[ch]:i.SRC_COLOR,[il]:i.SRC_ALPHA,[mh]:i.SRC_ALPHA_SATURATE,[dh]:i.DST_COLOR,[uh]:i.DST_ALPHA,[hh]:i.ONE_MINUS_SRC_COLOR,[rl]:i.ONE_MINUS_SRC_ALPHA,[ph]:i.ONE_MINUS_DST_COLOR,[fh]:i.ONE_MINUS_DST_ALPHA,[gh]:i.CONSTANT_COLOR,[_h]:i.ONE_MINUS_CONSTANT_COLOR,[xh]:i.CONSTANT_ALPHA,[vh]:i.ONE_MINUS_CONSTANT_ALPHA};function it(U,lt,Q,ct,mt,nt,Pt,Tt,ue,ne){if(U===Tn){m===!0&&(xt(i.BLEND),m=!1);return}if(m===!1&&($(i.BLEND),m=!0),U!==nh){if(U!==p||ne!==P){if((T!==yi||b!==yi)&&(i.blendEquation(i.FUNC_ADD),T=yi,b=yi),ne)switch(U){case tr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case tl:i.blendFunc(i.ONE,i.ONE);break;case el:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case nl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Nt("WebGLState: Invalid blending: ",U);break}else switch(U){case tr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case tl:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case el:Nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case nl:Nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Nt("WebGLState: Invalid blending: ",U);break}R=null,y=null,M=null,C=null,x.set(0,0,0),E=0,p=U,P=ne}return}mt=mt||lt,nt=nt||Q,Pt=Pt||ct,(lt!==T||mt!==b)&&(i.blendEquationSeparate(_e[lt],_e[mt]),T=lt,b=mt),(Q!==R||ct!==y||nt!==M||Pt!==C)&&(i.blendFuncSeparate(Vt[Q],Vt[ct],Vt[nt],Vt[Pt]),R=Q,y=ct,M=nt,C=Pt),(Tt.equals(x)===!1||ue!==E)&&(i.blendColor(Tt.r,Tt.g,Tt.b,ue),x.copy(Tt),E=ue),p=U,P=!1}function ft(U,lt){U.side===nn?xt(i.CULL_FACE):$(i.CULL_FACE);let Q=U.side===Ge;lt&&(Q=!Q),Et(Q),U.blending===tr&&U.transparent===!1?it(Tn):it(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),a.setFunc(U.depthFunc),a.setTest(U.depthTest),a.setMask(U.depthWrite),s.setMask(U.colorWrite);let ct=U.stencilWrite;o.setTest(ct),ct&&(o.setMask(U.stencilWriteMask),o.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),o.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),jt(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?$(i.SAMPLE_ALPHA_TO_COVERAGE):xt(i.SAMPLE_ALPHA_TO_COVERAGE)}function Et(U){L!==U&&(U?i.frontFace(i.CW):i.frontFace(i.CCW),L=U)}function At(U){U!==jc?($(i.CULL_FACE),U!==F&&(U===jo?i.cullFace(i.BACK):U===th?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):xt(i.CULL_FACE),F=U}function It(U){U!==O&&(W&&i.lineWidth(U),O=U)}function jt(U,lt,Q){U?($(i.POLYGON_OFFSET_FILL),(I!==lt||A!==Q)&&(I=lt,A=Q,a.getReversed()&&(lt=-lt),i.polygonOffset(lt,Q))):xt(i.POLYGON_OFFSET_FILL)}function te(U){U?$(i.SCISSOR_TEST):xt(i.SCISSOR_TEST)}function he(U){U===void 0&&(U=i.TEXTURE0+z-1),j!==U&&(i.activeTexture(U),j=U)}function N(U,lt,Q){Q===void 0&&(j===null?Q=i.TEXTURE0+z-1:Q=j);let ct=tt[Q];ct===void 0&&(ct={type:void 0,texture:void 0},tt[Q]=ct),(ct.type!==U||ct.texture!==lt)&&(j!==Q&&(i.activeTexture(Q),j=Q),i.bindTexture(U,lt||Z[U]),ct.type=U,ct.texture=lt)}function xe(){let U=tt[j];U!==void 0&&U.type!==void 0&&(i.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function se(){try{i.compressedTexImage2D(...arguments)}catch(U){Nt("WebGLState:",U)}}function w(){try{i.compressedTexImage3D(...arguments)}catch(U){Nt("WebGLState:",U)}}function _(){try{i.texSubImage2D(...arguments)}catch(U){Nt("WebGLState:",U)}}function B(){try{i.texSubImage3D(...arguments)}catch(U){Nt("WebGLState:",U)}}function H(){try{i.compressedTexSubImage2D(...arguments)}catch(U){Nt("WebGLState:",U)}}function Y(){try{i.compressedTexSubImage3D(...arguments)}catch(U){Nt("WebGLState:",U)}}function rt(){try{i.texStorage2D(...arguments)}catch(U){Nt("WebGLState:",U)}}function st(){try{i.texStorage3D(...arguments)}catch(U){Nt("WebGLState:",U)}}function J(){try{i.texImage2D(...arguments)}catch(U){Nt("WebGLState:",U)}}function et(){try{i.texImage3D(...arguments)}catch(U){Nt("WebGLState:",U)}}function at(U){return f[U]!==void 0?f[U]:i.getParameter(U)}function Ct(U,lt){f[U]!==lt&&(i.pixelStorei(U,lt),f[U]=lt)}function ht(U){$t.equals(U)===!1&&(i.scissor(U.x,U.y,U.z,U.w),$t.copy(U))}function ot(U){Bt.equals(U)===!1&&(i.viewport(U.x,U.y,U.z,U.w),Bt.copy(U))}function Rt(U,lt){let Q=l.get(lt);Q===void 0&&(Q=new WeakMap,l.set(lt,Q));let ct=Q.get(U);ct===void 0&&(ct=i.getUniformBlockIndex(lt,U.name),Q.set(U,ct))}function Lt(U,lt){let ct=l.get(lt).get(U);c.get(lt)!==ct&&(i.uniformBlockBinding(lt,ct,U.__bindingPointIndex),c.set(lt,ct))}function zt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},f={},j=null,tt={},u={},d=new WeakMap,g=[],S=null,m=!1,p=null,T=null,R=null,y=null,b=null,M=null,C=null,x=new Ht(0,0,0),E=0,P=!1,L=null,F=null,O=null,I=null,A=null,$t.set(0,0,i.canvas.width,i.canvas.height),Bt.set(0,0,i.canvas.width,i.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:$,disable:xt,bindFramebuffer:Ut,drawBuffers:_t,useProgram:Ft,setBlending:it,setMaterial:ft,setFlipSided:Et,setCullFace:At,setLineWidth:It,setPolygonOffset:jt,setScissorTest:te,activeTexture:he,bindTexture:N,unbindTexture:xe,compressedTexImage2D:se,compressedTexImage3D:w,texImage2D:J,texImage3D:et,pixelStorei:Ct,getParameter:at,updateUBOMapping:Rt,uniformBlockBinding:Lt,texStorage2D:rt,texStorage3D:st,texSubImage2D:_,texSubImage3D:B,compressedTexSubImage2D:H,compressedTexSubImage3D:Y,scissor:ht,viewport:ot,reset:zt}}function z1(i,t,e,n,r,s,a){let o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Xt,h=new WeakMap,f=new Set,u,d=new WeakMap,g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function S(w,_){return g?new OffscreenCanvas(w,_):Er("canvas")}function m(w,_,B){let H=1,Y=se(w);if((Y.width>B||Y.height>B)&&(H=B/Math.max(Y.width,Y.height)),H<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){let rt=Math.floor(H*Y.width),st=Math.floor(H*Y.height);u===void 0&&(u=S(rt,st));let J=_?S(rt,st):u;return J.width=rt,J.height=st,J.getContext("2d").drawImage(w,0,0,rt,st),Dt("WebGLRenderer: Texture has been resized from ("+Y.width+"x"+Y.height+") to ("+rt+"x"+st+")."),J}else return"data"in w&&Dt("WebGLRenderer: Image in DataTexture is too big ("+Y.width+"x"+Y.height+")."),w;return w}function p(w){return w.generateMipmaps}function T(w){i.generateMipmap(w)}function R(w){return w.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?i.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function y(w,_,B,H,Y,rt=!1){if(w!==null){if(i[w]!==void 0)return i[w];Dt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let st;H&&(st=t.get("EXT_texture_norm16"),st||Dt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let J=_;if(_===i.RED&&(B===i.FLOAT&&(J=i.R32F),B===i.HALF_FLOAT&&(J=i.R16F),B===i.UNSIGNED_BYTE&&(J=i.R8),B===i.UNSIGNED_SHORT&&st&&(J=st.R16_EXT),B===i.SHORT&&st&&(J=st.R16_SNORM_EXT)),_===i.RED_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.R8UI),B===i.UNSIGNED_SHORT&&(J=i.R16UI),B===i.UNSIGNED_INT&&(J=i.R32UI),B===i.BYTE&&(J=i.R8I),B===i.SHORT&&(J=i.R16I),B===i.INT&&(J=i.R32I)),_===i.RG&&(B===i.FLOAT&&(J=i.RG32F),B===i.HALF_FLOAT&&(J=i.RG16F),B===i.UNSIGNED_BYTE&&(J=i.RG8),B===i.UNSIGNED_SHORT&&st&&(J=st.RG16_EXT),B===i.SHORT&&st&&(J=st.RG16_SNORM_EXT)),_===i.RG_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RG8UI),B===i.UNSIGNED_SHORT&&(J=i.RG16UI),B===i.UNSIGNED_INT&&(J=i.RG32UI),B===i.BYTE&&(J=i.RG8I),B===i.SHORT&&(J=i.RG16I),B===i.INT&&(J=i.RG32I)),_===i.RGB_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RGB8UI),B===i.UNSIGNED_SHORT&&(J=i.RGB16UI),B===i.UNSIGNED_INT&&(J=i.RGB32UI),B===i.BYTE&&(J=i.RGB8I),B===i.SHORT&&(J=i.RGB16I),B===i.INT&&(J=i.RGB32I)),_===i.RGBA_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RGBA8UI),B===i.UNSIGNED_SHORT&&(J=i.RGBA16UI),B===i.UNSIGNED_INT&&(J=i.RGBA32UI),B===i.BYTE&&(J=i.RGBA8I),B===i.SHORT&&(J=i.RGBA16I),B===i.INT&&(J=i.RGBA32I)),_===i.RGB&&(B===i.UNSIGNED_SHORT&&st&&(J=st.RGB16_EXT),B===i.SHORT&&st&&(J=st.RGB16_SNORM_EXT),B===i.UNSIGNED_INT_5_9_9_9_REV&&(J=i.RGB9_E5),B===i.UNSIGNED_INT_10F_11F_11F_REV&&(J=i.R11F_G11F_B10F)),_===i.RGBA){let et=rt?br:Yt.getTransfer(Y);B===i.FLOAT&&(J=i.RGBA32F),B===i.HALF_FLOAT&&(J=i.RGBA16F),B===i.UNSIGNED_BYTE&&(J=et===re?i.SRGB8_ALPHA8:i.RGBA8),B===i.UNSIGNED_SHORT&&st&&(J=st.RGBA16_EXT),B===i.SHORT&&st&&(J=st.RGBA16_SNORM_EXT),B===i.UNSIGNED_SHORT_4_4_4_4&&(J=i.RGBA4),B===i.UNSIGNED_SHORT_5_5_5_1&&(J=i.RGB5_A1)}return(J===i.R16F||J===i.R32F||J===i.RG16F||J===i.RG32F||J===i.RGBA16F||J===i.RGBA32F)&&t.get("EXT_color_buffer_float"),J}function b(w,_){let B;return w?_===null||_===dn||_===nr?B=i.DEPTH24_STENCIL8:_===pn?B=i.DEPTH32F_STENCIL8:_===er&&(B=i.DEPTH24_STENCIL8,Dt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===dn||_===nr?B=i.DEPTH_COMPONENT24:_===pn?B=i.DEPTH_COMPONENT32F:_===er&&(B=i.DEPTH_COMPONENT16),B}function M(w,_){return p(w)===!0||w.isFramebufferTexture&&w.minFilter!==Ae&&w.minFilter!==Pe?Math.log2(Math.max(_.width,_.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?_.mipmaps.length:1}function C(w){let _=w.target;_.removeEventListener("dispose",C),E(_),_.isVideoTexture&&h.delete(_),_.isHTMLTexture&&f.delete(_)}function x(w){let _=w.target;_.removeEventListener("dispose",x),L(_)}function E(w){let _=n.get(w);if(_.__webglInit===void 0)return;let B=w.source,H=d.get(B);if(H){let Y=H[_.__cacheKey];Y.usedTimes--,Y.usedTimes===0&&P(w),Object.keys(H).length===0&&d.delete(B)}n.remove(w)}function P(w){let _=n.get(w);i.deleteTexture(_.__webglTexture);let B=w.source,H=d.get(B);delete H[_.__cacheKey],a.memory.textures--}function L(w){let _=n.get(w);if(w.depthTexture&&(w.depthTexture.dispose(),n.remove(w.depthTexture)),w.isWebGLCubeRenderTarget)for(let H=0;H<6;H++){if(Array.isArray(_.__webglFramebuffer[H]))for(let Y=0;Y<_.__webglFramebuffer[H].length;Y++)i.deleteFramebuffer(_.__webglFramebuffer[H][Y]);else i.deleteFramebuffer(_.__webglFramebuffer[H]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[H])}else{if(Array.isArray(_.__webglFramebuffer))for(let H=0;H<_.__webglFramebuffer.length;H++)i.deleteFramebuffer(_.__webglFramebuffer[H]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let H=0;H<_.__webglColorRenderbuffer.length;H++)_.__webglColorRenderbuffer[H]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[H]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let B=w.textures;for(let H=0,Y=B.length;H<Y;H++){let rt=n.get(B[H]);rt.__webglTexture&&(i.deleteTexture(rt.__webglTexture),a.memory.textures--),n.remove(B[H])}n.remove(w)}let F=0;function O(){F=0}function I(){return F}function A(w){F=w}function z(){let w=F;return w>=r.maxTextures&&Dt("WebGLTextures: Trying to use "+(w+1)+" texture units while this GPU supports only "+r.maxTextures),F+=1,w}function W(w){let _=[];return _.push(w.wrapS),_.push(w.wrapT),_.push(w.wrapR||0),_.push(w.magFilter),_.push(w.minFilter),_.push(w.anisotropy),_.push(w.internalFormat),_.push(w.format),_.push(w.type),_.push(w.generateMipmaps),_.push(w.premultiplyAlpha),_.push(w.flipY),_.push(w.unpackAlignment),_.push(w.colorSpace),_.join()}function K(w,_){let B=n.get(w);if(w.isVideoTexture&&N(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&B.__version!==w.version){let H=w.image;if(H===null)Dt("WebGLRenderer: Texture marked for update but no image data found.");else if(H.complete===!1)Dt("WebGLRenderer: Texture marked for update but image is incomplete");else{xt(B,w,_);return}}else w.isExternalTexture&&(B.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,B.__webglTexture,i.TEXTURE0+_)}function q(w,_){let B=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&B.__version!==w.version){xt(B,w,_);return}else w.isExternalTexture&&(B.__webglTexture=w.sourceTexture?w.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,B.__webglTexture,i.TEXTURE0+_)}function j(w,_){let B=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&B.__version!==w.version){xt(B,w,_);return}e.bindTexture(i.TEXTURE_3D,B.__webglTexture,i.TEXTURE0+_)}function tt(w,_){let B=n.get(w);if(w.isCubeDepthTexture!==!0&&w.version>0&&B.__version!==w.version){Ut(B,w,_);return}e.bindTexture(i.TEXTURE_CUBE_MAP,B.__webglTexture,i.TEXTURE0+_)}let St={[Vs]:i.REPEAT,[yn]:i.CLAMP_TO_EDGE,[ks]:i.MIRRORED_REPEAT},gt={[Ae]:i.NEAREST,[Mh]:i.NEAREST_MIPMAP_NEAREST,[kr]:i.NEAREST_MIPMAP_LINEAR,[Pe]:i.LINEAR,[da]:i.LINEAR_MIPMAP_NEAREST,[ai]:i.LINEAR_MIPMAP_LINEAR},$t={[wh]:i.NEVER,[Ih]:i.ALWAYS,[Ah]:i.LESS,[Ka]:i.LEQUAL,[Ch]:i.EQUAL,[Qa]:i.GEQUAL,[Rh]:i.GREATER,[Ph]:i.NOTEQUAL};function Bt(w,_){if(_.type===pn&&t.has("OES_texture_float_linear")===!1&&(_.magFilter===Pe||_.magFilter===da||_.magFilter===kr||_.magFilter===ai||_.minFilter===Pe||_.minFilter===da||_.minFilter===kr||_.minFilter===ai)&&Dt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(w,i.TEXTURE_WRAP_S,St[_.wrapS]),i.texParameteri(w,i.TEXTURE_WRAP_T,St[_.wrapT]),(w===i.TEXTURE_3D||w===i.TEXTURE_2D_ARRAY)&&i.texParameteri(w,i.TEXTURE_WRAP_R,St[_.wrapR]),i.texParameteri(w,i.TEXTURE_MAG_FILTER,gt[_.magFilter]),i.texParameteri(w,i.TEXTURE_MIN_FILTER,gt[_.minFilter]),_.compareFunction&&(i.texParameteri(w,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(w,i.TEXTURE_COMPARE_FUNC,$t[_.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Ae||_.minFilter!==kr&&_.minFilter!==ai||_.type===pn&&t.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let B=t.get("EXT_texture_filter_anisotropic");i.texParameterf(w,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,r.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Kt(w,_){let B=!1;w.__webglInit===void 0&&(w.__webglInit=!0,_.addEventListener("dispose",C));let H=_.source,Y=d.get(H);Y===void 0&&(Y={},d.set(H,Y));let rt=W(_);if(rt!==w.__cacheKey){Y[rt]===void 0&&(Y[rt]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,B=!0),Y[rt].usedTimes++;let st=Y[w.__cacheKey];st!==void 0&&(Y[w.__cacheKey].usedTimes--,st.usedTimes===0&&P(_)),w.__cacheKey=rt,w.__webglTexture=Y[rt].texture}return B}function Z(w,_,B){return Math.floor(Math.floor(w/B)/_)}function $(w,_,B,H){let rt=w.updateRanges;if(rt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,B,H,_.data);else{rt.sort((Ct,ht)=>Ct.start-ht.start);let st=0;for(let Ct=1;Ct<rt.length;Ct++){let ht=rt[st],ot=rt[Ct],Rt=ht.start+ht.count,Lt=Z(ot.start,_.width,4),zt=Z(ht.start,_.width,4);ot.start<=Rt+1&&Lt===zt&&Z(ot.start+ot.count-1,_.width,4)===Lt?ht.count=Math.max(ht.count,ot.start+ot.count-ht.start):(++st,rt[st]=ot)}rt.length=st+1;let J=e.getParameter(i.UNPACK_ROW_LENGTH),et=e.getParameter(i.UNPACK_SKIP_PIXELS),at=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let Ct=0,ht=rt.length;Ct<ht;Ct++){let ot=rt[Ct],Rt=Math.floor(ot.start/4),Lt=Math.ceil(ot.count/4),zt=Rt%_.width,U=Math.floor(Rt/_.width),lt=Lt,Q=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,zt),e.pixelStorei(i.UNPACK_SKIP_ROWS,U),e.texSubImage2D(i.TEXTURE_2D,0,zt,U,lt,Q,B,H,_.data)}w.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,J),e.pixelStorei(i.UNPACK_SKIP_PIXELS,et),e.pixelStorei(i.UNPACK_SKIP_ROWS,at)}}function xt(w,_,B){let H=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(H=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(H=i.TEXTURE_3D);let Y=Kt(w,_),rt=_.source;e.bindTexture(H,w.__webglTexture,i.TEXTURE0+B);let st=n.get(rt);if(rt.version!==st.__version||Y===!0){if(e.activeTexture(i.TEXTURE0+B),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){let Q=Yt.getPrimaries(Yt.workingColorSpace),ct=_.colorSpace===Bn?null:Yt.getPrimaries(_.colorSpace),mt=_.colorSpace===Bn||Q===ct?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,mt)}e.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment);let et=m(_.image,!1,r.maxTextureSize);et=xe(_,et);let at=s.convert(_.format,_.colorSpace),Ct=s.convert(_.type),ht=y(_.internalFormat,at,Ct,_.normalized,_.colorSpace,_.isVideoTexture);Bt(H,_);let ot,Rt=_.mipmaps,Lt=_.isVideoTexture!==!0,zt=st.__version===void 0||Y===!0,U=rt.dataReady,lt=M(_,et);if(_.isDepthTexture)ht=b(_.format===oi,_.type),zt&&(Lt?e.texStorage2D(i.TEXTURE_2D,1,ht,et.width,et.height):e.texImage2D(i.TEXTURE_2D,0,ht,et.width,et.height,0,at,Ct,null));else if(_.isDataTexture)if(Rt.length>0){Lt&&zt&&e.texStorage2D(i.TEXTURE_2D,lt,ht,Rt[0].width,Rt[0].height);for(let Q=0,ct=Rt.length;Q<ct;Q++)ot=Rt[Q],Lt?U&&e.texSubImage2D(i.TEXTURE_2D,Q,0,0,ot.width,ot.height,at,Ct,ot.data):e.texImage2D(i.TEXTURE_2D,Q,ht,ot.width,ot.height,0,at,Ct,ot.data);_.generateMipmaps=!1}else Lt?(zt&&e.texStorage2D(i.TEXTURE_2D,lt,ht,et.width,et.height),U&&$(_,et,at,Ct)):e.texImage2D(i.TEXTURE_2D,0,ht,et.width,et.height,0,at,Ct,et.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Lt&&zt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,lt,ht,Rt[0].width,Rt[0].height,et.depth);for(let Q=0,ct=Rt.length;Q<ct;Q++)if(ot=Rt[Q],_.format!==rn)if(at!==null)if(Lt){if(U)if(_.layerUpdates.size>0){let mt=Cl(ot.width,ot.height,_.format,_.type);for(let nt of _.layerUpdates){let Pt=ot.data.subarray(nt*mt/ot.data.BYTES_PER_ELEMENT,(nt+1)*mt/ot.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,nt,ot.width,ot.height,1,at,Pt)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,0,ot.width,ot.height,et.depth,at,ot.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,Q,ht,ot.width,ot.height,et.depth,0,ot.data,0,0);else Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Lt?U&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,0,ot.width,ot.height,et.depth,at,Ct,ot.data):e.texImage3D(i.TEXTURE_2D_ARRAY,Q,ht,ot.width,ot.height,et.depth,0,at,Ct,ot.data);_.layerUpdates.size>0&&_.clearLayerUpdates()}else{Lt&&zt&&e.texStorage2D(i.TEXTURE_2D,lt,ht,Rt[0].width,Rt[0].height);for(let Q=0,ct=Rt.length;Q<ct;Q++)ot=Rt[Q],_.format!==rn?at!==null?Lt?U&&e.compressedTexSubImage2D(i.TEXTURE_2D,Q,0,0,ot.width,ot.height,at,ot.data):e.compressedTexImage2D(i.TEXTURE_2D,Q,ht,ot.width,ot.height,0,ot.data):Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Lt?U&&e.texSubImage2D(i.TEXTURE_2D,Q,0,0,ot.width,ot.height,at,Ct,ot.data):e.texImage2D(i.TEXTURE_2D,Q,ht,ot.width,ot.height,0,at,Ct,ot.data)}else if(_.isDataArrayTexture)if(Lt){if(zt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,lt,ht,et.width,et.height,et.depth),U)if(_.layerUpdates.size>0){let Q=Cl(et.width,et.height,_.format,_.type);for(let ct of _.layerUpdates){let mt=et.data.subarray(ct*Q/et.data.BYTES_PER_ELEMENT,(ct+1)*Q/et.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ct,et.width,et.height,1,at,Ct,mt)}_.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,et.width,et.height,et.depth,at,Ct,et.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,ht,et.width,et.height,et.depth,0,at,Ct,et.data);else if(_.isData3DTexture)Lt?(zt&&e.texStorage3D(i.TEXTURE_3D,lt,ht,et.width,et.height,et.depth),U&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,et.width,et.height,et.depth,at,Ct,et.data)):e.texImage3D(i.TEXTURE_3D,0,ht,et.width,et.height,et.depth,0,at,Ct,et.data);else if(_.isFramebufferTexture){if(zt)if(Lt)e.texStorage2D(i.TEXTURE_2D,lt,ht,et.width,et.height);else{let Q=et.width,ct=et.height;for(let mt=0;mt<lt;mt++)e.texImage2D(i.TEXTURE_2D,mt,ht,Q,ct,0,at,Ct,null),Q>>=1,ct>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in i){let Q=i.canvas;if(Q.hasAttribute("layoutsubtree")||Q.setAttribute("layoutsubtree","true"),et.parentNode!==Q){Q.appendChild(et),f.add(_),Q.onpaint=ct=>{let mt=ct.changedElements;for(let nt of f)mt.includes(nt.image)&&(nt.needsUpdate=!0)},Q.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,et);else{let mt=i.RGBA,nt=i.RGBA,Pt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,mt,nt,Pt,et)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Rt.length>0){if(Lt&&zt){let Q=se(Rt[0]);e.texStorage2D(i.TEXTURE_2D,lt,ht,Q.width,Q.height)}for(let Q=0,ct=Rt.length;Q<ct;Q++)ot=Rt[Q],Lt?U&&e.texSubImage2D(i.TEXTURE_2D,Q,0,0,at,Ct,ot):e.texImage2D(i.TEXTURE_2D,Q,ht,at,Ct,ot);_.generateMipmaps=!1}else if(Lt){if(zt){let Q=se(et);e.texStorage2D(i.TEXTURE_2D,lt,ht,Q.width,Q.height)}U&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,at,Ct,et)}else e.texImage2D(i.TEXTURE_2D,0,ht,at,Ct,et);p(_)&&T(H),st.__version=rt.version,_.onUpdate&&_.onUpdate(_)}w.__version=_.version}function Ut(w,_,B){if(_.image.length!==6)return;let H=Kt(w,_),Y=_.source;e.bindTexture(i.TEXTURE_CUBE_MAP,w.__webglTexture,i.TEXTURE0+B);let rt=n.get(Y);if(Y.version!==rt.__version||H===!0){e.activeTexture(i.TEXTURE0+B);let st=Yt.getPrimaries(Yt.workingColorSpace),J=_.colorSpace===Bn?null:Yt.getPrimaries(_.colorSpace),et=_.colorSpace===Bn||st===J?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,et);let at=_.isCompressedTexture||_.image[0].isCompressedTexture,Ct=_.image[0]&&_.image[0].isDataTexture,ht=[];for(let nt=0;nt<6;nt++)!at&&!Ct?ht[nt]=m(_.image[nt],!0,r.maxCubemapSize):ht[nt]=Ct?_.image[nt].image:_.image[nt],ht[nt]=xe(_,ht[nt]);let ot=ht[0],Rt=s.convert(_.format,_.colorSpace),Lt=s.convert(_.type),zt=y(_.internalFormat,Rt,Lt,_.normalized,_.colorSpace),U=_.isVideoTexture!==!0,lt=rt.__version===void 0||H===!0,Q=Y.dataReady,ct=M(_,ot);Bt(i.TEXTURE_CUBE_MAP,_);let mt;if(at){U&&lt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,ct,zt,ot.width,ot.height);for(let nt=0;nt<6;nt++){mt=ht[nt].mipmaps;for(let Pt=0;Pt<mt.length;Pt++){let Tt=mt[Pt];_.format!==rn?Rt!==null?U?Q&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Pt,0,0,Tt.width,Tt.height,Rt,Tt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Pt,zt,Tt.width,Tt.height,0,Tt.data):Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Pt,0,0,Tt.width,Tt.height,Rt,Lt,Tt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Pt,zt,Tt.width,Tt.height,0,Rt,Lt,Tt.data)}}}else{if(mt=_.mipmaps,U&&lt){mt.length>0&&ct++;let nt=se(ht[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,ct,zt,nt.width,nt.height)}for(let nt=0;nt<6;nt++)if(Ct){U?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,ht[nt].width,ht[nt].height,Rt,Lt,ht[nt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,zt,ht[nt].width,ht[nt].height,0,Rt,Lt,ht[nt].data);for(let Pt=0;Pt<mt.length;Pt++){let ue=mt[Pt].image[nt].image;U?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Pt+1,0,0,ue.width,ue.height,Rt,Lt,ue.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Pt+1,zt,ue.width,ue.height,0,Rt,Lt,ue.data)}}else{U?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,0,0,Rt,Lt,ht[nt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,0,zt,Rt,Lt,ht[nt]);for(let Pt=0;Pt<mt.length;Pt++){let Tt=mt[Pt];U?Q&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Pt+1,0,0,Rt,Lt,Tt.image[nt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Pt+1,zt,Rt,Lt,Tt.image[nt])}}}p(_)&&T(i.TEXTURE_CUBE_MAP),rt.__version=Y.version,_.onUpdate&&_.onUpdate(_)}w.__version=_.version}function _t(w,_,B,H,Y,rt){let st=s.convert(B.format,B.colorSpace),J=s.convert(B.type),et=y(B.internalFormat,st,J,B.normalized,B.colorSpace),at=n.get(_),Ct=n.get(B);if(Ct.__renderTarget=_,!at.__hasExternalTextures){let ht=Math.max(1,_.width>>rt),ot=Math.max(1,_.height>>rt);Y===i.TEXTURE_3D||Y===i.TEXTURE_2D_ARRAY?e.texImage3D(Y,rt,et,ht,ot,_.depth,0,st,J,null):e.texImage2D(Y,rt,et,ht,ot,0,st,J,null)}e.bindFramebuffer(i.FRAMEBUFFER,w),he(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,H,Y,Ct.__webglTexture,0,te(_)):(Y===i.TEXTURE_2D||Y>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Y<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,H,Y,Ct.__webglTexture,rt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Ft(w,_,B){if(i.bindRenderbuffer(i.RENDERBUFFER,w),_.depthBuffer){let H=_.depthTexture,Y=H&&H.isDepthTexture?H.type:null,rt=b(_.stencilBuffer,Y),st=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;he(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,te(_),rt,_.width,_.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,te(_),rt,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,rt,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,st,i.RENDERBUFFER,w)}else{let H=_.textures;for(let Y=0;Y<H.length;Y++){let rt=H[Y],st=s.convert(rt.format,rt.colorSpace),J=s.convert(rt.type),et=y(rt.internalFormat,st,J,rt.normalized,rt.colorSpace);he(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,te(_),et,_.width,_.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,te(_),et,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,et,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function _e(w,_,B){let H=_.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,w),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Y=n.get(_.depthTexture);if(Y.__renderTarget=_,(!Y.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),H){if(Y.__webglInit===void 0&&(Y.__webglInit=!0,_.depthTexture.addEventListener("dispose",C)),Y.__webglTexture===void 0){Y.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),Bt(i.TEXTURE_CUBE_MAP,_.depthTexture);let at=s.convert(_.depthTexture.format),Ct=s.convert(_.depthTexture.type),ht;_.depthTexture.format===Mn?ht=i.DEPTH_COMPONENT24:_.depthTexture.format===oi&&(ht=i.DEPTH24_STENCIL8);for(let ot=0;ot<6;ot++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ot,0,ht,_.width,_.height,0,at,Ct,null)}}else K(_.depthTexture,0);let rt=Y.__webglTexture,st=te(_),J=H?i.TEXTURE_CUBE_MAP_POSITIVE_X+B:i.TEXTURE_2D,et=_.depthTexture.format===oi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===Mn)he(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,et,J,rt,0,st):i.framebufferTexture2D(i.FRAMEBUFFER,et,J,rt,0);else if(_.depthTexture.format===oi)he(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,et,J,rt,0,st):i.framebufferTexture2D(i.FRAMEBUFFER,et,J,rt,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Vt(w){let _=n.get(w),B=w.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==w.depthTexture){let H=w.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),H){let Y=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,H.removeEventListener("dispose",Y)};H.addEventListener("dispose",Y),_.__depthDisposeCallback=Y}_.__boundDepthTexture=H}if(w.depthTexture&&!_.__autoAllocateDepthBuffer)if(B)for(let H=0;H<6;H++)_e(_.__webglFramebuffer[H],w,H);else{let H=w.texture.mipmaps;H&&H.length>0?_e(_.__webglFramebuffer[0],w,0):_e(_.__webglFramebuffer,w,0)}else if(B){_.__webglDepthbuffer=[];for(let H=0;H<6;H++)if(e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[H]),_.__webglDepthbuffer[H]===void 0)_.__webglDepthbuffer[H]=i.createRenderbuffer(),Ft(_.__webglDepthbuffer[H],w,!1);else{let Y=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=_.__webglDepthbuffer[H];i.bindRenderbuffer(i.RENDERBUFFER,rt),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,rt)}}else{let H=w.texture.mipmaps;if(H&&H.length>0?e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),Ft(_.__webglDepthbuffer,w,!1);else{let Y=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,rt),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,rt)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function it(w,_,B){let H=n.get(w);_!==void 0&&_t(H.__webglFramebuffer,w,w.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),B!==void 0&&Vt(w)}function ft(w){let _=w.texture,B=n.get(w),H=n.get(_);w.addEventListener("dispose",x);let Y=w.textures,rt=w.isWebGLCubeRenderTarget===!0,st=Y.length>1;if(st||(H.__webglTexture===void 0&&(H.__webglTexture=i.createTexture()),H.__version=_.version,a.memory.textures++),rt){B.__webglFramebuffer=[];for(let J=0;J<6;J++)if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer[J]=[];for(let et=0;et<_.mipmaps.length;et++)B.__webglFramebuffer[J][et]=i.createFramebuffer()}else B.__webglFramebuffer[J]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer=[];for(let J=0;J<_.mipmaps.length;J++)B.__webglFramebuffer[J]=i.createFramebuffer()}else B.__webglFramebuffer=i.createFramebuffer();if(st)for(let J=0,et=Y.length;J<et;J++){let at=n.get(Y[J]);at.__webglTexture===void 0&&(at.__webglTexture=i.createTexture(),a.memory.textures++)}if(w.samples>0&&he(w)===!1){B.__webglMultisampledFramebuffer=i.createFramebuffer(),B.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let J=0;J<Y.length;J++){let et=Y[J];B.__webglColorRenderbuffer[J]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,B.__webglColorRenderbuffer[J]);let at=s.convert(et.format,et.colorSpace),Ct=s.convert(et.type),ht=y(et.internalFormat,at,Ct,et.normalized,et.colorSpace,w.isXRRenderTarget===!0),ot=te(w);i.renderbufferStorageMultisample(i.RENDERBUFFER,ot,ht,w.width,w.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+J,i.RENDERBUFFER,B.__webglColorRenderbuffer[J])}i.bindRenderbuffer(i.RENDERBUFFER,null),w.depthBuffer&&(B.__webglDepthRenderbuffer=i.createRenderbuffer(),Ft(B.__webglDepthRenderbuffer,w,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(rt){e.bindTexture(i.TEXTURE_CUBE_MAP,H.__webglTexture),Bt(i.TEXTURE_CUBE_MAP,_);for(let J=0;J<6;J++)if(_.mipmaps&&_.mipmaps.length>0)for(let et=0;et<_.mipmaps.length;et++)_t(B.__webglFramebuffer[J][et],w,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,et);else _t(B.__webglFramebuffer[J],w,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0);p(_)&&T(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(st){for(let J=0,et=Y.length;J<et;J++){let at=Y[J],Ct=n.get(at),ht=i.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(ht=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(ht,Ct.__webglTexture),Bt(ht,at),_t(B.__webglFramebuffer,w,at,i.COLOR_ATTACHMENT0+J,ht,0),p(at)&&T(ht)}e.unbindTexture()}else{let J=i.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(J=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(J,H.__webglTexture),Bt(J,_),_.mipmaps&&_.mipmaps.length>0)for(let et=0;et<_.mipmaps.length;et++)_t(B.__webglFramebuffer[et],w,_,i.COLOR_ATTACHMENT0,J,et);else _t(B.__webglFramebuffer,w,_,i.COLOR_ATTACHMENT0,J,0);p(_)&&T(J),e.unbindTexture()}w.depthBuffer&&Vt(w)}function Et(w){let _=w.textures;for(let B=0,H=_.length;B<H;B++){let Y=_[B];if(p(Y)){let rt=R(w),st=n.get(Y).__webglTexture;e.bindTexture(rt,st),T(rt),e.unbindTexture()}}}let At=[],It=[];function jt(w){if(w.samples>0){if(he(w)===!1){let _=w.textures,B=w.width,H=w.height,Y=i.COLOR_BUFFER_BIT,rt=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,st=n.get(w),J=_.length>1;if(J)for(let at=0;at<_.length;at++)e.bindFramebuffer(i.FRAMEBUFFER,st.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,st.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,st.__webglMultisampledFramebuffer);let et=w.texture.mipmaps;et&&et.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglFramebuffer);for(let at=0;at<_.length;at++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(Y|=i.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(Y|=i.STENCIL_BUFFER_BIT)),J){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,st.__webglColorRenderbuffer[at]);let Ct=n.get(_[at]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ct,0)}i.blitFramebuffer(0,0,B,H,0,0,B,H,Y,i.NEAREST),c===!0&&(At.length=0,It.length=0,At.push(i.COLOR_ATTACHMENT0+at),w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&(At.push(rt),It.push(rt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,It)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,At))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),J)for(let at=0;at<_.length;at++){e.bindFramebuffer(i.FRAMEBUFFER,st.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.RENDERBUFFER,st.__webglColorRenderbuffer[at]);let Ct=n.get(_[at]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,st.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+at,i.TEXTURE_2D,Ct,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&c){let _=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function te(w){return Math.min(r.maxSamples,w.samples)}function he(w){let _=n.get(w);return w.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function N(w){let _=a.render.frame;h.get(w)!==_&&(h.set(w,_),w.update())}function xe(w,_){let B=w.colorSpace,H=w.format,Y=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||B!==Mr&&B!==Bn&&(Yt.getTransfer(B)===re?(H!==rn||Y!==qe)&&Dt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Nt("WebGLTextures: Unsupported texture color space:",B)),_}function se(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(l.width=w.naturalWidth||w.width,l.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(l.width=w.displayWidth,l.height=w.displayHeight):(l.width=w.width,l.height=w.height),l}this.allocateTextureUnit=z,this.resetTextureUnits=O,this.getTextureUnits=I,this.setTextureUnits=A,this.setTexture2D=K,this.setTexture2DArray=q,this.setTexture3D=j,this.setTextureCube=tt,this.rebindTextures=it,this.setupRenderTarget=ft,this.updateRenderTargetMipmap=Et,this.updateMultisampleRenderTarget=jt,this.setupDepthRenderbuffer=Vt,this.setupFrameBufferTexture=_t,this.useMultisampledRTT=he,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function V1(i,t){function e(n,r=Bn){let s,a=Yt.getTransfer(r);if(n===qe)return i.UNSIGNED_BYTE;if(n===ma)return i.UNSIGNED_SHORT_4_4_4_4;if(n===ga)return i.UNSIGNED_SHORT_5_5_5_1;if(n===gl)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===_l)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===pl)return i.BYTE;if(n===ml)return i.SHORT;if(n===er)return i.UNSIGNED_SHORT;if(n===pa)return i.INT;if(n===dn)return i.UNSIGNED_INT;if(n===pn)return i.FLOAT;if(n===mn)return i.HALF_FLOAT;if(n===xl)return i.ALPHA;if(n===vl)return i.RGB;if(n===rn)return i.RGBA;if(n===Mn)return i.DEPTH_COMPONENT;if(n===oi)return i.DEPTH_STENCIL;if(n===yl)return i.RED;if(n===_a)return i.RED_INTEGER;if(n===li)return i.RG;if(n===xa)return i.RG_INTEGER;if(n===va)return i.RGBA_INTEGER;if(n===Gr||n===Hr||n===Wr||n===Xr)if(a===re)if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===Gr)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Hr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Wr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Xr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===Gr)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Hr)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Wr)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Xr)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ya||n===Sa||n===Ma||n===ba)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===ya)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Sa)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Ma)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ba)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ea||n===Ta||n===wa||n===Aa||n===Ca||n===qr||n===Ra)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(n===Ea||n===Ta)return a===re?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===wa)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(n===Aa)return s.COMPRESSED_R11_EAC;if(n===Ca)return s.COMPRESSED_SIGNED_R11_EAC;if(n===qr)return s.COMPRESSED_RG11_EAC;if(n===Ra)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Pa||n===Ia||n===La||n===Da||n===Na||n===Ua||n===Fa||n===Oa||n===Ba||n===za||n===Va||n===ka||n===Ga||n===Ha)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(n===Pa)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ia)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===La)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Da)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Na)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Ua)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Fa)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Oa)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Ba)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===za)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Va)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ka)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Ga)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ha)return a===re?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Wa||n===Xa||n===qa)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(n===Wa)return a===re?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Xa)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===qa)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Ya||n===Za||n===Yr||n===Ja)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(n===Ya)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Za)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Yr)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Ja)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===nr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}var k1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,G1=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Gl=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){let n=new Lr(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){let e=t.cameras[0].viewport,n=new ke({vertexShader:k1,fragmentShader:G1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new be(new xi(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Hl=class extends bn{constructor(t,e){super();let n=this,r=null,s=1,a=null,o="local-floor",c=1,l=null,h=null,f=null,u=null,d=null,g=null,S=typeof XRWebGLBinding<"u",m=new Gl,p={},T=e.getContextAttributes(),R=null,y=null,b=[],M=[],C=new Xt,x=null,E=null,P=new We;P.viewport=new me;let L=new We;L.viewport=new me;let F=[P,L],O=new ha,I=null,A=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let $=b[Z];return $===void 0&&($=new Yi,b[Z]=$),$.getTargetRaySpace()},this.getControllerGrip=function(Z){let $=b[Z];return $===void 0&&($=new Yi,b[Z]=$),$.getGripSpace()},this.getHand=function(Z){let $=b[Z];return $===void 0&&($=new Yi,b[Z]=$),$.getHandSpace()};function z(Z){let $=M.indexOf(Z.inputSource);if($===-1)return;let xt=b[$];xt!==void 0&&(xt.update(Z.inputSource,Z.frame,l||a),xt.dispatchEvent({type:Z.type,data:Z.inputSource}))}function W(){r.removeEventListener("select",z),r.removeEventListener("selectstart",z),r.removeEventListener("selectend",z),r.removeEventListener("squeeze",z),r.removeEventListener("squeezestart",z),r.removeEventListener("squeezeend",z),r.removeEventListener("end",W),r.removeEventListener("inputsourceschange",K);for(let Z=0;Z<b.length;Z++){let $=M[Z];$!==null&&(M[Z]=null,b[Z].disconnect($))}I=null,A=null,m.reset();for(let Z in p)delete p[Z];if(t.setRenderTarget(R),d=null,u=null,f=null,r=null,y=null,Kt.stop(),n.isPresenting=!1,t.setPixelRatio(x),t.setSize(C.width,C.height,!1),E!==null){let Z=E.camera;Z.fov=E.fov,Z.zoom=E.zoom,Z.updateProjectionMatrix(),E=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){s=Z,n.isPresenting===!0&&Dt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){o=Z,n.isPresenting===!0&&Dt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(Z){l=Z},this.getBaseLayer=function(){return u!==null?u:d},this.getBinding=function(){return f===null&&S&&(f=new XRWebGLBinding(r,e)),f},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(Z){if(r=Z,r!==null){if(R=t.getRenderTarget(),r.addEventListener("select",z),r.addEventListener("selectstart",z),r.addEventListener("selectend",z),r.addEventListener("squeeze",z),r.addEventListener("squeezestart",z),r.addEventListener("squeezeend",z),r.addEventListener("end",W),r.addEventListener("inputsourceschange",K),T.xrCompatible!==!0&&await e.makeXRCompatible(),x=t.getPixelRatio(),t.getSize(C),S&&"createProjectionLayer"in XRWebGLBinding.prototype){let xt=null,Ut=null,_t=null;T.depth&&(_t=T.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,xt=T.stencil?oi:Mn,Ut=T.stencil?nr:dn);let Ft={colorFormat:e.RGBA8,depthFormat:_t,scaleFactor:s};f=this.getBinding(),u=f.createProjectionLayer(Ft),r.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),y=new Xe(u.textureWidth,u.textureHeight,{format:rn,type:qe,depthTexture:new jn(u.textureWidth,u.textureHeight,Ut,void 0,void 0,void 0,void 0,void 0,void 0,xt),stencilBuffer:T.stencil,colorSpace:t.outputColorSpace,samples:T.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{let xt={antialias:T.antialias,alpha:!0,depth:T.depth,stencil:T.stencil,framebufferScaleFactor:s};d=new XRWebGLLayer(r,e,xt),r.updateRenderState({baseLayer:d}),t.setPixelRatio(1),t.setSize(d.framebufferWidth,d.framebufferHeight,!1),y=new Xe(d.framebufferWidth,d.framebufferHeight,{format:rn,type:qe,colorSpace:t.outputColorSpace,stencilBuffer:T.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await r.requestReferenceSpace(o),Kt.setContext(r),Kt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function K(Z){for(let $=0;$<Z.removed.length;$++){let xt=Z.removed[$],Ut=M.indexOf(xt);Ut>=0&&(M[Ut]=null,b[Ut].disconnect(xt))}for(let $=0;$<Z.added.length;$++){let xt=Z.added[$],Ut=M.indexOf(xt);if(Ut===-1){for(let Ft=0;Ft<b.length;Ft++)if(Ft>=M.length){M.push(xt),Ut=Ft;break}else if(M[Ft]===null){M[Ft]=xt,Ut=Ft;break}if(Ut===-1)break}let _t=b[Ut];_t&&_t.connect(xt)}}let q=new V,j=new V;function tt(Z,$,xt){q.setFromMatrixPosition($.matrixWorld),j.setFromMatrixPosition(xt.matrixWorld);let Ut=q.distanceTo(j),_t=$.projectionMatrix.elements,Ft=xt.projectionMatrix.elements,_e=_t[14]/(_t[10]-1),Vt=_t[14]/(_t[10]+1),it=(_t[9]+1)/_t[5],ft=(_t[9]-1)/_t[5],Et=(_t[8]-1)/_t[0],At=(Ft[8]+1)/Ft[0],It=_e*Et,jt=_e*At,te=Ut/(-Et+At),he=te*-Et;if($.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(he),Z.translateZ(te),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),_t[10]===-1)Z.projectionMatrix.copy($.projectionMatrix),Z.projectionMatrixInverse.copy($.projectionMatrixInverse);else{let N=_e+te,xe=Vt+te,se=It-he,w=jt+(Ut-he),_=it*Vt/xe*N,B=ft*Vt/xe*N;Z.projectionMatrix.makePerspective(se,w,_,B,N,xe),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function St(Z,$){$===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices($.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(r===null)return;let $=Z.near,xt=Z.far;m.texture!==null&&(m.depthNear>0&&($=m.depthNear),m.depthFar>0&&(xt=m.depthFar)),O.near=L.near=P.near=$,O.far=L.far=P.far=xt,(I!==O.near||A!==O.far)&&(r.updateRenderState({depthNear:O.near,depthFar:O.far}),I=O.near,A=O.far),O.layers.mask=Z.layers.mask|6,P.layers.mask=O.layers.mask&-5,L.layers.mask=O.layers.mask&-3;let Ut=Z.parent,_t=O.cameras;St(O,Ut);for(let Ft=0;Ft<_t.length;Ft++)St(_t[Ft],Ut);_t.length===2?tt(O,P,L):O.projectionMatrix.copy(P.projectionMatrix),E===null&&Z.isPerspectiveCamera&&(E={camera:Z,fov:Z.fov,zoom:Z.zoom}),gt(Z,O,Ut)};function gt(Z,$,xt){xt===null?Z.matrix.copy($.matrixWorld):(Z.matrix.copy(xt.matrixWorld),Z.matrix.invert(),Z.matrix.multiply($.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy($.projectionMatrix),Z.projectionMatrixInverse.copy($.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=Xi*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(!(u===null&&d===null))return c},this.setFoveation=function(Z){c=Z,u!==null&&(u.fixedFoveation=Z),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=Z)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(O)},this.getCameraTexture=function(Z){return p[Z]};let $t=null;function Bt(Z,$){if(h=$.getViewerPose(l||a),g=$,h!==null){let xt=h.views;d!==null&&(t.setRenderTargetFramebuffer(y,d.framebuffer),t.setRenderTarget(y));let Ut=!1;xt.length!==O.cameras.length&&(O.cameras.length=0,Ut=!0);for(let Vt=0;Vt<xt.length;Vt++){let it=xt[Vt],ft=null;if(d!==null)ft=d.getViewport(it);else{let At=f.getViewSubImage(u,it);ft=At.viewport,Vt===0&&(t.setRenderTargetTextures(y,At.colorTexture,At.depthStencilTexture),t.setRenderTarget(y))}let Et=F[Vt];Et===void 0&&(Et=new We,Et.layers.enable(Vt),Et.viewport=new me,F[Vt]=Et),Et.matrix.fromArray(it.transform.matrix),Et.matrix.decompose(Et.position,Et.quaternion,Et.scale),Et.projectionMatrix.fromArray(it.projectionMatrix),Et.projectionMatrixInverse.copy(Et.projectionMatrix).invert(),Et.viewport.set(ft.x,ft.y,ft.width,ft.height),Vt===0&&(O.matrix.copy(Et.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),Ut===!0&&O.cameras.push(Et)}let _t=r.enabledFeatures;if(_t&&_t.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&S){f=n.getBinding();let Vt=f.getDepthInformation(xt[0]);Vt&&Vt.isValid&&Vt.texture&&m.init(Vt,r.renderState)}if(_t&&_t.includes("camera-access")&&S){t.state.unbindTexture(),f=n.getBinding();for(let Vt=0;Vt<xt.length;Vt++){let it=xt[Vt].camera;if(it){let ft=p[it];ft||(ft=new Lr,p[it]=ft);let Et=f.getCameraImage(it);ft.sourceTexture=Et}}}}for(let xt=0;xt<b.length;xt++){let Ut=M[xt],_t=b[xt];Ut!==null&&_t!==void 0&&_t.update(Ut,$,l||a)}$t&&$t(Z,$),$.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:$}),g=null}let Kt=new lu;Kt.setAnimationLoop(Bt),this.setAnimationLoop=function(Z){$t=Z},this.dispose=function(){}}},H1=new ge,pu=new Ot;pu.set(-1,0,0,0,1,0,0,0,1);function W1(i,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Tl(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function r(m,p,T,R,y){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?s(m,p):p.isMeshLambertMaterial?(s(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(s(m,p),f(m,p)):p.isMeshPhongMaterial?(s(m,p),h(m,p),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(s(m,p),u(m,p),p.isMeshPhysicalMaterial&&d(m,p,y)):p.isMeshMatcapMaterial?(s(m,p),g(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),S(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?c(m,p,T,R):p.isSpriteMaterial?l(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Ge&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Ge&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let T=t.get(p),R=T.envMap,y=T.envMapRotation;R&&(m.envMap.value=R,m.envMapRotation.value.setFromMatrix4(H1.makeRotationFromEuler(y)).transpose(),R.isCubeTexture&&R.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(pu),m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function c(m,p,T,R){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*T,m.scale.value=R*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function l(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function f(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function d(m,p,T){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Ge&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.retroreflectivity>0&&(m.retroreflectivity.value=p.retroreflectivity),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=T.texture,m.transmissionSamplerSize.value.set(T.width,T.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function S(m,p){let T=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(T.matrixWorld),m.nearDistance.value=T.shadow.camera.near,m.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function X1(i,t,e,n){let r={},s={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(y,b){let M=b.program;n.uniformBlockBinding(y,M)}function l(y,b){let M=r[y.id];M===void 0&&(m(y),M=h(y),r[y.id]=M,y.addEventListener("dispose",T));let C=b.program;n.updateUBOMapping(y,C);let x=t.render.frame;s[y.id]!==x&&(u(y),s[y.id]=x)}function h(y){let b=f();y.__bindingPointIndex=b;let M=i.createBuffer(),C=y.__size,x=y.usage;return i.bindBuffer(i.UNIFORM_BUFFER,M),i.bufferData(i.UNIFORM_BUFFER,C,x),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,b,M),M}function f(){for(let y=0;y<o;y++)if(a.indexOf(y)===-1)return a.push(y),y;return Nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){let b=r[y.id],M=y.uniforms,C=y.__cache;i.bindBuffer(i.UNIFORM_BUFFER,b);for(let x=0,E=M.length;x<E;x++){let P=M[x];if(Array.isArray(P))for(let L=0,F=P.length;L<F;L++)d(P[L],x,L,C);else d(P,x,0,C)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function d(y,b,M,C){if(S(y,b,M,C)===!0){let x=y.__offset,E=y.value;if(Array.isArray(E)){let P=0;for(let L=0;L<E.length;L++){let F=E[L],O=p(F);g(F,y.__data,P),typeof F!="number"&&typeof F!="boolean"&&!F.isMatrix3&&!ArrayBuffer.isView(F)&&(P+=O.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(E,y.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,x,y.__data)}}function g(y,b,M){typeof y=="number"||typeof y=="boolean"?b[0]=y:y.isMatrix3?(b[0]=y.elements[0],b[1]=y.elements[1],b[2]=y.elements[2],b[3]=0,b[4]=y.elements[3],b[5]=y.elements[4],b[6]=y.elements[5],b[7]=0,b[8]=y.elements[6],b[9]=y.elements[7],b[10]=y.elements[8],b[11]=0):ArrayBuffer.isView(y)?b.set(new y.constructor(y.buffer,y.byteOffset,b.length)):y.toArray(b,M)}function S(y,b,M,C){let x=y.value,E=b+"_"+M;if(C[E]===void 0)return typeof x=="number"||typeof x=="boolean"?C[E]=x:ArrayBuffer.isView(x)?C[E]=x.slice():C[E]=x.clone(),!0;{let P=C[E];if(typeof x=="number"||typeof x=="boolean"){if(P!==x)return C[E]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(P.equals(x)===!1)return P.copy(x),!0}}return!1}function m(y){let b=y.uniforms,M=0,C=16;for(let E=0,P=b.length;E<P;E++){let L=Array.isArray(b[E])?b[E]:[b[E]];for(let F=0,O=L.length;F<O;F++){let I=L[F],A=Array.isArray(I.value)?I.value:[I.value];for(let z=0,W=A.length;z<W;z++){let K=A[z],q=p(K),j=M%C,tt=j%q.boundary,St=j+tt;M+=tt,St!==0&&C-St<q.storage&&(M+=C-St),I.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=M,M+=q.storage}}}let x=M%C;return x>0&&(M+=C-x),y.__size=M,y.__cache={},this}function p(y){let b={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(b.boundary=4,b.storage=4):y.isVector2?(b.boundary=8,b.storage=8):y.isVector3||y.isColor?(b.boundary=16,b.storage=12):y.isVector4?(b.boundary=16,b.storage=16):y.isMatrix3?(b.boundary=48,b.storage=48):y.isMatrix4?(b.boundary=64,b.storage=64):y.isTexture?Dt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(y)?(b.boundary=16,b.storage=y.byteLength):Dt("WebGLRenderer: Unsupported uniform value type.",y),b}function T(y){let b=y.target;b.removeEventListener("dispose",T);let M=a.indexOf(b.__bindingPointIndex);a.splice(M,1),i.deleteBuffer(r[b.id]),delete r[b.id],delete s[b.id]}function R(){for(let y in r)i.deleteBuffer(r[y]);a=[],r={},s={}}return{bind:c,update:l,dispose:R}}var q1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),wn=null;function Y1(){return wn===null&&(wn=new Ys(q1,16,16,li,mn),wn.name="DFG_LUT",wn.minFilter=Pe,wn.magFilter=Pe,wn.wrapS=yn,wn.wrapT=yn,wn.generateMipmaps=!1,wn.needsUpdate=!0),wn}var io=class{constructor(t={}){let{canvas:e=Dh(),context:n=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:u=!1,outputBufferType:d=qe}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=a;let S=d,m=new Set([va,xa,_a]),p=new Set([qe,dn,er,nr,ma,ga]),T=new Uint32Array(4),R=new Int32Array(4),y=new V,b=null,M=null,C=[],x=[],E=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=fn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let P=this,L=!1,F=null,O=null,I=null,A=null;this._outputColorSpace=Ne;let z=0,W=0,K=null,q=-1,j=null,tt=new me,St=new me,gt=null,$t=new Ht(0),Bt=0,Kt=e.width,Z=e.height,$=1,xt=null,Ut=null,_t=new me(0,0,Kt,Z),Ft=new me(0,0,Kt,Z),_e=!1,Vt=new Ji,it=!1,ft=!1,Et=new ge,At=new V,It=new me,jt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},te=!1;function he(){return K===null?$:1}let N=n;function xe(v,D){return e.getContext(v,D)}let se,w,_,B,H,Y,rt,st,J,et,at,Ct,ht,ot,Rt,Lt,zt,U,lt,Q,ct,mt,nt;try{let v={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${"186"}`),e.addEventListener("webglcontextlost",ue,!1),e.addEventListener("webglcontextrestored",ne,!1),e.addEventListener("webglcontextcreationerror",an,!1),N===null){let D="webgl2";if(N=xe(D,v),N===null)throw xe(D)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Pt()}catch(v){throw e.removeEventListener("webglcontextlost",ue,!1),e.removeEventListener("webglcontextrestored",ne,!1),e.removeEventListener("webglcontextcreationerror",an,!1),Nt("WebGLRenderer: "+v.message),v}function Pt(){se=new t0(N),se.init(),ct=new V1(N,se),w=new Wm(N,se,t,ct),_=new B1(N,se),w.reversedDepthBuffer&&u&&_.buffers.depth.setReversed(!0),O=N.createFramebuffer(),I=N.createFramebuffer(),A=N.createFramebuffer(),B=new i0(N),H=new E1,Y=new z1(N,se,_,H,w,ct,B),rt=new jm(P),st=new sd(N),mt=new Gm(N,st),J=new e0(N,st,B,mt),et=new s0(N,J,st,mt,B),U=new r0(N,w,Y),Rt=new Xm(H),at=new b1(P,rt,se,w,mt,Rt),Ct=new W1(P,H),ht=new w1,ot=new L1(se),zt=new km(P,rt,_,et,g,c),Lt=new O1(P,et,w),nt=new X1(N,B,w,_),lt=new Hm(N,se,B),Q=new n0(N,se,B),B.programs=at.programs,P.capabilities=w,P.extensions=se,P.properties=H,P.renderLists=ht,P.shadowMap=Lt,P.state=_,P.info=B}S!==qe&&(E=new o0(S,e.width,e.height,o,r,s));let Tt=new Hl(P,N);this.xr=Tt,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let v=se.get("WEBGL_lose_context");v&&v.loseContext()},this.forceContextRestore=function(){let v=se.get("WEBGL_lose_context");v&&v.restoreContext()},this.getPixelRatio=function(){return $},this.setPixelRatio=function(v){v!==void 0&&($=v,this.setSize(Kt,Z,!1))},this.getSize=function(v){return v.set(Kt,Z)},this.setSize=function(v,D,X=!0){if(Tt.isPresenting){Dt("WebGLRenderer: Can't change size while VR device is presenting.");return}Kt=v,Z=D,e.width=Math.floor(v*$),e.height=Math.floor(D*$),X===!0&&(e.style.width=v+"px",e.style.height=D+"px"),E!==null&&E.setSize(e.width,e.height),this.setViewport(0,0,v,D)},this.getDrawingBufferSize=function(v){return v.set(Kt*$,Z*$).floor()},this.setDrawingBufferSize=function(v,D,X){Kt=v,Z=D,$=X,e.width=Math.floor(v*X),e.height=Math.floor(D*X),this.setViewport(0,0,v,D)},this.setEffects=function(v){if(S===qe){Nt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(v){for(let D=0;D<v.length;D++)if(v[D].isOutputPass===!0){Dt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}E.setEffects(v||[])},this.getCurrentViewport=function(v){return v.copy(tt)},this.getViewport=function(v){return v.copy(_t)},this.setViewport=function(v,D,X,k){v.isVector4?_t.set(v.x,v.y,v.z,v.w):_t.set(v,D,X,k),_.viewport(tt.copy(_t).multiplyScalar($).round())},this.getScissor=function(v){return v.copy(Ft)},this.setScissor=function(v,D,X,k){v.isVector4?Ft.set(v.x,v.y,v.z,v.w):Ft.set(v,D,X,k),_.scissor(St.copy(Ft).multiplyScalar($).round())},this.getScissorTest=function(){return _e},this.setScissorTest=function(v){_.setScissorTest(_e=v)},this.setOpaqueSort=function(v){xt=v},this.setTransparentSort=function(v){Ut=v},this.getClearColor=function(v){return v.copy(zt.getClearColor())},this.setClearColor=function(){zt.setClearColor(...arguments)},this.getClearAlpha=function(){return zt.getClearAlpha()},this.setClearAlpha=function(){zt.setClearAlpha(...arguments)},this.clear=function(v=!0,D=!0,X=!0){let k=0;if(v){let G=!1;if(K!==null){let pt=K.texture.format;G=m.has(pt)}if(G){let pt=K.texture.type,yt=p.has(pt),dt=zt.getClearColor(),Mt=zt.getClearAlpha(),wt=dt.r,kt=dt.g,Wt=dt.b;yt?(T[0]=wt,T[1]=kt,T[2]=Wt,T[3]=Mt,N.clearBufferuiv(N.COLOR,0,T)):(R[0]=wt,R[1]=kt,R[2]=Wt,R[3]=Mt,N.clearBufferiv(N.COLOR,0,R))}else k|=N.COLOR_BUFFER_BIT}D&&(k|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),X&&(k|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),k!==0&&N.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(v){v.setRenderer(this),F=v},this.dispose=function(){e.removeEventListener("webglcontextlost",ue,!1),e.removeEventListener("webglcontextrestored",ne,!1),e.removeEventListener("webglcontextcreationerror",an,!1),zt.dispose(),ht.dispose(),ot.dispose(),H.dispose(),rt.dispose(),et.dispose(),mt.dispose(),nt.dispose(),at.dispose(),Tt.dispose(),Tt.removeEventListener("sessionstart",Mc),Tt.removeEventListener("sessionend",bc),ui.stop()};function ue(v){v.preventDefault(),Ml("WebGLRenderer: Context Lost."),L=!0}function ne(){Ml("WebGLRenderer: Context Restored."),L=!1;let v=B.autoReset,D=Lt.enabled,X=Lt.autoUpdate,k=Lt.needsUpdate,G=Lt.type;Pt(),B.autoReset=v,Lt.enabled=D,Lt.autoUpdate=X,Lt.needsUpdate=k,Lt.type=G}function an(v){Nt("WebGLRenderer: A WebGL context could not be created. Reason: ",v.statusMessage)}function _n(v){let D=v.target;D.removeEventListener("dispose",_n),tf(D)}function tf(v){ef(v),H.remove(v)}function ef(v){let D=H.get(v).programs;D!==void 0&&(D.forEach(function(X){at.releaseProgram(X)}),v.isShaderMaterial&&at.releaseShaderCache(v))}this.renderBufferDirect=function(v,D,X,k,G,pt){D===null&&(D=jt);let yt=G.isMesh&&G.matrixWorld.determinantAffine()<0,dt=sf(v,D,X,k,G);_.setMaterial(k,yt);let Mt=X.index,wt=1;if(k.wireframe===!0){if(Mt=J.getWireframeAttribute(X),Mt===void 0)return;wt=2}let kt=X.drawRange,Wt=X.attributes.position,bt=kt.start*wt,ie=(kt.start+kt.count)*wt;pt!==null&&(bt=Math.max(bt,pt.start*wt),ie=Math.min(ie,(pt.start+pt.count)*wt)),Mt!==null?(bt=Math.max(bt,0),ie=Math.min(ie,Mt.count)):Wt!=null&&(bt=Math.max(bt,0),ie=Math.min(ie,Wt.count));let Se=ie-bt;if(Se<0||Se===1/0)return;mt.setup(G,k,dt,X,Mt);let de,le=lt;if(Mt!==null&&(de=st.get(Mt),le=Q,le.setIndex(de)),G.isMesh)k.wireframe===!0?(_.setLineWidth(k.wireframeLinewidth*he()),le.setMode(N.LINES)):le.setMode(N.TRIANGLES);else if(G.isLine){let Ie=k.linewidth;Ie===void 0&&(Ie=1),_.setLineWidth(Ie*he()),G.isLineSegments?le.setMode(N.LINES):G.isLineLoop?le.setMode(N.LINE_LOOP):le.setMode(N.LINE_STRIP)}else G.isPoints?le.setMode(N.POINTS):G.isSprite&&le.setMode(N.TRIANGLES);if(G.isBatchedMesh)if(se.get("WEBGL_multi_draw"))le.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{let Ie=G._multiDrawStarts,vt=G._multiDrawCounts,Oe=G._multiDrawCount,Qt=Mt?st.get(Mt).bytesPerElement:1,je=H.get(k).currentProgram.getUniforms();for(let xn=0;xn<Oe;xn++)je.setValue(N,"_gl_DrawID",xn),le.render(Ie[xn]/Qt,vt[xn])}else if(G.isInstancedMesh)le.renderInstances(bt,Se,G.count);else if(X.isInstancedBufferGeometry){let Ie=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,vt=Math.min(X.instanceCount,Ie);le.renderInstances(bt,Se,vt)}else le.render(bt,Se)};function Sc(v,D,X,k){F!==null&&v.isNodeMaterial&&F.setObject(k,v),it===!0&&Rt.setState(v,X,!1),v.transparent===!0&&v.side===nn&&v.forceSinglePass===!1?(v.side=Ge,v.needsUpdate=!0,us(v,D,k),v.side=ri,v.needsUpdate=!0,us(v,D,k),v.side=nn):us(v,D,k)}this.compile=function(v,D,X=null){X===null&&(X=v),F!==null&&F.renderStart(v,D,X),M=ot.get(X),M.init(D),x.push(M),X.traverseVisible(function(G){G.isLight&&G.layers.test(D.layers)&&(M.pushLight(G),G.castShadow&&M.pushShadow(G))}),v!==X&&v.traverseVisible(function(G){G.isLight&&G.layers.test(D.layers)&&(M.pushLight(G),G.castShadow&&M.pushShadow(G))}),M.setupLights(),F!==null&&F.updateLights(M.state.lightsArray),ft=this.localClippingEnabled,it=Rt.init(this.clippingPlanes,ft),it===!0&&Rt.setGlobalState(this.clippingPlanes,D),F!==null&&Lt.render(M.state.shadowsArray,X,D);let k=new Set;return v.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;let pt=G.material;if(pt)if(Array.isArray(pt))for(let yt=0;yt<pt.length;yt++){let dt=pt[yt];Sc(dt,X,D,G),k.add(dt)}else Sc(pt,X,D,G),k.add(pt)}),M=x.pop(),F!==null&&F.renderEnd(),k},this.compileAsync=function(v,D,X=null){let k=this.compile(v,D,X);return new Promise(G=>{function pt(){if(k.forEach(function(yt){let Mt=H.get(yt).currentProgram;(Mt===void 0||Mt.isReady())&&k.delete(yt)}),k.size===0){G(v);return}setTimeout(pt,10)}se.get("KHR_parallel_shader_compile")!==null?pt():setTimeout(pt,10)})};let bo=null;function nf(v){bo&&bo(v)}function Mc(){ui.stop()}function bc(){ui.start()}let ui=new lu;ui.setAnimationLoop(nf),typeof self<"u"&&ui.setContext(self),this.setAnimationLoop=function(v){bo=v,Tt.setAnimationLoop(v),v===null?ui.stop():ui.start()},Tt.addEventListener("sessionstart",Mc),Tt.addEventListener("sessionend",bc),this.render=function(v,D){if(D!==void 0&&D.isCamera!==!0){Nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;F!==null&&F.renderStart(v,D);let X=Tt.enabled===!0&&Tt.isPresenting===!0,k=E!==null&&(K===null||X)&&E.begin(P,K);if(v.matrixWorldAutoUpdate===!0&&v.updateMatrixWorld(),D.parent===null&&D.matrixWorldAutoUpdate===!0&&D.updateMatrixWorld(),Tt.enabled===!0&&Tt.isPresenting===!0&&(E===null||E.isCompositing()===!1)&&(Tt.cameraAutoUpdate===!0&&Tt.updateCamera(D),D=Tt.getCamera()),v.isScene===!0&&v.onBeforeRender(P,v,D,K),M=ot.get(v,x.length),M.init(D),M.state.textureUnits=Y.getTextureUnits(),x.push(M),Et.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse),Vt.setFromProjectionMatrix(Et,un,D.reversedDepth),ft=this.localClippingEnabled,it=Rt.init(this.clippingPlanes,ft),b=ht.get(v,C.length),b.init(),C.push(b),Tt.enabled===!0&&Tt.isPresenting===!0){let yt=P.xr.getDepthSensingMesh();yt!==null&&Eo(yt,D,-1/0,P.sortObjects)}Eo(v,D,0,P.sortObjects),b.finish(),F!==null&&F.updateLights(M.state.lightsArray),P.sortObjects===!0&&b.sort(xt,Ut),te=Tt.enabled===!1||Tt.isPresenting===!1||Tt.hasDepthSensing()===!1,te&&zt.addToRenderList(b,v),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),it===!0&&Rt.beginShadows();let G=M.state.shadowsArray;if(Lt.render(G,v,D),it===!0&&Rt.endShadows(),(k&&E.hasRenderPass())===!1){let yt=b.opaque,dt=b.transmissive;if(M.setupLights(),D.isArrayCamera){let Mt=D.cameras;if(dt.length>0)for(let wt=0,kt=Mt.length;wt<kt;wt++){let Wt=Mt[wt];Tc(yt,dt,v,Wt)}te&&zt.render(v);for(let wt=0,kt=Mt.length;wt<kt;wt++){let Wt=Mt[wt];Ec(b,v,Wt,Wt.viewport)}}else dt.length>0&&Tc(yt,dt,v,D),te&&zt.render(v),Ec(b,v,D)}K!==null&&W===0&&(Y.updateMultisampleRenderTarget(K),Y.updateRenderTargetMipmap(K)),k&&E.end(P),v.isScene===!0&&v.onAfterRender(P,v,D),mt.resetDefaultState(),q=-1,j=null,x.pop(),x.length>0?(M=x[x.length-1],Y.setTextureUnits(M.state.textureUnits),it===!0&&Rt.setGlobalState(P.clippingPlanes,M.state.camera)):M=null,C.pop(),C.length>0?b=C[C.length-1]:b=null,F!==null&&F.renderEnd()};function Eo(v,D,X,k){if(v.visible===!1)return;if(v.layers.test(D.layers)){if(v.isGroup)X=v.renderOrder;else if(v.isLOD)v.autoUpdate===!0&&v.update(D);else if(v.isLightProbeGrid)M.pushLightProbeGrid(v);else if(v.isLight)M.pushLight(v),v.castShadow&&M.pushShadow(v);else if(v.isSprite){if(!v.frustumCulled||v.intersectsFrustum(Vt)){k&&It.setFromMatrixPosition(v.matrixWorld).applyMatrix4(Et);let yt=et.update(v),dt=v.material;dt.visible&&b.push(v,yt,dt,X,It.z,null,D)}}else if((v.isMesh||v.isLine||v.isPoints)&&(!v.frustumCulled||v.intersectsFrustum(Vt))){let yt=et.update(v),dt=v.material;if(k&&(v.boundingSphere!==void 0?(v.boundingSphere===null&&v.computeBoundingSphere(),It.copy(v.boundingSphere.center)):(yt.boundingSphere===null&&yt.computeBoundingSphere(),It.copy(yt.boundingSphere.center)),It.applyMatrix4(v.matrixWorld).applyMatrix4(Et)),Array.isArray(dt)){let Mt=yt.groups;for(let wt=0,kt=Mt.length;wt<kt;wt++){let Wt=Mt[wt],bt=dt[Wt.materialIndex];bt&&bt.visible&&b.push(v,yt,bt,X,It.z,Wt,D)}}else dt.visible&&b.push(v,yt,dt,X,It.z,null,D)}}let pt=v.children;for(let yt=0,dt=pt.length;yt<dt;yt++)Eo(pt[yt],D,X,k)}function Ec(v,D,X,k){let{opaque:G,transmissive:pt,transparent:yt}=v;M.setupLightsView(X),it===!0&&Rt.setGlobalState(P.clippingPlanes,X),k&&_.viewport(tt.copy(k)),G.length>0&&hs(G,D,X),pt.length>0&&hs(pt,D,X),yt.length>0&&hs(yt,D,X),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function Tc(v,D,X,k){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;if(M.state.transmissionRenderTarget[k.id]===void 0){let bt=se.has("EXT_color_buffer_half_float")||se.has("EXT_color_buffer_float");M.state.transmissionRenderTarget[k.id]=new Xe(1,1,{generateMipmaps:!0,type:bt?mn:qe,minFilter:ai,samples:Math.max(4,w.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Yt.workingColorSpace})}let pt=M.state.transmissionRenderTarget[k.id],yt=k.viewport||tt;pt.setSize(yt.z*P.transmissionResolutionScale,yt.w*P.transmissionResolutionScale);let dt=P.getRenderTarget(),Mt=P.getActiveCubeFace(),wt=P.getActiveMipmapLevel();P.setRenderTarget(pt),P.getClearColor($t),Bt=P.getClearAlpha(),Bt<1&&P.setClearColor(16777215,.5),P.clear(),te&&zt.render(X);let kt=P.toneMapping;P.toneMapping=fn;let Wt=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),M.setupLightsView(k),it===!0&&Rt.setGlobalState(P.clippingPlanes,k),hs(v,X,k),Y.updateMultisampleRenderTarget(pt),Y.updateRenderTargetMipmap(pt),se.has("WEBGL_multisampled_render_to_texture")===!1){let bt=!1;for(let ie=0,Se=D.length;ie<Se;ie++){let de=D[ie],{object:le,geometry:Ie,material:vt,group:Oe}=de;if(vt.side===nn&&le.layers.test(k.layers)){let Qt=vt.side;vt.side=Ge,vt.needsUpdate=!0,wc(le,X,k,Ie,vt,Oe),vt.side=Qt,vt.needsUpdate=!0,bt=!0}}bt===!0&&(Y.updateMultisampleRenderTarget(pt),Y.updateRenderTargetMipmap(pt))}P.setRenderTarget(dt,Mt,wt),P.setClearColor($t,Bt),Wt!==void 0&&(k.viewport=Wt),P.toneMapping=kt}function hs(v,D,X){let k=D.isScene===!0?D.overrideMaterial:null;for(let G=0,pt=v.length;G<pt;G++){let yt=v[G],{object:dt,geometry:Mt,group:wt}=yt,kt=yt.material;kt.allowOverride===!0&&k!==null&&(kt=k),dt.layers.test(X.layers)&&wc(dt,D,X,Mt,kt,wt)}}function wc(v,D,X,k,G,pt){F!==null&&G.isNodeMaterial&&F.setObject(v,G),v.onBeforeRender(P,D,X,k,G,pt),v.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,v.matrixWorld),v.normalMatrix.getNormalMatrix(v.modelViewMatrix),G.onBeforeRender(P,D,X,k,v,pt),G.transparent===!0&&G.side===nn&&G.forceSinglePass===!1?(G.side=Ge,G.needsUpdate=!0,P.renderBufferDirect(X,D,k,G,v,pt),G.side=ri,G.needsUpdate=!0,P.renderBufferDirect(X,D,k,G,v,pt),G.side=nn):P.renderBufferDirect(X,D,k,G,v,pt),v.onAfterRender(P,D,X,k,G,pt)}function us(v,D,X){D.isScene!==!0&&(D=jt);let k=H.get(v),G=M.state.lights,pt=M.state.shadowsArray,yt=G.state.version,dt=at.getParameters(v,G.state,pt,D,X,M.state.lightProbeGridArray),Mt=at.getProgramCacheKey(dt),wt=k.programs;k.environment=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?D.environment:null,k.fog=D.fog;let kt=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap;k.envMap=rt.get(v.envMap||k.environment,kt),k.envMapRotation=k.environment!==null&&v.envMap===null?D.environmentRotation:v.envMapRotation,wt===void 0&&(v.addEventListener("dispose",_n),wt=new Map,k.programs=wt);let Wt=wt.get(Mt);if(Wt!==void 0){if(k.currentProgram===Wt&&k.lightsStateVersion===yt)return Cc(v,dt),Wt}else dt.uniforms=at.getUniforms(v),F!==null&&v.isNodeMaterial&&F.build(v,X,dt),v.onBeforeCompile(dt,P),Wt=at.acquireProgram(dt,Mt),wt.set(Mt,Wt),k.uniforms=dt.uniforms;let bt=k.uniforms;return(!v.isShaderMaterial&&!v.isRawShaderMaterial||v.clipping===!0)&&(bt.clippingPlanes=Rt.uniform),Cc(v,dt),k.needsLights=of(v),k.lightsStateVersion=yt,k.needsLights&&(bt.ambientLightColor.value=G.state.ambient,bt.lightProbe.value=G.state.probe,bt.sunLights.value=G.state.sun,bt.sunLightShadows.value=G.state.sunShadow,bt.directionalLights.value=G.state.directional,bt.directionalLightShadows.value=G.state.directionalShadow,bt.spotLights.value=G.state.spot,bt.spotLightShadows.value=G.state.spotShadow,bt.rectAreaLights.value=G.state.rectArea,bt.ltc_1.value=G.state.rectAreaLTC1,bt.ltc_2.value=G.state.rectAreaLTC2,bt.pointLights.value=G.state.point,bt.pointLightShadows.value=G.state.pointShadow,bt.hemisphereLights.value=G.state.hemi,bt.sunShadowMatrix.value=G.state.sunShadowMatrix,bt.sunShadowCascade.value=G.state.sunShadowCascade,bt.directionalShadowMatrix.value=G.state.directionalShadowMatrix,bt.spotLightMatrix.value=G.state.spotLightMatrix,bt.spotLightMap.value=G.state.spotLightMap,bt.pointShadowMatrix.value=G.state.pointShadowMatrix),k.lightProbeGrid=M.state.lightProbeGridArray.length>0,k.currentProgram=Wt,k.uniformsList=null,Wt}function Ac(v){if(v.uniformsList===null){let D=v.currentProgram.getUniforms();v.uniformsList=ar.seqWithValue(D.seq,v.uniforms)}return v.uniformsList}function Cc(v,D){let X=H.get(v);X.outputColorSpace=D.outputColorSpace,X.batching=D.batching,X.batchingColor=D.batchingColor,X.instancing=D.instancing,X.instancingColor=D.instancingColor,X.instancingMorph=D.instancingMorph,X.skinning=D.skinning,X.morphTargets=D.morphTargets,X.morphNormals=D.morphNormals,X.morphColors=D.morphColors,X.morphTargetsCount=D.morphTargetsCount,X.numClippingPlanes=D.numClippingPlanes,X.numIntersection=D.numClipIntersection,X.vertexAlphas=D.vertexAlphas,X.vertexTangents=D.vertexTangents,X.toneMapping=D.toneMapping}function rf(v,D){if(v.length===0)return null;if(v.length===1)return v[0].texture!==null?v[0]:null;y.setFromMatrixPosition(D.matrixWorld);for(let X=0,k=v.length;X<k;X++){let G=v[X];if(G.texture!==null&&G.boundingBox.containsPoint(y))return G}return null}function sf(v,D,X,k,G){D.isScene!==!0&&(D=jt),Y.resetTextureUnits();let pt=D.fog,yt=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?D.environment:null,dt=K===null?P.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:Yt.workingColorSpace,Mt=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,wt=rt.get(k.envMap||yt,Mt),kt=k.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,Wt=!!X.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),bt=!!X.morphAttributes.position,ie=!!X.morphAttributes.normal,Se=!!X.morphAttributes.color,de=fn;k.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(de=P.toneMapping);let le=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Ie=le!==void 0?le.length:0,vt=H.get(k),Oe=M.state.lights;if(it===!0&&(ft===!0||v!==j)){let fe=v===j&&k.id===q;Rt.setState(k,v,fe)}let Qt=!1;k.version===vt.__version?(vt.needsLights&&vt.lightsStateVersion!==Oe.state.version||vt.outputColorSpace!==dt||G.isBatchedMesh&&vt.batching===!1||!G.isBatchedMesh&&vt.batching===!0||G.isBatchedMesh&&vt.batchingColor===!0&&G._colorsTexture===null||G.isBatchedMesh&&vt.batchingColor===!1&&G._colorsTexture!==null||G.isInstancedMesh&&vt.instancing===!1||!G.isInstancedMesh&&vt.instancing===!0||G.isSkinnedMesh&&vt.skinning===!1||!G.isSkinnedMesh&&vt.skinning===!0||G.isInstancedMesh&&vt.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&vt.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&vt.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&vt.instancingMorph===!1&&G.morphTexture!==null||vt.envMap!==wt||k.fog===!0&&vt.fog!==pt||vt.numClippingPlanes!==void 0&&(vt.numClippingPlanes!==Rt.numPlanes||vt.numIntersection!==Rt.numIntersection)||vt.vertexAlphas!==kt||vt.vertexTangents!==Wt||vt.morphTargets!==bt||vt.morphNormals!==ie||vt.morphColors!==Se||vt.toneMapping!==de||vt.morphTargetsCount!==Ie||!!vt.lightProbeGrid!=M.state.lightProbeGridArray.length>0)&&(Qt=!0):(Qt=!0,vt.__version=k.version);let je=vt.currentProgram;Qt===!0&&(je=us(k,D,G),F&&k.isNodeMaterial&&F.onUpdateProgram(k,je,vt));let xn=!1,Gn=!1,Ti=!1,oe=je.getUniforms(),ve=vt.uniforms;if(_.useProgram(je.program)&&(xn=!0,Gn=!0,Ti=!0),k.id!==q&&(q=k.id,Gn=!0),vt.needsLights){let fe=rf(M.state.lightProbeGridArray,G);vt.lightProbeGrid!==fe&&(vt.lightProbeGrid=fe,Gn=!0)}if(xn||j!==v){_.buffers.depth.getReversed()&&v.reversedDepth!==!0&&(v._reversedDepth=!0,v.updateProjectionMatrix()),oe.setValue(N,"projectionMatrix",v.projectionMatrix),oe.setValue(N,"viewMatrix",v.matrixWorldInverse);let Wn=oe.map.cameraPosition;Wn!==void 0&&Wn.setValue(N,At.setFromMatrixPosition(v.matrixWorld)),w.logarithmicDepthBuffer&&oe.setValue(N,"logDepthBufFC",2/(Math.log(v.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&oe.setValue(N,"isOrthographic",v.isOrthographicCamera===!0),j!==v&&(j=v,Gn=!0,Ti=!0)}if(vt.needsLights&&(Oe.state.sunShadowMap.length>0&&oe.setValue(N,"sunShadowMap",Oe.state.sunShadowMap,Y),Oe.state.directionalShadowMap.length>0&&oe.setValue(N,"directionalShadowMap",Oe.state.directionalShadowMap,Y),Oe.state.spotShadowMap.length>0&&oe.setValue(N,"spotShadowMap",Oe.state.spotShadowMap,Y),Oe.state.pointShadowMap.length>0&&oe.setValue(N,"pointShadowMap",Oe.state.pointShadowMap,Y)),G.isSkinnedMesh){oe.setOptional(N,G,"bindMatrix"),oe.setOptional(N,G,"bindMatrixInverse");let fe=G.skeleton;fe&&(fe.boneTexture===null&&fe.computeBoneTexture(),oe.setValue(N,"boneTexture",fe.boneTexture,Y))}G.isBatchedMesh&&(oe.setOptional(N,G,"batchingTexture"),oe.setValue(N,"batchingTexture",G._matricesTexture,Y),oe.setOptional(N,G,"batchingIdTexture"),oe.setValue(N,"batchingIdTexture",G._indirectTexture,Y),oe.setOptional(N,G,"batchingColorTexture"),G._colorsTexture!==null&&oe.setValue(N,"batchingColorTexture",G._colorsTexture,Y));let Hn=X.morphAttributes;if((Hn.position!==void 0||Hn.normal!==void 0||Hn.color!==void 0)&&U.update(G,X,je),(Gn||vt.receiveShadow!==G.receiveShadow)&&(vt.receiveShadow=G.receiveShadow,oe.setValue(N,"receiveShadow",G.receiveShadow)),(k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial)&&k.envMap===null&&D.environment!==null&&(ve.envMapIntensity.value=D.environmentIntensity),ve.dfgLUT!==void 0&&(ve.dfgLUT.value=Y1()),Gn){if(oe.setValue(N,"toneMappingExposure",P.toneMappingExposure),vt.needsLights&&af(ve,Ti),pt&&k.fog===!0&&Ct.refreshFogUniforms(ve,pt),Ct.refreshMaterialUniforms(ve,k,$,Z,M.state.transmissionRenderTarget[v.id]),vt.needsLights&&vt.lightProbeGrid){let fe=vt.lightProbeGrid;ve.probesSH.value=fe.texture,ve.probesMin.value.copy(fe.boundingBox.min),ve.probesMax.value.copy(fe.boundingBox.max),ve.probesResolution.value.copy(fe.resolution)}ar.upload(N,Ac(vt),ve,Y)}if(k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(ar.upload(N,Ac(vt),ve,Y),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&oe.setValue(N,"center",G.center),oe.setValue(N,"modelViewMatrix",G.modelViewMatrix),oe.setValue(N,"normalMatrix",G.normalMatrix),oe.setValue(N,"modelMatrix",G.matrixWorld),k.uniformsGroups!==void 0){let fe=k.uniformsGroups;for(let Wn=0,wi=fe.length;Wn<wi;Wn++){let Pc=fe[Wn];nt.update(Pc,je),nt.bind(Pc,je)}}return je}function af(v,D){v.ambientLightColor.needsUpdate=D,v.lightProbe.needsUpdate=D,v.sunLights.needsUpdate=D,v.sunLightShadows.needsUpdate=D,v.directionalLights.needsUpdate=D,v.directionalLightShadows.needsUpdate=D,v.pointLights.needsUpdate=D,v.pointLightShadows.needsUpdate=D,v.spotLights.needsUpdate=D,v.spotLightShadows.needsUpdate=D,v.rectAreaLights.needsUpdate=D,v.hemisphereLights.needsUpdate=D}function of(v){return v.isMeshLambertMaterial||v.isMeshToonMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isShadowMaterial||v.isShaderMaterial&&v.lights===!0}this.getActiveCubeFace=function(){return z},this.getActiveMipmapLevel=function(){return W},this.getRenderTarget=function(){return K},this.setRenderTargetTextures=function(v,D,X){let k=H.get(v);k.__autoAllocateDepthBuffer=v.resolveDepthBuffer===!1,k.__autoAllocateDepthBuffer===!1&&(k.__useRenderToTexture=!1),H.get(v.texture).__webglTexture=D,H.get(v.depthTexture).__webglTexture=k.__autoAllocateDepthBuffer?void 0:X,k.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(v,D){let X=H.get(v);X.__webglFramebuffer=D,X.__useDefaultFramebuffer=D===void 0},this.setRenderTarget=function(v,D=0,X=0){K=v,z=D,W=X;let k=null,G=!1,pt=!1;if(v){let dt=H.get(v);if(dt.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(N.FRAMEBUFFER,dt.__webglFramebuffer),tt.copy(v.viewport),St.copy(v.scissor),gt=v.scissorTest,_.viewport(tt),_.scissor(St),_.setScissorTest(gt),q=-1;return}else if(dt.__webglFramebuffer===void 0)Y.setupRenderTarget(v);else if(dt.__hasExternalTextures)Y.rebindTextures(v,H.get(v.texture).__webglTexture,H.get(v.depthTexture).__webglTexture);else if(v.depthBuffer){let kt=v.depthTexture;if(dt.__boundDepthTexture!==kt){if(kt!==null&&H.has(kt)&&(v.width!==kt.image.width||v.height!==kt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Y.setupDepthRenderbuffer(v)}}let Mt=v.texture;(Mt.isData3DTexture||Mt.isDataArrayTexture||Mt.isCompressedArrayTexture)&&(pt=!0);let wt=H.get(v).__webglFramebuffer;v.isWebGLCubeRenderTarget?(Array.isArray(wt[D])?k=wt[D][X]:k=wt[D],G=!0):v.samples>0&&Y.useMultisampledRTT(v)===!1?k=H.get(v).__webglMultisampledFramebuffer:Array.isArray(wt)?k=wt[X]:k=wt,tt.copy(v.viewport),St.copy(v.scissor),gt=v.scissorTest}else tt.copy(_t).multiplyScalar($).floor(),St.copy(Ft).multiplyScalar($).floor(),gt=_e;if(X!==0&&(k=O),_.bindFramebuffer(N.FRAMEBUFFER,k)&&_.drawBuffers(v,k),_.viewport(tt),_.scissor(St),_.setScissorTest(gt),G){let dt=H.get(v.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+D,dt.__webglTexture,X)}else if(pt){let dt=D;for(let Mt=0;Mt<v.textures.length;Mt++){let wt=H.get(v.textures[Mt]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+Mt,wt.__webglTexture,X,dt)}}else if(v!==null&&X!==0){let dt=H.get(v.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,dt.__webglTexture,X)}q=-1};function Rc(v){let D=H.get(v);return(D.__readFormat!==v.format||D.__readType!==v.type)&&(D.__readFormat=v.format,D.__readType=v.type,D.__formatReadable=w.textureFormatReadable(v.format),D.__typeReadable=w.textureTypeReadable(v.type)),D}this.readRenderTargetPixels=function(v,D,X,k,G,pt,yt,dt=0){if(!(v&&v.isWebGLRenderTarget)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Mt=H.get(v).__webglFramebuffer;if(v.isWebGLCubeRenderTarget&&yt!==void 0&&(Mt=Mt[yt]),Mt){_.bindFramebuffer(N.FRAMEBUFFER,Mt);try{let wt=v.textures[dt],kt=wt.format,Wt=wt.type;v.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+dt);let bt=Rc(wt);if(bt.__formatReadable===!1){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(bt.__typeReadable===!1){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}D>=0&&D<=v.width-k&&X>=0&&X<=v.height-G&&N.readPixels(D,X,k,G,ct.convert(kt),ct.convert(Wt),pt)}finally{let wt=K!==null?H.get(K).__webglFramebuffer:null;_.bindFramebuffer(N.FRAMEBUFFER,wt)}}},this.readRenderTargetPixelsAsync=async function(v,D,X,k,G,pt,yt,dt=0){if(!(v&&v.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Mt=H.get(v).__webglFramebuffer;if(v.isWebGLCubeRenderTarget&&yt!==void 0&&(Mt=Mt[yt]),Mt)if(D>=0&&D<=v.width-k&&X>=0&&X<=v.height-G){_.bindFramebuffer(N.FRAMEBUFFER,Mt);let wt=v.textures[dt],kt=wt.format,Wt=wt.type;v.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+dt);let bt=Rc(wt);if(bt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(bt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ie=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,ie),N.bufferData(N.PIXEL_PACK_BUFFER,pt.byteLength,N.STREAM_READ),N.readPixels(D,X,k,G,ct.convert(kt),ct.convert(Wt),0),N.bindBuffer(N.PIXEL_PACK_BUFFER,null);let Se=K!==null?H.get(K).__webglFramebuffer:null;_.bindFramebuffer(N.FRAMEBUFFER,Se);let de=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await Uh(N,de,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,ie),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,pt),N.bindBuffer(N.PIXEL_PACK_BUFFER,null),N.deleteBuffer(ie),N.deleteSync(de),pt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(v,D=null,X=0){let k=Math.pow(2,-X),G=Math.floor(v.image.width*k),pt=Math.floor(v.image.height*k),yt=D!==null?D.x:0,dt=D!==null?D.y:0;Y.setTexture2D(v,0),N.copyTexSubImage2D(N.TEXTURE_2D,X,0,0,yt,dt,G,pt),_.unbindTexture()},this.copyTextureToTexture=function(v,D,X=null,k=null,G=0,pt=0){let yt,dt,Mt,wt,kt,Wt,bt,ie,Se,de=v.isCompressedTexture?v.mipmaps[pt]:v.image;if(X!==null)yt=X.max.x-X.min.x,dt=X.max.y-X.min.y,Mt=X.isBox3?X.max.z-X.min.z:1,wt=X.min.x,kt=X.min.y,Wt=X.isBox3?X.min.z:0;else{let ve=Math.pow(2,-G);yt=Math.floor(de.width*ve),dt=Math.floor(de.height*ve),v.isDataArrayTexture?Mt=de.depth:v.isData3DTexture?Mt=Math.floor(de.depth*ve):Mt=1,wt=0,kt=0,Wt=0}k!==null?(bt=k.x,ie=k.y,Se=k.z):(bt=0,ie=0,Se=0);let le=ct.convert(D.format),Ie=ct.convert(D.type),vt;D.isData3DTexture?(Y.setTexture3D(D,0),vt=N.TEXTURE_3D):D.isDataArrayTexture||D.isCompressedArrayTexture?(Y.setTexture2DArray(D,0),vt=N.TEXTURE_2D_ARRAY):(Y.setTexture2D(D,0),vt=N.TEXTURE_2D),_.activeTexture(N.TEXTURE0),_.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,D.flipY),_.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,D.premultiplyAlpha),_.pixelStorei(N.UNPACK_ALIGNMENT,D.unpackAlignment);let Oe=_.getParameter(N.UNPACK_ROW_LENGTH),Qt=_.getParameter(N.UNPACK_IMAGE_HEIGHT),je=_.getParameter(N.UNPACK_SKIP_PIXELS),xn=_.getParameter(N.UNPACK_SKIP_ROWS),Gn=_.getParameter(N.UNPACK_SKIP_IMAGES);_.pixelStorei(N.UNPACK_ROW_LENGTH,de.width),_.pixelStorei(N.UNPACK_IMAGE_HEIGHT,de.height),_.pixelStorei(N.UNPACK_SKIP_PIXELS,wt),_.pixelStorei(N.UNPACK_SKIP_ROWS,kt),_.pixelStorei(N.UNPACK_SKIP_IMAGES,Wt);let Ti=v.isDataArrayTexture||v.isData3DTexture,oe=D.isDataArrayTexture||D.isData3DTexture;if(v.isDepthTexture){let ve=H.get(v),Hn=H.get(D),fe=H.get(ve.__renderTarget),Wn=H.get(Hn.__renderTarget);_.bindFramebuffer(N.READ_FRAMEBUFFER,fe.__webglFramebuffer),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,Wn.__webglFramebuffer);for(let wi=0;wi<Mt;wi++)Ti&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,H.get(v).__webglTexture,G,Wt+wi),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,H.get(D).__webglTexture,pt,Se+wi)),N.blitFramebuffer(wt,kt,yt,dt,bt,ie,yt,dt,N.DEPTH_BUFFER_BIT,N.NEAREST);_.bindFramebuffer(N.READ_FRAMEBUFFER,null),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(G!==0||v.isRenderTargetTexture||H.has(v)){let ve=H.get(v),Hn=H.get(D);_.bindFramebuffer(N.READ_FRAMEBUFFER,I),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,A);for(let fe=0;fe<Mt;fe++)Ti?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,ve.__webglTexture,G,Wt+fe):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,ve.__webglTexture,G),oe?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,Hn.__webglTexture,pt,Se+fe):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,Hn.__webglTexture,pt),G!==0?N.blitFramebuffer(wt,kt,yt,dt,bt,ie,yt,dt,N.COLOR_BUFFER_BIT,N.NEAREST):oe?N.copyTexSubImage3D(vt,pt,bt,ie,Se+fe,wt,kt,yt,dt):N.copyTexSubImage2D(vt,pt,bt,ie,wt,kt,yt,dt);_.bindFramebuffer(N.READ_FRAMEBUFFER,null),_.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else oe?v.isDataTexture||v.isData3DTexture?N.texSubImage3D(vt,pt,bt,ie,Se,yt,dt,Mt,le,Ie,de.data):D.isCompressedArrayTexture?N.compressedTexSubImage3D(vt,pt,bt,ie,Se,yt,dt,Mt,le,de.data):N.texSubImage3D(vt,pt,bt,ie,Se,yt,dt,Mt,le,Ie,de):v.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,pt,bt,ie,yt,dt,le,Ie,de.data):v.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,pt,bt,ie,de.width,de.height,le,de.data):N.texSubImage2D(N.TEXTURE_2D,pt,bt,ie,yt,dt,le,Ie,de);_.pixelStorei(N.UNPACK_ROW_LENGTH,Oe),_.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Qt),_.pixelStorei(N.UNPACK_SKIP_PIXELS,je),_.pixelStorei(N.UNPACK_SKIP_ROWS,xn),_.pixelStorei(N.UNPACK_SKIP_IMAGES,Gn),pt===0&&D.generateMipmaps&&N.generateMipmap(vt),_.unbindTexture()},this.initRenderTarget=function(v){H.get(v).__webglFramebuffer===void 0&&Y.setupRenderTarget(v)},this.initTexture=function(v){v.isCubeTexture?Y.setTextureCube(v,0):v.isData3DTexture?Y.setTexture3D(v,0):v.isDataArrayTexture||v.isCompressedArrayTexture?Y.setTexture2DArray(v,0):Y.setTexture2D(v,0),_.unbindTexture()},this.resetState=function(){z=0,W=0,K=null,_.reset(),mt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return un}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let e=this.getContext();e.drawingBufferColorSpace=Yt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Yt._getUnpackColorSpace()}};var Ke=class{constructor(){this._partials=new Float64Array(32),this._n=0}add(t){let e=this._partials,n=0;for(let r=0;r<this._n&&r<32;r++){let s=e[r],a=t+s,o=Math.abs(t)<Math.abs(s)?t-(a-s):s-(a-t);o&&(e[n++]=o),t=a}return e[n]=t,this._n=n+1,this}valueOf(){let t=this._partials,e=this._n,n,r,s,a=0;if(e>0){for(a=t[--e];e>0&&(n=a,r=t[--e],a=n+r,s=r-(a-n),!s););e>0&&(s<0&&t[e-1]<0||s>0&&t[e-1]>0)&&(r=s*2,n=a+r,r==n-a&&(a=n))}return a}};function*J1(i){for(let t of i)yield*t}function lr(i){return Array.from(J1(i))}var Jt=1e-6,mu=1e-12,qt=Math.PI,He=qt/2,Wl=qt/4,Fe=qt*2,sn=180/qt,Ce=qt/180,ee=Math.abs,gu=Math.atan,zn=Math.atan2,ae=Math.cos;var ce=Math.sin,_u=Math.sign||function(i){return i>0?1:i<0?-1:0},Qe=Math.sqrt;function xu(i){return i>1?0:i<-1?qt:Math.acos(i)}function Vn(i){return i>1?He:i<-1?-He:Math.asin(i)}function Re(){}function ao(i,t){i&&yu.hasOwnProperty(i.type)&&yu[i.type](i,t)}var vu={Feature:function(i,t){ao(i.geometry,t)},FeatureCollection:function(i,t){for(var e=i.features,n=-1,r=e.length;++n<r;)ao(e[n].geometry,t)}},yu={Sphere:function(i,t){t.sphere()},Point:function(i,t){i=i.coordinates,t.point(i[0],i[1],i[2])},MultiPoint:function(i,t){for(var e=i.coordinates,n=-1,r=e.length;++n<r;)i=e[n],t.point(i[0],i[1],i[2])},LineString:function(i,t){Xl(i.coordinates,t,0)},MultiLineString:function(i,t){for(var e=i.coordinates,n=-1,r=e.length;++n<r;)Xl(e[n],t,0)},Polygon:function(i,t){Su(i.coordinates,t)},MultiPolygon:function(i,t){for(var e=i.coordinates,n=-1,r=e.length;++n<r;)Su(e[n],t)},GeometryCollection:function(i,t){for(var e=i.geometries,n=-1,r=e.length;++n<r;)ao(e[n],t)}};function Xl(i,t,e){var n=-1,r=i.length-e,s;for(t.lineStart();++n<r;)s=i[n],t.point(s[0],s[1],s[2]);t.lineEnd()}function Su(i,t){var e=-1,n=i.length;for(t.polygonStart();++e<n;)Xl(i[e],t,1);t.polygonEnd()}function ci(i,t){i&&vu.hasOwnProperty(i.type)?vu[i.type](i,t):ao(i,t)}function Kr(i){return[zn(i[1],i[0]),Vn(i[2])]}function Cn(i){var t=i[0],e=i[1],n=ae(e);return[n*ae(t),n*ce(t),ce(e)]}function Qr(i,t){return i[0]*t[0]+i[1]*t[1]+i[2]*t[2]}function cr(i,t){return[i[1]*t[2]-i[2]*t[1],i[2]*t[0]-i[0]*t[2],i[0]*t[1]-i[1]*t[0]]}function oo(i,t){i[0]+=t[0],i[1]+=t[1],i[2]+=t[2]}function jr(i,t){return[i[0]*t,i[1]*t,i[2]*t]}function ts(i){var t=Qe(i[0]*i[0]+i[1]*i[1]+i[2]*i[2]);i[0]/=t,i[1]/=t,i[2]/=t}function es(i,t){function e(n,r){return n=i(n,r),t(n[0],n[1])}return i.invert&&t.invert&&(e.invert=function(n,r){return n=t.invert(n,r),n&&i.invert(n[0],n[1])}),e}function ql(i,t){return ee(i)>qt&&(i-=Math.round(i/Fe)*Fe),[i,t]}ql.invert=ql;function Tu(i,t,e){return(i%=Fe)?t||e?es(bu(i),Eu(t,e)):bu(i):t||e?Eu(t,e):ql}function Mu(i){return function(t,e){return t+=i,ee(t)>qt&&(t-=Math.round(t/Fe)*Fe),[t,e]}}function bu(i){var t=Mu(i);return t.invert=Mu(-i),t}function Eu(i,t){var e=ae(i),n=ce(i),r=ae(t),s=ce(t);function a(o,c){var l=ae(c),h=ae(o)*l,f=ce(o)*l,u=ce(c),d=u*e+h*n;return[zn(f*r-d*s,h*e-u*n),Vn(d*r+f*s)]}return a.invert=function(o,c){var l=ae(c),h=ae(o)*l,f=ce(o)*l,u=ce(c),d=u*r-f*s;return[zn(f*r+u*s,h*e+d*n),Vn(d*e-h*n)]},a}function Au(i,t,e,n,r,s){if(e){var a=ae(t),o=ce(t),c=n*e;r==null?(r=t+n*Fe,s=t-c/2):(r=wu(a,r),s=wu(a,s),(n>0?r<s:r>s)&&(r+=n*Fe));for(var l,h=r;n>0?h>s:h<s;h-=c)l=Kr([a,-o*ae(h),-o*ce(h)]),i.point(l[0],l[1])}}function wu(i,t){t=Cn(t),t[0]-=i,ts(t);var e=xu(-t[1]);return((-t[2]<0?-e:e)+Fe-Jt)%Fe}function lo(){var i=[],t;return{point:function(e,n,r){t.push([e,n,r])},lineStart:function(){i.push(t=[])},lineEnd:Re,rejoin:function(){i.length>1&&i.push(i.pop().concat(i.shift()))},result:function(){var e=i;return i=[],t=null,e}}}function hr(i,t){return ee(i[0]-t[0])<Jt&&ee(i[1]-t[1])<Jt}function co(i,t,e,n){this.x=i,this.z=t,this.o=e,this.e=n,this.v=!1,this.n=this.p=null}function ho(i,t,e,n,r){var s=[],a=[],o,c;if(i.forEach(function(g){if(!((S=g.length-1)<=0)){var S,m=g[0],p=g[S],T;if(hr(m,p)){if(!m[2]&&!p[2]){for(r.lineStart(),o=0;o<S;++o)r.point((m=g[o])[0],m[1]);r.lineEnd();return}p[0]+=2*Jt}s.push(T=new co(m,g,null,!0)),a.push(T.o=new co(m,null,T,!1)),s.push(T=new co(p,g,null,!1)),a.push(T.o=new co(p,null,T,!0))}}),!!s.length){for(a.sort(t),Cu(s),Cu(a),o=0,c=a.length;o<c;++o)a[o].e=e=!e;for(var l=s[0],h,f;;){for(var u=l,d=!0;u.v;)if((u=u.n)===l)return;h=u.z,r.lineStart();do{if(u.v=u.o.v=!0,u.e){if(d)for(o=0,c=h.length;o<c;++o)r.point((f=h[o])[0],f[1]);else n(u.x,u.n.x,1,r);u=u.n}else{if(d)for(h=u.p.z,o=h.length-1;o>=0;--o)r.point((f=h[o])[0],f[1]);else n(u.x,u.p.x,-1,r);u=u.p}u=u.o,h=u.z,d=!d}while(!u.v);r.lineEnd()}}}function Cu(i){if(t=i.length){for(var t,e=0,n=i[0],r;++e<t;)n.n=r=i[e],r.p=n,n=r;n.n=r=i[0],r.p=n}}function Yl(i){return ee(i[0])<=qt?i[0]:_u(i[0])*((ee(i[0])+qt)%Fe-qt)}function Ru(i,t){var e=Yl(t),n=t[1],r=ce(n),s=[ce(e),-ae(e),0],a=0,o=0,c=new Ke;r===1?n=He+Jt:r===-1&&(n=-He-Jt);for(var l=0,h=i.length;l<h;++l)if(u=(f=i[l]).length)for(var f,u,d=f[u-1],g=Yl(d),S=d[1]/2+Wl,m=ce(S),p=ae(S),T=0;T<u;++T,g=y,m=M,p=C,d=R){var R=f[T],y=Yl(R),b=R[1]/2+Wl,M=ce(b),C=ae(b),x=y-g,E=x>=0?1:-1,P=E*x,L=P>qt,F=m*M;if(c.add(zn(F*E*ce(P),p*C+F*ae(P))),a+=L?x+E*Fe:x,L^g>=e^y>=e){var O=cr(Cn(d),Cn(R));ts(O);var I=cr(s,O);ts(I);var A=(L^x>=0?-1:1)*Vn(I[2]);(n>A||n===A&&(O[0]||O[1]))&&(o+=L^x>=0?1:-1)}}return(a<-Jt||a<Jt&&c<-mu)^o&1}function uo(i,t,e,n){return function(r){var s=t(r),a=lo(),o=t(a),c=!1,l,h,f,u={point:d,lineStart:S,lineEnd:m,polygonStart:function(){u.point=p,u.lineStart=T,u.lineEnd=R,h=[],l=[]},polygonEnd:function(){u.point=d,u.lineStart=S,u.lineEnd=m,h=lr(h);var y=Ru(l,n);h.length?(c||(r.polygonStart(),c=!0),ho(h,K1,y,e,r)):y&&(c||(r.polygonStart(),c=!0),r.lineStart(),e(null,null,1,r),r.lineEnd()),c&&(r.polygonEnd(),c=!1),h=l=null},sphere:function(){r.polygonStart(),r.lineStart(),e(null,null,1,r),r.lineEnd(),r.polygonEnd()}};function d(y,b){i(y,b)&&r.point(y,b)}function g(y,b){s.point(y,b)}function S(){u.point=g,s.lineStart()}function m(){u.point=d,s.lineEnd()}function p(y,b){f.push([y,b]),o.point(y,b)}function T(){o.lineStart(),f=[]}function R(){p(f[0][0],f[0][1]),o.lineEnd();var y=o.clean(),b=a.result(),M,C=b.length,x,E,P;if(f.pop(),l.push(f),f=null,!!C){if(y&1){if(E=b[0],(x=E.length-1)>0){for(c||(r.polygonStart(),c=!0),r.lineStart(),M=0;M<x;++M)r.point((P=E[M])[0],P[1]);r.lineEnd()}return}C>1&&y&2&&b.push(b.pop().concat(b.shift())),h.push(b.filter($1))}}return u}}function $1(i){return i.length>1}function K1(i,t){return((i=i.x)[0]<0?i[1]-He-Jt:He-i[1])-((t=t.x)[0]<0?t[1]-He-Jt:He-t[1])}var Zl=uo(function(){return!0},Q1,tg,[-qt,-He]);function Q1(i){var t=NaN,e=NaN,n=NaN,r;return{lineStart:function(){i.lineStart(),r=1},point:function(s,a){var o=s>0?qt:-qt,c=ee(s-t);ee(c-qt)<Jt?(i.point(t,e=(e+a)/2>0?He:-He),i.point(n,e),i.lineEnd(),i.lineStart(),i.point(o,e),i.point(s,e),r=0):n!==o&&c>=qt&&(ee(t-n)<Jt&&(t-=n*Jt),ee(s-o)<Jt&&(s-=o*Jt),e=j1(t,e,s,a),i.point(n,e),i.lineEnd(),i.lineStart(),i.point(o,e),r=0),i.point(t=s,e=a),n=o},lineEnd:function(){i.lineEnd(),t=e=NaN},clean:function(){return 2-r}}}function j1(i,t,e,n){var r,s,a=ce(i-e);return ee(a)>Jt?gu((ce(t)*(s=ae(n))*ce(e)-ce(n)*(r=ae(t))*ce(i))/(r*s*a)):(t+n)/2}function tg(i,t,e,n){var r;if(i==null)r=e*He,n.point(-qt,r),n.point(0,r),n.point(qt,r),n.point(qt,0),n.point(qt,-r),n.point(0,-r),n.point(-qt,-r),n.point(-qt,0),n.point(-qt,r);else if(ee(i[0]-t[0])>Jt){var s=i[0]<t[0]?qt:-qt;r=e*s/2,n.point(-s,r),n.point(0,r),n.point(s,r)}else n.point(t[0],t[1])}function Pu(i){var t=ae(i),e=2*Ce,n=t>0,r=ee(t)>Jt;function s(h,f,u,d){Au(d,i,e,u,h,f)}function a(h,f){return ae(h)*ae(f)>t}function o(h){var f,u,d,g,S;return{lineStart:function(){g=d=!1,S=1},point:function(m,p){var T=[m,p],R,y=a(m,p),b=n?y?0:l(m,p):y?l(m+(m<0?qt:-qt),p):0;if(!f&&(g=d=y)&&h.lineStart(),y!==d&&(R=c(f,T),(!R||hr(f,R)||hr(T,R))&&(T[2]=1)),y!==d)S=0,y?(h.lineStart(),R=c(T,f),h.point(R[0],R[1])):(R=c(f,T),h.point(R[0],R[1],2),h.lineEnd()),f=R;else if(r&&f&&n^y){var M;!(b&u)&&(M=c(T,f,!0))&&(S=0,n?(h.lineStart(),h.point(M[0][0],M[0][1]),h.point(M[1][0],M[1][1]),h.lineEnd()):(h.point(M[1][0],M[1][1]),h.lineEnd(),h.lineStart(),h.point(M[0][0],M[0][1],3)))}y&&(!f||!hr(f,T))&&h.point(T[0],T[1]),f=T,d=y,u=b},lineEnd:function(){d&&h.lineEnd(),f=null},clean:function(){return S|(g&&d)<<1}}}function c(h,f,u){var d=Cn(h),g=Cn(f),S=[1,0,0],m=cr(d,g),p=Qr(m,m),T=m[0],R=p-T*T;if(!R)return!u&&h;var y=t*p/R,b=-t*T/R,M=cr(S,m),C=jr(S,y),x=jr(m,b);oo(C,x);var E=M,P=Qr(C,E),L=Qr(E,E),F=P*P-L*(Qr(C,C)-1);if(!(F<0)){var O=Qe(F),I=jr(E,(-P-O)/L);if(oo(I,C),I=Kr(I),!u)return I;var A=h[0],z=f[0],W=h[1],K=f[1],q;z<A&&(q=A,A=z,z=q);var j=z-A,tt=ee(j-qt)<Jt,St=tt||j<Jt;if(!tt&&K<W&&(q=W,W=K,K=q),St?tt?W+K>0^I[1]<(ee(I[0]-A)<Jt?W:K):W<=I[1]&&I[1]<=K:j>qt^(A<=I[0]&&I[0]<=z)){var gt=jr(E,(-P+O)/L);return oo(gt,C),[I,Kr(gt)]}}}function l(h,f){var u=n?i:qt-i,d=0;return h<-u?d|=1:h>u&&(d|=2),f<-u?d|=4:f>u&&(d|=8),d}return uo(a,o,s,n?[0,-i]:[-qt,i-qt])}function Iu(i,t,e,n,r,s){var a=i[0],o=i[1],c=t[0],l=t[1],h=0,f=1,u=c-a,d=l-o,g;if(g=e-a,!(!u&&g>0)){if(g/=u,u<0){if(g<h)return;g<f&&(f=g)}else if(u>0){if(g>f)return;g>h&&(h=g)}if(g=r-a,!(!u&&g<0)){if(g/=u,u<0){if(g>f)return;g>h&&(h=g)}else if(u>0){if(g<h)return;g<f&&(f=g)}if(g=n-o,!(!d&&g>0)){if(g/=d,d<0){if(g<h)return;g<f&&(f=g)}else if(d>0){if(g>f)return;g>h&&(h=g)}if(g=s-o,!(!d&&g<0)){if(g/=d,d<0){if(g>f)return;g>h&&(h=g)}else if(d>0){if(g<h)return;g<f&&(f=g)}return h>0&&(i[0]=a+h*u,i[1]=o+h*d),f<1&&(t[0]=a+f*u,t[1]=o+f*d),!0}}}}}var ns=1e9,fo=-ns;function Jl(i,t,e,n){function r(l,h){return i<=l&&l<=e&&t<=h&&h<=n}function s(l,h,f,u){var d=0,g=0;if(l==null||(d=a(l,f))!==(g=a(h,f))||c(l,h)<0^f>0)do u.point(d===0||d===3?i:e,d>1?n:t);while((d=(d+f+4)%4)!==g);else u.point(h[0],h[1])}function a(l,h){return ee(l[0]-i)<Jt?h>0?0:3:ee(l[0]-e)<Jt?h>0?2:1:ee(l[1]-t)<Jt?h>0?1:0:h>0?3:2}function o(l,h){return c(l.x,h.x)}function c(l,h){var f=a(l,1),u=a(h,1);return f!==u?f-u:f===0?h[1]-l[1]:f===1?l[0]-h[0]:f===2?l[1]-h[1]:h[0]-l[0]}return function(l){var h=l,f=lo(),u,d,g,S,m,p,T,R,y,b,M,C={point:x,lineStart:F,lineEnd:O,polygonStart:P,polygonEnd:L};function x(A,z){r(A,z)&&h.point(A,z)}function E(){for(var A=0,z=0,W=d.length;z<W;++z)for(var K=d[z],q=1,j=K.length,tt=K[0],St,gt,$t=tt[0],Bt=tt[1];q<j;++q)St=$t,gt=Bt,tt=K[q],$t=tt[0],Bt=tt[1],gt<=n?Bt>n&&($t-St)*(n-gt)>(Bt-gt)*(i-St)&&++A:Bt<=n&&($t-St)*(n-gt)<(Bt-gt)*(i-St)&&--A;return A}function P(){h=f,u=[],d=[],M=!0}function L(){var A=E(),z=M&&A,W=(u=lr(u)).length;(z||W)&&(l.polygonStart(),z&&(l.lineStart(),s(null,null,1,l),l.lineEnd()),W&&ho(u,o,A,s,l),l.polygonEnd()),h=l,u=d=g=null}function F(){C.point=I,d&&d.push(g=[]),b=!0,y=!1,T=R=NaN}function O(){u&&(I(S,m),p&&y&&f.rejoin(),u.push(f.result())),C.point=x,y&&h.lineEnd()}function I(A,z){var W=r(A,z);if(d&&g.push([A,z]),b)S=A,m=z,p=W,b=!1,W&&(h.lineStart(),h.point(A,z));else if(W&&y)h.point(A,z);else{var K=[T=Math.max(fo,Math.min(ns,T)),R=Math.max(fo,Math.min(ns,R))],q=[A=Math.max(fo,Math.min(ns,A)),z=Math.max(fo,Math.min(ns,z))];Iu(K,q,i,t,e,n)?(y||(h.lineStart(),h.point(K[0],K[1])),h.point(q[0],q[1]),W||h.lineEnd(),M=!1):W&&(h.lineStart(),h.point(A,z),M=!1)}T=A,R=z,y=W}return C}}var is=i=>i;var $l=new Ke,Kl=new Ke,Lu,Du,Ql,jl,hi={point:Re,lineStart:Re,lineEnd:Re,polygonStart:function(){hi.lineStart=eg,hi.lineEnd=ig},polygonEnd:function(){hi.lineStart=hi.lineEnd=hi.point=Re,$l.add(ee(Kl)),Kl=new Ke},result:function(){var i=$l/2;return $l=new Ke,i}};function eg(){hi.point=ng}function ng(i,t){hi.point=Nu,Lu=Ql=i,Du=jl=t}function Nu(i,t){Kl.add(jl*i-Ql*t),Ql=i,jl=t}function ig(){Nu(Lu,Du)}var tc=hi;var ur=1/0,po=ur,rs=-ur,mo=rs,rg={point:sg,lineStart:Re,lineEnd:Re,polygonStart:Re,polygonEnd:Re,result:function(){var i=[[ur,po],[rs,mo]];return rs=mo=-(po=ur=1/0),i}};function sg(i,t){i<ur&&(ur=i),i>rs&&(rs=i),t<po&&(po=t),t>mo&&(mo=t)}var fr=rg;var ec=0,nc=0,ss=0,go=0,_o=0,dr=0,ic=0,rc=0,as=0,Ou,Bu,Rn,Pn,gn={point:Ei,lineStart:Uu,lineEnd:Fu,polygonStart:function(){gn.lineStart=lg,gn.lineEnd=cg},polygonEnd:function(){gn.point=Ei,gn.lineStart=Uu,gn.lineEnd=Fu},result:function(){var i=as?[ic/as,rc/as]:dr?[go/dr,_o/dr]:ss?[ec/ss,nc/ss]:[NaN,NaN];return ec=nc=ss=go=_o=dr=ic=rc=as=0,i}};function Ei(i,t){ec+=i,nc+=t,++ss}function Uu(){gn.point=ag}function ag(i,t){gn.point=og,Ei(Rn=i,Pn=t)}function og(i,t){var e=i-Rn,n=t-Pn,r=Qe(e*e+n*n);go+=r*(Rn+i)/2,_o+=r*(Pn+t)/2,dr+=r,Ei(Rn=i,Pn=t)}function Fu(){gn.point=Ei}function lg(){gn.point=hg}function cg(){zu(Ou,Bu)}function hg(i,t){gn.point=zu,Ei(Ou=Rn=i,Bu=Pn=t)}function zu(i,t){var e=i-Rn,n=t-Pn,r=Qe(e*e+n*n);go+=r*(Rn+i)/2,_o+=r*(Pn+t)/2,dr+=r,r=Pn*i-Rn*t,ic+=r*(Rn+i),rc+=r*(Pn+t),as+=r*3,Ei(Rn=i,Pn=t)}var sc=gn;function xo(i){this._context=i}xo.prototype={_radius:4.5,pointRadius:function(i){return this._radius=i,this},polygonStart:function(){this._line=0},polygonEnd:function(){this._line=NaN},lineStart:function(){this._point=0},lineEnd:function(){this._line===0&&this._context.closePath(),this._point=NaN},point:function(i,t){switch(this._point){case 0:{this._context.moveTo(i,t),this._point=1;break}case 1:{this._context.lineTo(i,t);break}default:{this._context.moveTo(i+this._radius,t),this._context.arc(i,t,this._radius,0,Fe);break}}},result:Re};var oc=new Ke,ac,Vu,ku,os,ls,vo={point:Re,lineStart:function(){vo.point=ug},lineEnd:function(){ac&&Gu(Vu,ku),vo.point=Re},polygonStart:function(){ac=!0},polygonEnd:function(){ac=null},result:function(){var i=+oc;return oc=new Ke,i}};function ug(i,t){vo.point=Gu,Vu=os=i,ku=ls=t}function Gu(i,t){os-=i,ls-=t,oc.add(Qe(os*os+ls*ls)),os=i,ls=t}var lc=vo;var Hu,yo,Wu,Xu,pr=class{constructor(t){this._append=t==null?qu:fg(t),this._radius=4.5,this._=""}pointRadius(t){return this._radius=+t,this}polygonStart(){this._line=0}polygonEnd(){this._line=NaN}lineStart(){this._point=0}lineEnd(){this._line===0&&(this._+="Z"),this._point=NaN}point(t,e){switch(this._point){case 0:{this._append`M${t},${e}`,this._point=1;break}case 1:{this._append`L${t},${e}`;break}default:{if(this._append`M${t},${e}`,this._radius!==Wu||this._append!==yo){let n=this._radius,r=this._;this._="",this._append`m0,${n}a${n},${n} 0 1,1 0,${-2*n}a${n},${n} 0 1,1 0,${2*n}z`,Wu=n,yo=this._append,Xu=this._,this._=r}this._+=Xu;break}}}result(){let t=this._;return this._="",t.length?t:null}};function qu(i){let t=1;this._+=i[0];for(let e=i.length;t<e;++t)this._+=arguments[t]+i[t]}function fg(i){let t=Math.floor(i);if(!(t>=0))throw new RangeError(`invalid digits: ${i}`);if(t>15)return qu;if(t!==Hu){let e=10**t;Hu=t,yo=function(r){let s=1;this._+=r[0];for(let a=r.length;s<a;++s)this._+=Math.round(arguments[s]*e)/e+r[s]}}return yo}function cc(i,t){let e=3,n=4.5,r,s;function a(o){return o&&(typeof n=="function"&&s.pointRadius(+n.apply(this,arguments)),ci(o,r(s))),s.result()}return a.area=function(o){return ci(o,r(tc)),tc.result()},a.measure=function(o){return ci(o,r(lc)),lc.result()},a.bounds=function(o){return ci(o,r(fr)),fr.result()},a.centroid=function(o){return ci(o,r(sc)),sc.result()},a.projection=function(o){return arguments.length?(r=o==null?(i=null,is):(i=o).stream,a):i},a.context=function(o){return arguments.length?(s=o==null?(t=null,new pr(e)):new xo(t=o),typeof n!="function"&&s.pointRadius(n),a):t},a.pointRadius=function(o){return arguments.length?(n=typeof o=="function"?o:(s.pointRadius(+o),+o),a):n},a.digits=function(o){if(!arguments.length)return e;if(o==null)e=null;else{let c=Math.floor(o);if(!(c>=0))throw new RangeError(`invalid digits: ${o}`);e=c}return t===null&&(s=new pr(e)),a},a.projection(i).digits(e).context(t)}function cs(i){return function(t){var e=new hc;for(var n in i)e[n]=i[n];return e.stream=t,e}}function hc(){}hc.prototype={constructor:hc,point:function(i,t){this.stream.point(i,t)},sphere:function(){this.stream.sphere()},lineStart:function(){this.stream.lineStart()},lineEnd:function(){this.stream.lineEnd()},polygonStart:function(){this.stream.polygonStart()},polygonEnd:function(){this.stream.polygonEnd()}};function uc(i,t,e){var n=i.clipExtent&&i.clipExtent();return i.scale(150).translate([0,0]),n!=null&&i.clipExtent(null),ci(e,i.stream(fr)),t(fr.result()),n!=null&&i.clipExtent(n),i}function fc(i,t,e){return uc(i,function(n){var r=t[1][0]-t[0][0],s=t[1][1]-t[0][1],a=Math.min(r/(n[1][0]-n[0][0]),s/(n[1][1]-n[0][1])),o=+t[0][0]+(r-a*(n[1][0]+n[0][0]))/2,c=+t[0][1]+(s-a*(n[1][1]+n[0][1]))/2;i.scale(150*a).translate([o,c])},e)}function Yu(i,t,e){return fc(i,[[0,0],t],e)}function Zu(i,t,e){return uc(i,function(n){var r=+t,s=r/(n[1][0]-n[0][0]),a=(r-s*(n[1][0]+n[0][0]))/2,o=-s*n[0][1];i.scale(150*s).translate([a,o])},e)}function Ju(i,t,e){return uc(i,function(n){var r=+t,s=r/(n[1][1]-n[0][1]),a=-s*n[0][0],o=(r-s*(n[1][1]+n[0][1]))/2;i.scale(150*s).translate([a,o])},e)}var $u=16,dg=ae(30*Ce);function dc(i,t){return+t?mg(i,t):pg(i)}function pg(i){return cs({point:function(t,e){t=i(t,e),this.stream.point(t[0],t[1])}})}function mg(i,t){function e(n,r,s,a,o,c,l,h,f,u,d,g,S,m){var p=l-n,T=h-r,R=p*p+T*T;if(R>4*t&&S--){var y=a+u,b=o+d,M=c+g,C=Qe(y*y+b*b+M*M),x=Vn(M/=C),E=ee(ee(M)-1)<Jt||ee(s-f)<Jt?(s+f)/2:zn(b,y),P=i(E,x),L=P[0],F=P[1],O=L-n,I=F-r,A=T*O-p*I;(A*A/R>t||ee((p*O+T*I)/R-.5)>.3||a*u+o*d+c*g<dg)&&(e(n,r,s,a,o,c,L,F,E,y/=C,b/=C,M,S,m),m.point(L,F),e(L,F,E,y,b,M,l,h,f,u,d,g,S,m))}}return function(n){var r,s,a,o,c,l,h,f,u,d,g,S,m={point:p,lineStart:T,lineEnd:y,polygonStart:function(){n.polygonStart(),m.lineStart=b},polygonEnd:function(){n.polygonEnd(),m.lineStart=T}};function p(x,E){x=i(x,E),n.point(x[0],x[1])}function T(){f=NaN,m.point=R,n.lineStart()}function R(x,E){var P=Cn([x,E]),L=i(x,E);e(f,u,h,d,g,S,f=L[0],u=L[1],h=x,d=P[0],g=P[1],S=P[2],$u,n),n.point(f,u)}function y(){m.point=p,n.lineEnd()}function b(){T(),m.point=M,m.lineEnd=C}function M(x,E){R(r=x,E),s=f,a=u,o=d,c=g,l=S,m.point=R}function C(){e(f,u,h,d,g,S,s,a,r,o,c,l,$u,n),m.lineEnd=y,y()}return m}}var gg=cs({point:function(i,t){this.stream.point(i*Ce,t*Ce)}});function _g(i){return cs({point:function(t,e){var n=i(t,e);return this.stream.point(n[0],n[1])}})}function xg(i,t,e,n,r){function s(a,o){return a*=n,o*=r,[t+i*a,e-i*o]}return s.invert=function(a,o){return[(a-t)/i*n,(e-o)/i*r]},s}function Ku(i,t,e,n,r,s){if(!s)return xg(i,t,e,n,r);var a=ae(s),o=ce(s),c=a*i,l=o*i,h=a/i,f=o/i,u=(o*e-a*t)/i,d=(o*t+a*e)/i;function g(S,m){return S*=n,m*=r,[c*S-l*m+t,e-l*S-c*m]}return g.invert=function(S,m){return[n*(h*S-f*m+u),r*(d-f*S-h*m)]},g}function pc(i){return vg(function(){return i})()}function vg(i){var t,e=150,n=480,r=250,s=0,a=0,o=0,c=0,l=0,h,f=0,u=1,d=1,g=null,S=Zl,m=null,p,T,R,y=is,b=.5,M,C,x,E,P;function L(A){return x(A[0]*Ce,A[1]*Ce)}function F(A){return A=x.invert(A[0],A[1]),A&&[A[0]*sn,A[1]*sn]}L.stream=function(A){return E&&P===A?E:E=gg(_g(h)(S(M(y(P=A)))))},L.preclip=function(A){return arguments.length?(S=A,g=void 0,I()):S},L.postclip=function(A){return arguments.length?(y=A,m=p=T=R=null,I()):y},L.clipAngle=function(A){return arguments.length?(S=+A?Pu(g=A*Ce):(g=null,Zl),I()):g*sn},L.clipExtent=function(A){return arguments.length?(y=A==null?(m=p=T=R=null,is):Jl(m=+A[0][0],p=+A[0][1],T=+A[1][0],R=+A[1][1]),I()):m==null?null:[[m,p],[T,R]]},L.scale=function(A){return arguments.length?(e=+A,O()):e},L.translate=function(A){return arguments.length?(n=+A[0],r=+A[1],O()):[n,r]},L.center=function(A){return arguments.length?(s=A[0]%360*Ce,a=A[1]%360*Ce,O()):[s*sn,a*sn]},L.rotate=function(A){return arguments.length?(o=A[0]%360*Ce,c=A[1]%360*Ce,l=A.length>2?A[2]%360*Ce:0,O()):[o*sn,c*sn,l*sn]},L.angle=function(A){return arguments.length?(f=A%360*Ce,O()):f*sn},L.reflectX=function(A){return arguments.length?(u=A?-1:1,O()):u<0},L.reflectY=function(A){return arguments.length?(d=A?-1:1,O()):d<0},L.precision=function(A){return arguments.length?(M=dc(C,b=A*A),I()):Qe(b)},L.fitExtent=function(A,z){return fc(L,A,z)},L.fitSize=function(A,z){return Yu(L,A,z)},L.fitWidth=function(A,z){return Zu(L,A,z)},L.fitHeight=function(A,z){return Ju(L,A,z)};function O(){var A=Ku(e,0,0,u,d,f).apply(null,t(s,a)),z=Ku(e,n-A[0],r-A[1],u,d,f);return h=Tu(o,c,l),C=es(t,z),x=es(h,C),M=dc(C,b),I()}function I(){return E=P=null,L}return function(){return t=i.apply(this,arguments),L.invert=t.invert&&F,O()}}function So(i,t){return[i,t]}So.invert=So;function mc(){return pc(So).scale(152.63)}function gc(i){return i}function Mo(i){if(i==null)return gc;var t,e,n=i.scale[0],r=i.scale[1],s=i.translate[0],a=i.translate[1];return function(o,c){c||(t=e=0);var l=2,h=o.length,f=new Array(h);for(f[0]=(t+=o[0])*n+s,f[1]=(e+=o[1])*r+a;l<h;)f[l]=o[l],++l;return f}}function Qu(i,t){for(var e,n=i.length,r=n-t;r<--n;)e=i[r],i[r++]=i[n],i[n]=e}function _c(i,t){return typeof t=="string"&&(t=i.objects[t]),t.type==="GeometryCollection"?{type:"FeatureCollection",features:t.geometries.map(function(e){return ju(i,e)})}:ju(i,t)}function ju(i,t){var e=t.id,n=t.bbox,r=t.properties==null?{}:t.properties,s=xc(i,t);return e==null&&n==null?{type:"Feature",properties:r,geometry:s}:n==null?{type:"Feature",id:e,properties:r,geometry:s}:{type:"Feature",id:e,bbox:n,properties:r,geometry:s}}function xc(i,t){var e=Mo(i.transform),n=i.arcs;function r(h,f){f.length&&f.pop();for(var u=n[h<0?~h:h],d=0,g=u.length;d<g;++d)f.push(e(u[d],d));h<0&&Qu(f,g)}function s(h){return e(h)}function a(h){for(var f=[],u=0,d=h.length;u<d;++u)r(h[u],f);return f.length<2&&f.push(f[0]),f}function o(h){for(var f=a(h);f.length<4;)f.push(f[0]);return f}function c(h){return h.map(o)}function l(h){var f=h.type,u;switch(f){case"GeometryCollection":return{type:f,geometries:h.geometries.map(l)};case"Point":u=s(h.coordinates);break;case"MultiPoint":u=h.coordinates.map(s);break;case"LineString":u=a(h.arcs);break;case"MultiLineString":u=h.arcs.map(a);break;case"Polygon":u=c(h.arcs);break;case"MultiPolygon":u=h.arcs.map(c);break;default:return null}return{type:f,coordinates:u}}return l(t)}var vc={type:"Topology",objects:{land:{type:"GeometryCollection",geometries:[{type:"MultiPolygon",arcs:[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]],[[11]],[[12]],[[13]],[[14]],[[15]],[[16,18]],[[19]],[[20]],[[21]],[[22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44]],[[45]],[[46]],[[47]],[[48]],[[49]],[[50]],[[51]],[[52]],[[53]],[[54]],[[55]],[[56]],[[57]],[[58]],[[59]],[[60]],[[61]],[[62]],[[63]],[[64]],[[65]],[[66]],[[67]],[[68]],[[69]],[[70]],[[71]],[[72]],[[73]],[[74]],[[75]],[[76]],[[77]],[[78]],[[79]],[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]],[[89]],[[90]],[[91]],[[92,115],[114]],[[94]],[[95]],[[96]],[[97]],[[98]],[[99]],[[100]],[[101]],[[102]],[[103]],[[104]],[[105]],[[106]],[[107]],[[108]],[[109]],[[110]],[[111]],[[112]],[[113]],[[116]],[[117]],[[118]],[[119]],[[120]],[[121]],[[122]],[[123]],[[124]],[[125]],[[126]],[[127]],[[128]],[[129]]]}]}},arcs:[[[33452,3290],[-82,-301],[-81,-266],[-582,81],[-621,-35],[-348,197],[0,23],[-152,174],[625,-23],[599,-58],[207,243],[147,208],[288,-243]],[[5775,3611],[-533,-81],[-364,208],[-163,209],[-11,35],[-180,162],[169,220],[517,-93],[277,-185],[212,-209],[76,-266]],[[37457,4468],[342,-255],[120,-359],[33,-254],[11,-301],[-430,-186],[-452,-150],[-522,-139],[-582,-116],[-658,35],[-365,197],[49,243],[593,162],[239,197],[174,254],[126,220],[168,209],[180,243],[141,0],[414,127],[419,-127]],[[16330,7154],[359,-93],[332,104],[-158,-208],[-261,-151],[-386,47],[-278,208],[60,197],[332,-104]],[[15122,7165],[425,-231],[-164,23],[-359,58],[-381,162],[202,127],[277,-139]],[[22505,8080],[305,-81],[304,69],[163,-335],[-217,46],[-337,-23],[-343,23],[-376,-35],[-283,116],[-146,243],[174,104],[353,-81],[403,-46]],[[30985,8657],[33,-266],[-49,-231],[-76,-220],[-326,-81],[-311,-116],[-364,11],[136,232],[-327,-81],[-310,-81],[-212,174],[-16,243],[305,231],[190,70],[321,-23],[82,301],[16,219],[-6,475],[158,278],[256,93],[147,-220],[65,-220],[120,-267],[92,-254],[76,-267]],[[0,529],[16,-5],[245,344],[501,-185],[32,21],[78,49],[94,61],[81,52],[41,26],[41,-1],[29,-10],[402,-246],[352,246],[63,34],[816,104],[265,-138],[130,-71],[419,-196],[789,-151],[625,-185],[1072,-139],[800,162],[1181,-116],[669,-185],[734,174],[773,162],[60,278],[-1094,23],[-898,139],[-234,231],[-745,128],[49,266],[103,243],[104,220],[-55,243],[-462,162],[-212,209],[-430,185],[675,-35],[642,93],[402,-197],[495,173],[457,220],[223,197],[-98,243],[-359,162],[-408,174],[-571,35],[-500,81],[-539,58],[-180,220],[-359,185],[-217,208],[-87,672],[136,-58],[250,-185],[457,58],[441,81],[228,-255],[441,58],[370,127],[348,162],[315,197],[419,58],[-11,220],[-97,220],[81,208],[359,104],[163,-196],[425,115],[321,151],[397,12],[375,57],[376,139],[299,128],[337,127],[218,-35],[190,-46],[414,81],[370,-104],[381,11],[364,81],[375,-57],[414,-58],[386,23],[403,-12],[413,-11],[381,23],[283,174],[337,92],[349,-127],[331,104],[300,208],[179,-185],[98,-208],[180,-197],[288,174],[332,-220],[375,-70],[321,-162],[392,35],[354,104],[418,-23],[376,-81],[381,-104],[147,254],[-180,197],[-136,209],[-359,46],[-158,220],[-60,220],[-98,440],[213,-81],[364,-35],[359,35],[327,-93],[283,-174],[119,-208],[376,-35],[359,81],[381,116],[342,70],[283,-139],[370,46],[239,451],[224,-266],[321,-104],[348,58],[228,-232],[365,-23],[337,-69],[332,-128],[218,220],[108,209],[278,-232],[381,58],[283,-127],[190,-197],[370,58],[288,127],[283,151],[337,81],[392,69],[354,81],[272,127],[163,186],[65,254],[-32,244],[-87,231],[-98,232],[-87,231],[-71,209],[-16,231],[27,232],[130,220],[109,243],[44,231],[-55,255],[-32,232],[136,266],[152,173],[180,220],[190,186],[223,173],[109,255],[152,162],[174,151],[267,34],[174,186],[196,115],[228,70],[202,150],[157,186],[218,69],[163,-151],[-103,-196],[-283,-174],[-120,-127],[-206,92],[-229,-58],[-190,-139],[-202,-150],[-136,-174],[-38,-231],[17,-220],[130,-197],[-190,-139],[-261,-46],[-153,-197],[-163,-185],[-174,-255],[-44,-220],[98,-243],[147,-185],[229,-139],[212,-185],[114,-232],[60,-220],[82,-232],[130,-196],[82,-220],[38,-544],[81,-220],[22,-232],[87,-231],[-38,-313],[-152,-243],[-163,-197],[-370,-81],[-125,-208],[-169,-197],[-419,-220],[-370,-93],[-348,-127],[-376,-128],[-223,-243],[-446,-23],[-489,23],[-441,-46],[-468,0],[87,-232],[424,-104],[311,-162],[174,-208],[-310,-185],[-479,58],[-397,-151],[-17,-243],[-11,-232],[327,-196],[60,-220],[353,-220],[588,-93],[500,-162],[398,-185],[506,-186],[690,-92],[681,-162],[473,-174],[517,-197],[272,-278],[136,-220],[337,209],[457,173],[484,186],[577,150],[495,162],[691,12],[680,-81],[560,-139],[180,255],[386,173],[702,12],[550,127],[522,128],[577,81],[614,104],[430,150],[-196,209],[-119,208],[0,220],[-539,-23],[-571,-93],[-544,0],[-77,220],[39,440],[125,128],[397,138],[468,139],[337,174],[337,174],[251,231],[380,104],[376,81],[190,47],[430,23],[408,81],[343,116],[337,139],[305,139],[386,185],[245,197],[261,173],[82,232],[-294,139],[98,243],[185,185],[288,116],[305,139],[283,185],[217,232],[136,277],[202,163],[331,-35],[136,-197],[332,-23],[11,220],[142,231],[299,-58],[71,-220],[331,-34],[360,104],[348,69],[315,-34],[120,-243],[305,196],[283,105],[315,81],[310,81],[283,139],[310,92],[240,128],[168,208],[207,-151],[288,81],[202,-277],[157,-209],[316,116],[125,232],[283,162],[365,-35],[108,-220],[229,220],[299,69],[326,23],[294,-11],[310,-70],[300,-34],[130,-197],[180,-174],[304,104],[327,24],[315,0],[310,11],[278,81],[294,70],[245,162],[261,104],[283,58],[212,162],[152,324],[158,197],[288,-93],[109,-208],[239,-139],[289,46],[196,-208],[206,-151],[283,139],[98,255],[250,104],[289,197],[272,81],[326,116],[218,127],[228,139],[218,127],[261,-69],[250,208],[180,162],[261,-11],[229,139],[54,208],[234,162],[228,116],[278,93],[256,46],[244,-35],[262,-58],[223,-162],[27,-254],[245,-197],[168,-162],[332,-70],[185,-162],[229,-162],[266,-35],[223,116],[240,243],[261,-127],[272,-70],[261,-69],[272,-46],[277,0],[229,-614],[-11,-150],[-33,-267],[-266,-150],[-218,-220],[38,-232],[310,12],[-38,-232],[-141,-220],[-131,-243],[212,-185],[321,-58],[321,104],[153,232],[92,220],[153,185],[174,174],[70,208],[147,289],[174,58],[316,24],[277,69],[283,93],[136,231],[82,220],[190,220],[272,151],[234,115],[153,197],[157,104],[202,93],[277,-58],[250,58],[272,69],[305,-34],[201,162],[142,393],[103,-162],[131,-278],[234,-115],[266,-47],[267,70],[283,-46],[261,-12],[174,58],[234,-35],[212,-127],[250,81],[300,0],[255,81],[289,-81],[185,197],[141,196],[191,163],[348,439],[179,-81],[212,-162],[185,-208],[354,-359],[272,-12],[256,0],[299,70],[299,81],[229,162],[190,174],[310,23],[207,127],[218,-116],[141,-185],[196,-185],[305,23],[190,-150],[332,-151],[348,-58],[288,47],[218,185],[185,185],[250,46],[251,-81],[288,-58],[261,93],[250,0],[245,-58],[256,-58],[250,104],[299,93],[283,23],[316,0],[255,58],[251,46],[76,290],[11,243],[174,-162],[49,-266],[92,-244],[115,-196],[234,-105],[315,35],[365,12],[250,35],[364,0],[262,11],[364,-23],[310,-46],[196,-186],[-54,-220],[179,-173],[299,-139],[310,-151],[360,-104],[375,-92],[283,-93],[315,-12],[180,197],[245,-162],[212,-185],[245,-139],[337,-58],[321,-69],[136,-232],[316,-139],[212,-208],[310,-93],[321,12],[299,-35],[332,12],[332,-47],[310,-81],[288,-139],[289,-116],[195,-173],[-32,-232],[-147,-208],[-125,-266],[-98,-209],[-131,-243],[-364,-93],[-163,-208],[-360,-127],[-125,-232],[-190,-220],[-201,-185],[-115,-243],[-70,-220],[-28,-266],[6,-220],[158,-232],[60,-220],[130,-208],[517,-81],[109,-255],[-501,-93],[-424,-127],[-528,-23],[-234,-336],[-49,-278],[-119,-220],[-147,-220],[370,-196],[141,-244],[239,-219],[338,-197],[386,-186],[419,-185],[636,-185],[142,-289],[800,-128],[53,-45],[208,-175],[767,151],[636,-186],[-99520,-142]],[[31180,18764],[361,-355],[389,-147],[-125,-296],[-264,-29],[-141,208],[-92,-239],[-238,-183],[-301,67],[-202,177],[-291,86],[-350,330],[-283,317],[-383,662],[229,-124],[390,-395],[369,-212],[143,271],[90,405],[256,244],[198,-70],[106,-274],[139,-443]],[[33736,20389],[222,-266],[-83,-207],[-375,-177],[-125,207],[-236,-266],[-139,266],[333,354],[236,-148],[167,237]],[[69522,21210],[-427,-38],[-7,314],[41,244],[19,121],[179,-186],[263,-74],[9,-112],[-77,-269]],[[90387,26479],[269,-204],[151,81],[217,113],[166,-39],[20,-702],[-95,-203],[-29,-476],[-97,162],[-193,-412],[-57,32],[-171,19],[-171,505],[-38,390],[-160,515],[7,271],[181,-52]],[[98060,26404],[63,-244],[198,239],[80,-249],[0,-249],[-103,-274],[-182,-435],[-142,-238],[103,-284],[-214,-7],[-238,-223],[-75,-387],[-157,-597],[-219,-264],[-138,-169],[-256,13],[-180,194],[-302,42],[-46,217],[149,438],[349,583],[179,111],[200,225],[238,310],[167,306],[123,441],[106,149],[41,330],[195,273],[61,-251]],[[98502,29218],[202,-622],[5,403],[126,-161],[41,-447],[224,-192],[188,-48],[158,226],[141,-69],[-67,-524],[-85,-345],[-212,12],[-74,-179],[26,-254],[-41,-110],[-105,-319],[-138,-404],[-214,-236],[-48,155],[-116,85],[160,486],[-91,326],[-299,236],[8,214],[201,206],[47,455],[-13,382],[-113,396],[8,104],[-133,244],[-218,523],[-117,418],[104,46],[151,-328],[216,-153],[78,-526]],[[96421,37487],[-105,-142],[-153,160],[-199,266],[-179,313],[-184,416],[-38,201],[119,-9],[156,-201],[122,-200],[89,-166],[228,-366],[144,-272]],[[99547,40335],[96,-171],[-46,-308],[-172,-81],[-153,73],[-27,260],[107,203],[126,-74],[69,98]],[[0,40798],[99822,-145],[-177,-124],[-36,220],[139,121],[88,33],[-99836,184]],[[0,41087],[0,-289]],[[0,41087],[57,27],[-34,-284],[-23,-32]],[[96623,40851],[-92,-78],[-93,259],[10,158],[175,-339]],[[96418,41756],[45,-476],[-75,74],[-58,-32],[-39,163],[-6,453],[133,-182]],[[63904,42571],[45,-711],[72,-276],[-28,-284],[-49,-174],[-94,347],[-53,-175],[53,-438],[-24,-250],[-77,-137],[-18,-500],[-109,-689],[-137,-814],[-172,-1120],[-106,-821],[-125,-685],[-226,-140],[-243,-250],[-160,151],[-220,211],[-77,312],[-18,524],[-98,471],[-26,425],[50,426],[128,102],[1,197],[133,447],[25,377],[-65,280],[-52,372],[-23,544],[97,331],[38,375],[138,22],[155,121],[103,107],[122,7],[158,337],[229,364],[83,297],[-38,253],[118,-71],[153,410],[6,356],[92,264],[96,-254],[74,-251],[69,-390]],[[89877,42448],[100,-464],[179,223],[92,-250],[133,-231],[-29,-262],[60,-506],[42,-295],[70,-72],[75,-505],[-27,-307],[90,-400],[301,-309],[197,-281],[186,-257],[-37,-143],[159,-371],[108,-639],[111,130],[113,-256],[68,91],[48,-626],[197,-363],[129,-226],[217,-478],[78,-475],[7,-337],[-19,-365],[132,-502],[-16,-523],[-48,-274],[-75,-527],[6,-339],[-55,-423],[-123,-538],[-205,-290],[-102,-458],[-93,-292],[-82,-510],[-107,-294],[-70,-442],[-36,-407],[14,-187],[-159,-205],[-311,-22],[-257,-242],[-127,-229],[-168,-254],[-230,262],[-170,104],[43,308],[-152,-112],[-243,-428],[-240,160],[-158,94],[-159,42],[-269,171],[-179,364],[-52,449],[-64,298],[-137,240],[-267,71],[91,287],[-67,438],[-136,-408],[-247,-109],[146,327],[42,341],[107,289],[-22,438],[-226,-504],[-174,-202],[-106,-470],[-217,243],[9,313],[-174,429],[-147,221],[52,137],[-356,358],[-195,17],[-267,287],[-498,-56],[-359,-211],[-317,-197],[-265,39],[-294,-303],[-241,-137],[-53,-309],[-103,-240],[-236,-15],[-174,-52],[-246,107],[-199,-64],[-191,-27],[-165,-315],[-81,26],[-140,-167],[-133,-187],[-203,23],[-186,0],[-295,377],[-149,113],[6,338],[138,81],[47,134],[-10,212],[34,411],[-31,350],[-147,598],[-45,337],[12,336],[-111,385],[-7,174],[-123,235],[-35,463],[-158,467],[-39,252],[122,-255],[-93,548],[137,-171],[83,-229],[-5,303],[-138,465],[-26,186],[-65,177],[31,341],[56,146],[38,295],[-29,346],[114,425],[21,-450],[118,406],[225,198],[136,252],[212,217],[126,46],[77,-73],[219,220],[168,66],[42,129],[74,54],[153,-14],[292,173],[151,262],[71,316],[163,300],[13,236],[7,321],[194,502],[117,-510],[119,118],[-99,279],[87,287],[122,-128],[34,449],[152,291],[67,233],[140,101],[4,165],[122,-69],[5,148],[122,85],[134,80],[205,-271],[155,-350],[173,-4],[177,-56],[-59,325],[133,473],[126,155],[-44,147],[121,338],[168,208],[142,-70],[234,111],[-5,302],[-204,195],[148,86],[184,-147],[148,-242],[234,-151],[79,60],[172,-182],[162,169],[105,-51],[65,113],[127,-292],[-74,-316],[-105,-239],[-96,-20],[32,-236],[-81,-295],[-99,-291],[20,-166],[221,-327],[214,-189],[143,-204],[201,-350],[78,1],[145,-151],[43,-183],[265,-200],[183,202],[55,317],[56,262],[34,324],[85,470],[-39,286],[20,171],[-32,339],[37,445],[53,120],[-43,197],[67,313],[52,325],[7,168],[104,222],[78,-289],[19,-371],[70,-71],[11,-249],[101,-300],[21,-335],[-10,-214]],[[95032,44386],[78,-203],[-194,4],[-106,363],[166,-142],[56,-22]],[[83531,44530],[-117,-11],[-368,414],[259,116],[146,-180],[97,-180],[-17,-159]],[[94680,44747],[-108,-14],[-170,60],[-58,91],[17,235],[183,-93],[91,-124],[45,-155]],[[94910,44908],[-42,-109],[-206,512],[-57,353],[94,0],[100,-473],[111,-283]],[[84565,44589],[-238,-130],[-33,71],[25,201],[119,360],[275,235],[32,139],[239,133],[194,20],[87,74],[105,-74],[-102,-160],[-289,-258],[-233,-170],[-181,-441]],[[82749,45797],[100,-158],[172,48],[69,-251],[-321,-119],[-193,-79],[-149,5],[95,340],[153,5],[74,209]],[[84139,45797],[-41,-328],[-417,-168],[-370,73],[0,216],[220,123],[174,-177],[185,45],[249,216]],[[94409,45654],[12,-119],[-218,251],[-152,212],[-104,197],[41,60],[128,-142],[228,-272],[65,-187]],[[93760,46238],[-56,-33],[-121,134],[-114,243],[14,99],[166,-250],[111,-193]],[[80172,46575],[533,-59],[61,244],[515,-284],[101,-383],[417,-108],[341,-351],[-317,-225],[-306,238],[-251,-16],[-288,44],[-260,106],[-322,225],[-204,59],[-116,-74],[-506,243],[-48,254],[-255,44],[191,564],[337,-35],[224,-231],[115,-45],[38,-210]],[[87423,46908],[-143,-402],[-27,445],[49,212],[58,200],[63,-173],[0,-282]],[[93299,46550],[-78,-59],[-120,227],[-122,375],[-59,450],[38,57],[30,-175],[84,-134],[135,-375],[131,-200],[-39,-166]],[[92217,47343],[-146,-48],[-44,-166],[-152,-144],[-142,-138],[-148,1],[-228,171],[-158,165],[23,183],[249,-86],[152,46],[42,283],[40,15],[27,-314],[158,45],[78,202],[155,211],[-30,348],[166,11],[56,-97],[-5,-327],[-93,-361]],[[85346,48536],[-104,-196],[-192,108],[-54,254],[281,29],[69,-195]],[[86241,48752],[101,-452],[-234,244],[-232,49],[-157,-39],[-192,21],[65,325],[344,24],[305,-172]],[[92538,47921],[-87,-157],[-52,348],[-65,229],[-126,193],[-158,252],[-200,174],[77,143],[150,-166],[94,-130],[117,-142],[111,-248],[106,-189],[33,-307]],[[87261,49899],[78,-955],[287,-354],[232,627],[319,356],[247,1],[238,-206],[206,-212],[298,-113],[482,-407],[513,-338],[192,-302],[154,-297],[43,-349],[462,-365],[68,-313],[-256,-64],[62,-393],[248,-388],[180,-627],[159,20],[-11,-262],[215,-100],[-84,-111],[295,-249],[-30,-171],[-184,-41],[-69,153],[-238,66],[-281,89],[-216,377],[-158,325],[-144,517],[-362,259],[-235,-169],[-170,-195],[35,-436],[-218,-203],[-155,99],[-288,25],[-247,485],[-282,118],[-69,-168],[-352,-18],[118,481],[175,164],[-72,642],[-134,496],[-538,500],[-229,50],[-417,546],[-82,-287],[-107,-52],[-63,216],[-1,257],[-212,290],[299,213],[198,-11],[-23,156],[-407,1],[-110,352],[-248,109],[-117,293],[374,143],[142,192],[446,-242],[44,-220]],[[84788,51419],[-223,-587],[-209,-113],[-267,115],[-463,-29],[-243,-85],[-39,-447],[248,-526],[150,268],[518,201],[-22,-272],[-121,86],[-121,-347],[-245,-229],[263,-757],[-50,-203],[249,-682],[-2,-388],[-148,-173],[-109,207],[134,484],[-273,-229],[-69,164],[36,228],[-200,346],[21,576],[-186,-179],[24,-689],[11,-846],[-176,-85],[-119,173],[79,544],[-43,570],[-117,4],[-86,405],[115,387],[40,469],[139,891],[58,243],[237,439],[217,-174],[350,-82],[319,25],[275,429],[48,-132]],[[85746,51249],[-15,-517],[-143,58],[-42,-359],[114,-312],[-78,-71],[-112,374],[-82,755],[56,472],[92,215],[20,-322],[164,-52],[26,-241]],[[79393,47122],[-308,-12],[-234,494],[-356,482],[-119,358],[-210,481],[-138,443],[-212,827],[-244,493],[-81,508],[-103,461],[-250,372],[-145,506],[-209,330],[-290,652],[-24,300],[178,-24],[430,-114],[246,-577],[215,-401],[153,-246],[263,-635],[283,-9],[233,-405],[161,-495],[211,-270],[-111,-482],[159,-205],[100,-15],[47,-412],[97,-330],[204,-52],[135,-374],[-70,-735],[-11,-914]],[[82742,51659],[312,-546],[-329,-70],[-93,-403],[12,-535],[-267,-404],[-7,-589],[-107,-903],[-41,210],[-316,-266],[-110,361],[-198,34],[-139,189],[-330,-212],[-101,285],[-182,-32],[-229,68],[-43,793],[-138,164],[-134,505],[-38,517],[32,548],[165,392],[204,-202],[214,110],[56,500],[119,112],[333,128],[199,467],[137,374],[110,221],[236,323],[214,411],[140,462],[112,2],[143,-299],[13,-257],[183,-165],[231,-177],[-20,-232],[-186,-29],[50,-289],[-205,-201],[-158,-533],[204,-560],[-48,-272]],[[85104,55551],[28,-392],[16,-332],[-94,-540],[-102,602],[-130,-300],[89,-435],[-79,-277],[-327,343],[-78,428],[84,280],[-176,280],[-87,-245],[-131,23],[-205,-330],[-46,173],[109,498],[175,166],[151,223],[98,-268],[212,162],[45,264],[196,15],[-16,457],[225,-280],[23,-297],[20,-218]],[[72560,54241],[-242,-135],[-132,470],[-49,849],[126,959],[192,-328],[129,-416],[134,-616],[-42,-615],[-116,-168]],[[33073,56553],[-232,-65],[-50,53],[81,163],[-6,233],[160,77],[58,-21],[-11,-440]],[[84439,56653],[-100,-195],[-87,-373],[-87,-175],[-171,409],[57,158],[70,165],[30,367],[153,35],[-44,-398],[205,570],[-26,-563]],[[82917,56084],[-369,-561],[136,414],[200,364],[167,409],[146,587],[49,-482],[-183,-325],[-146,-406]],[[83856,57606],[166,-183],[177,1],[-5,-247],[-129,-251],[-176,-178],[-10,275],[20,301],[-43,282]],[[84861,57766],[78,-660],[-214,157],[5,-199],[68,-364],[-132,-133],[-11,416],[-84,31],[-43,357],[163,-47],[-4,224],[-169,451],[266,-13],[77,-220]],[[83757,58301],[-74,-510],[-119,295],[-142,450],[238,-22],[97,-213]],[[83700,61512],[171,-168],[85,153],[26,-150],[-46,-245],[95,-423],[-73,-491],[-164,-196],[-43,-476],[62,-471],[147,-65],[123,70],[347,-328],[-27,-321],[91,-142],[-29,-272],[-216,290],[-103,310],[-71,-217],[-177,354],[-253,-87],[-138,130],[14,244],[87,151],[-83,136],[-36,-213],[-137,340],[-41,257],[-11,566],[112,-195],[29,925],[90,535],[169,-1]],[[31780,61349],[-71,-149],[-209,4],[-163,-21],[-16,253],[40,86],[227,-3],[142,-52],[50,-118]],[[28638,61137],[-84,-99],[-156,95],[-159,215],[34,135],[116,41],[64,-20],[187,-53],[147,-142],[46,-161],[-195,-11]],[[29839,62320],[241,-93],[34,101],[217,-3],[165,-152],[73,15],[50,-209],[152,11],[-9,-176],[124,-21],[136,-217],[-103,-240],[-132,128],[-127,-25],[-92,28],[-50,-107],[-106,-37],[-43,144],[-92,-85],[-111,-405],[-71,94],[-14,170],[-185,100],[-131,-41],[-169,43],[-130,-110],[-149,184],[24,190],[256,-82],[210,-47],[100,131],[-127,256],[2,226],[-175,92],[62,163],[170,-26]],[[80649,61615],[-240,-284],[-228,183],[-8,509],[137,267],[304,166],[159,-14],[62,-226],[-122,-260],[-64,-341]],[[6794,61855],[-41,-99],[-69,84],[8,165],[-46,216],[14,65],[48,97],[-19,116],[16,55],[21,-11],[107,-100],[49,-51],[45,-79],[71,-207],[-7,-33],[-108,-126],[-89,-92]],[[6645,62777],[-94,-43],[-47,125],[-32,48],[-3,37],[27,50],[99,-56],[73,-90],[-23,-71]],[[6456,63091],[-9,-63],[-149,17],[21,72],[137,-26]],[[6207,63177],[-15,-34],[-19,8],[-97,21],[-35,133],[-11,24],[74,82],[23,-38],[80,-196]],[[5737,63567],[-33,-58],[-93,107],[14,43],[43,58],[64,-12],[5,-138]],[[27867,64030],[110,-216],[260,66],[98,-138],[235,-366],[173,-267],[92,8],[165,-120],[-20,-167],[205,-24],[210,-242],[-33,-138],[-185,-75],[-187,-29],[-191,46],[-398,-57],[186,329],[-113,154],[-179,39],[-96,171],[-66,336],[-157,-23],[-259,159],[-83,124],[-362,91],[-97,115],[104,148],[-273,30],[-199,-307],[-115,-8],[-40,-144],[-138,-65],[-118,56],[146,183],[60,213],[126,131],[142,116],[210,56],[67,65],[240,-42],[219,-7],[261,-201]],[[28462,64617],[-68,-29],[-70,340],[-104,171],[60,375],[84,-23],[97,-491],[1,-343]],[[83659,64045],[-119,-485],[-146,499],[-32,438],[163,581],[223,447],[127,-176],[-49,-357],[-167,-947]],[[28383,66284],[-303,-95],[-19,219],[130,47],[184,-18],[8,-153]],[[28611,66290],[-48,-420],[-51,75],[4,309],[-124,234],[-1,67],[220,-265]],[[87399,70756],[35,-203],[-156,-357],[-114,189],[-143,-137],[-73,-346],[-181,168],[2,281],[154,352],[158,-68],[114,248],[204,-127]],[[59604,71655],[-188,-251],[21,-111],[8,-48],[-285,-240],[-136,77],[-64,237],[132,22],[19,3],[40,143],[200,-8],[253,176]],[[56583,71675],[152,-199],[216,34],[207,-42],[-7,-103],[151,71],[-35,-175],[-400,-50],[3,98],[-339,115],[52,251]],[[54311,73167],[-100,-465],[41,-183],[-58,-303],[-213,222],[-141,64],[-387,300],[38,304],[325,-54],[284,64],[211,51]],[[52558,74927],[166,-419],[-39,-782],[-126,38],[-113,-197],[-105,156],[-11,713],[-64,338],[153,-30],[139,183]],[[89159,72524],[-104,-472],[48,-296],[-145,-416],[-355,-278],[-488,-36],[-396,-675],[-186,227],[-12,442],[-483,-130],[-329,-279],[-325,-11],[282,-435],[-186,-1004],[-179,-248],[-135,229],[69,533],[-176,172],[-113,405],[263,182],[145,371],[280,306],[203,403],[553,177],[297,-121],[291,1050],[185,-282],[408,591],[158,229],[174,723],[-47,664],[117,374],[295,108],[152,-819],[-9,-479],[-256,-595],[4,-610]],[[52655,75484],[-92,-456],[-126,120],[-64,398],[56,219],[179,226],[47,-507]],[[89974,76679],[195,-126],[197,250],[62,-663],[-412,-162],[-244,-587],[-436,404],[-152,-646],[-308,-9],[-39,587],[138,455],[296,33],[81,817],[83,460],[326,-615],[213,-198]],[[32315,78082],[202,-79],[257,16],[-137,-242],[-102,-38],[-353,250],[-69,198],[105,183],[97,-288]],[[32831,79592],[-135,-11],[-360,186],[-258,279],[96,49],[365,-148],[284,-247],[8,-108]],[[15692,79240],[-140,-82],[-456,269],[-84,209],[-248,207],[-50,168],[-286,107],[-107,321],[24,137],[291,-129],[171,-89],[261,-63],[94,-204],[138,-280],[277,-244],[115,-327]],[[34407,80527],[-184,-517],[181,199],[187,-126],[-98,-206],[247,-162],[128,144],[277,-182],[-86,-433],[194,101],[36,-313],[86,-367],[-117,-520],[-125,-22],[-183,111],[60,484],[-77,75],[-322,-513],[-166,21],[196,277],[-267,144],[-298,-35],[-539,18],[-43,175],[173,208],[-121,160],[234,356],[287,941],[172,336],[241,204],[129,-26],[-54,-160],[-148,-372]],[[13136,82508],[267,47],[-84,-671],[242,-475],[-111,1],[-167,270],[-103,272],[-140,184],[-51,260],[16,188],[131,-76]],[[89901,80562],[280,-1046],[-411,195],[-171,-854],[271,-605],[-8,-413],[-211,356],[-182,-457],[-51,496],[31,575],[-32,638],[64,446],[13,790],[-163,581],[24,808],[257,271],[-110,274],[123,83],[73,-391],[96,-569],[-7,-581],[114,-597]],[[48114,81456],[-493,-349],[-393,89],[225,617],[-145,601],[378,463],[210,276],[233,24],[298,-365],[-149,-406],[46,-422],[-210,-528]],[[53524,83435],[-166,-478],[-291,333],[-39,246],[408,195],[88,-296]],[[7498,84325],[-277,-225],[-142,152],[-43,277],[252,210],[148,90],[185,-40],[117,-183],[-240,-281]],[[49165,85222],[-297,-639],[283,81],[304,-3],[-72,-481],[-250,-530],[287,-38],[270,-759],[190,-95],[171,-673],[79,-233],[337,-113],[-34,-378],[-142,-173],[111,-305],[-250,-310],[-371,6],[-473,-163],[-130,116],[-183,-276],[-257,67],[-195,-226],[-148,118],[407,621],[249,127],[-436,99],[-79,235],[291,183],[-152,319],[52,387],[414,-54],[40,343],[-190,372],[-337,104],[-66,160],[101,264],[-92,163],[-149,-279],[-17,569],[-140,301],[101,611],[216,480],[222,-47],[335,49]],[[4006,85976],[-171,-92],[-182,110],[-168,161],[274,101],[220,-54],[27,-226]],[[27981,87304],[-108,-310],[-123,50],[-73,176],[13,41],[107,177],[114,-13],[70,-121]],[[27250,87631],[-325,-326],[-196,13],[-61,160],[207,273],[381,-6],[-6,-114]],[[2297,88264],[171,-113],[173,61],[225,-156],[276,-79],[-23,-64],[-211,-125],[-211,128],[-106,107],[-245,-34],[-66,52],[17,223]],[[26344,89371],[51,-259],[143,91],[161,-155],[304,-203],[318,-184],[25,-281],[204,46],[199,-196],[-247,-186],[-432,142],[-156,266],[-275,-314],[-396,-306],[-95,346],[-377,-57],[242,292],[35,465],[95,542],[201,-49]],[[45969,89843],[-64,-382],[314,-403],[-361,-451],[-801,-405],[-240,-107],[-365,87],[-775,187],[273,261],[-605,289],[492,114],[-12,174],[-583,137],[188,385],[421,87],[433,-400],[422,321],[349,-167],[453,315],[461,-42]],[[28926,90253],[-312,-30],[-69,289],[118,331],[255,82],[217,-163],[3,-253],[-32,-82],[-180,-174]],[[0,91325],[681,-451],[728,-588],[-24,-367],[187,-147],[-64,429],[754,-88],[544,-553],[-276,-257],[-455,-61],[-7,-578],[-111,-122],[-260,17],[-212,206],[-369,172],[-62,257],[-283,96],[-315,-76],[-151,207],[60,219],[-333,-140],[126,-278],[-158,-251]],[[0,88971],[0,2354]],[[23431,91410],[-173,-207],[-374,179],[-226,-65],[-380,266],[245,183],[194,256],[295,-168],[166,-106],[84,-112],[169,-226]],[[0,92833],[99999,-404],[-305,-30],[-49,187],[-99645,247]],[[0,92833],[36,24],[235,-1],[402,-169],[-24,-81],[-286,-141],[-363,-36],[0,404]],[[24848,91640],[-1,-604],[371,463],[332,-380],[-83,-438],[269,-399],[290,427],[202,510],[16,648],[394,-45],[411,-87],[373,-293],[17,-293],[-207,-315],[196,-316],[-36,-288],[-544,-413],[-386,-91],[-287,178],[-83,-297],[-268,-498],[-81,-258],[-322,-400],[-397,-39],[-220,-250],[-18,-384],[-323,-74],[-340,-479],[-301,-665],[-108,-466],[-15,-686],[408,-99],[125,-553],[130,-448],[388,117],[517,-256],[277,-225],[199,-279],[348,-162],[294,-249],[459,-34],[302,-58],[-45,-511],[86,-594],[201,-661],[414,-561],[214,192],[150,607],[-145,934],[-196,311],[445,276],[314,415],[154,411],[-22,395],[-189,502],[-338,445],[328,619],[-121,535],[-93,922],[194,137],[476,-161],[286,-57],[230,155],[258,-200],[342,-343],[85,-229],[495,-45],[-8,-496],[92,-747],[254,-92],[201,-348],[402,328],[266,652],[184,274],[216,-527],[362,-754],[307,-709],[-112,-371],[370,-333],[250,-338],[442,-152],[179,-189],[110,-500],[216,-78],[112,-223],[20,-664],[-202,-222],[-199,-207],[-458,-210],[-349,-486],[-470,-96],[-594,125],[-417,4],[-287,-41],[-233,-424],[-354,-262],[-401,-782],[-320,-545],[236,97],[446,776],[583,493],[416,59],[245,-290],[-262,-397],[88,-637],[91,-446],[361,-295],[459,86],[278,664],[19,-429],[180,-214],[-344,-387],[-615,-351],[-276,-239],[-310,-426],[-211,44],[-11,500],[483,488],[-445,-19],[-309,-72],[48,-194],[-296,-286],[-286,-204],[-293,-175],[-159,-386],[-35,-98],[-3,-313],[92,-313],[115,-15],[-29,216],[83,-131],[-22,-169],[-188,-96],[-133,12],[-205,-104],[-121,-29],[-162,-29],[-231,-171],[408,111],[82,-112],[-389,-177],[-177,-1],[8,72],[-84,-164],[82,-27],[-60,-424],[-203,-455],[-20,152],[-61,31],[-91,147],[57,-318],[66,-106],[8,-222],[-89,-230],[-157,-472],[-25,24],[86,402],[-142,226],[-33,490],[-53,-255],[59,-375],[-175,88],[183,-186],[12,-562],[79,-41],[29,-204],[39,-591],[-176,-439],[-288,-175],[-182,-346],[-139,-38],[-141,-217],[-39,-199],[-305,-383],[-157,-281],[-131,-351],[-43,-419],[50,-411],[92,-505],[124,-418],[1,-256],[132,-685],[-9,-398],[-12,-230],[-69,-361],[-83,-74],[-137,71],[-44,259],[-106,136],[-147,508],[-129,452],[-42,231],[57,393],[-77,325],[-217,494],[-108,91],[-281,-269],[-49,30],[-135,276],[-174,146],[-314,-75],[-247,66],[-212,-41],[-118,-83],[54,-166],[-5,-240],[59,-117],[-53,-77],[-103,87],[-104,-112],[-202,18],[-207,313],[-242,-74],[-202,137],[-173,-42],[-234,-138],[-253,-438],[-276,-255],[-152,-282],[-63,-266],[-3,-407],[14,-284],[52,-201],[1,-1],[-1,-1],[-107,-516],[-49,-426],[-20,-791],[-27,-289],[48,-322],[86,-288],[56,-458],[184,-440],[65,-337],[109,-291],[295,-157],[114,-247],[244,165],[212,60],[208,106],[175,101],[176,241],[67,345],[22,496],[48,173],[188,155],[294,137],[246,-21],[169,50],[66,-125],[-9,-285],[-149,-351],[-66,-360],[51,-103],[-42,-255],[-69,-461],[-71,152],[-58,-10],[1,-87],[53,-3],[-5,-160],[-45,-256],[24,-91],[-29,-212],[18,-56],[-32,-299],[-55,-156],[-50,-19],[-55,-205],[90,-107],[24,88],[82,-75],[29,-23],[61,104],[79,8],[26,-48],[43,29],[129,-53],[128,16],[90,65],[32,66],[89,-31],[66,-40],[73,14],[55,51],[127,-82],[44,-13],[85,-110],[80,-132],[101,-91],[73,-162],[-24,-57],[-14,-132],[29,-216],[-64,-202],[-30,-237],[-9,-261],[15,-152],[7,-266],[-43,-58],[-26,-253],[19,-156],[-56,-151],[12,-159],[43,-97],[70,-321],[108,-238],[130,-252],[100,-212],[-6,-125],[111,-27],[26,48],[77,-145],[136,42],[119,150],[168,119],[95,176],[153,-34],[-10,-58],[155,-21],[124,-102],[90,-177],[105,-164],[143,-18],[209,412],[114,63],[3,195],[51,500],[159,274],[175,11],[22,123],[218,-49],[218,298],[109,132],[134,285],[98,-36],[73,-156],[-54,-199],[-8,-139],[-163,-69],[91,-268],[-3,-309],[-123,-343],[105,-469],[120,38],[62,427],[-86,208],[-14,447],[346,241],[-38,278],[97,186],[100,-415],[195,-9],[180,-330],[11,-195],[249,-6],[297,61],[159,-264],[213,-73],[155,184],[4,149],[344,35],[333,9],[-236,-175],[95,-279],[222,-44],[210,-291],[45,-473],[144,13],[109,-139],[183,-217],[171,-385],[8,-304],[105,-14],[149,-289],[109,-205],[333,-119],[30,107],[225,43],[298,-159],[95,-65],[204,-140],[294,-499],[46,-242],[95,28],[69,-327],[155,-1033],[149,-97],[7,-408],[-208,-487],[86,-178],[491,-92],[10,-593],[211,388],[349,-212],[462,-361],[135,-346],[-45,-327],[323,182],[540,-313],[415,23],[411,-489],[355,-662],[214,-170],[237,-24],[101,-186],[94,-752],[46,-358],[-110,-977],[-142,-385],[-391,-822],[-177,-668],[-206,-513],[-69,-11],[-78,-435],[20,-1107],[-77,-910],[-30,-390],[-88,-233],[-49,-790],[-282,-771],[-47,-610],[-225,-256],[-65,-355],[-302,2],[-437,-227],[-195,-263],[-311,-173],[-327,-470],[-235,-586],[-41,-441],[46,-326],[-51,-597],[-63,-289],[-195,-325],[-308,-1040],[-244,-468],[-189,-277],[-127,-562],[-183,-337],[-121,-372],[-313,-328],[-205,118],[-151,-63],[-256,253],[-189,-19],[-169,327],[-19,-308],[353,-506],[-38,-408],[173,-257],[-14,-289],[-267,-757],[-412,-317],[-557,-123],[-305,59],[59,-352],[-57,-442],[51,-298],[-167,-208],[-284,-82],[-267,216],[-108,-155],[39,-587],[188,-178],[152,186],[82,-307],[-255,-183],[-223,-367],[-41,-595],[-66,-316],[-262,-2],[-218,-302],[-80,-443],[274,-433],[265,-119],[-96,-531],[-328,-333],[-180,-692],[-254,-234],[-113,-276],[89,-614],[185,-342],[-117,30],[-247,4],[-134,-145],[-250,-213],[-45,-552],[-118,-14],[-313,192],[-318,412],[-346,338],[-87,374],[79,346],[-140,393],[-36,1007],[119,568],[293,457],[-422,172],[265,522],[94,982],[309,-208],[145,1224],[-186,157],[-87,-738],[-175,83],[87,845],[95,1095],[127,404],[-79,576],[-23,666],[117,19],[170,954],[192,945],[118,881],[-64,885],[83,487],[-34,730],[163,721],[50,1143],[89,1227],[87,1321],[-20,967],[-58,832],[-279,340],[-24,242],[-551,593],[-498,646],[-214,365],[-115,488],[46,170],[-236,775],[-274,1090],[-262,1177],[-114,269],[-87,435],[-216,386],[-198,239],[90,264],[-134,563],[86,414],[221,373],[148,442],[-60,258],[-106,-275],[-166,259],[56,167],[-47,536],[97,89],[52,368],[105,381],[-20,241],[153,126],[190,236],[-37,183],[103,44],[-12,296],[65,214],[138,40],[117,371],[106,310],[-102,141],[52,343],[-62,540],[59,155],[-44,500],[-112,315],[-93,170],[-59,319],[68,158],[-70,40],[-52,195],[-138,165],[-122,-38],[-56,-205],[-112,-149],[-61,-20],[-27,-123],[132,-321],[-75,-76],[-40,-87],[-130,-30],[-48,353],[-36,-101],[-92,35],[-56,238],[-114,39],[-72,69],[-119,-1],[-8,-128],[-32,89],[-151,131],[-56,124],[32,103],[-11,130],[-77,142],[-109,116],[-95,76],[-19,173],[-73,105],[18,-172],[-55,-141],[-64,164],[-89,58],[-38,120],[2,179],[36,187],[-78,83],[64,114],[-96,186],[-130,238],[-61,200],[-117,185],[-140,267],[31,92],[46,-89],[21,41],[-48,185],[-84,52],[-31,-140],[-161,9],[-100,57],[-115,117],[-154,37],[-79,127],[-142,103],[-174,11],[-127,117],[-149,244],[-314,636],[-144,192],[-226,154],[-156,-43],[-223,-223],[-140,-58],[-196,156],[-208,112],[-260,271],[-208,83],[-314,275],[-233,282],[-70,158],[-155,35],[-284,187],[-116,270],[-299,335],[-139,373],[-66,288],[93,57],[-29,169],[64,153],[1,204],[-93,266],[-25,235],[-94,298],[-244,587],[-280,462],[-135,368],[-238,241],[-51,145],[42,365],[-142,137],[-164,288],[-69,412],[-149,48],[-162,311],[-130,288],[-12,184],[-149,446],[-99,452],[5,227],[-201,235],[-93,-26],[-159,163],[-44,-240],[46,-284],[27,-444],[95,-243],[206,-407],[46,-139],[42,-42],[37,-203],[49,8],[56,-381],[85,-150],[59,-210],[174,-300],[92,-550],[83,-259],[77,-277],[15,-311],[134,-20],[112,-268],[100,-264],[-6,-106],[-117,-217],[-49,3],[-74,359],[-182,337],[-200,286],[-142,150],[9,432],[-42,320],[-132,183],[-191,264],[-37,-76],[-70,154],[-171,143],[-164,343],[20,44],[115,-33],[103,221],[10,266],[-214,422],[-163,163],[-102,369],[-103,388],[-129,472],[-113,531],[-46,302],[-180,340],[-130,71],[-30,169],[-156,30],[-100,159],[-258,59],[-70,95],[-34,324],[-270,594],[-231,821],[10,137],[-123,195],[-215,495],[-38,482],[-148,323],[61,489],[-10,507],[-89,453],[109,557],[67,1072],[-50,792],[-88,506],[-80,274],[33,115],[402,-200],[148,-558],[68,156],[-44,485],[-94,484],[-38,1],[-537,581],[-199,255],[-503,245],[-155,523],[40,362],[-356,252],[-48,476],[-336,429],[-6,304],[-153,223],[-245,188],[-78,515],[-358,478],[-150,558],[-267,38],[-441,15],[-326,170],[-574,613],[-266,112],[-486,211],[-385,-50],[-546,271],[-330,252],[-309,-125],[58,-411],[-154,-38],[-321,-123],[-245,-199],[-307,-126],[-40,348],[125,580],[295,182],[-76,148],[-354,-329],[-190,-394],[-400,-420],[203,-287],[-262,-424],[-299,-247],[-278,-181],[-69,-261],[-434,-305],[-87,-278],[-325,-252],[-191,45],[-259,-165],[-282,-201],[-231,-197],[-477,-169],[-43,99],[304,276],[271,182],[296,324],[345,66],[137,243],[385,353],[62,119],[205,208],[48,448],[141,349],[-320,-179],[-90,102],[-150,-215],[-181,300],[-75,-212],[-104,294],[-278,-236],[-170,0],[-24,352],[50,217],[-179,210],[-361,-113],[-235,277],[-190,142],[-1,334],[-214,252],[108,340],[226,330],[99,303],[225,43],[191,-94],[224,285],[201,-51],[212,183],[-52,270],[-155,106],[205,228],[-170,-7],[-295,-128],[-85,-131],[-219,131],[-392,-67],[-407,142],[-117,238],[-351,343],[390,247],[620,289],[228,0],[-38,-295],[586,22],[-225,366],[-342,226],[-197,295],[-267,252],[-381,187],[155,309],[493,19],[350,270],[66,287],[284,281],[271,68],[526,262],[256,-40],[427,315],[421,-124],[201,-266],[123,114],[469,-35],[-16,-136],[425,-101],[283,59],[585,-186],[534,-56],[214,-77],[370,96],[421,-177],[302,-83],[518,-142],[438,-284],[289,-55],[244,247],[336,184],[413,-72],[416,259],[455,148],[191,-245],[207,138],[62,278],[192,-63],[470,-530],[369,401],[38,-448],[341,96],[105,173],[337,-34],[424,-248],[650,-217],[383,-100],[272,38],[375,-300],[-391,-293],[502,-127],[750,70],[236,103],[296,-354],[302,299],[-283,251],[179,202],[338,27],[223,59],[224,-141],[279,-321],[310,47],[491,-266],[431,94],[405,-14],[-32,367],[247,103],[431,-200],[-2,-559],[177,471],[223,-16],[126,594],[-298,364],[-324,239],[22,653],[329,429],[366,-95],[281,-261],[378,-666],[-247,-290],[517,-120]],[[18287,93781],[-139,-277],[618,179],[386,-298],[314,302],[254,-194],[227,-580],[140,244],[-197,606],[244,86],[276,-94],[311,-239],[175,-575],[86,-417],[466,-293],[502,-279],[-31,-260],[-456,-48],[178,-227],[-94,-217],[-503,93],[-478,160],[-322,-36],[-522,-201],[-824,-103],[-374,-41],[-151,279],[-379,161],[-246,-66],[-343,468],[185,62],[429,101],[392,-26],[362,103],[-537,138],[-594,-47],[-394,12],[-146,217],[644,237],[-428,-9],[-485,156],[233,443],[193,235],[744,359],[284,-114]],[[20972,93958],[-244,-390],[-434,413],[95,83],[372,24],[211,-130]],[[28794,93770],[25,-163],[-296,17],[-299,13],[-304,-80],[-80,36],[-306,313],[12,213],[133,39],[636,-63],[479,-325]],[[25955,93803],[219,-369],[256,477],[704,242],[477,-611],[-42,-387],[550,172],[263,235],[616,-299],[383,-282],[36,-258],[515,134],[290,-376],[670,-234],[242,-238],[263,-553],[-510,-275],[654,-386],[441,-130],[400,-543],[437,-39],[-87,-414],[-487,-687],[-342,253],[-437,568],[-359,-74],[-35,-338],[292,-344],[377,-272],[114,-157],[181,-584],[-96,-425],[-350,160],[-697,473],[393,-509],[289,-357],[45,-206],[-753,236],[-596,343],[-337,287],[97,167],[-414,304],[-405,286],[5,-171],[-803,-94],[-235,203],[183,435],[522,10],[571,76],[-92,211],[96,294],[360,576],[-77,261],[-107,203],[-425,286],[-563,201],[178,150],[-294,367],[-245,34],[-219,201],[-149,-175],[-503,-76],[-1011,132],[-588,174],[-450,89],[-231,207],[290,270],[-394,2],[-88,599],[213,528],[286,241],[717,158],[-204,-382]],[[22123,94208],[331,-124],[496,75],[72,-172],[-259,-283],[420,-254],[-50,-532],[-455,-229],[-268,50],[-192,225],[-690,456],[5,189],[567,-73],[-306,386],[329,286]],[[89889,93835],[-421,-4],[-569,66],[-49,31],[263,234],[348,54],[394,-226],[34,-155]],[[24112,93575],[-298,-442],[-317,22],[-173,519],[4,294],[145,251],[276,161],[579,-20],[530,-144],[-415,-526],[-331,-115]],[[16539,92764],[-731,-294],[-147,259],[-641,312],[93,193],[218,489],[241,388],[-272,362],[939,93],[397,-123],[709,-33],[270,-171],[298,-249],[-349,-149],[-681,-415],[-344,-414],[0,-248]],[[91869,94941],[-321,-234],[-444,53],[-516,233],[66,192],[518,-89],[697,-155]],[[23996,94879],[-151,-229],[-403,44],[-337,155],[148,266],[399,159],[243,-208],[101,-187]],[[90301,95224],[-219,-439],[-1023,16],[-461,-139],[-550,384],[149,406],[366,111],[734,-26],[1004,-313]],[[22639,95907],[212,-273],[9,-303],[-127,-440],[-458,-60],[-298,94],[5,345],[-455,-46],[-18,457],[299,-18],[419,201],[390,-34],[22,77]],[[19941,95601],[109,-210],[247,99],[291,-26],[49,-289],[-169,-281],[-940,-91],[-701,-256],[-423,-14],[-35,193],[577,261],[-1255,-70],[-389,106],[379,577],[262,165],[782,-199],[493,-350],[485,-45],[-397,565],[255,215],[286,-68],[94,-282]],[[65981,92363],[-164,-52],[-907,77],[-74,262],[-503,158],[-40,320],[284,126],[-10,323],[551,503],[-255,73],[665,518],[-75,268],[621,312],[917,380],[925,110],[475,220],[541,76],[193,-233],[-187,-184],[-984,-293],[-848,-282],[-863,-562],[-414,-577],[-435,-568],[56,-491],[531,-484]],[[23699,96131],[308,-190],[547,1],[240,-194],[-64,-222],[319,-134],[177,-140],[374,-26],[406,-50],[441,128],[566,51],[451,-42],[298,-223],[62,-244],[-174,-157],[-414,-127],[-355,72],[-797,-91],[-570,-11],[-449,73],[-738,190],[-96,325],[-34,293],[-279,258],[-574,72],[-322,183],[104,242],[573,-37]],[[17722,96454],[-38,-454],[-214,-205],[-259,-29],[-517,-252],[-444,-91],[-377,128],[472,442],[570,383],[426,-9],[381,87]],[[63641,74970],[141,-419],[130,-28],[85,-159],[-228,-47],[-49,-459],[-47,-207],[-102,-138],[7,-293],[88,-436],[263,-123],[193,-296],[395,-102],[434,156],[27,139],[-52,417],[40,618],[-216,200],[71,405],[-184,34],[61,498],[262,-145],[244,189],[-202,355],[-80,338],[-224,-151],[-28,-433],[-87,383],[-15,144],[68,246],[-53,206],[-322,202],[-125,530],[-154,150],[-9,192],[270,-56],[11,432],[236,96],[243,-88],[50,576],[-50,365],[-278,-28],[-236,144],[-321,-260],[-259,-124],[-127,-350],[-269,-97],[-276,-610],[252,-561],[-27,-398],[303,-696],[146,-311]],[[0,88971],[99997,-3],[-357,-260],[-360,44],[250,-315],[166,-487],[128,-159],[32,-244],[-71,-157],[-518,129],[-777,-445],[-247,-69],[-425,-415],[-403,-362],[-102,-269],[-397,409],[-724,-464],[-126,220],[-268,-254],[-371,81],[-90,-388],[-333,-572],[10,-239],[316,-132],[-37,-860],[-258,-22],[-119,-494],[116,-255],[-486,-301],[-96,-675],[-415,-144],[-83,-600],[-400,-551],[-103,407],[-119,862],[-155,1313],[134,819],[234,353],[15,276],[431,132],[496,744],[479,608],[499,471],[223,833],[-337,-50],[-167,-487],[-705,-648],[-227,726],[-717,-201],[-696,-990],[230,-362],[-620,-154],[-430,-61],[20,427],[-431,90],[-344,-291],[-850,102],[-913,-175],[-900,-1153],[-1065,-1394],[438,-74],[136,-370],[270,-132],[178,296],[305,-39],[401,-650],[9,-502],[-217,-591],[-23,-705],[-126,-945],[-418,-855],[-94,-409],[-377,-688],[-374,-682],[-179,-349],[-370,-346],[-175,-8],[-175,287],[-373,-432],[-43,-197],[-106,36],[-120,-201],[-83,-201],[10,-424],[-143,-130],[-50,-105],[-104,-174],[-185,-97],[-121,-159],[-9,-256],[-32,-65],[111,-96],[157,-259],[240,-697],[68,-383],[3,-681],[-105,-325],[-252,-113],[-222,-245],[-250,-51],[-31,322],[52,443],[-123,615],[206,99],[-190,506],[-135,113],[-34,-112],[-81,-49],[-10,112],[-72,54],[-75,94],[77,260],[65,69],[-25,108],[71,319],[-18,97],[-163,64],[-131,158],[-388,-171],[-204,-277],[-300,-161],[148,274],[-58,230],[220,397],[-147,310],[-242,-209],[-314,-411],[-171,-381],[-272,-29],[-142,-275],[147,-400],[227,-97],[9,-265],[220,-172],[311,421],[247,-230],[179,-15],[46,-310],[-394,-165],[-130,-319],[-270,-296],[-142,-414],[299,-324],[109,-582],[169,-541],[189,-454],[-5,-439],[-174,-161],[66,-315],[164,-184],[-43,-481],[-71,-468],[-155,-53],[-203,-640],[-225,-775],[-258,-705],[-382,-545],[-386,-498],[-313,-68],[-170,-262],[-96,192],[-157,-294],[-388,-296],[-294,-90],[-95,-624],[-154,-35],[-73,429],[66,228],[-373,190],[-131,-97],[-371,-505],[-231,-558],[-61,-410],[212,-623],[260,-772],[252,-365],[169,-475],[127,-1093],[-37,-1039],[-232,-389],[-318,-381],[-227,-492],[-346,-550],[-101,378],[78,401],[-206,335],[-233,87],[-112,307],[-141,611],[-249,271],[-238,-11],[41,464],[-245,-3],[-22,-650],[-150,-863],[-90,-522],[19,-428],[181,-18],[113,-539],[50,-512],[155,-338],[168,-69],[144,-306],[64,-56],[164,-356],[116,-396],[16,-398],[-29,-269],[27,-203],[20,-349],[98,-163],[109,-523],[-5,-199],[-197,-40],[-263,438],[-329,469],[-32,301],[-161,395],[-38,489],[-100,322],[30,431],[-61,250],[-110,227],[-47,292],[-148,334],[-135,280],[-45,-347],[-53,328],[30,369],[82,566],[-27,439],[86,452],[-94,350],[23,644],[-113,306],[-90,707],[-50,746],[-121,490],[-183,-297],[-315,-421],[-156,53],[-172,138],[96,732],[-58,554],[-218,681],[34,213],[-163,76],[-197,481],[-79,309],[-16,301],[-53,284],[-116,344],[-256,23],[25,-243],[-87,-329],[-118,120],[-41,-108],[-78,65],[-108,53],[-39,-216],[-189,7],[-343,-122],[16,-445],[-148,-349],[-400,-398],[-311,-695],[-209,-373],[-276,-386],[-1,-272],[-138,-146],[-250,-212],[-130,-31],[-84,-450],[58,-769],[15,-490],[-118,-561],[-1,-1004],[-144,-29],[-126,-450],[84,-195],[-253,-167],[-93,-402],[-112,-170],[-263,552],[-128,827],[-107,596],[-97,279],[-148,568],[-69,739],[-48,369],[-253,811],[-115,1145],[-83,756],[1,716],[-54,553],[-404,-353],[-196,70],[-362,716],[133,214],[-82,232],[-326,501],[-203,150],[-83,425],[-215,449],[-512,-111],[-451,-11],[-391,-83],[-523,179],[-302,136],[-314,76],[-118,725],[-133,105],[-214,-106],[-280,-286],[-339,196],[-281,454],[-267,168],[-186,561],[-205,788],[-149,-96],[-177,196],[-103,-231],[-165,29],[58,-261],[-25,-135],[89,-445],[109,-510],[137,-135],[47,-207],[190,-248],[16,-244],[-27,-197],[35,-199],[80,-165],[37,-194],[41,-145],[-18,430],[75,310],[76,64],[84,-186],[5,-345],[-61,-348],[53,-226],[49,29],[11,-162],[217,93],[230,-15],[168,-18],[190,400],[207,379],[176,364],[80,201],[35,-51],[-26,-244],[-37,-108],[38,-466],[125,-404],[155,-214],[204,-78],[164,-107],[125,-339],[75,-196],[100,-75],[-1,-132],[-101,-352],[-44,-166],[-117,-189],[-104,-404],[-126,31],[-58,-141],[-44,-300],[34,-395],[-26,-72],[-128,2],[-174,-221],[-27,-288],[-63,-125],[-173,5],[-109,-149],[1,-239],[-134,-164],[-153,56],[-186,-199],[-128,-33],[-201,-159],[-54,-263],[-6,-201],[-277,-249],[-444,-276],[-249,-417],[-122,-32],[-83,34],[-163,-245],[-177,-113],[-233,-31],[-70,-34],[-61,-156],[-73,-43],[-42,-150],[-138,13],[-89,-80],[-192,30],[-72,345],[8,323],[-46,174],[-54,437],[-80,243],[56,29],[-29,270],[34,114],[-12,257],[-36,253],[-84,177],[-22,236],[-143,212],[-148,495],[-79,482],[-192,406],[-124,97],[-184,563],[-32,411],[12,350],[-159,655],[-130,231],[-150,122],[-92,339],[15,133],[-77,307],[-81,131],[-108,440],[-170,476],[-141,406],[-139,-3],[44,325],[12,206],[34,236],[-9,86],[-78,-238],[-60,-446],[-75,-308],[-65,-103],[-93,191],[-125,263],[-198,847],[-29,-53],[115,-624],[171,-594],[210,-920],[102,-321],[90,-334],[249,-654],[-55,-103],[9,-384],[323,-530],[49,-121],[90,-580],[-61,-107],[40,-608],[102,-706],[106,-145],[152,-219],[161,-683],[77,-543],[152,-288],[379,-558],[154,-336],[151,-341],[87,-203],[136,-178],[66,-183],[-9,-245],[-158,-142],[119,-161],[91,-109],[54,-244],[125,-248],[138,-2],[262,151],[302,70],[245,184],[138,39],[99,108],[158,20],[89,12],[128,88],[147,59],[132,202],[105,2],[6,-163],[-25,-344],[1,-310],[-59,-214],[-78,-639],[-134,-659],[-172,-755],[-238,-866],[-237,-661],[-327,-806],[-278,-479],[-415,-586],[-259,-450],[-304,-715],[-64,-312],[-63,-140],[-195,-236],[-68,-246],[-104,-44],[-40,-416],[-89,-238],[-54,-393],[-112,-195],[-128,-728],[16,-335],[178,-216],[8,-153],[-76,-357],[16,-180],[-18,-282],[97,-370],[115,-583],[101,-129],[45,-265],[-11,-588],[34,-519],[11,-923],[49,-290],[-83,-422],[-108,-410],[-177,-366],[-254,-225],[-313,-287],[-313,-634],[-107,-108],[-194,-420],[-115,-136],[-23,-421],[132,-448],[54,-346],[4,-177],[49,29],[-8,-579],[-45,-274],[65,-102],[-41,-246],[-116,-210],[-229,-199],[-334,-320],[-122,-219],[24,-248],[71,-40],[-24,-311],[-70,-430],[-32,-491],[-72,-267],[-190,-298],[-54,-86],[-118,-300],[-77,-303],[-158,-424],[-314,-609],[-196,-355],[-209,-269],[-291,-229],[-141,-31],[-36,-164],[-169,88],[-138,-113],[-301,114],[-168,-72],[-115,31],[-286,-233],[-238,-94],[-171,-223],[-127,-14],[-117,210],[-94,11],[-120,264],[-13,-82],[-37,159],[2,346],[-90,396],[89,108],[-7,453],[-182,553],[-139,501],[-1,1],[-199,768],[-207,446],[-108,432],[-62,575],[-68,428],[-93,910],[-7,707],[-35,322],[-108,243],[-144,489],[-146,708],[-60,371],[-226,577],[-17,453],[-26,372],[38,519],[96,541],[15,254],[90,532],[66,243],[159,386],[90,263],[29,438],[-15,335],[-83,211],[-74,358],[-68,355],[15,122],[85,235],[-84,570],[-57,396],[-139,374],[26,115],[-39,183],[-74,444],[-228,626],[-285,596],[-184,488],[-169,610],[9,196],[61,189],[67,430],[56,438],[-52,90],[96,663],[40,467],[-108,390],[-127,100],[-56,265],[-71,85],[3,163],[-289,-213],[-105,32],[-107,-133],[-222,13],[-149,370],[-91,427],[-197,390],[-209,-8],[-245,1],[-229,-69],[-224,-126],[-436,-346],[-154,-203],[-250,-171],[-248,168],[-126,-7],[-194,116],[-178,-7],[-329,-103],[-193,-170],[-275,-217],[-54,15],[-73,-5],[-286,282],[-252,450],[-237,323],[-187,381],[-75,44],[-200,238],[-144,316],[-49,216],[-34,437],[-122,349],[-108,232],[-71,76],[-69,118],[-32,261],[-41,130],[-80,97],[-149,247],[-117,39],[-63,166],[1,90],[-84,125],[-18,127],[-46,453],[36,262],[-115,460],[-138,210],[122,112],[134,415],[66,304],[-24,318],[78,291],[34,557],[-30,583],[-34,294],[28,295],[-72,281],[-146,255],[12,249],[13,274],[106,161],[91,308],[-18,200],[96,417],[155,376],[93,95],[74,344],[6,315],[100,365],[185,216],[177,603],[144,235],[259,66],[219,403],[139,158],[232,493],[-70,735],[106,508],[37,312],[179,399],[278,270],[206,244],[186,612],[87,362],[205,-2],[167,-251],[264,41],[288,-131],[121,-6],[267,323],[300,102],[175,244],[268,180],[471,105],[459,48],[140,-87],[262,232],[297,5],[113,-137],[190,35],[302,239],[195,-71],[-9,-299],[236,217],[20,-113],[-139,-289],[-2,-274],[96,-147],[-36,-511],[-183,-297],[53,-322],[143,-10],[70,-281],[106,-92],[326,-204],[117,51],[232,-98],[368,-264],[130,-526],[250,-114],[391,-248],[296,-293],[136,153],[133,272],[-65,452],[87,288],[200,277],[192,80],[375,-121],[95,-264],[104,-2],[88,-101],[276,-69],[68,-196],[369,10],[268,-156],[275,-175],[129,-92],[214,188],[114,169],[245,49],[198,-75],[75,-293],[65,193],[222,-140],[217,-33],[137,149],[80,194],[-19,34],[74,276],[56,446],[40,149],[8,6],[99,482],[138,416],[5,21],[-26,452],[68,243],[-102,268],[105,222],[-169,-51],[-233,136],[-191,-340],[-421,-66],[-225,317],[-300,20],[-64,-245],[-192,-71],[-268,315],[-303,-10],[-165,587],[-203,328],[135,459],[-176,283],[308,565],[428,23],[117,449],[529,-78],[334,383],[324,167],[459,13],[485,-416],[399,-229],[323,91],[239,-53],[328,309],[42,252],[-70,403],[-160,218],[-154,68],[-102,181],[-354,499],[-317,223],[-240,347],[202,95],[231,494],[-156,234],[410,241],[-8,129],[-249,-95],[-222,-48],[-185,-191],[-260,-31],[-239,-220],[16,-368],[136,-142],[284,35],[-55,-210],[-304,-103],[-377,-342],[-154,121],[61,277],[-304,173],[50,113],[265,197],[-80,135],[-432,149],[-19,221],[-257,-73],[-103,-325],[-215,-437],[6,-152],[-135,-128],[-84,56],[-78,-713],[-144,-245],[-101,-422],[89,-337],[33,-228],[243,-190],[-51,-145],[-330,-33],[-118,-182],[-232,-319],[-87,275],[3,122],[-169,17],[-145,56],[-336,-154],[192,-332],[-141,-96],[-154,0],[-147,304],[-52,-130],[62,-353],[139,-277],[-105,-130],[155,-272],[137,-171],[4,-334],[-257,157],[82,-302],[-176,-62],[105,-521],[-184,-7],[-228,257],[-104,472],[-49,393],[-108,272],[-143,337],[-18,168],[-48,41],[-5,130],[-154,199],[-24,281],[23,403],[38,184],[-46,93],[-59,46],[-78,192],[-120,118],[-261,218],[-161,213],[-254,176],[-233,435],[56,44],[-127,248],[-5,200],[-179,93],[-85,-255],[-82,198],[6,205],[10,9],[62,54],[-221,86],[-226,-210],[15,-293],[-34,-168],[91,-301],[261,-298],[140,-488],[309,-476],[217,3],[68,-130],[-78,-118],[249,-213],[204,-179],[238,-308],[29,-111],[-52,-211],[-154,276],[-242,97],[-116,-382],[200,-219],[-33,-309],[-116,-35],[-148,-506],[-116,-46],[1,181],[57,317],[60,126],[-108,342],[-85,298],[-115,74],[-82,255],[-179,107],[-120,238],[-206,38],[-217,267],[-254,384],[-189,341],[-86,584],[-138,68],[-226,195],[-128,-80],[-161,-274],[-115,-43],[-252,-334],[-548,160],[-404,-192],[-32,-355],[15,-344],[-263,-393],[-356,-125],[-25,-199],[-171,-327],[-107,-481],[108,-338],[-160,-263],[-60,-384],[-210,-118],[-197,-455],[-352,-8],[-265,11],[-174,-209],[-106,-223],[-136,49],[-103,199],[-79,340],[-259,92],[-112,-153],[-146,83],[-143,-65],[42,462],[-26,363],[-124,55],[-67,224],[22,386],[111,215],[20,239],[58,355],[-6,250],[-56,212],[-12,200],[14,420],[-114,257],[393,426],[340,-107],[373,4],[296,-101],[230,31],[449,-19],[144,354],[53,1177],[-287,620],[-205,299],[-424,228],[-28,430],[360,129],[466,-152],[-88,669],[263,-254],[646,461],[84,484],[243,119],[222,117],[143,162],[244,870],[380,247],[231,-17],[54,125],[232,32],[52,-130],[188,291],[-63,222],[-13,335],[-113,328],[-8,604],[46,159],[80,178],[244,36],[98,163],[223,167],[-9,-304],[-82,-192],[33,-166],[151,-89],[-68,-223],[-83,64],[-200,-425],[76,-288],[4,-228],[281,-138],[-3,-210],[283,111],[156,162],[313,-233],[132,-189],[189,174],[434,273],[350,200],[277,-100],[21,-144],[268,-7],[63,260],[383,191],[-59,497],[10,445],[136,371],[262,202],[221,-442],[223,12],[53,453],[32,349],[-102,-75],[-176,210],[-24,340],[351,164],[350,86],[301,-97],[287,17],[316,327],[-291,280],[-504,-47],[-489,-216],[-452,-125],[-161,322],[-269,195],[62,581],[-135,534],[133,344],[252,371],[635,640],[185,124],[-28,250],[-387,279],[-478,-167],[-269,-413],[43,-361],[-441,-475],[-537,-509],[-202,-832],[198,-416],[265,-328],[-255,-666],[-289,-138],[-106,-992],[-157,-554],[-337,57],[-158,-468],[-321,-27],[-89,558],[-232,671],[-211,835],[-187,363],[-548,-684],[-370,-138],[-385,301],[-99,635],[-88,1364],[256,380],[733,496],[549,609],[508,824],[668,1141],[465,444],[763,741],[610,259],[457,-31],[423,489],[506,-26],[499,118],[869,-433],[-358,-158],[305,-371],[286,206],[456,-358],[761,-140],[1050,-668],[213,-281],[18,-393],[-308,-311],[-454,-157],[-1240,449],[-204,-75],[453,-433],[36,-878],[358,-180],[217,-153],[36,286],[-174,263],[183,215],[672,-368],[234,144],[-187,433],[647,578],[256,-34],[260,-206],[161,406],[-231,352],[136,353],[-204,367],[777,-190],[158,-331],[-351,-73],[2,-328],[218,-203],[429,128],[68,377],[581,282],[969,507],[209,-29],[-273,-359],[344,-61],[199,202],[521,16],[412,245],[317,-356],[315,391],[-291,343],[145,195],[820,-179],[385,-185],[1006,-675],[186,309],[-282,313],[-8,125],[-335,58],[92,280],[-149,461],[-8,189],[512,535],[182,537],[207,116],[735,-156],[58,-328],[-263,-479],[173,-189],[89,-413],[-63,-809],[307,-362],[-120,-395],[-544,-839],[318,-87],[110,213],[306,151],[74,293],[240,281],[-162,336],[130,390],[-304,49],[-67,328],[222,594],[-361,481],[497,398],[-64,421],[139,13],[145,-328],[-109,-570],[297,-108],[-127,426],[465,233],[577,31],[513,-337],[-247,492],[-28,630],[484,119],[668,-26],[602,77],[-226,309],[321,388],[319,16],[540,293],[734,79],[93,162],[729,55],[227,-133],[624,314],[510,-10],[77,255],[265,252],[656,242],[476,-191],[-378,-146],[629,-90],[75,-292],[254,143],[812,-7],[626,-289],[223,-221],[-69,-307],[-307,-175],[-730,-328],[-209,-175],[345,-83],[410,-149],[250,112],[142,-379],[122,153],[444,93],[892,-97],[67,-276],[1162,-88],[15,451],[590,-103],[443,3],[449,-312],[128,-378],[-165,-247],[349,-465],[437,-240],[268,620],[446,-266],[473,159],[538,-182],[204,166],[455,-83],[-201,549],[367,256],[2509,-384],[236,-351],[727,-451],[1122,112],[553,-98],[231,-244],[-33,-432],[342,-168],[372,121],[492,15],[525,-116],[526,66],[484,-526],[344,189],[-224,378],[123,263],[886,-166],[578,36],[799,-282],[-99610,-258]],[[23933,96380],[-126,-17],[-521,38],[-74,165],[559,-9],[195,-109],[-33,-68]],[[19392,96485],[-518,-170],[-411,191],[224,188],[406,60],[392,-92],[-93,-177]],[[56867,96577],[-620,-241],[-490,137],[191,152],[-167,189],[575,119],[110,-222],[401,-134]],[[19538,97019],[-339,-115],[-461,1],[5,84],[285,177],[149,-27],[361,-120]],[[23380,96697],[-411,-122],[-226,138],[-119,221],[-22,245],[360,-24],[162,-39],[332,-205],[-76,-214]],[[22205,96856],[108,-247],[-453,66],[-457,192],[-619,21],[268,176],[-335,142],[-21,227],[546,-81],[751,-215],[212,-281]],[[79187,96845],[-1566,-228],[507,776],[229,66],[208,-38],[704,-336],[-82,-240]],[[55069,97669],[915,-440],[-699,-233],[-155,-435],[-243,-111],[-132,-490],[-335,-23],[-598,361],[252,210],[-416,170],[-541,499],[-216,463],[757,212],[152,-207],[396,8],[105,202],[408,20],[350,-206]],[[57068,98086],[545,-207],[-412,-318],[-806,-70],[-819,98],[-50,163],[-398,11],[-304,271],[858,165],[403,-142],[281,177],[702,-148]],[[64204,98169],[-373,-78],[-250,-45],[-39,-97],[-324,-98],[-301,140],[158,185],[-618,18],[542,107],[422,8],[57,-160],[159,142],[262,97],[412,-129],[-107,-90]],[[77760,97184],[-606,-73],[-773,170],[-462,226],[-213,423],[-379,117],[722,404],[600,133],[540,-297],[640,-572],[-69,-531]],[[25828,97644],[334,-190],[-381,-176],[-513,-445],[-492,-42],[-575,76],[-299,240],[4,215],[220,157],[-508,-4],[-306,196],[-176,268],[193,262],[192,180],[285,42],[-122,135],[646,30],[355,-315],[468,-127],[455,-112],[220,-390]],[[30972,99681],[742,-47],[597,-75],[508,-161],[-12,-157],[-678,-257],[-672,-119],[-251,-133],[605,3],[-656,-358],[-452,-167],[-476,-483],[-573,-98],[-177,-120],[-841,-64],[383,-74],[-192,-105],[230,-292],[-264,-202],[-429,-167],[-132,-232],[-388,-176],[39,-134],[475,23],[6,-144],[-742,-355],[-726,163],[-816,-91],[-414,71],[-525,31],[-35,284],[514,133],[-137,427],[170,41],[742,-255],[-379,379],[-450,113],[225,229],[492,141],[79,206],[-392,231],[-118,304],[759,-26],[220,-64],[433,216],[-625,68],[-972,-38],[-491,201],[-232,239],[-324,173],[-61,202],[413,112],[324,19],[545,96],[409,220],[344,-30],[300,-166],[211,319],[367,95],[498,65],[849,24],[148,-63],[802,100],[601,-38],[602,-37]],[[42472,99925],[1737,-469],[-513,-227],[-1062,-26],[-1496,-58],[140,-105],[984,65],[836,-204],[540,181],[231,-212],[-305,-344],[707,220],[1348,229],[833,-114],[156,-253],[-1132,-420],[-157,-136],[-888,-102],[643,-28],[-324,-431],[-224,-383],[9,-658],[333,-386],[-434,-24],[-457,-187],[513,-313],[65,-502],[-297,-55],[360,-508],[-617,-42],[322,-241],[-91,-208],[-391,-91],[-388,-2],[348,-400],[4,-263],[-549,244],[-143,-158],[375,-148],[364,-361],[105,-476],[-495,-114],[-214,228],[-344,340],[95,-401],[-322,-311],[732,-25],[383,-32],[-745,-515],[-755,-466],[-813,-204],[-306,-2],[-288,-228],[-386,-624],[-597,-414],[-192,-24],[-370,-145],[-399,-138],[-238,-365],[-4,-415],[-141,-388],[-453,-472],[112,-462],[-125,-488],[-142,-577],[-391,-36],[-410,482],[-556,3],[-269,324],[-186,577],[-481,735],[-141,385],[-38,530],[-384,546],[100,435],[-186,208],[275,691],[418,220],[110,247],[58,461],[-318,-209],[-151,-88],[-249,-84],[-341,193],[-19,401],[109,314],[258,9],[567,-157],[-478,375],[-249,202],[-276,-83],[-232,147],[310,550],[-169,220],[-220,409],[-335,626],[-353,230],[3,247],[-745,346],[-590,43],[-743,-24],[-677,-44],[-323,188],[-482,372],[729,186],[559,31],[-1188,154],[-627,241],[39,229],[1051,285],[1018,284],[107,214],[-750,213],[243,235],[961,413],[404,63],[-115,265],[658,156],[854,93],[853,5],[303,-184],[737,325],[663,-221],[390,-46],[577,-192],[-660,318],[38,253],[932,353],[975,-27],[354,218],[982,57],[2219,-74]]],bbox:[-180,-85.60903777459777,180,83.64513000000002],transform:{scale:[.0036000360003600037,.0016925586033320111],translate:[-180,-85.60903777459777]}};function yc(i){return i.state?i.state:i.statusCode===null||i.statusCode>=400?"outage":i.statusCode>=300?"degraded":i.content==="changed"?"changed":i.content==="green"?"healthy":"unknown"}var kn=Math.PI/180;function Eg(i,t,e=1){return new V(Math.cos(i*kn)*Math.sin(t*kn),Math.sin(i*kn),Math.cos(i*kn)*Math.cos(t*kn)).multiplyScalar(e)}function qy(i,t,e,n){let r=new io({antialias:!0,alpha:!0,powerPreference:"low-power"});r.setClearColor(0,0),r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)),r.outputColorSpace=Ne,r.domElement.setAttribute("aria-hidden","true"),i.prepend(r.domElement);let s=new Ar,a=new ii(-1.5,1.5,1.5,-1.5,.1,20);a.position.set(0,0,5);let o=new Sn;o.rotation.set(20*kn,24*kn,0,"XYZ"),s.add(o),s.add(new Br(16777215,1.3));let c=new Qi(16772343,2.3);c.position.set(-3,4,5),s.add(c);let l=new Qi(14272502,.6);l.position.set(3,-1,1),s.add(l);let h=new vi({roughness:.77,metalness:.08}),f=new be(new Ki(1,96,64),h);f.rotation.y=-Math.PI/2,o.add(f);let u,d=[],g="",S,m=1,p=1,T=!1,R=!1,y=!1,b=!0,M=!1,C=!1,x=null,E=0,P=0,L=0,F="",O=null,I=new V,A=new V,z=new ResizeObserver(Bt);z.observe(i);let W=new IntersectionObserver(it=>{b=it[0].isIntersecting,$()});W.observe(i);function K(it){let ft=document.createElement("span");ft.style.color=it,i.append(ft);let Et=getComputedStyle(ft).color;ft.remove();let At=document.createElement("canvas");At.width=At.height=1;let It=At.getContext("2d");It.fillStyle=Et,It.fillRect(0,0,1,1);let[jt,te,he]=It.getImageData(0,0,1,1).data;return`rgb(${jt},${te},${he})`}function q(){return{healthy:K("var(--ww-green, #00a55e)"),changed:K("var(--ww-pink, #ce2376)"),degraded:K("var(--ww-amber, #a8650c)"),outage:K("var(--ww-red, #c5221f)"),unknown:K("var(--ww-copy-soft, #77738b)"),ocean:K("var(--ww-globe-ocean, #471c40)"),land:K("var(--ww-globe-land, #d1a3be)"),coast:K("color-mix(in srgb, var(--ww-pink-soft, #f7d8ea) 84%, var(--ww-plum, #782858))"),grid:K("var(--ww-pink-soft, #f7d8ea)")}}function j(){let it=document.createElement("canvas");it.width=2048,it.height=1024;let ft=it.getContext("2d");ft.fillStyle=S.ocean,ft.fillRect(0,0,2048,1024);let Et=mc().scale(2048/(2*Math.PI)).translate([1024,512]),At=cc(Et,ft),It=_c(vc,vc.objects.land);ft.beginPath(),At(It),ft.fillStyle=S.land,ft.fill(),ft.strokeStyle=S.coast,ft.lineWidth=1.15,ft.stroke(),ft.globalAlpha=.075,ft.strokeStyle=S.grid,ft.lineWidth=1;for(let jt=0;jt<=2048;jt+=2048/24)ft.beginPath(),ft.moveTo(jt,0),ft.lineTo(jt,1024),ft.stroke();for(let jt=0;jt<=1024;jt+=1024/12)ft.beginPath(),ft.moveTo(0,jt),ft.lineTo(2048,jt),ft.stroke();u?.dispose(),u=new Ir(it),u.colorSpace=Ne,u.anisotropy=Math.min(4,r.capabilities.getMaxAnisotropy()),h.map=u,h.needsUpdate=!0}function tt(){for(let it of d)o.remove(it.group),it.spill.remove(),it.group.traverse(ft=>{ft instanceof be&&(ft.geometry.dispose(),ft.material.dispose())});d=[]}function St(it){tt();for(let ft of it){let Et=new Ht(S[yc(ft)]),At=new Sn,It=Eg(ft.latitude,ft.longitude);At.position.copy(It),At.quaternion.setFromUnitVectors(new V(0,0,1),It);let jt=new be(new Dr(.006,.009,.046,8),new vi({color:Et,roughness:.6}));jt.rotation.x=Math.PI/2,jt.position.z=.022,At.add(jt);let te=new be(new Ki(.021,16,12),new vi({color:Et,emissive:Et,emissiveIntensity:.6,roughness:.3,metalness:.12}));te.position.z=.055,At.add(te);let he=new be(new Nr(.039,.044,40),new _i({color:Et,transparent:!0,opacity:.45,side:nn,depthWrite:!1}));he.position.z=.006,At.add(he);let N=new be(new xi(.15,.15),new ke({uniforms:{tint:{value:Et}},transparent:!0,depthWrite:!1,vertexShader:"varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:"varying vec2 vUv; uniform vec3 tint; void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d),3.)*.28;gl_FragColor=vec4(tint,a);}"}));N.position.z=.007,At.add(N),o.add(At);let xe=document.createElement("div");xe.className="ww-pin-spill",xe.style.background=`radial-gradient(circle, ${S[yc(ft)]}, transparent 66%)`,t.append(xe),d.push({check:ft,group:At,head:te,ring:he,spill:xe,point:It,x:0,y:0,visible:!1})}$()}function gt(){S=q(),j(),St(d.map(it=>it.check)),$()}let $t=new MutationObserver(gt);for(let it=i.parentElement;it;it=it.parentElement)$t.observe(it,{attributes:!0,attributeFilter:["data-theme","class","style"]});function Bt(){if(m=i.clientWidth,p=i.clientHeight,!m||!p)return;let it=1.16,ft=it*m/p;a.left=-ft,a.right=ft,a.top=it,a.bottom=-it,a.updateProjectionMatrix(),r.setSize(m,p),$()}function Kt(it,ft=!1){g=it;let Et=d.find(At=>At.check.id===it);if(ft&&Et){let At=-Et.check.longitude*kn,It=o.rotation.y+Math.atan2(Math.sin(At-o.rotation.y),Math.cos(At-o.rotation.y));O={x:Et.check.latitude*kn,y:It},E=performance.now()+n.resumeDelay+700}$()}function Z(it){if(L=0,M||C||!b||document.hidden){P=0;return}let ft=P?Math.min((it-P)/1e3,.05):0;P=it;let Et=!T&&!R&&!y&&!x&&it>=E&&!O;if(O){let It=R?1:1-Math.exp(-ft*8);o.rotation.x+=(O.x-o.rotation.x)*It,o.rotation.y+=(O.y-o.rotation.y)*It,Math.abs(O.x-o.rotation.x)+Math.abs(O.y-o.rotation.y)<.001&&(O=null)}else Et&&(o.rotation.y+=n.rotationSpeed*ft);let At=x?.moved?"dragging":Et?"rotating":"paused";At!==F&&(F=At,n.onActivity(At)),o.updateMatrixWorld(!0),e.style.opacity="0";for(let It of d){I.copy(It.point).applyMatrix4(o.matrixWorld),It.visible=I.z>.055,A.copy(It.head.position),It.group.localToWorld(A),A.project(a),It.x=(A.x*.5+.5)*m,It.y=(-A.y*.5+.5)*p,It.head.scale.setScalar(It.check.id===g?1.22:1),It.ring.material.opacity=It.check.id===g?.9:.35;let jt=Math.exp(-Math.pow((I.z-.03)/.3,2));if(It.spill.style.opacity=String(jt*.09),It.spill.style.transform=`translate3d(${It.x}px,${It.y}px,0)`,It.check.id===g&&I.z>.18){e.textContent=It.check.id,e.style.opacity="1";let te=Math.max(60,Math.min(m-60,It.x));e.style.transform=`translate3d(${te}px,${It.y-25}px,0) translate(-50%,-100%)`}}r.render(s,a),(Et||O||!T&&!R&&!y&&!x&&it<E)&&$()}function $(){!L&&!M&&(L=requestAnimationFrame(Z))}function xt(it,ft){let Et=i.getBoundingClientRect();return d.filter(At=>At.visible).map(At=>({p:At,distance:Math.hypot(At.x-(it-Et.left),At.y-(ft-Et.top))})).filter(At=>At.distance<=22).sort((At,It)=>At.distance-It.distance)[0]?.p}function Ut(it){x||it.pointerType==="mouse"&&it.button!==0||(x={id:it.pointerId,x:it.clientX,y:it.clientY,originX:it.clientX,originY:it.clientY,moved:!1},O=null,i.setPointerCapture(it.pointerId),$())}function _t(it){if(!x){i.style.cursor=xt(it.clientX,it.clientY)?"pointer":"grab";return}it.pointerId===x.id&&(Math.hypot(it.clientX-x.originX,it.clientY-x.originY)>6&&(x.moved=!0),x.moved&&(o.rotation.y+=(it.clientX-x.x)*.006,o.rotation.x=El.clamp(o.rotation.x+(it.clientY-x.y)*.006,-1.3,1.3),i.style.cursor="grabbing"),x.x=it.clientX,x.y=it.clientY,$())}function Ft(it){if(!x||it.pointerId!==x.id)return;let ft=!x.moved&&it.type==="pointerup";if(x=null,E=performance.now()+n.resumeDelay,i.hasPointerCapture(it.pointerId)&&i.releasePointerCapture(it.pointerId),i.style.cursor="grab",ft){let Et=xt(it.clientX,it.clientY);Et&&n.onSelect(Et.check.id)}$()}function _e(){P=0,$()}function Vt(it){it.preventDefault(),C=!0,n.onFailure()}return i.addEventListener("pointerdown",Ut),i.addEventListener("pointermove",_t),i.addEventListener("pointerup",Ft),i.addEventListener("pointercancel",Ft),i.addEventListener("lostpointercapture",Ft),r.domElement.addEventListener("webglcontextlost",Vt),document.addEventListener("visibilitychange",_e),gt(),Bt(),{setChecks:St,setSelected:Kt,refreshTheme:gt,setPaused(it){T=it,$()},setReduced(it){R=it,$()},setFocused(it){y=it,$()},dispose(){M=!0,cancelAnimationFrame(L),z.disconnect(),W.disconnect(),$t.disconnect(),document.removeEventListener("visibilitychange",_e),i.removeEventListener("pointerdown",Ut),i.removeEventListener("pointermove",_t),i.removeEventListener("pointerup",Ft),i.removeEventListener("pointercancel",Ft),i.removeEventListener("lostpointercapture",Ft),r.domElement.removeEventListener("webglcontextlost",Vt),tt(),f.geometry.dispose(),h.dispose(),u?.dispose(),r.dispose(),r.domElement.remove()}}}export{Eg as coordinates,qy as createGlobe};
