(function attachProductVisualResolver(root){
'use strict';

const KNOWN_FORMATS=Object.freeze(['Vial','Pen','Cartridge']);
const IMAGE_DATA_PATTERN=/^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);/i;
const HTTPS_PATTERN=/^https:\/\/[^\s]+$/i;
const LOCAL_HTTP_PATTERN=/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i;

function normalizeFormat(value){
  const raw=String(value||'').trim().toLowerCase();
  if(raw==='vial')return 'Vial';
  if(raw==='pen')return 'Pen';
  if(raw==='cartridge'||raw==='bottle')return 'Cartridge';
  return '';
}

function isSafeAssetUrl(value){
  const url=String(value||'').trim();
  if(!url||/[\u0000-\u001f\u007f]/.test(url))return false;
  if(IMAGE_DATA_PATTERN.test(url))return true;
  if(url.startsWith('/')&&!url.startsWith('//'))return true;
  return HTTPS_PATTERN.test(url)||LOCAL_HTTP_PATTERN.test(url);
}

function versionAssetUrl(value,version){
  const url=String(value||'').trim();
  if(!isSafeAssetUrl(url)||url.startsWith('data:'))return url;
  const v=String(version??'').trim();
  if(!v)return url;
  const hashIndex=url.indexOf('#');
  const hash=hashIndex>=0?url.slice(hashIndex):'';
  const base=hashIndex>=0?url.slice(0,hashIndex):url;
  const queryIndex=base.indexOf('?');
  const pathname=queryIndex>=0?base.slice(0,queryIndex):base;
  const query=queryIndex>=0?base.slice(queryIndex+1):'';
  const params=query.split('&').filter(Boolean).filter(param=>!/^masterv=/i.test(param));
  params.push(`masterv=${encodeURIComponent(v)}`);
  return `${pathname}?${params.join('&')}${hash}`;
}

function buildMasterMap(rows=[],options={}){
  const masters={};
  for(const row of Array.isArray(rows)?rows:[]){
    const format=normalizeFormat(row?.format);
    const rawUrl=row?.master_image_url||row?.url;
    if(!format||!isSafeAssetUrl(rawUrl))continue;
    if(row?.active===false||row?.approval_status==='rejected')continue;
    const version=row?.version??row?.content_hash??'';
    masters[format]=Object.freeze({
      format,
      url:versionAssetUrl(rawUrl,version),
      version,
      source:'master'
    });
  }
  if(isSafeAssetUrl(options?.neutral)){
    masters.Neutral=Object.freeze({
      format:'',
      url:String(options.neutral).trim(),
      version:'',
      source:'neutral-fallback'
    });
  }
  return masters;
}

function masterRecord(masters,format){
  const value=masters?.[format];
  if(typeof value==='string')return isSafeAssetUrl(value)?{url:value,version:''}:null;
  if(value&&isSafeAssetUrl(value.url))return value;
  return null;
}

function resolveProductVisual(input={}){
  const variant=input.variant||{};
  const format=normalizeFormat(input.format||variant.format);
  const customApproved=variant.use_custom_image===true||variant.custom_image_approved===true;
  const customUrl=variant.custom_image_url||variant.image_url;

  if(customApproved&&isSafeAssetUrl(customUrl)){
    return Object.freeze({
      format,
      url:String(customUrl).trim(),
      source:'approved-custom',
      version:variant.image_version||'',
      overlayAllowed:variant.allow_dynamic_overlay===true&&format!=='Cartridge'
    });
  }

  const master=masterRecord(input.masters,format);
  if(master){
    return Object.freeze({
      format,
      url:master.url,
      source:'master',
      version:master.version||'',
      overlayAllowed:format==='Vial'||format==='Pen'
    });
  }

  const neutral=input.neutralFallback||input.masters?.Neutral?.url||input.masters?.Neutral;
  return Object.freeze({
    format,
    url:isSafeAssetUrl(neutral)?String(neutral).trim():'',
    source:'neutral-fallback',
    version:'',
    overlayAllowed:false
  });
}

const api=Object.freeze({
  KNOWN_FORMATS,
  normalizeFormat,
  isSafeAssetUrl,
  versionAssetUrl,
  buildMasterMap,
  resolveProductVisual
});

root.AIBT_PRODUCT_VISUALS=api;
})(typeof window!=='undefined'?window:globalThis);
