var mongoose=require("mongoose")

var placeOrderSchema=new mongoose.Schema({
    reciever:{
        type:String
    },
    loginUser:{
        type:String
    },
    fulladdress:{
        type:String
    },
    email:{
        type:String
    },
    contact:{
        type:Number
    },
    item:{
        type:String
    },
    quantity:{
        type:String
    },
    delivered:{
       type:Number,
       default:-1
    },
    date:{
        type:Date,
        default:new Date()
    }
})
// -1 meaning it is accepted by store
// 0 means delivered from store
// 1 means delivered to user
module.exports=mongoose.model("placedorderModel",placeOrderSchema)