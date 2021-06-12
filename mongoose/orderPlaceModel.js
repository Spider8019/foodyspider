var mongoose=require("mongoose")
const Stores= require("./stores")
const Users=require("./lioModel")

var placeOrderSchema=new mongoose.Schema({
    reciever:{
        type:String
    },
    loginUserId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:Users,
    },
    fulladdress:{
        type:String
    },
    storeId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:Stores
    },
    email:{
        type:String
    },
    contact:{
        type:Number
    },
    paymentMethod:{
        type:String,
        required:true,
    },
    item:[{
        type:String
    }],
    quantity:[{
        type:String
    }],
    delivered:{
       type:Number,
       default:-1
    },
    date:{
        type:Date,
        default:new Date()
    },

})
// -1 meaning it is accepted by store
// 0 means delivered from store
// 1 means delivered to user
module.exports=mongoose.model("placedorderModel",placeOrderSchema)