const mongoose=require("mongoose")
const Store=require("./stores");
const Items=require("./itemModel");

const offerSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    validUpto:{
        type:Date
    },
    validFor:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:Store
    }],
    itemId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:Items
    }],
    quantity:[{
        type:Number
    }],
    totalAmout:{
        type:Number
    },
    createdAt:{
        type:Date,
        default:Date.now
    }

})

module.exports= new mongoose.model("Offer",offerSchema)