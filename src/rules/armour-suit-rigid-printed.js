/** Independent transcription of outlined AV cells on printed HMK pp.113–116.
 * Only a boxed value is Rigid. An unboxed numeric value is non-rigid.
 * A printed dot has no AV and no Rigid status.
 * Source: visual examination of original page images, not material inference.
 */
export const PRINTED_SUIT_RIGID_BOXES = Object.freeze({
  "Clothing": {},
  "Heavy Clothing": {},
  "Quilted Coat": {
    "sk": "ep"
  },
  "Kûrbúl Cuirass": {
    "sk": "ep",
    "sh": "ep",
    "ua": "ep",
    "tx": "ep",
    "ab": "ep"
  },
  "Scale Byrnie": {
    "sk": "ep",
    "sh": "ep",
    "ua": "ep",
    "tx": "ep",
    "ab": "ep"
  },
  "Mail Byrnie": {
    "sk": "ep",
    "sh": "ep",
    "ua": "ep",
    "tx": "ep",
    "ab": "ep"
  },
  "Gambeson": {
    "sk": "ep",
    "tx": "ep",
    "ab": "ep",
    "pv": "ep",
    "th": "ep",
    "kn": "ep"
  },
  "Scale Habergeon": {
    "sk": "ep",
    "fa": "ep",
    "sh": "ep",
    "ua": "ep",
    "el": "ep",
    "tx": "ep",
    "ab": "ep",
    "pv": "ep",
    "kn": "ep"
  },
  "Mail Habergeon": {
    "sk": "ep",
    "sh": "ep",
    "ua": "ep",
    "el": "ep",
    "tx": "ep",
    "ab": "ep",
    "pv": "ep",
    "kn": "ep"
  },
  "Mail Hauberk": {
    "sk": "ep",
    "nk": "ep",
    "sh": "ep",
    "ua": "ep",
    "el": "ep",
    "fo": "ep",
    "ha": "ep",
    "tx": "ep",
    "ab": "ep",
    "pv": "ep",
    "th": "ep",
    "kn": "ep",
    "ca": "ep",
    "ft": "ep"
  },
  "Kûrbúl & Mail": {
    "sk": "ep",
    "fa": "ep",
    "nk": "ep",
    "sh": "ep",
    "ua": "ep",
    "el": "ep",
    "fo": "ep",
    "ha": "ep",
    "tx": "ep",
    "ab": "ep",
    "pv": "ep",
    "th": "ep",
    "kn": "ep",
    "ca": "ep",
    "ft": "ep"
  },
  "Plate & Mail": {
    "sk": "ep",
    "fa": "ep",
    "nk": "ep",
    "sh": "ep",
    "ua": "ep",
    "el": "ep",
    "fo": "ep",
    "ha": "ep",
    "tx": "ep",
    "ab": "ep",
    "pv": "ep",
    "th": "ep",
    "kn": "ep",
    "ca": "ep",
    "ft": "ep"
  }
});
export function printedSuitRigid(name,location,aspect){
 const suit=Object.hasOwn(PRINTED_SUIT_RIGID_BOXES,name)?PRINTED_SUIT_RIGID_BOXES[name]:null;
 if(!suit||!['b','e','p','f'].includes(aspect))return {ok:false,reason:'Unknown suit/aspect'};
 return {ok:true,rigid:(suit[location]||'').includes(aspect)};
}
