import { PRINTED_SUIT_RIGID_BOXES } from './armour-suit-rigid-verified.js';
/** Fixed printed HMK armour suit protection matrices, pp.113–116.
 * A printed dot is null, NOT zero. Rigid box outlines cannot be
 * established from text extraction and are deliberately not inferred.
 * Reference only until graphical Rigid audit and combat integration.
 */
export const PRINTED_SUIT_PROTECTION = Object.freeze({
  "Clothing": {
    "sk": [
      null,
      null,
      null,
      null
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      null,
      null,
      null,
      null
    ],
    "sh": [
      null,
      1,
      null,
      1
    ],
    "ua": [
      null,
      1,
      null,
      1
    ],
    "el": [
      null,
      1,
      null,
      1
    ],
    "fo": [
      null,
      null,
      null,
      null
    ],
    "ha": [
      null,
      null,
      null,
      null
    ],
    "tx": [
      null,
      2,
      null,
      2
    ],
    "ab": [
      null,
      2,
      null,
      2
    ],
    "pv": [
      null,
      2,
      null,
      2
    ],
    "th": [
      null,
      1,
      null,
      1
    ],
    "kn": [
      null,
      1,
      null,
      1
    ],
    "ca": [
      null,
      1,
      null,
      1
    ],
    "ft": [
      null,
      1,
      null,
      1
    ]
  },
  "Heavy Clothing": {
    "sk": [
      1,
      2,
      1,
      3
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      null,
      null,
      null,
      null
    ],
    "sh": [
      2,
      4,
      1,
      4
    ],
    "ua": [
      2,
      3,
      1,
      3
    ],
    "el": [
      null,
      1,
      null,
      1
    ],
    "fo": [
      null,
      1,
      null,
      1
    ],
    "ha": [
      null,
      null,
      null,
      null
    ],
    "tx": [
      2,
      4,
      1,
      4
    ],
    "ab": [
      2,
      4,
      1,
      4
    ],
    "pv": [
      null,
      3,
      null,
      3
    ],
    "th": [
      null,
      2,
      null,
      2
    ],
    "kn": [
      null,
      2,
      null,
      2
    ],
    "ca": [
      null,
      1,
      null,
      1
    ],
    "ft": [
      1,
      3,
      1,
      4
    ]
  },
  "Quilted Coat": {
    "sk": [
      6,
      8,
      6,
      6
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      null,
      null,
      null,
      null
    ],
    "sh": [
      4,
      4,
      2,
      4
    ],
    "ua": [
      4,
      4,
      2,
      4
    ],
    "el": [
      4,
      4,
      2,
      4
    ],
    "fo": [
      4,
      3,
      2,
      3
    ],
    "ha": [
      null,
      null,
      null,
      null
    ],
    "tx": [
      4,
      4,
      2,
      4
    ],
    "ab": [
      4,
      4,
      2,
      4
    ],
    "pv": [
      4,
      5,
      2,
      5
    ],
    "th": [
      4,
      5,
      2,
      5
    ],
    "kn": [
      null,
      2,
      null,
      2
    ],
    "ca": [
      null,
      1,
      null,
      1
    ],
    "ft": [
      1,
      3,
      1,
      4
    ]
  },
  "Kûrbúl Cuirass": {
    "sk": [
      8,
      13,
      10,
      7
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      null,
      null,
      null,
      null
    ],
    "sh": [
      6,
      8,
      6,
      6
    ],
    "ua": [
      6,
      8,
      6,
      6
    ],
    "el": [
      2,
      2,
      1,
      2
    ],
    "fo": [
      2,
      2,
      1,
      2
    ],
    "ha": [
      null,
      null,
      null,
      null
    ],
    "tx": [
      6,
      8,
      6,
      6
    ],
    "ab": [
      6,
      8,
      6,
      6
    ],
    "pv": [
      2,
      3,
      1,
      3
    ],
    "th": [
      null,
      1,
      null,
      1
    ],
    "kn": [
      null,
      1,
      null,
      1
    ],
    "ca": [
      1,
      4,
      1,
      5
    ],
    "ft": [
      1,
      3,
      1,
      4
    ]
  },
  "Scale Byrnie": {
    "sk": [
      8,
      13,
      10,
      7
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      null,
      null,
      null,
      null
    ],
    "sh": [
      6,
      10,
      6,
      7
    ],
    "ua": [
      6,
      10,
      6,
      7
    ],
    "el": [
      2,
      2,
      1,
      2
    ],
    "fo": [
      2,
      2,
      1,
      2
    ],
    "ha": [
      null,
      null,
      null,
      null
    ],
    "tx": [
      6,
      10,
      6,
      7
    ],
    "ab": [
      6,
      10,
      6,
      7
    ],
    "pv": [
      2,
      3,
      1,
      3
    ],
    "th": [
      2,
      3,
      1,
      3
    ],
    "kn": [
      null,
      1,
      null,
      1
    ],
    "ca": [
      1,
      4,
      1,
      5
    ],
    "ft": [
      1,
      3,
      1,
      4
    ]
  },
  "Mail Byrnie": {
    "sk": [
      8,
      13,
      10,
      7
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      null,
      null,
      null,
      null
    ],
    "sh": [
      4,
      10,
      8,
      5
    ],
    "ua": [
      4,
      10,
      8,
      5
    ],
    "el": [
      2,
      2,
      1,
      2
    ],
    "fo": [
      null,
      null,
      null,
      null
    ],
    "ha": [
      null,
      null,
      null,
      null
    ],
    "tx": [
      4,
      10,
      8,
      5
    ],
    "ab": [
      4,
      10,
      8,
      5
    ],
    "pv": [
      2,
      3,
      1,
      3
    ],
    "th": [
      null,
      1,
      null,
      1
    ],
    "kn": [
      null,
      1,
      null,
      1
    ],
    "ca": [
      1,
      4,
      1,
      5
    ],
    "ft": [
      1,
      3,
      1,
      4
    ]
  },
  "Gambeson": {
    "sk": [
      8,
      13,
      10,
      7
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      6,
      5,
      4,
      5
    ],
    "sh": [
      6,
      5,
      4,
      5
    ],
    "ua": [
      6,
      5,
      4,
      5
    ],
    "el": [
      6,
      5,
      4,
      5
    ],
    "fo": [
      6,
      5,
      4,
      5
    ],
    "ha": [
      null,
      null,
      null,
      null
    ],
    "tx": [
      6,
      6,
      4,
      6
    ],
    "ab": [
      6,
      6,
      4,
      6
    ],
    "pv": [
      6,
      6,
      4,
      6
    ],
    "th": [
      8,
      8,
      5,
      8
    ],
    "kn": [
      6,
      9,
      6,
      7
    ],
    "ca": [
      1,
      3,
      1,
      4
    ],
    "ft": [
      1,
      3,
      1,
      4
    ]
  },
  "Scale Habergeon": {
    "sk": [
      8,
      13,
      10,
      7
    ],
    "fa": [
      6,
      11,
      9,
      5
    ],
    "nk": [
      null,
      null,
      null,
      null
    ],
    "sh": [
      10,
      16,
      11,
      11
    ],
    "ua": [
      6,
      10,
      6,
      7
    ],
    "el": [
      10,
      16,
      11,
      11
    ],
    "fo": [
      2,
      2,
      1,
      2
    ],
    "ha": [
      1,
      2,
      1,
      3
    ],
    "tx": [
      6,
      10,
      6,
      7
    ],
    "ab": [
      6,
      10,
      6,
      7
    ],
    "pv": [
      6,
      11,
      6,
      8
    ],
    "th": [
      4,
      5,
      2,
      5
    ],
    "kn": [
      6,
      9,
      6,
      7
    ],
    "ca": [
      3,
      4,
      2,
      5
    ],
    "ft": [
      3,
      4,
      2,
      5
    ]
  },
  "Mail Habergeon": {
    "sk": [
      8,
      13,
      10,
      7
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      null,
      null,
      null,
      null
    ],
    "sh": [
      4,
      10,
      8,
      5
    ],
    "ua": [
      4,
      10,
      8,
      5
    ],
    "el": [
      4,
      10,
      8,
      5
    ],
    "fo": [
      2,
      2,
      1,
      2
    ],
    "ha": [
      null,
      null,
      null,
      null
    ],
    "tx": [
      4,
      10,
      8,
      5
    ],
    "ab": [
      4,
      10,
      8,
      5
    ],
    "pv": [
      4,
      11,
      8,
      6
    ],
    "th": [
      4,
      5,
      2,
      5
    ],
    "kn": [
      6,
      9,
      6,
      7
    ],
    "ca": [
      3,
      4,
      2,
      5
    ],
    "ft": [
      3,
      4,
      2,
      5
    ]
  },
  "Mail Hauberk": {
    "sk": [
      4,
      10,
      8,
      5
    ],
    "fa": [
      null,
      null,
      null,
      null
    ],
    "nk": [
      4,
      10,
      8,
      5
    ],
    "sh": [
      4,
      10,
      8,
      5
    ],
    "ua": [
      4,
      10,
      8,
      5
    ],
    "el": [
      10,
      21,
      17,
      10
    ],
    "fo": [
      4,
      10,
      8,
      5
    ],
    "ha": [
      4,
      10,
      8,
      5
    ],
    "tx": [
      4,
      10,
      8,
      5
    ],
    "ab": [
      4,
      10,
      8,
      5
    ],
    "pv": [
      4,
      11,
      8,
      6
    ],
    "th": [
      8,
      21,
      16,
      11
    ],
    "kn": [
      10,
      22,
      17,
      11
    ],
    "ca": [
      4,
      10,
      8,
      5
    ],
    "ft": [
      4,
      10,
      8,
      5
    ]
  },
  "Kûrbúl & Mail": {
    "sk": [
      10,
      21,
      17,
      10
    ],
    "fa": [
      6,
      11,
      9,
      5
    ],
    "nk": [
      4,
      10,
      8,
      5
    ],
    "sh": [
      8,
      16,
      13,
      9
    ],
    "ua": [
      8,
      16,
      13,
      9
    ],
    "el": [
      8,
      16,
      13,
      9
    ],
    "fo": [
      4,
      10,
      8,
      5
    ],
    "ha": [
      4,
      10,
      8,
      5
    ],
    "tx": [
      8,
      16,
      13,
      9
    ],
    "ab": [
      8,
      16,
      13,
      9
    ],
    "pv": [
      4,
      11,
      8,
      6
    ],
    "th": [
      8,
      21,
      16,
      11
    ],
    "kn": [
      8,
      17,
      13,
      10
    ],
    "ca": [
      10,
      21,
      17,
      10
    ],
    "ft": [
      4,
      10,
      8,
      5
    ]
  },
  "Plate & Mail": {
    "sk": [
      10,
      21,
      17,
      10
    ],
    "fa": [
      6,
      11,
      9,
      5
    ],
    "nk": [
      10,
      21,
      17,
      10
    ],
    "sh": [
      10,
      21,
      17,
      10
    ],
    "ua": [
      10,
      21,
      17,
      10
    ],
    "el": [
      10,
      21,
      17,
      10
    ],
    "fo": [
      10,
      21,
      17,
      10
    ],
    "ha": [
      4,
      10,
      8,
      5
    ],
    "tx": [
      10,
      21,
      17,
      10
    ],
    "ab": [
      10,
      21,
      17,
      10
    ],
    "pv": [
      4,
      11,
      8,
      6
    ],
    "th": [
      8,
      21,
      16,
      11
    ],
    "kn": [
      10,
      22,
      17,
      11
    ],
    "ca": [
      10,
      21,
      17,
      10
    ],
    "ft": [
      4,
      10,
      8,
      5
    ]
  }
});
export const SUIT_LOCATION_CODES = Object.freeze(["sk", "fa", "nk", "sh", "ua", "el", "fo", "ha", "tx", "ab", "pv", "th", "kn", "ca", "ft"]);
export function printedSuitAV(suitName,location,aspect){
 const row=Object.hasOwn(PRINTED_SUIT_PROTECTION,suitName)?PRINTED_SUIT_PROTECTION[suitName][location]:undefined;
 const index={b:0,e:1,p:2,f:3}[aspect];
 if(!row||index===undefined)return {ok:false,reason:'Unknown suit/location/aspect'};
 const av=row[index];
 return av===null?{ok:true,covered:false,av:null,rigid:false}:{ok:true,covered:true,av,rigid:PRINTED_SUIT_RIGID_BOXES[suitName][location][index]};
}
