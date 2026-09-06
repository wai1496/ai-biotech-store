const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('checkout.html','utf8');
const js=fs.readFileSync('checkout.js','utf8');

assert(html.includes('id="newAddressForm"'),'checkout must render an inline new-address form');
for(const id of ['shipRecipient','shipPhone','shipLine1','shipLine2','shipPostcode','shipCity','shipState','shipCountry']){
  assert(html.includes(`id="${id}"`),`missing Malaysia shipping field ${id}`);
}
assert(html.includes('value="MY"')&&html.includes('Malaysia'),'country must be locked to Malaysia');
assert(!js.includes("prompt('Recipient name'"),'checkout must not use prompt dialogs for shipping address');
assert(js.includes("csb.rpc('ensure_my_customer_profile'"),'checkout must repair a missing own customer profile before saving addresses');
assert(js.includes("csb.from('addresses').insert"),'checkout must support saving a new address');
assert(js.includes("country:'MY'"),'saved checkout addresses must use Malaysia country code');
assert(!js.includes("could not be saved: '+error.message"),'checkout must not expose raw database errors to customers');
console.log('checkout Malaysia address contract: ok');
