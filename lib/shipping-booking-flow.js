/* Durable state machine. Store operations MUST be atomic per the versioned DB contract. */
function usableAwb(value){return !!String(value||'').trim()&&!/not available|pending|^null$/i.test(String(value));}
async function resumeBooking(orderId,{store,submit,pay,status,parcelFrom}){
  const lease=await store.claim(orderId);
  if(!lease?.acquired){const e=new Error('A booking is already in progress. Retry its status later.');e.status=409;throw e;}
  let state=lease.state;
  const advance=async patch=>{state=await store.advance(lease,patch);return state;};
  try{
    if(state.stage==='ready')return {reused:true,...state};
    if(!state.providerOrderNo){
      if(state.stage!=='new')throw new Error('Submission outcome is unknown. Manual provider reconciliation is required; automatic resubmission is blocked.');
      await advance({stage:'submitting'});
      const providerOrderNo=await submit();
      if(!providerOrderNo)throw new Error('Provider did not return an order number. Do not resubmit.');
      await advance({stage:'submitted',providerOrderNo});
    }
    let parcel;
    if(state.stage==='submitted'){
      // Mark before calling payment: a lost response never causes a second charge.
      await advance({stage:'paying'});
      parcel=parcelFrom(await pay(state.providerOrderNo));
      await advance({stage:'awaiting-awb'});
    }
    if(!usableAwb(parcel?.awb))parcel=parcelFrom(await status(state.providerOrderNo));
    if(!usableAwb(parcel?.awb)){await advance({stage:'awaiting-awb'});return {reused:true,...state,labelUrl:null};}
    // Atomic shipment/order transition with exact intent and AWB validation.
    return {...await store.complete(lease,parcel),labelUrl:parcel.awbLink||null};
  }finally{await store.release(lease);}
}
module.exports={resumeBooking,usableAwb};
