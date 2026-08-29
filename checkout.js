const SB_URL='https://yjauxyvtrmdriwtmckkl.supabase.co',SB_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
const csb=supabase.createClient(SB_URL,SB_KEY);
let cart=JSON.parse(localStorage.getItem('aibt_cart')||'[]'),me=null,addresses=[],wallet=0,newAddress=null,store={flat_shipping_fee:0,free_shipping_threshold:null},cartIssues=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>'RM '+Number(v||0).toFixed(2);
function msg(t){checkoutMessage.textContent=t||''}
function subtotal(){return cart.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||0),0)}
function shippingFee(value=subtotal()){const threshold=Number(store.free_shipping_threshold);return threshold>0&&value>=threshold?0:Number(store.flat_shipping_fee||0)}
function totals(){const sub=subtotal(),shipping=shippingFee(sub),walletUse=Math.max(0,Number(walletAmount?.value||0)),total=Math.max(0,sub+shipping-walletUse);return{sub,shipping,walletUse,total}}
function renderTotals(){const t=totals();checkoutSubtotal.textContent=money(t.sub);checkoutShipping.textContent=money(t.shipping);checkoutGrandTotal.textContent=money(t.total);const max=Math.min(wallet,t.sub+t.shipping);walletAmount.max=String(max);if(Number(walletAmount.value||0)>max)walletAmount.value=String(max)}
function renderCart(){
  checkoutItems.innerHTML=cart.map(x=>`<div class="order"><b>${esc(x.name)}</b><div>${esc(x.strength)} · ${esc(x.form)}</div><small>${money(x.price)} × ${x.qty}</small>${x.unavailable?'<div class="notice">This variant is unavailable or out of stock.</div>':''}</div>`).join('')||'<p>Your cart is empty.</p>';
  renderTotals();
  placeOrderBtn.disabled=!cart.length||cart.some(x=>x.unavailable);
  if(cartIssues.length)msg(cartIssues.join(' '));
}
function addressText(a){return `${a.label||'Address'} — ${a.recipient_name}, ${a.line1}${a.line2?' '+a.line2:''}, ${a.postcode} ${a.city}, ${a.state}`}
function renderAddresses(){checkoutAddress.innerHTML=addresses.map((a,i)=>`<option value="${i}">${esc(addressText(a))}</option>`).join('')+(newAddress?`<option value="new" selected>${esc(addressText(newAddress))}</option>`:'');if(!addresses.length&&!newAddress)checkoutAddress.innerHTML='<option value="">No saved address</option>'}
async function syncCart(){
  cartIssues=[];
  const ids=[...new Set(cart.map(x=>x.variantId).filter(Boolean))];
  if(!ids.length)return;
  const {data,error}=await csb.from('variants').select('id,product_id,strength_label,format,price,stock_quantity,reserved_quantity,active,archived_at,products(name)').in('id',ids);
  if(error){cartIssues.push('Could not refresh live stock. Please refresh again before ordering.');return;}
  const map=new Map((data||[]).map(v=>[v.id,v]));
  cart=cart.map(item=>{
    const v=map.get(item.variantId);
    if(!v||v.active===false||v.archived_at)return {...item,unavailable:true};
    const available=Math.max(0,Number(v.stock_quantity||0)-Number(v.reserved_quantity||0));
    let qty=Math.max(1,Number(item.qty||1));
    if(available>0&&qty>available){qty=available;cartIssues.push(`Quantity adjusted to live stock for ${v.products?.name||item.name}.`)}
    return {...item,name:v.products?.name||item.name,strength:v.strength_label,form:v.format,price:Number(v.price||0),qty,unavailable:available<=0};
  });
  localStorage.setItem('aibt_cart',JSON.stringify(cart));
}
async function init(){
  const [{data:{user}},{data:settings}]=await Promise.all([csb.auth.getUser(),csb.from('stores').select('flat_shipping_fee,free_shipping_threshold').eq('id','primary').maybeSingle()]);
  if(settings)store=settings;
  if(!user){checkoutLogin.hidden=false;checkoutApp.hidden=true;return}
  me=user;checkoutLogin.hidden=true;checkoutApp.hidden=false;
  await syncCart();
  const [{data:a},{data:w}]=await Promise.all([csb.from('addresses').select('*').eq('user_id',user.id).order('is_default',{ascending:false}),csb.from('wallet_accounts').select('balance').eq('user_id',user.id).maybeSingle()]);
  addresses=a||[];wallet=Number(w?.balance||0);checkoutWallet.textContent=money(wallet);renderAddresses();renderCart();
}
function useNewAddress(){const recipient_name=prompt('Recipient name','');if(recipient_name===null)return;const phone=prompt('Phone','');const line1=prompt('Address line 1','');const line2=prompt('Address line 2','');const city=prompt('City','');const state=prompt('State','');const postcode=prompt('Postcode','');if(!recipient_name||!phone||!line1||!city||!state||!postcode)return alert('Please complete the required address fields.');newAddress={label:'Checkout',recipient_name,phone,line1,line2,city,state,postcode,country:'MY'};renderAddresses()}
async function placeOrder(){
  if(!cart.length)return msg('Your cart is empty.');if(cart.some(x=>x.unavailable))return msg('Remove unavailable items before checkout.');
  let address=checkoutAddress.value==='new'?newAddress:addresses[Number(checkoutAddress.value)]||null;if(!address)return msg('Choose or enter a shipping address.');
  const t=totals();if(t.walletUse>wallet)return msg('Wallet amount is higher than your available balance.');if(t.walletUse>t.sub+t.shipping)return msg('Wallet amount cannot exceed the order total.');
  placeOrderBtn.disabled=true;placeOrderBtn.textContent='Creating order…';msg('');
  try{
    const items=cart.map(x=>({variant_id:x.variantId,quantity:Number(x.qty)})),key='web-'+crypto.randomUUID(),voucher=voucherCode.value.trim()||null;
    const {data,error}=await csb.rpc('create_order',{p_items:items,p_checkout_key:key,p_voucher_code:voucher,p_shipping_fee:t.shipping,p_wallet_amount:t.walletUse,p_shipping_address:address,p_billing_address:address,p_notes:checkoutNote.value.trim()});
    if(error)throw error;
    localStorage.removeItem('aibt_cart');cart=[];renderCart();msg('Order created successfully. Order ID: '+data);setTimeout(()=>location.href='/member.html',1200);
  }catch(e){msg(e.message||String(e))}finally{placeOrderBtn.disabled=false;placeOrderBtn.textContent='PLACE ORDER'}
}
walletAmount.addEventListener('input',renderTotals);
document.addEventListener('DOMContentLoaded',init);
