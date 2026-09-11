const SB_URL='https://yjauxyvtrmdriwtmckkl.supabase.co',SB_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
const psb=window.AIBTRuntime.createClient();

function show(title,message,meta){
  paymentTitle.textContent=title;
  paymentMessage.textContent=message;
  if(meta){paymentMeta.hidden=false;paymentMeta.textContent=meta}else paymentMeta.hidden=true;
}

async function initPaymentReturn(){
  if(!window.AIBTRuntime.writesEnabled){show('Payment verification locked',window.AIBTRuntime.reason);return;}
  const q=new URLSearchParams(location.search),orderId=q.get('order_id')||'',billCode=q.get('billcode')||'';
  if(!orderId||!billCode){show('Payment reference missing','We could not identify this payment return. Open your Member area to review the order.');return;}
  const {data:{session}}=await psb.auth.getSession();
  if(!session?.access_token){show('Sign in required','Please sign in to your Member area, then return to the order to verify payment.');return;}
  try{
    const r=await fetch('/api/toyyibpay-reconcile',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({orderId,billCode})});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||'Payment verification failed.');
    if(data.status==='successful'){
      window.AIBTCore.cart.clear();
      window.AIBTCore.checkoutIntent.clear();
      show('Payment successful','Your ToyyibPay sandbox payment was verified. The order is now marked as paid.',`Order: ${orderId}`);
      return;
    }
    if(data.status==='failed'){
      show('Payment not completed','The sandbox payment was unsuccessful. Your order remains unpaid. Open Member area and use PAY / RETRY PAYMENT on this order.',`Order: ${orderId}`);
      return;
    }
    show('Payment pending','ToyyibPay has not confirmed the sandbox payment yet. Your order remains pending payment. You can safely retry the same order from Member area.',`Order: ${orderId}`);
  }catch(e){show('Verification unavailable',e.message||'Could not verify the sandbox payment. Your order has not been marked paid.');}
}

document.addEventListener('DOMContentLoaded',initPaymentReturn);
