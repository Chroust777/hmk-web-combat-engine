import {GM_COLOR, validateChat, emptyChat} from '../src/integration/hmk-chat-store.js?v=94.104';
const doc=emptyChat();
doc.nextSequence=3;
doc.messages=[
 {id:'m1',sequence:1,revision:1,author:{kind:'gm',id:'gm',name:'GameMaster',color:'#e7cfa9'},text:'stará barva',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),gameDate:null,lastOp:'op1'},
 {id:'m2',sequence:2,revision:1,author:{kind:'gm',id:'gm',name:'GameMaster',color:GM_COLOR},text:'nová barva',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),gameDate:null,lastOp:'op2'}
];
validateChat(doc);
if(GM_COLOR !== '#dbc08f') throw new Error('GM color not updated');
console.log('PASS test_94104_chat_style');
