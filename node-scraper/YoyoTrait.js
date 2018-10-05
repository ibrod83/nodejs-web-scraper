// class YoyoTrait{
//   chuj(){
//     console.log('chuj from yoyotrait!')
//   }
// }

function YoyoTrait(){

}

YoyoTrait.prototype.yoyo=function(str,obj){
  // console.log(this)
  // debugger;
  console.log('string from yoyotrait!',str,obj)
}

module.exports = YoyoTrait;