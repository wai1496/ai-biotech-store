import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = p => fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
const ops = read('ops.js');
const commerce = read('ops-commerce.js');
const control = read('ops-control.js');
const recovery = read('ops-recovery.js');

const checks = [
 ['product edit preview exists', ops, /previewProductSave/],
 ['product writes require reason', ops, /Reason for change/],
 ['inventory adjustment uses audited RPC', ops, /adjust_inventory/],
 ['order status uses controlled RPC', commerce, /ops_set_order_status/],
 ['wallet adjustment uses controlled RPC', commerce, /ops_adjust_wallet/],
 ['payment recording uses controlled RPC', commerce, /ops_record_payment/],
 ['shipping action is present', commerce, /Shipping \/ Tracking|shipping/i],
 ['content page save uses controlled RPC', control, /ops_save_page/],
 ['media master save uses controlled RPC', control, /ops_save_media_template/],
 ['recovery requires preview before restore', recovery, /ops_preview_recovery_restore/],
 ['recovery creates safety snapshot', recovery, /Auto safety snapshot|safety snapshot/i]
];
for (const [name,text,re] of checks) assert.match(text,re,name);
for (const [name,text] of [['ops',ops],['commerce',commerce],['control',control],['recovery',recovery]]) {
  assert.doesNotMatch(text,/\b(?:alert|confirm|prompt)\s*\(/,`${name} must not use native blocking dialogs`);
}
console.log(`Operations action contract PASS (${checks.length} controlled action checks)`);
